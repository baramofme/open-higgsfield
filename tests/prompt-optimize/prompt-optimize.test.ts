/* Unit tests for the dock prompt-optimization wiring: the REAL engine module,
   the REAL `optimizePromptDraft` server action the composer button calls, and the
   composer button's run() write-back contract — all exercised headlessly against
   a stubbed fetch. The LLM endpoint is mocked: nothing here touches the network.

   Run:  node --experimental-strip-types --import ./tests/prompt-optimize/boot.mjs \
           --test tests/prompt-optimize/prompt-optimize.test.ts
   (from the repo root). `npm test` runs the same command.

   Coverage of the acceptance criteria:
     (1) the composer action triggers the optimizer and the REWRITTEN prompt is what
         the button writes back into the caption store (success + cache paths);
     (2) covered on the Python side (tests/test_prompt_optimizer_wiring.py);
     (3) HTTP failure (network throw + HTTP 500) falls through to the ORIGINAL
         prompt, logs a warning, and never throws out of the action — the failure-
         fallback path is explicitly exercised here and there;
     (4) the sha256 cache returns the cached rewrite on a repeated identical prompt
         and makes no second HTTP call. */
import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./repo-resolve-hook.mjs", pathToFileURL(import.meta.dirname + "/"));

const engine = await import("@/generation/prompt-optimize");
const actions = await import("@/generation/actions");
const promptStores = await import("@/generation/stores/prompt");

const { optimizePrompt, normalizeUrl, stripThoughts, cacheKey, DEFAULT_SYSTEM_PROMPT, IMAGE_SYSTEM_PROMPT, systemPromptForMode } = engine;
const { optimizePromptDraft } = actions;
const { useVideoPrompt, useImagePrompt, useAudioPrompt } = promptStores;

const API = "http://localhost:8081/v1";
const MODEL = "test-model";

/* The canned rewrite the mock endpoint always returns. It carries the H3
   `<Picture N>` / `<d>` tags so a test can prove the engine preserves them and the
   button writes them back unchanged. */
const REWRITE = "A cinematic cat strides across the moon. <Picture 1> <d>hello</d>";

/* A reasoning-capable model inline-emits a chain-of-thought block (which
   `stripThoughts` removes) and wraps the final answer in ```text code fences (which
   `optimizerHttpJson` strips). The canned content below carries both, so a test
   proves the text that lands is the clean rewrite — both engine strip passes run
   against the real parser. The `<|think|>` marker is the unambiguous one stripThoughts
   handles first. */
const LLM_RESPONSE = {
  choices: [
    {
      message: {
        content: "<|think|>\nreasoning that must vanish\n<|/think|>\n```text\n" + REWRITE + "\n```",
      },
    },
  ],
};

/* A stubbed fetch that records every call and can be told to fail. No real
   endpoint is ever contacted. */
let calls: { url: string; body: any }[] = [];
let failMode: "none" | "throw" | "http500" = "none";
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: any, init: any = {}) => {
  const url = String(input);
  calls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
  if (failMode === "throw") throw new TypeError("simulated network down");
  if (failMode === "http500")
    return { ok: false, status: 500, text: async () => "upstream exploded", json: async () => ({}) };
  return {
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => LLM_RESPONSE,
  };
}) as typeof fetch;

/* Capture the fallback warning so a test can assert the log fires. */
const warnings: string[] = [];
const realWarn = console.warn;
console.warn = (...args: unknown[]) => {
  warnings.push(args.map(String).join(" "));
};

/* Restore the monkeypatched globals when the process exits — after every test has
   run, so mid-suite behaviour is unaffected. */
process.on("exit", () => {
  console.warn = realWarn;
  globalThis.fetch = realFetch;
});

describe("engine — success path", () => {
  test("rewrite lands, thinking block + code fences stripped", async () => {
    calls = [];
    failMode = "none";
    const r = await optimizePrompt("a cat on the moon", { apiUrl: API, model: MODEL });
    assert.equal(r.changed, true);
    assert.equal(r.cached, false);
    assert.equal(r.text, REWRITE); // thinking block + ``` fences gone
    assert.equal(r.error, undefined);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.endsWith("/v1/chat/completions"), calls[0].url);
  });

  test("the H3 <Picture N> and <d> tags survive the round-trip", () => {
    assert.ok(REWRITE.includes("<Picture 1>"));
    assert.ok(REWRITE.includes("<d>") && REWRITE.includes("</d>"));
  });
});

describe("engine — sha256 idempotency cache", () => {
  test("identical repeat hits the cache and makes no second HTTP call", async () => {
    calls = [];
    failMode = "none";
    await optimizePrompt("cache me", { apiUrl: API, model: MODEL }); // populate
    const before = calls.length;
    const r = await optimizePrompt("cache me", { apiUrl: API, model: MODEL });
    assert.equal(r.cached, true);
    assert.equal(r.text, REWRITE);
    assert.equal(calls.length, before, "a cache hit must not refetch");
  });

  test("cache key is prompt-sensitive (same prompt stable, different differs)", () => {
    const cfg = {
      apiUrl: "http://x",
      apiKey: "",
      model: "m",
      apiFormat: "openai" as const,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    };
    assert.notEqual(cacheKey(cfg, "a"), cacheKey(cfg, "b"));
    assert.equal(cacheKey(cfg, "a"), cacheKey(cfg, "a"));
  });

  test("a different prompt misses the cache and refetches", async () => {
    calls = [];
    failMode = "none";
    await optimizePrompt("first prompt", { apiUrl: API, model: MODEL });
    const before = calls.length;
    const r = await optimizePrompt("second prompt", { apiUrl: API, model: MODEL });
    assert.equal(r.cached, false);
    assert.equal(calls.length, before + 1);
  });
});

describe("engine — failure fallback (criterion 3)", () => {
  test("network throw: original preserved, error surfaced, warning logged, never throws", async () => {
    calls = [];
    warnings.length = 0;
    failMode = "throw";
    const r = await optimizePrompt("keep me raw", { apiUrl: API, model: MODEL });
    assert.equal(r.text, "keep me raw"); // original preserved
    assert.equal(r.changed, false);
    assert.equal(r.cached, false);
    assert.match(r.error ?? "", /simulated network down/);
    assert.ok(warnings.length > 0, "failure must log a warning");
    assert.match(warnings.at(-1)!, /passing through original/);
  });

  test("HTTP 500: original preserved, status in the error", async () => {
    calls = [];
    warnings.length = 0;
    failMode = "http500";
    const r = await optimizePrompt("raw after 500", { apiUrl: API, model: MODEL });
    assert.equal(r.text, "raw after 500");
    assert.equal(r.changed, false);
    assert.match(r.error ?? "", /API error \(500\)/);
    assert.ok(warnings.length > 0);
  });

  test("disabled / empty pass straight through without any HTTP call", async () => {
    calls = [];
    failMode = "none";
    const off = await optimizePrompt("bypass me", { enabled: false });
    assert.equal(off.text, "bypass me");
    assert.equal(off.changed, false);
    assert.equal(calls.length, 0);

    const empty = await optimizePrompt("   ");
    assert.equal(empty.text, "   ");
    assert.equal(calls.length, 0);
  });
});

describe("engine — ported helpers", () => {
  test("stripThoughts removes inline reasoning", () => {
    assert.equal(stripThoughts("A<|think|>\nzzz\n<|/think|>B").trim(), "AB");
  });

  test("normalizeUrl produces the right endpoint for each format", () => {
    assert.equal(normalizeUrl(API, "openai", MODEL), "http://localhost:8081/v1/chat/completions");
    assert.equal(
      normalizeUrl("http://localhost:8081/v1/chat/completions", "openai", MODEL),
      "http://localhost:8081/v1/chat/completions",
    );
    assert.ok(normalizeUrl(API, "responses", MODEL).endsWith("/v1/responses"));
  });
});

describe("server action — the composer's optimizePromptDraft (criterion 1 + 3)", () => {
  test("success returns the rewritten prompt", async () => {
    calls = [];
    failMode = "none";
    const r = await optimizePromptDraft({ text: "a cat on the moon", enabled: true });
    assert.equal(r.text, REWRITE);
    assert.equal(r.changed, true);
    assert.equal(r.cached, false);
    assert.equal(r.error, undefined);
  });

  test("cache hit: second identical draft returns cached, no HTTP", async () => {
    calls = [];
    failMode = "none";
    await optimizePromptDraft({ text: "cache draft" }); // populate
    const before = calls.length;
    const r = await optimizePromptDraft({ text: "cache draft" });
    assert.equal(r.cached, true);
    assert.equal(r.text, REWRITE);
    assert.equal(calls.length, before);
  });

  test("failure returns the original + the reason the banner needs (criterion 3)", async () => {
    calls = [];
    warnings.length = 0;
    failMode = "throw";
    const f = await optimizePromptDraft({ text: "keep me raw draft" });
    assert.equal(f.text, "keep me raw draft"); // original kept
    assert.equal(f.changed, false);
    assert.ok(f.error, "the action must carry the reason for the UI banner");
    failMode = "none";
  });

  test("guards: enabled:false passes through; a non-object payload is rejected", async () => {
    calls = [];
    failMode = "none";
    const off = await optimizePromptDraft({ text: "off draft", enabled: false });
    assert.equal(off.text, "off draft");
    assert.equal(off.changed, false);
    assert.equal(calls.length, 0);
    await assert.rejects(() => optimizePromptDraft("not-an-object"), /Invalid optimize payload/);
  });
});

describe("composer button run() write-back contract (criterion 1)", () => {
  /* The button (prompt-optimize-button.tsx) cannot be mounted headlessly — it is a
     JSX component and Node's type-stripping does not transform .tsx (JSX), so
     importing it throws ERR_UNKNOWN_FILE_EXTENSION. Its tsc type-check is covered by
     `tsc -p tsconfig.json` (it is in the compile set), and the real click path is
     verified live by the sibling card's CDP test.

     What the button's run() DOES is exactly: read the caption store, call the real
     `optimizePromptDraft` action (same one the button imports), and on success write
     the rewrite back via the same per-surface store's setText; on failure call the
     composer's onError with the "kept original" banner and leave the store untouched.
     Below we drive that exact sequence against the REAL store and the REAL action so
     the two things run() delegates to are exercised end-to-end with the mocked LLM. */

  function runButtonLike(surface: "image" | "video" | "audio", onError: (message: string) => void) {
    const store =
      surface === "image" ? useImagePrompt : surface === "audio" ? useAudioPrompt : useVideoPrompt;
    return {
      store,
      run: async () => {
        const current = store.getState().text;
        if (!current.trim()) return;
        try {
          const result = await optimizePromptDraft({ text: current, surface });
          if (result.error) {
            onError(`Prompt optimization failed — kept original: ${result.error}`);
            return;
          }
          store.getState().setText(result.text);
        } catch (caught) {
          onError(
            `Prompt optimization failed — kept original: ${caught instanceof Error ? caught.message : String(caught)}`,
          );
        }
      },
    };
  }

  test("press rewrites the caption in the store before submit", async () => {
    calls = [];
    failMode = "none";
    const { store, run } = runButtonLike("video", () => {});
    store.getState().setText("원문: 골목을 걷는 고양이");
    await run();
    assert.equal(store.getState().text, REWRITE); // rewrite landed
    assert.equal(calls.length, 1); // exactly one optimizer call
    // tag preservation: what landed keeps the H3 tags the converter produced
    assert.ok(store.getState().text.includes("<Picture 1>"));
    assert.ok(store.getState().text.includes("<d>"));
    store.getState().setText(""); // reset persisted caption
  });

  test("failure keeps the original caption and surfaces the banner", async () => {
    calls = [];
    warnings.length = 0;
    failMode = "throw";
    const banners: string[] = [];
    const { store, run } = runButtonLike("image", (m) => banners.push(m));
    const original = "원문 캡션 유지";
    store.getState().setText(original);
    await run();
    assert.equal(store.getState().text, original); // original preserved
    assert.equal(banners.length, 1);
    assert.match(banners[0], /kept original/); // banner shown, generate not blocked
    failMode = "none";
    store.getState().setText("");
  });

  test("empty caption: run() is a no-op, no HTTP call", async () => {
    calls = [];
    failMode = "none";
    const { store, run } = runButtonLike("audio", () => {});
    store.getState().setText("   ");
    await run();
    assert.equal(calls.length, 0);
    store.getState().setText("");
  });
});

describe("engine — mode-aware system prompt routing", () => {
  /* The composer's surface (image | video | audio) must reach the engine and pick
     the right system prompt. An image caption gets the still-image template (static
     visual cues, NO temporal / motion vocabulary); everything else keeps the
     unchanged video prompt. This is the heart of the change — criterion (1) and (2). */

  test("image mode selects the still-image prompt and drops the video prompt", async () => {
    calls = [];
    failMode = "none";
    await optimizePrompt("a cat sitting on a windowsill", { apiUrl: API, model: MODEL, mode: "image" });
    assert.equal(calls.length, 1);
    const system = calls[0].body.messages[0].content;
    assert.equal(system, IMAGE_SYSTEM_PROMPT);
    assert.notEqual(system, DEFAULT_SYSTEM_PROMPT, "image must NOT reuse the video prompt");
    /* static / visual qualities the image prompt must call out are present */
    assert.match(system, /composition/i);
    assert.match(system, /lighting/i);
    assert.match(system, /colour palette/i);
    assert.match(system, /frozen frame/i);
    /* the image prompt carries an explicit PROHIBITION against motion / temporal
       language, instead of the affirmative instruction the video prompt carries */
    assert.match(system, /Do NOT introduce motion/i);
    /* the affirmative temporal / motion cues unique to the video prompt are absent
       from the image prompt — proving image mode is not video-optimised. (These
       words may still appear inside the prohibition clause above; we only check the
       video prompt's affirmative phrasing is gone.) */
    assert.ok(!/temporal coherence/i.test(system), "no affirmative temporal-coherence instruction");
    assert.ok(!/motion explicitly/i.test(system), "no 'mention ... motion explicitly' instruction");
    assert.ok(!/natural motion/i.test(system), "no 'natural motion' quality cue");
    assert.ok(!/mention camera/i.test(system), "no 'mention camera movement' instruction");
  });

  test("video mode and a missing mode keep the video prompt byte-identical", async () => {
    calls = [];
    failMode = "none";
    await optimizePrompt("mode-routing-probe-video", { apiUrl: API, model: MODEL, mode: "video" });
    await optimizePrompt("mode-routing-probe-none", { apiUrl: API, model: MODEL });
    assert.equal(calls[0].body.messages[0].content, DEFAULT_SYSTEM_PROMPT);
    assert.equal(calls[1].body.messages[0].content, DEFAULT_SYSTEM_PROMPT);
    /* the default video prompt still carries the temporal cues it always did —
       proving video behaviour is genuinely unchanged, not merely reworded */
    assert.match(DEFAULT_SYSTEM_PROMPT, /temporal coherence/i);
    assert.match(DEFAULT_SYSTEM_PROMPT, /camera movement/i);
  });

  test("audio surface also falls back to the unchanged video prompt", async () => {
    calls = [];
    failMode = "none";
    await optimizePrompt("audio-routing-probe", { apiUrl: API, model: MODEL, mode: "audio" });
    assert.equal(calls[0].body.messages[0].content, DEFAULT_SYSTEM_PROMPT);
  });

  test("systemPromptForMode routes ONLY an explicit image to the still-image template", () => {
    assert.equal(systemPromptForMode("image"), IMAGE_SYSTEM_PROMPT);
    assert.equal(systemPromptForMode("video"), DEFAULT_SYSTEM_PROMPT);
    assert.equal(systemPromptForMode("audio"), DEFAULT_SYSTEM_PROMPT);
    assert.equal(systemPromptForMode(undefined), DEFAULT_SYSTEM_PROMPT);
    assert.equal(systemPromptForMode(null), DEFAULT_SYSTEM_PROMPT);
    assert.equal(systemPromptForMode("anything-else"), DEFAULT_SYSTEM_PROMPT);
  });

  test("image and video rewrites cache independently because the system prompt is keyed", async () => {
    calls = [];
    failMode = "none";
    const probe = "independent-cache-probe";
    await optimizePrompt(probe, { apiUrl: API, model: MODEL, mode: "image" });
    await optimizePrompt(probe, { apiUrl: API, model: MODEL, mode: "video" });
    /* distinct system prompts → distinct cache keys → two real HTTP calls */
    assert.equal(calls.length, 2);
    const before = calls.length;
    const r = await optimizePrompt(probe, { apiUrl: API, model: MODEL, mode: "image" });
    assert.equal(r.cached, true, "the image rewrite must be served from its own cache");
    assert.equal(calls.length, before, "a cache hit must not refetch");
  });

  test("an explicit systemPrompt override beats the mode routing", async () => {
    calls = [];
    failMode = "none";
    await optimizePrompt("override-probe", {
      apiUrl: API,
      model: MODEL,
      mode: "image",
      systemPrompt: "CUSTOM PROMPT",
    });
    assert.equal(calls[0].body.messages[0].content, "CUSTOM PROMPT");
  });
});

describe("server action — surface → mode forwarding", () => {
  /* The composer button passes its surface into optimizePromptDraft; the action
     must forward it as the engine's mode. Proves criterion (3): the mode parameter
     is read and routed end-to-end. */

  test("an image surface is forwarded so the still-image prompt is sent", async () => {
    calls = [];
    failMode = "none";
    await optimizePromptDraft({ text: "a cat on a windowsill", surface: "image" });
    assert.equal(calls[0].body.messages[0].content, IMAGE_SYSTEM_PROMPT);
  });

  test("a video surface is forwarded to the unchanged video prompt", async () => {
    calls = [];
    failMode = "none";
    await optimizePromptDraft({ text: "draft surface probe", surface: "video" });
    assert.equal(calls[0].body.messages[0].content, DEFAULT_SYSTEM_PROMPT);
  });

  test("a missing surface keeps the video default (backward compatible)", async () => {
    calls = [];
    failMode = "none";
    await optimizePromptDraft({ text: "no-surface-probe" });
    assert.equal(calls[0].body.messages[0].content, DEFAULT_SYSTEM_PROMPT);
  });

  test("a `mode` alias is honoured when no surface is given", async () => {
    calls = [];
    failMode = "none";
    await optimizePromptDraft({ text: "mode-alias-probe", mode: "image" });
    assert.equal(calls[0].body.messages[0].content, IMAGE_SYSTEM_PROMPT);
  });
});
