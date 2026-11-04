import "./src/generation/camera-angle";
import { toPlatform } from "./src/generation/to-platform";
import { createCfwuiClient } from "./src/generation/cfwui-platform";
import { usePromptTokens, mergePromptWithTokens } from "./src/generation/prompt-registry";

const BASE_PROMPT =
  "A cinematic photograph of a woman with long brown hair in a sunlit studio";
function mk(promptText: string): any {
  return {
    model: "krea-2-turbo",
    prompt: { text: promptText },
    settings: { resolution: "1k", aspectRatio: "1:1", steps: 8, cfg: 1.0,
      sampler: "euler", scheduler: "simple", batchSize: 1 },
    media: {}, studio: "cinema",
  };
}
const client = createCfwuiClient({ baseUrl: process.env.CFWUI_BASE_URL || "http://127.0.0.1:7861" });
async function submitAndPoll(body: Record<string, unknown>, label: string) {
  const q = await client.submit("ImageGen_run_imagegen", body);
  console.log(`[${label}] task_id=${q.requestId}`);
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    const st = await client.status(q.requestId);
    if (st.status === "completed") { const u = st.images?.[0]?.url || ""; console.log(`[${label}] url=${u}`); return u; }
    if (st.status === "failed") { console.log(`[${label}] FAIL ${JSON.stringify(st.error)}`); return ""; }
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log(`[${label}] TIMEOUT`); return "";
}
function bodyWithView(view: string) {
  usePromptTokens.getState().reset();
  usePromptTokens.getState().select("camera-angle", "view", view);
  const b = toPlatform(mk(mergePromptWithTokens(BASE_PROMPT, "image"))).body as Record<string, unknown>;
  console.log(`[${view}] prompt=${(b as any).prompt} node_inputs=${JSON.stringify((b as any).node_inputs)}`);
  return b;
}

// Clean single-axis PROMPT-TOKEN A/B: front-only then back-only.
const frontUrl = await submitAndPoll(bodyWithView("front view"), "front-view");
const backUrl  = await submitAndPoll(bodyWithView("back view"), "back-view");
console.log("FRONT_URL " + frontUrl);
console.log("BACK_URL " + backUrl);
process.exit(0);
