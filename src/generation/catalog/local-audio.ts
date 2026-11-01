import { audioModel } from "./defaults";

/* Local audio models that run on the comfy-webui backend instead of the
   Higgsfield cloud. Unlike the image and video modules, the audio endpoint is a
   plain synchronous gradio api: it runs the ComfyUI workflow, waits, and returns
   the generated file's URL on the stream's `event: complete`. There is no async
   task id and no `get_task_status` pair, so the transport reads the stream to
   completion inside the submit itself — see `submitAudio` in cfwui-platform.

   Only MiniMax Music-3 is wired: it is the lone audio api_name registered as a
   named gradio endpoint (measured against /gradio_api/info). The ace_step tabs
   exist in the AudioGen UI but are not queue-REST-routable api_names, so a
   queue-REST submit could not reach them. The `paths` below are documentation —
   the real api_name and the positional argument order travel on the mapper in
   to-platform.ts (mapAudioCfwui), which is what selects the backend.

   The defaults sit below the backend's own (Music-3 ships 60s / 30 steps) on
   purpose: a music run is slow, so a fresh press returns an auditable clip
   quickly instead of a full-length track. Every value the chip offers is one the
   run can honour; nothing here mirrors a cloud menu. */
export const minimaxMusic3Local = audioModel(
  "minimax-music-3-local",
  "MiniMax Music 3 (Local)",
);
