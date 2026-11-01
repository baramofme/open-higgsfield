import { videoModel } from "./defaults";
import type { ModelEntry } from "./types";

/* Local video models that run on the comfy-webui backend instead of the
   Higgsfield cloud. Their real api_name travels on the platform map in
   to-platform.ts (mapVideoCfwui), so the `paths` below are placeholders that
   never dispatch on their own — the MAP entry is what selects the backend.
   Roles: a start image drives image-to-video, and a handful of references feed
   MiniMax H3's named-element prompting (ref2va). */

/* Option chips that the local backend actually acts on — every value here is a
   value the run can honour, never a composer mirror of a cloud menu.
   - resolution: the tier table in module/video_gen/{LTX_2_5,H3} maps the tier
     (with the aspect) to concrete pixel dimensions, so the chip changes the
     frame size of the file that comes back.
   - outputFormat: the name of the container SaveVideo writes — mp4, mkv or
     webm are the three the node accepts, and the recipe carries the chip's
     value straight to its format input.
   - generateAudio: whether the generated audio track is decoded into the file;
     off leaves the audio decoder out of the graph, so the video is silent. */
const localVideoSettings = {
  resolution: { type: "enum", values: ["544p", "768p", "1080p"], default: "768p" },
  outputFormat: { type: "enum", values: ["mp4", "webm", "mkv"], default: "mp4" },
  generateAudio: { type: "boolean", default: true },
} as const satisfies Partial<ModelEntry["settings"]>;

export const ltx25Local = videoModel(
  "ltx-2.5-local",
  "LTX 2.5 (Local)",
  { start: 1, reference: 9 },
  { text: "VideoGen_LTX_2_5_run", image: "VideoGen_LTX_2_5_run" },
  localVideoSettings,
);

/* Reference caps mirror the H3 backend verbatim: the ref2va recipe's
   injectors accept up to 9 images, 3 videos and 3 standalone audio
   (run.py's ref_image1..9 / ref_video1..3 / ref_audio1..3), and the
   hosted reference-to-video schema caps the same 9/3/3. The "+" dialog
   reads these numbers straight off the roles object — the composer's
   slot row is this declaration, not hand-written UI. */
export const minimaxH3Local = videoModel(
  "minimax-h3-local",
  "MiniMax H3 (Local)",
  { start: 1, reference: 9, video: 3, audio: 3 },
  { text: "VideoGen_H3_run", image: "VideoGen_H3_run" },
  localVideoSettings,
);
