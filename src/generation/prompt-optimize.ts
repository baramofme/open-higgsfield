/* Prompt-optimization engine for the dock composer.
   A TypeScript port of the ComfyUI-LTXPromptOptimizer engine (the LLM call, URL
   normalisation, response parsing, thinking-tag strip, code-fence strip and the
   sha256 idempotency cache) that was itself ported verbatim from
   ComfyUI-MiniMaxH3-Easy. The engine is model-agnostic; only the system prompt
   content is opinionated.

   Where the source ran inside ComfyUI as a node, this runs on the Next server
   (a server action calls `optimizePrompt`), so the HTTP call is made server-side.
   A browser never talks to the LLM endpoint directly: that keeps the API key off
   the client and avoids Chrome's loopback Private-Network-Access preflight, which
   would otherwise block a CORS-mode fetch from the :3100 page to a loopback port.

   On any failure the ORIGINAL prompt is returned with a warning logged, never
   breaking the submit path — the same behaviour the source node has. */

import { createHash } from "node:crypto";

/* ── Constants ─────────────────────────────────────────────────────────────── */

export const DEFAULT_TIMEOUT_MS = 600_000;
export const DEFAULT_MAX_OUTPUT_TOKENS = 50_000;

export type OptimizerFormat = "openai" | "responses" | "gemini" | "ollama";

/** Generic LTX-friendly optimization instructions. The source's H3-specific
 *  `<Picture N>` / `<d>` tag guides were replaced by this in the ported node;
 *  we inherit that generic prompt verbatim. */
export const DEFAULT_SYSTEM_PROMPT = `\
You are a prompt optimization assistant for text-to-video generation (LTX and similar models).

Given a user's raw prompt, rewrite it so that it:
1. Adds quality cues: cinematic lighting, natural motion, coherent composition, sharp details.
2. Preserves every creative intent the user expressed — do NOT add unrelated subjects, do NOT remove user elements.
3. Restructures for token efficiency: keep under ~300 words. Prefer concrete visual nouns over abstract adjectives.
4. Ensures temporal coherence: mention camera movement, pacing, or motion explicitly if the user implies them.
5. If the prompt references an image, video, or audio asset by name/tag, keep that reference intact. Never hallucinate details about attached media unless the media's content is explicitly described by the user in text.
6. Output ONLY the rewritten prompt text. No preamble, no explanation, no code fences.

Rewrite rules:
- Keep the user's language (do NOT translate unless asked).
- If dialogue or spoken words appear in the prompt, preserve them verbatim.
- Prefer present-tense, active-voice descriptions.
- Do not invent scene directions the user didn't request.
`;

/* ── URL normalisation (ported) ────────────────────────────────────────────── */

const KNOWN_ENDPOINT_SUFFIXES = [
  "/v1/chat/completions",
  "/chat/completions",
  "/v1/responses",
  "/responses",
];

const GEMINI_ENDPOINT_RE =
  /\/(v1beta|v1)\/models\/[^/?:#]+?:(generateContent|streamGenerateContent)$/i;

function normalizeBaseUrl(apiUrl: string): string {
  const base = String(apiUrl ?? "").trim();
  if (!base) throw new Error("API URL is required");
  const withScheme = /^https?:\/\//i.test(base) ? base : `https://${base}`;
  const parsed = new URL(withScheme);
  // urlunsplit: scheme://netloc + path.rstrip("/") + ?query (no fragment)
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
}

function endpointKind(value: string): "chat" | "responses" | "gemini" | "" {
  let lower = "";
  try {
    lower = new URL(value).pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    lower = String(value ?? "").toLowerCase();
  }
  if (lower.endsWith("/chat/completions")) return "chat";
  if (lower.endsWith("/responses")) return "responses";
  if (GEMINI_ENDPOINT_RE.test(lower)) return "gemini";
  return "";
}

function stripEndpoint(base: string): string {
  const lower = base.toLowerCase();
  for (const suffix of KNOWN_ENDPOINT_SUFFIXES) {
    if (lower.endsWith(suffix)) return base.slice(0, base.length - suffix.length).replace(/\/+$/, "");
  }
  const match = GEMINI_ENDPOINT_RE.exec(lower);
  if (match && lower.endsWith(match[0])) return base.slice(0, match.index).replace(/\/+$/, "");
  return base;
}

function normalizeGeminiModelId(model: string): string {
  let raw = decodeURIComponent(String(model ?? "").trim());
  if (!raw) throw new Error("Model is required");
  if (raw.includes("://")) raw = new URL(raw).pathname;
  raw = raw.split("?")[0].split("#")[0].trim().replace(/^\/+|\/+$/g, "");
  const match = /(?:^|\/)models\/([^/:]+)(?::[A-Za-z]+)?$/i.exec(raw);
  if (match) {
    raw = match[1]!;
  } else {
    if (raw.toLowerCase().startsWith("models/")) raw = raw.slice(7);
    raw = raw.split("/").pop() ?? raw;
    raw = raw.replace(/:(generateContent|streamGenerateContent)$/i, "");
  }
  raw = raw.trim();
  if (!raw) throw new Error("Model is required");
  return raw;
}

function geminiUrlWithQuery(url: string, query: string): string {
  const pairs = new URLSearchParams(query)
  const kept: [string, string][] = [];
  for (const [key, value] of pairs) {
    if (key.toLowerCase() !== "alt") kept.push([key, value]);
  }
  const encoded = new URLSearchParams(kept).toString();
  return url + (encoded ? `?${encoded}` : "");
}

function normalizeGeminiUrl(apiUrl: string, model: string): string {
  const base = normalizeBaseUrl(apiUrl);
  const parsed = new URL(base);
  const clean = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
  const lower = clean.toLowerCase();
  const modelId = encodeURIComponent(normalizeGeminiModelId(model)).replace(/%2D/gi, "-").replace(/%2E/gi, ".").replace(/%5F/gi, "_");

  const endpointMatch = GEMINI_ENDPOINT_RE.exec(lower);
  if (endpointMatch && lower.endsWith(endpointMatch[0])) {
    const version = endpointMatch[1]!;
    const trimmed = clean.slice(0, endpointMatch.index).replace(/\/+$/, "");
    return geminiUrlWithQuery(`${trimmed}/${version}/models/${modelId}:generateContent`, parsed.search.slice(1));
  }
  let url: string;
  if (lower.endsWith("/v1beta/models") || lower.endsWith("/v1/models")) {
    url = `${clean}/${modelId}:generateContent`;
  } else if (lower.endsWith("/v1beta") || lower.endsWith("/v1")) {
    url = `${clean}/models/${modelId}:generateContent`;
  } else if (lower.endsWith("/models")) {
    url = `${clean}/${modelId}:generateContent`;
  } else {
    url = `${clean}/v1beta/models/${modelId}:generateContent`;
  }
  return geminiUrlWithQuery(url, parsed.search.slice(1));
}

export function normalizeUrl(apiUrl: string, apiFormat: OptimizerFormat, model: string): string {
  if (apiFormat === "gemini") return normalizeGeminiUrl(apiUrl, model);
  const base = normalizeBaseUrl(apiUrl);
  const parsed = new URL(base);
  const clean = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
  const endpoint = apiFormat === "responses" ? "/v1/responses" : "/v1/chat/completions";
  const baseKind = endpointKind(clean);
  const endpointKindValue = endpointKind(endpoint);
  if (baseKind === endpointKindValue && baseKind !== "") {
    return clean + (parsed.search ? parsed.search : "");
  }
  let working = stripEndpoint(clean);
  let ep = endpoint;
  if (working.toLowerCase().endsWith("/v1") && ep.toLowerCase().startsWith("/v1/")) ep = ep.slice(3);
  return working + ep + (parsed.search ? parsed.search : "");
}

function normalizeOllamaUnloadUrl(apiUrl: string): string {
  const base = normalizeBaseUrl(apiUrl);
  const parsed = new URL(base);
  let clean = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, "")}`;
  clean = stripEndpoint(clean);
  if (clean.toLowerCase().endsWith("/v1")) clean = clean.slice(0, -3).replace(/\/+$/, "");
  if (clean.toLowerCase().endsWith("/api/generate"))
    clean = clean.slice(0, -"/api/generate".length).replace(/\/+$/, "");
  return clean + "/api/generate" + (parsed.search ? parsed.search : "");
}

/* ── Response parsing helpers (ported) ─────────────────────────────────────── */

function partIsThought(part: unknown): boolean {
  if (!part || typeof part !== "object") return false;
  const p = part as Record<string, unknown>;
  const flag = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    return false;
  };
  if (flag(p["thought"]) || flag(p["is_thought"])) return true;
  const type = String(p["type"] ?? "").trim().toLowerCase();
  if (["reasoning", "thinking", "thought", "summary_text"].includes(type)) return true;
  return flag(p["reasoning"]) || flag(p["thinking"]);
}

function responsesText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  const direct = d["output_text"];
  if (typeof direct === "string" && direct.trim()) return direct;
  const output = d["output"];
  const chunks: string[] = [];
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== "object") continue;
      const it = item as Record<string, unknown>;
      const itemType = String(it["type"] ?? "").toLowerCase();
      if (["reasoning", "thinking", "thought"].includes(itemType)) continue;
      const content = it["content"];
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const pt = part as Record<string, unknown>;
        const partType = String(pt["type"] ?? "").toLowerCase();
        if (["reasoning", "thinking", "thought", "summary_text"].includes(partType)) continue;
        const value = pt["text"];
        if (typeof value === "string") chunks.push(value);
        else if (value && typeof value === "object" && typeof (value as Record<string, unknown>)["value"] === "string")
          chunks.push(String((value as Record<string, unknown>)["value"]));
      }
    }
  }
  if (chunks.length) return chunks.join("");
  const choices = d["choices"];
  if (Array.isArray(choices) && choices.length) {
    const first = choices[0];
    const message = first && typeof first === "object" ? (first as Record<string, unknown>)["message"] : {};
    const content = message && typeof message === "object" ? (message as Record<string, unknown>)["content"] : "";
    if (typeof content === "string") return content;
  }
  return "";
}

function chatContentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const chunks: string[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object" || partIsThought(part)) continue;
    const value = (part as Record<string, unknown>)["text"];
    if (typeof value === "string") chunks.push(value);
  }
  return chunks.join("");
}

/** Strip the thinking block reasoning-capable models often inline. */
export function stripThoughts(text: string): string {
  let out = text.replace(/<\|think\|>[\s\S]*?<\|\/think\|>/g, "");
  out = out.replace(/<think>[\s\S]*?<\/think>/g, "");
  return out.trim();
}

/* ── Core HTTP call (ported) ───────────────────────────────────────────────── */

export interface OptimizerConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  apiFormat: OptimizerFormat;
  systemPrompt: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

async function optimizerHttpJson(config: OptimizerConfig, userPrompt: string): Promise<string> {
  const url = normalizeUrl(config.apiUrl, config.apiFormat, config.model);
  const apiKey = String(config.apiKey ?? "").trim();
  const outputBudget = Math.max(1, Math.trunc(config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS));
  const timeoutMs = Math.max(1, config.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let headers: Record<string, string>;
  let payload: unknown;

  if (config.apiFormat === "gemini") {
    if (!apiKey) throw new Error("API key is required for Gemini native");
    headers = { "Content-Type": "application/json", Accept: "application/json", "x-goog-api-key": apiKey };
    const combined =
      config.systemPrompt +
      "\n\n=== USER PROMPT TO OPTIMIZE ===\n" +
      userPrompt +
      "\n\nFollow the instructions above. Return only the final rewritten prompt.";
    payload = {
      contents: [{ role: "user", parts: [{ text: combined }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: outputBudget },
    };
  } else if (config.apiFormat === "responses") {
    headers = { "Content-Type": "application/json", Accept: "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    payload = {
      model: config.model,
      instructions: config.systemPrompt,
      input: [{ role: "user", content: [{ type: "input_text", text: userPrompt }] }],
      store: false,
      stream: false,
      temperature: 0.35,
      max_output_tokens: outputBudget,
    };
  } else {
    headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    payload = {
      model: config.model,
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      temperature: 0.35,
      max_tokens: outputBudget,
    };
  }

  let data: unknown;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`API error (${response.status}): ${detail.slice(0, 1000)}`);
    }
    data = await response.json();
  } catch (error) {
    throw new Error(`Request failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (config.apiFormat === "ollama") {
      try {
        await fetch(normalizeOllamaUnloadUrl(config.apiUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: config.model, keep_alive: 0 }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        /* best-effort unload — never let it surface as an optimization failure */
      }
    }
  }

  let text: string;
  if (config.apiFormat === "gemini") {
    const candidates = data && typeof data === "object" ? (data as Record<string, unknown>)["candidates"] : undefined;
    if (!Array.isArray(candidates) || !candidates.length) throw new Error("Gemini returned no candidates");
    const candidate = candidates[0];
    const parts =
      candidate && typeof candidate === "object"
        ? ((candidate as Record<string, unknown>)["content"] as Record<string, unknown> | undefined)?.["parts"]
        : undefined;
    text = Array.isArray(parts)
      ? parts
          .filter((p) => p && typeof p === "object" && !partIsThought(p) && (p as Record<string, unknown>)["text"] != null)
          .map((p) => String((p as Record<string, unknown>)["text"] ?? ""))
          .join("")
      : "";
    if (!text.trim()) throw new Error("Gemini returned no text");
  } else if (config.apiFormat === "responses") {
    text = responsesText(data);
  } else {
    const dataObj = data as Record<string, unknown>;
    const choices = Array.isArray(dataObj?.["choices"]) ? (dataObj["choices"] as unknown[]) : [];
    const first = choices[0];
    const message = first && typeof first === "object" ? (first as Record<string, unknown>)["message"] : {};
    const content = message && typeof message === "object" ? (message as Record<string, unknown>)["content"] : "";
    text = chatContentText(content);
  }

  text = stripThoughts(text);
  text = text.replace(/^```(?:text)?\s*/i, "");
  text = text.replace(/\s*```$/, "").trim();
  if (!text) throw new Error("API returned empty response");
  return text;
}

/* ── Idempotency cache ─────────────────────────────────────────────────────── */

const cache = new Map<string, string>();

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function cacheKey(config: OptimizerConfig, prompt: string): string {
  /* Fixed key order (p,u,m,f,s) makes the serialisation deterministic without
     needing sortKeys — the same composite identity the source hashed. */
  const parts = JSON.stringify({
    p: sha256Hex(prompt),
    u: config.apiUrl,
    m: config.model,
    f: config.apiFormat,
    s: sha256Hex(config.systemPrompt),
  });
  return sha256Hex(parts);
}

/* ── Public entry point ────────────────────────────────────────────────────── */

export type OptimizeResult = {
  /** The text to send onward — the rewrite on success, the original on failure. */
  text: string;
  /** True when `text` differs from the input because the LLM rewrote it. */
  changed: boolean;
  /** True when `text` came from the idempotency cache (no HTTP call made). */
  cached: boolean;
  /** Set only when optimization failed; the reason logged for the warning. */
  error?: string;
};

export function resolveOptimizerConfig(overrides: Partial<OptimizerConfig> = {}): OptimizerConfig {
  return {
    apiUrl: overrides.apiUrl ?? process.env.OHPROMPT_API_URL ?? "http://localhost:8081/v1",
    apiKey: overrides.apiKey ?? process.env.OHPROMPT_API_KEY ?? "",
    model: overrides.model ?? process.env.OHPROMPT_MODEL ?? "qwen3.8-flash-next",
    apiFormat: (overrides.apiFormat ??
      (process.env.OHPROMPT_FORMAT as OptimizerFormat | undefined) ??
      "openai") as OptimizerFormat,
    systemPrompt:
      overrides.systemPrompt && overrides.systemPrompt.trim()
        ? overrides.systemPrompt
        : process.env.OHPROMPT_SYSTEM_PROMPT?.trim() || DEFAULT_SYSTEM_PROMPT,
    timeoutMs: overrides.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxOutputTokens: overrides.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  };
}

/** Rewrite a raw prompt via the configured LLM, falling back to the original on
 *  any failure. Disabled or an empty prompt passes straight through untouched. */
export async function optimizePrompt(
  rawPrompt: string,
  options: { enabled?: boolean } & Partial<OptimizerConfig> = {},
): Promise<OptimizeResult> {
  const original = String(rawPrompt ?? "");
  const enabled = options.enabled ?? true;
  if (!enabled || !original.trim()) {
    return { text: original, changed: false, cached: false };
  }

  const config = resolveOptimizerConfig(options);
  const key = cacheKey(config, original);
  const hit = cache.get(key);
  if (hit !== undefined) {
    return { text: hit, changed: true, cached: true };
  }

  try {
    const optimized = await optimizerHttpJson(config, original);
    cache.set(key, optimized);
    return { text: optimized, changed: true, cached: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[prompt-optimize] optimization failed, passing through original: ${message}`);
    return { text: original, changed: false, cached: false, error: message };
  }
}
