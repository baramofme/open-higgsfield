import type { ModelEntry } from "./types";
import { IMAGE_ASPECT } from "./tokens";

/* The image-form shows one shared ratio menu (Auto first) no matter which
   model is selected — KREA_ASPECT is that menu. */
const KREA_ASPECT = IMAGE_ASPECT;

/** Local backend model: comfy-webui "Krea-2-Turbo" via ImageGen_run_imagegen.
 * reference cap mirrors krea2_style_reference max_count (3). */
export const krea2Turbo: ModelEntry = {
  id: "krea-2-turbo",
  surface: "image",
  label: "Krea 2 Turbo",
  roles: { start: 1, reference: 3 },
  settings: {
    aspectRatio: { type: "enum", values: KREA_ASPECT, default: "auto" },
    /* The quality tier is the image-form's menu (Low/Medium/High/Auto in the
       app's order, English per the label ruling). Krea's local backend has no
       quality parameter, so the mapper leaves it out of the body — it is the
       composer's mirror, not a knob. */
    quality: {
      type: "enum",
      values: ["low", "medium", "high", "auto"],
      default: "high",
      /* The ladder's rungs are steps/cfg pairs - the numbers the local backend
         actually runs on (cfwui accepts exactly steps/cfg/sampler/scheduler).
         Until a render comparison confirms them these are judgement calls, not
         measurements; "auto" imposes nothing, leaving the server's own
         euler/simple/8/1.0 fill. */
      presets: {
        low: { steps: 6, cfg: 0.9 },
        medium: { steps: 10, cfg: 1.2 },
        high: { steps: 16, cfg: 1.5 },
        auto: {},
      },
    },
    resolution: { type: "enum", values: ["1k", "2k"], default: "1k" },
    batchSize: { type: "enum", values: ["1", "2", "3", "4"], default: "1" },
  },
};
