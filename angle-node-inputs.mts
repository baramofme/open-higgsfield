import "./src/generation/camera-angle"; // module-load registers the feature
import { toPlatform } from "./src/generation/to-platform";
import { usePromptTokens, mergePromptWithTokens } from "./src/generation/prompt-registry";

function mk(promptText: string, start?: string): any {
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
    media: start ? { start: [{ id: "s", url: start, role: "start" }] } : {},
    studio: "cinema",
  };
}

const BASE = "A cinematic photograph of a woman with long brown hair in a sunlit studio";
let fail = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) { fail++; console.log("FAIL:", msg); } else { console.log("PASS:", msg); }
}

// A. Zero regression: nothing selected -> NO node_inputs key at all.
usePromptTokens.getState().reset();
const autoText = mergePromptWithTokens(BASE, "image");
assert(autoText === BASE, "empty token set leaves the base caption untouched");
const autoBody = toPlatform(mk(autoText)).body;
assert(!("node_inputs" in autoBody), "no dock chip -> the body carries NO node_inputs (zero regression)");
assert(autoBody.prompt === BASE, "auto run still sends the base prompt verbatim");

// B. Single-axis selection -> node_inputs present AND prompt string still present.
usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "view", "back view");
const oneText = mergePromptWithTokens(BASE, "image");
const oneBody = toPlatform(mk(oneText)).body;
assert(typeof oneBody.prompt === "string" && oneBody.prompt.includes("back view"),
  "the prompt-token channel still composes the selected token (channel intact)");
assert(!!oneBody.node_inputs, "a single dock chip now also emits node_inputs alongside the prompt");
const niB: any = oneBody.node_inputs;
assert(niB.qwenmultiangle.horizontal_angle === 180, "back view -> qwen h=180 (bucket midpoint)");
assert(niB.qwenmultiangle.vertical_angle === 0, "unselected elevation -> qwen v=0 (neutral eye-level)");
assert(niB.qwenmultiangle.zoom === 5.0, "unselected distance -> qwen zoom=5.0 (node neutral default)");
assert(niB.krea2_anygles.yaw === 180, "back azimuth -> krea2 yaw=180");
assert(niB.krea2_anygles.elevation === 0, "unselected elevation -> krea2 elevation=0");
assert(niB.krea2_anygles.distance === 1.0, "unselected distance -> krea2 distance=1.0 (neutral)");
assert(niB.krea2_anygles.extra_prompt === " back view", "extra_prompt carries the picked token, leading space (spec §1c)");
assert(!("source" in niB.krea2_anygles), "txt2img (no start image) attaches no anygles source");

// C. Full 3-axis selection -> both backends get the verbatim bucket midpoints.
usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "distance", "close-up"); // out of order on purpose
usePromptTokens.getState().select("camera-angle", "view", "front view");
usePromptTokens.getState().select("camera-angle", "elevation", "high-angle shot");
const fullText = mergePromptWithTokens(BASE, "image");
const niC: any = toPlatform(mk(fullText)).body.node_inputs;
assert(niC.qwenmultiangle.horizontal_angle === 0, "front view -> qwen h=0");
assert(niC.qwenmultiangle.vertical_angle === 53, "high-angle shot -> qwen v=53 (Int step=1 midpoint)");
assert(niC.qwenmultiangle.zoom === 8, "close-up -> qwen zoom=8 (bucket midpoint)");
assert(niC.krea2_anygles.yaw === 0, "front -> krea2 yaw=0");
assert(niC.krea2_anygles.elevation === 52.5, "high-angle -> krea2 elevation=52.5 (float midpoint)");
assert(niC.krea2_anygles.distance === 0.8, "close-up -> krea2 distance=0.8 (closer)");
assert(niC.krea2_anygles.extra_prompt === " front view high-angle shot close-up",
  "extra_prompt word order is view->elevation->distance regardless of click order");

// D. img2img start image -> the anygles source is attached (reprojection path).
usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "view", "right side view");
const START = "https://example.test/source.png";
const imgBody = toPlatform(mk(mergePromptWithTokens(BASE, "image"), START)).body;
assert(imgBody.task_type === "img2img", "a start image maps to img2img (prompt path unaffected)");
assert(imgBody.image === START, "the start image still rides the img2img image field");
const niD: any = imgBody.node_inputs;
assert(niD.krea2_anygles.source === START, "anygles source is the start image when one exists");
assert(niD.qwenmultiangle.horizontal_angle === 90, "right side view -> qwen h=90 (works txt2img AND img2img)");

// E. Custom-only selection -> numeric node path stays closed (custom is not an axis),
//    yet the free text still rides the prompt channel verbatim.
usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "custom", "  dutch tilt 30 degrees  ");
const customText = mergePromptWithTokens(BASE, "image");
const customBody = toPlatform(mk(customText)).body;
assert(customBody.prompt.includes("dutch tilt 30 degrees"), "custom free text still reaches the prompt");
assert(!("node_inputs" in customBody), "a custom-only pick keeps the numeric node path closed");

// F. Image-scope guard: a video surface never inherits an image-only angle token,
//    and (here) never produces node_inputs for a krea2 image run.
usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "view", "front-left quarter view");
assert(mergePromptWithTokens(BASE, "video") === BASE, "camera-angle is image-scoped (no bleed into video prompt)");
const flBody = toPlatform(mk(mergePromptWithTokens(BASE, "image"))).body.node_inputs;
assert(flBody.qwenmultiangle.horizontal_angle === 315, "front-left quarter -> qwen h=315");
assert(flBody.krea2_anygles.yaw === -45, "front-left (315) re-signs to krea2 yaw=-45 (left-side negative)");

console.log(fail === 0 ? "\nALL-NODE-INPUTS-PASS" : `\n${fail} NODE-INPUTS-FAILURES`);
process.exit(fail === 0 ? 0 : 1);
