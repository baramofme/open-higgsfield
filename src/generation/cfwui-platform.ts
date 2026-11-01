import { PlatformError } from "./platform";
import type { GenerationStatus, QueuedGeneration } from "./platform";

/**
 * cfwui (comfy-webui) transport — speaks Gradio's queue REST instead of the
 * Higgsfield platform contract. Same surface as createPlatformClient:
 * submit(toolName, params) / status(requestId).
 *
 * Protocol (verified live on comfy-webui :7861):
 *   POST {base}/gradio_api/call/{api_name}  {"data":[arg,...]}  -> {"event_id":...}
 *   GET  {base}/gradio_api/call/{api_name}/{event_id}           -> SSE stream;
 *        "event: complete" carries the return values as a JSON array
 *        (proper JSON, unlike the MCP text channel's Python repr).
 */

export type CfwuiClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export function createCfwuiClient(options: CfwuiClientOptions) {
  const base = options.baseUrl.replace(/\/$/, "");
  const origin = new URL(base).origin;
  const fetchImpl = options.fetch ?? fetch;

  async function callTool(apiName: string, args: unknown[]): Promise<unknown> {
    const startUrl = `${base}/gradio_api/call/${apiName}`;
    console.info("[cfwui] call", { apiName });
    const start = await fetchImpl(startUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: args }),
    });
    if (!start.ok) throw new PlatformError(start.status, await readBody(start));

    const eventId = stringField(asRecord(await readJson(start)), "event_id");
    if (!eventId) throw new PlatformError(502, { detail: "cfwui call returned no event_id" });

    const streamUrl = `${base}/gradio_api/call/${apiName}/${eventId}`;
    const stream = await fetchImpl(streamUrl);
    if (!stream.ok) throw new PlatformError(stream.status, await readBody(stream));
    return parseComplete(await stream.text(), apiName);
  }

  return {
    /** `tool` is the cfwui api_name (e.g. "ImageGen_run_imagegen"); `params` is
     * the semantic-API json_params object. */
    async submit(tool: string, params: Record<string, unknown>): Promise<QueuedGeneration> {
      const ret = asRecord(await callTool(tool, [params]));
      if (ret.error) throw new PlatformError(400, ret);
      const requestId = stringField(ret, "task_id");
      if (!requestId) throw new PlatformError(502, { detail: "cfwui run returned no task_id" });
      return {
        status: stringField(ret, "status") ?? "queued",
        requestId,
        statusUrl: "",
        cancelUrl: "",
      };
    },

    /** Audio is a plain synchronous gradio api: `apiName` is e.g.
     * "AudioGen_MiniMax_Music_3" and `args` are its positional arguments. The
     * call returns the generated file's URL on the stream's `event: complete`;
     * there is no task id to poll, so the transport opens the stream and reads it
     * to completion right here. The submit is that stream's only reader, attached
     * at t=0, so the complete is captured reliably — a reconnect after the job
     * finishes replays only heartbeats, never its complete (measured against the
     * live backend). The finished URL travels inside an `audio:done:` request id
     * so the poll's first status resolves the run instantly. */
    async submitAudio(apiName: string, args: unknown[]): Promise<QueuedGeneration> {
      const startUrl = `${base}/gradio_api/call/${apiName}`;
      console.info("[cfwui] audio call", { apiName });
      const start = await fetchImpl(startUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: args }),
      });
      if (!start.ok) throw new PlatformError(start.status, await readBody(start));
      const eventId = stringField(asRecord(await readJson(start)), "event_id");
      if (!eventId) throw new PlatformError(502, { detail: "cfwui audio call returned no event_id" });
      const stream = await fetchImpl(`${base}/gradio_api/call/${apiName}/${eventId}`);
      if (!stream.ok) throw new PlatformError(stream.status, await readBody(stream));
      const url = audioUrlFromComplete(await stream.text(), apiName);
      return {
        status: "completed",
        requestId: `audio:done:${encodeURIComponent(rewriteFileUrl(url, origin))}`,
        statusUrl: "",
        cancelUrl: "",
      };
    },

    async status(requestId: string): Promise<GenerationStatus> {
      if (!requestId) throw new PlatformError(400, { detail: "Missing request id" });
      /* A finished audio run already holds its result inside the request id the
         submit minted — there is nothing left to ask the backend for. Decode the
         stored URL and report the run completed so the poll resolves on its first
         tick, handing the mp3 to the absorption path like any other output. */
      if (requestId.startsWith("audio:done:")) {
        const url = decodeURIComponent(requestId.slice("audio:done:".length));
        return { status: "completed", requestId, images: [{ url }] };
      }
      const ret = asRecord(await callTool(statusApiFor(requestId), [requestId]));
      const status = stringField(ret, "status");
      if (!status) {
        if (ret.error) throw new PlatformError(404, ret);
        throw new PlatformError(502, ret);
      }
      const result = asRecord(ret.result);
      const rawImages = Array.isArray(result.images) ? result.images : [];
      const images = rawImages.flatMap((item) =>
        typeof item === "string" ? [{ url: rewriteFileUrl(item, origin) }] : [],
      );
      /* The video modules hand back a single mp4 url instead of an image list,
         so a finished task with no images still carries its output as a URL.
         Prefer the explicit video_url field when present (avoids first-pick
         of an input echo); fall back to regex-scan only if absent. */
      const media = images.length
        ? images
        : (() => {
            const explicit = stringField(result, "video_url");
            if (explicit && explicit.includes(".mp4")) return [{ url: rewriteFileUrl(explicit, origin) }];
            const url = findMediaUrl(ret);
            return url ? [{ url: rewriteFileUrl(url, origin) }] : [];
          })();
      return {
        status,
        requestId: stringField(ret, "task_id") ?? requestId,
        ...(media.length ? { images: media } : {}),
        ...(ret.error !== undefined ? { error: ret.error } : {}),
      };
    },
  };
}

/** Output URLs come back rooted at the Gradio bind address (often
 * http://0.0.0.0:7861). Keep the path, swap the host for ours. */
function rewriteFileUrl(url: string, origin: string): string {
  try {
    const parsed = new URL(url);
    return `${origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/** Which status endpoint answers for a given task id, routed by its family
 *  prefix so the video modules poll their own status, not the image one. */
function statusApiFor(requestId: string): string {
  if (requestId.startsWith("ltx2_5_task")) return "VideoGen_LTX_2_5_get_task_status";
  if (requestId.startsWith("h3_task")) return "VideoGen_H3_get_task_status";
  return "ImageGen_get_task_status";
}

/** A finished run's media URL, recovered by scanning the returned record for a
 *  file when the module gives back no explicit image list. */
function findMediaUrl(obj: unknown): string | undefined {
  try {
    const m = JSON.stringify(obj).match(/https?:\/\/[^"\\]+?\.(?:png|mp4|webm|mov)/);
    return m ? m[0] : undefined;
  } catch {
    return undefined;
  }
}

/** The audio stream's `event: complete` carries the generated file URL as a JSON
 *  array (`[url]`); recover it. A failure that arrives as `event: error` with no
 *  usable message — the opaque `{"error":null}` that used to leave the run card
 *  silent — is surfaced as an actionable reason via `audioFailure`; a stream that
 *  ends without ever completing is reported as a backend that produced nothing.
 *  This is the silent-fail fix for the audio plane. */
function audioUrlFromComplete(text: string, apiName: string): string {
  let event = "";
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (event === "complete") {
      let url: unknown;
      try {
        const parsed = JSON.parse(payload) as unknown;
        url = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        throw new PlatformError(502, { detail: audioFailure(apiName, "unparseable complete payload") });
      }
      if (typeof url === "string" && url) return url;
      throw new PlatformError(502, { detail: audioFailure(apiName, "no audio URL in the complete payload") });
    } else if (event === "error") {
      throw new PlatformError(400, { detail: audioFailure(apiName, payload) });
    }
  }
  throw new PlatformError(502, {
    detail: audioFailure(apiName, "the stream ended without a complete event"),
  });
}

/** Turn whatever the audio endpoint reported into one actionable sentence. The
 *  gradio error payload is routinely `{"error": null}` with the real reason lost,
 *  so when nothing usable is present we fall back to a clear message that names
 *  the likely causes and tells the visitor what to check next. */
function audioFailure(apiName: string, raw: unknown): string {
  const record = asRecord(raw);
  const detail = record.detail ?? record.error ?? record.message;
  const text = typeof raw === "string" ? raw : typeof detail === "string" ? detail : "";
  const usable =
    text.length > 0 &&
    text !== "null" &&
    text !== "{}" &&
    !text.includes('"error":null') &&
    !text.includes('"error": null');
  if (usable) return `Audio generation failed — ${text}`;
  return `Audio generation failed (${apiName}) and the backend reported no reason. Check the caption and the steps/duration range, then try again; if it keeps failing, the audio model files or the ComfyUI backend may be unavailable.`;
}

function parseComplete(text: string, apiName: string): unknown {
  let event = "";
  let value: unknown;
  let failure: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (event === "complete") {
      try {
        const parsed = JSON.parse(payload) as unknown;
        value = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        failure = `cfwui ${apiName}: unparseable complete payload`;
      }
    } else if (event === "error") {
      failure = payload || "cfwui stream error";
    }
  }
  if (failure) throw new Error(failure);
  if (value === undefined) throw new Error(`cfwui ${apiName}: stream ended without a complete event`);
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
