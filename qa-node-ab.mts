import "./src/generation/camera-angle";
import { toPlatform } from "./src/generation/to-platform";
import { createCfwuiClient } from "./src/generation/cfwui-platform";
import { usePromptTokens } from "./src/generation/prompt-registry";
import { chipsToNumeric } from "./src/generation/camera-angle-numeric";

// ── PURE NODE-PATH A/B: identical prompt + identical seed, ONLY node_inputs
//    differ (h0 front vs h180 back). Isolates the node channel from the
//    prompt-token channel. ──
const BASE_PROMPT =
  "A cinematic photograph of a woman with long brown hair in a sunlit studio";
const SEED = 20261102;

function mk(promptText: string): any {
  return {
    model: "krea-2-turbo",
    prompt: { text: promptText },
    settings: {
      resolution: "1k", aspectRatio: "1:1", steps: 8, cfg: 1.0,
      sampler: "euler", scheduler: "simple", batchSize: 1,
    },
    media: {}, studio: "cinema",
  };
}

const client = createCfwuiClient({ baseUrl: process.env.CFWUI_BASE_URL || "http://127.0.0.1:7861" });

async function submitAndPoll(body: Record<string, unknown>, label: string) {
  const q = await client.submit("ImageGen_run_imagegen", body);
  console.log(`[${label}] task_id=${q.requestId}`);
  const deadline = Date.now() + 300_000;
  let last = "";
  while (Date.now() < deadline) {
    const st = await client.status(q.requestId);
    last = st.status;
    if (st.status === "completed") {
      const url = (st.images && st.images[0] && st.images[0].url) || "";
      console.log(`[${label}] COMPLETED url=${url}`);
      return { taskId: q.requestId, url, status: "completed", label };
    }
    if (st.status === "failed") {
      console.log(`[${label}] FAILED`, JSON.stringify(st.error));
      return { taskId: q.requestId, url: "", status: "failed", error: st.error, label };
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log(`[${label}] TIMEOUT last=${last}`);
  return { taskId: q.requestId, url: "", status: "timeout", label };
}

function pureNodeBody(view: string): Record<string, unknown> {
  usePromptTokens.getState().reset(); // node-only: tokens stay unselected, prompt is verbatim BASE
  const { body } = toPlatform(mk(BASE_PROMPT));
  const b = body as Record<string, unknown>;
  const n = chipsToNumeric(view, undefined, undefined);
  (b as any).node_inputs = {
    qwenmultiangle: {
      horizontal_angle: n.qwenmultiangle.h,
      vertical_angle: n.qwenmultiangle.v,
      zoom: n.qwenmultiangle.z,
    },
    // mirror OH's real emission shape (both dicts always present)
    krea2_anygles: {
      yaw: n.anygles.yaw,
      elevation: n.anygles.elevation,
      distance: n.anygles.distance,
      extra_prompt: n.anygles.extra_prompt,
    },
  };
  (b as any).seed = SEED;
  console.log(`[${label(view)}] prompt=${(b as any).prompt} node_inputs=${JSON.stringify((b as any).node_inputs)} seed=${SEED}`);
  return b;
}
function label(view: string) { return `${view} (h=${chipsToNumeric(view, undefined, undefined).qwenmultiangle.h})`; }

const resA = await submitAndPoll(pureNodeBody("front view"), "nodeA-front-h0");
const resB = await submitAndPoll(pureNodeBody("back view"), "nodeB-back-h180");
console.log("NODE_AB_JSON " + JSON.stringify({ a: resA, b: resB }));
process.exit(resA.status === "completed" && resB.status === "completed" ? 0 : 1);
