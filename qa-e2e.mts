import "./src/generation/camera-angle"; // module-load registers the feature
import { toPlatform } from "./src/generation/to-platform";
import { createCfwuiClient } from "./src/generation/cfwui-platform";
import { usePromptTokens, mergePromptWithTokens } from "./src/generation/prompt-registry";

// ── live end-to-end harness: OH mapper + OH cfwui client → :7861 → :8189 ──
const BASE_PROMPT =
  "A cinematic photograph of a woman with long brown hair in a sunlit studio";

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

const client = createCfwuiClient({ baseUrl: process.env.CFWUI_BASE_URL || "http://127.0.0.1:7861" });

async function submitAndPoll(body: Record<string, unknown>, label: string) {
  const q = await client.submit("ImageGen_run_imagegen", body);
  console.log(`[${label}] task_id=${q.requestId} status=${q.status}`);
  const deadline = Date.now() + 240_000;
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

// build the node_inputs body for a given chip selection
function bodyWithAngle(view: string | undefined, elev: string | undefined, dist: string | undefined) {
  usePromptTokens.getState().reset();
  if (view) usePromptTokens.getState().select("camera-angle", "view", view);
  if (elev) usePromptTokens.getState().select("camera-angle", "elevation", elev);
  if (dist) usePromptTokens.getState().select("camera-angle", "distance", dist);
  const text = mergePromptWithTokens(BASE_PROMPT, "image");
  const plane = mk(text);
  const { body } = toPlatform(plane);
  return body as Record<string, unknown>;
}

// ── the decisive probe: FRONT view node-path run ──
const frontBody = bodyWithAngle("front view", "high-angle shot", "close-up");
console.log("FRONT_BODY node_inputs =", JSON.stringify((frontBody as any).node_inputs));
console.log("FRONT_BODY.prompt =", (frontBody as any).prompt);

const r = await submitAndPoll(frontBody, "front");
console.log("RESULT_JSON " + JSON.stringify(r));
process.exit(0);
