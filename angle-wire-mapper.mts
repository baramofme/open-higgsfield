import "./src/generation/camera-angle"; // module-load registers the feature
import { toPlatform } from "./src/generation/to-platform";
import { usePromptTokens, mergePromptWithTokens } from "./src/generation/prompt-registry";

function mk(promptText: string): any {
  return {
    model: "krea-2-turbo",
    prompt: { text: promptText },
    settings: {
      resolution: "1k",
      aspectRatio: "1:1",
      steps: 8,
      cfg: 1.0,
      sampler: "euler",
      scheduler: "simple",
      batchSize: 1,
    },
    media: {},
    studio: "cinema",
  };
}

const BASE = "A cinematic photograph of a woman with long brown hair in a sunlit studio";
let fail = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { fail++; console.log("FAIL:", msg); } else { console.log("PASS:", msg); }
}

// 1. Nothing selected -> "auto" -> the caption stays exactly as typed.
usePromptTokens.getState().reset();
const autoText = mergePromptWithTokens(BASE, "image");
assert(autoText === BASE, "empty token set leaves the base caption untouched");
assert(toPlatform(mk(autoText)).body.prompt === BASE, "auto run sends the base prompt verbatim");

// 2. A single-axis selection reaches the body.
usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "view", "front view");
const oneText = mergePromptWithTokens(BASE, "image");
assert(oneText.includes("front view"), "selected view token joins the composed prompt");
assert(toPlatform(mk(oneText)).body.prompt.includes("front view"), "selected view token reaches krea2 body.prompt");

// 3. Full 3-axis selection in canonical axis order view -> elevation -> distance.
usePromptTokens.getState().reset();
// select out of order on purpose: composition must be declaration order, not click order
usePromptTokens.getState().select("camera-angle", "distance", "close-up");
usePromptTokens.getState().select("camera-angle", "view", "back view");
usePromptTokens.getState().select("camera-angle", "elevation", "high-angle shot");
const fullText = mergePromptWithTokens(BASE, "image");
console.log("FULL_PROMPT:", JSON.stringify(fullText));
assert(fullText.includes("back view"), "view token present");
assert(fullText.includes("high-angle shot"), "elevation token present");
assert(fullText.includes("close-up"), "distance token present");
const orderOk =
  fullText.indexOf("back view") < fullText.indexOf("high-angle shot") &&
  fullText.indexOf("high-angle shot") < fullText.indexOf("close-up");
assert(orderOk, "axes compose in view->elevation->distance regardless of click order");
const body = toPlatform(mk(fullText)).body;
assert(body.prompt === fullText, "the composed prompt is exactly what mapKrea2Cfwui sends");
assert(body.task_type === "txt2img", "cinema image seat (no start image) is txt2img");
assert(body.model === "Krea-2-Turbo", "the body names the local model");
assert(body.path === undefined, "body-only submit, no data positional args");

// 4. Custom free-text token is appended after the axis words.
usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "view", "right side view");
usePromptTokens.getState().select("camera-angle", "custom", "  dutch tilt 30 degrees  ");
const customText = mergePromptWithTokens(BASE, "image");
console.log("CUSTOM_PROMPT:", JSON.stringify(customText));
assert(customText.includes("right side view"), "axis token present alongside custom");
assert(customText.includes("dutch tilt 30 degrees"), "custom free text is trimmed and appended");
assert(customText.indexOf("right side view") < customText.indexOf("dutch tilt"), "custom rides after the axis words");

// 5. Re-picking the same axis replaces in place (never stacks two copies).
usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "view", "front view");
usePromptTokens.getState().select("camera-angle", "view", "back view");
const replaced = mergePromptWithTokens(BASE, "image");
assert(replaced.includes("back view") && !replaced.includes("front view"), "re-picking a slot replaces it in place");

// 6. Image-scope guard: a video surface never inherits an image-only angle token.
const videoText = mergePromptWithTokens(BASE, "video");
assert(videoText === BASE, "camera-angle is image-scoped and does not bleed into a video prompt");

console.log(fail === 0 ? "\nALL-MAPPER-PASS" : `\n${fail} MAPPER-FAILURES`);
process.exit(fail === 0 ? 0 : 1);
