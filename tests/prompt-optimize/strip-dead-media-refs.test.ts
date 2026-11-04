/* Unit tests for the opt-in dead-media-ref strip (t_094811e6): the `@동영상N` /
   `@오디오N` handles that bind nothing on a slot-absent lane (Krea 2 imagegen,
   LTX) are dropped before the prompt reaches the text encoder — only when the
   model opts in. Default OFF must leave the stored prompt byte-identical, because
   the same strip on the same seed churns the render (~26 avg / ~90 pixel —
   t_a763a3fe), and removal is noise-cleanup and render-breakage at once.

   Run:  node --experimental-strip-types --import ./tests/prompt-optimize/boot.mjs \
           --test tests/prompt-optimize/strip-dead-media-refs.test.ts

   Coverage of the acceptance criteria (draft):
     (1) ON vs OFF is distinguishable on the same plane — the krea2 body carries
         the handles with the flag unset and drops them once it is set;
     (2) OFF is byte-identical passthrough on every lane, including lanes that
         carry handles — the renderer determinism half of this criterion was
         proven live by t_a763a3fe (same-seed reproduction 0.0 / max 0); what is
         proven HERE is that the mapper's OFF path returns the plane's own string
         unchanged, so that proof applies;
     (3) zero injection: after an ON strip no video/audio handle substring
         survives to reach the tokenizer (the live Krea2Tokenizer re-measure of
         the WITH 80 / WITHOUT 65 segment baseline is a server-side run, not
         something this file can execute; the substring guarantee below is the
         mapper-side half of the criterion).

   Scaffold words are left standing on purpose — the handle is the unit the card
   scopes, and "texture like / rhythm of" removal was measured as a larger churn
   with the scaffold itself driving most of the difference (t_a763a3fe). */
import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./repo-resolve-hook.mjs", pathToFileURL(import.meta.dirname + "/"));

const { toPlatform } = await import("@/generation/to-platform");
const { getModel } = await import("@/generation/catalog");
const { krea2Turbo } = await import("@/generation/catalog/krea-2-turbo");
const { minimaxH3Local } = await import("@/generation/catalog/local-video");

const DEAD_SENTENCE = "A film still with texture like @동영상1, rhythm of @오디오1.";

type MediaItem = { id: string; url: string; role: "start" | "end" | "reference" | "video" | "audio" };

const START: MediaItem = { id: "s1", url: "https://files.test/start.png", role: "start" };
const VIDEO: MediaItem = { id: "v1", url: "https://files.test/clip.mp4", role: "video" };

function plane(
  model: string,
  text: string,
  media: Partial<Record<MediaItem["role"], MediaItem[]>> = {},
  tray?: MediaItem[],
) {
  return {
    model,
    prompt: { text },
    media,
    ...(tray ? { tray } : {}),
    settings: {},
  };
}

describe("default OFF — byte-identical passthrough", () => {
  test("krea2 body carries the prompt untouched while the flag is unset", () => {
    assert.equal(krea2Turbo.stripDeadMediaRefs, undefined); // the shipped default
    const mapped = toPlatform(plane("krea-2-turbo", DEAD_SENTENCE));
    assert.equal(mapped.body.prompt, DEAD_SENTENCE);
  });

  test("LTX body carries the prompt untouched while the flag is unset", () => {
    const mapped = toPlatform(plane("ltx-2.5-local", DEAD_SENTENCE, { start: [START] }, [START]));
    assert.equal(mapped.body.prompt, DEAD_SENTENCE);
  });

  test("H3 body keeps the audio literal untouched while the flag is unset", () => {
    const mapped = toPlatform(
      plane("minimax-h3-local", DEAD_SENTENCE, { reference: [START], video: [VIDEO] }),
    );
    assert.ok(String(mapped.body.prompt).includes("@오디오1"));
  });
});

describe("opt-in ON — the strip does what the card scoped", () => {
  test("krea2 ON drops both handles, keeps scaffold and particles", () => {
    krea2Turbo.stripDeadMediaRefs = true;
    try {
      const mapped = toPlatform(plane("krea-2-turbo", DEAD_SENTENCE));
      const out = String(mapped.body.prompt);
      assert.ok(!out.includes("@동영상"), "video handle must not reach the encoder");
      assert.ok(!out.includes("@오디오"), "audio handle must not reach the encoder");
      assert.ok(out.includes("texture like"), "scaffold left standing (handle-only strip)");
      assert.ok(out.includes("rhythm of"), "scaffold left standing (handle-only strip)");
      assert.ok(out.includes("A film still"), "the real words survive");
    } finally {
      krea2Turbo.stripDeadMediaRefs = undefined;
    }
  });

  test("particle after the handle survives the removal", () => {
    krea2Turbo.stripDeadMediaRefs = true;
    try {
      const text = " @동영상1가 화면을 가린다 ";
      const out = String(toPlatform(plane("krea-2-turbo", text)).body.prompt);
      assert.ok(out.includes("가 화면을 가린다"), "the particle and the clause outside the token stay");
      assert.ok(!out.includes("@동영상"));
    } finally {
      krea2Turbo.stripDeadMediaRefs = undefined;
    }
  });

  test("image handles are out of scope — krea2 ON leaves them alone", () => {
    krea2Turbo.stripDeadMediaRefs = true;
    try {
      const text = "@이미지1과 @image 2와 @img3, @동영상1과 @audio 1";
      const out = String(toPlatform(plane("krea-2-turbo", text)).body.prompt);
      assert.ok(out.includes("@이미지1"), "image handle untouched (krea2 style refs bind by URL)");
      assert.ok(out.includes("@image 2"));
      assert.ok(out.includes("@img3"));
      assert.ok(!out.includes("@동영상"), "video handle gone");
      assert.ok(!out.includes("@audio"), "English audio alias caught too");
    } finally {
      krea2Turbo.stripDeadMediaRefs = undefined;
    }
  });

  test("the resolver's video aliases are all caught (mirror of _VIDEO_TOKEN_ALIASES)", () => {
    krea2Turbo.stripDeadMediaRefs = true;
    try {
      const text = "@video 2 @Video 2 @vid 2 @동영상2";
      const out = String(toPlatform(plane("krea-2-turbo", text)).body.prompt);
      assert.ok(!out.includes("@video") && !out.includes("@Video") && !out.includes("@vid") && !out.includes("@동영상"));
    } finally {
      krea2Turbo.stripDeadMediaRefs = undefined;
    }
  });

  test("LTX ON strips the handles after the image rewrite has run", () => {
    const ltx = getModel("ltx-2.5-local");
    ltx.stripDeadMediaRefs = true;
    try {
      const text = "@이미지1의 결, @동영상1의 리듬, @오디오1의 박자";
      const out = String(
        toPlatform(plane("ltx-2.5-local", text, { start: [START] }, [START])).body.prompt,
      );
      assert.ok(out.includes("@이미지1"), "the anchor token keeps its slot coordinate (t_277eac4f)");
      assert.ok(!out.includes("@동영상") && !out.includes("@오디오"), "handles gone");
      assert.ok(out.includes("의 결") && out.includes("의 리듬") && out.includes("의 박자"), "particles survive");
    } finally {
      ltx.stripDeadMediaRefs = undefined;
    }
  });

  test("H3 is never stripped — the lane has slots, and audio's literal is the honest carrier", () => {
    minimaxH3Local.stripDeadMediaRefs = true; // even a flag set here must not fire
    try {
      const mapped = toPlatform(
        plane("minimax-h3-local", DEAD_SENTENCE, { reference: [START], video: [VIDEO] }),
      );
      assert.ok(
        String(mapped.body.prompt).includes("@오디오1"),
        "audio stays literal on the slotted lane (resolver keeps it)",
      );
    } finally {
      minimaxH3Local.stripDeadMediaRefs = undefined;
    }
  });

  test("ON with no handle in the prompt returns the string unchanged", () => {
    krea2Turbo.stripDeadMediaRefs = true;
    try {
      const text = "  plain prompt with CRLF\r\nand trailing spaces   ";
      const out = String(toPlatform(plane("krea-2-turbo", text)).body.prompt);
      assert.equal(out, text);
    } finally {
      krea2Turbo.stripDeadMediaRefs = undefined;
    }
  });
});
