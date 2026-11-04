import "./src/generation/camera-angle";
import { toPlatform } from "./src/generation/to-platform";
import { createCfwuiClient } from "./src/generation/cfwui-platform";
import { usePromptTokens } from "./src/generation/prompt-registry";

// ── PROMPT-CHANNEL-ONLY A/B (post-activation regression of t_1d77157a's
//    seed-fixed frontal-cascade judgment): identical base + SAME seed, only
//    the angle WORD differs inside the prompt text; NO node_inputs, NO chips.
//    Isolates the prompt-token channel from the node channel. ──
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

function promptOnlyBody(angleWord: string): Record<string, unknown> {
  usePromptTokens.getState().reset(); // no chips -> node_inputs absent (baseline body)
  const { body } = toPlatform(mk(`${BASE_PROMPT}, ${angleWord}`));
  const b = body as Record<string, unknown>;
  (b as any).seed = SEED;
  console.log(`[${angleWord}] prompt=${b.prompt} node_inputs_present=${"node_inputs" in b} seed=${SEED}`);
  return b;
}

const pA = await submitAndPoll(promptOnlyBody("front view"), "promptA-front");
const pB = await submitAndPoll(promptOnlyBody("back view"), "promptB-back");
console.log("PROMPT_AB_JSON " + JSON.stringify({ a: pA, b: pB }));
process.exit(pA.status === "completed" && pB.status === "completed" ? 0 : 1);
