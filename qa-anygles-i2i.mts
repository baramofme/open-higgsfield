import "./src/generation/camera-angle";
import { toPlatform } from "./src/generation/to-platform";
import { createCfwuiClient } from "./src/generation/cfwui-platform";
import { usePromptTokens, mergePromptWithTokens } from "./src/generation/prompt-registry";

// ── anygles re-projection live attempt: OH real path with a START image +
//    back-view chip → task_type img2img, node_inputs.krea2_anygles.source set.
//    Exercises the LoadLoRA->Camera->Encode->ModelPatch sub-path + sampler
//    model re-route. Long deadline: SAM 3D Body (2.1GB ckpt) + edit round-trip. ──
const BASE_PROMPT =
  "A cinematic photograph of a woman with long brown hair in a sunlit studio";
const START_URL =
  "http://127.0.0.1:7861/gradio_api/file=%2Fmnt%2Fnvmedata%2Fcomfy%2Foutput%2FComfyUI_00212_.png";

function mk(promptText: string): any {
  return {
    model: "krea-2-turbo",
    prompt: { text: promptText },
    settings: {
      resolution: "1k", aspectRatio: "1:1", steps: 8, cfg: 1.0,
      sampler: "euler", scheduler: "simple", batchSize: 1, denoise: 0.85,
    },
    media: { start: [{ id: "s", url: START_URL, role: "start" }] },
    studio: "cinema",
  };
}

const client = createCfwuiClient({ baseUrl: process.env.CFWUI_BASE_URL || "http://127.0.0.1:7861" });

async function submitAndPoll(body: Record<string, unknown>, label: string) {
  const q = await client.submit("ImageGen_run_imagegen", body);
  console.log(`[${label}] task_id=${q.requestId}`);
  const deadline = Date.now() + 600_000;
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
usePromptTokens.getState().select("camera-angle", "view", "back view");
const text = mergePromptWithTokens(BASE_PROMPT, "image");
const { body } = toPlatform(mk(text));
const b = body as Record<string, unknown>;
console.log(`[anygles-i2i] task_type=${b.task_type} prompt=${b.prompt} node_inputs=${JSON.stringify(b.node_inputs)} image=${b.image ? "present" : "MISSING"} denoise=${b.denoise}`);

const r = await submitAndPoll(b, "anygles-i2i");
console.log("RESULT_JSON " + JSON.stringify(r));
process.exit(r.status === "completed" ? 0 : 1);
