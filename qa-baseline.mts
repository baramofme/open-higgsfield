import "./src/generation/camera-angle"; // module-load registers the feature
import { toPlatform } from "./src/generation/to-platform";
import { createCfwuiClient } from "./src/generation/cfwui-platform";
import { usePromptTokens } from "./src/generation/prompt-registry";

// ── post-activation REGRESSION probe: no chips → body carries NO node_inputs ──
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

usePromptTokens.getState().reset();
const { body } = toPlatform(mk(BASE_PROMPT));
const b = body as Record<string, unknown>;
console.log(`[baseline] prompt=${b.prompt} node_inputs_present=${"node_inputs" in b} seed=${SEED}`);
(b as any).seed = SEED;

const r = await submitAndPoll(b, "baseline");
console.log("RESULT_JSON " + JSON.stringify(r));
process.exit(r.status === "completed" ? 0 : 1);
