import type { ModelEntry } from "./types";
import { IMAGE_ASPECT } from "./tokens";

/* Mirror of the classic image app's composer (higgsfield.ai/ko/ai/image):
   the model selector re-labels the Marketing Studio Image API family as
   "GPT Image" tiers. Verified against docs.higgsfield.ai (2026-10-31):
   - GPT Image 2        = marketing-studio/image       (quality 3 tiers, image_urls max 2)
   - GPT Image 2.5 Flare = marketing-studio/image/flare (quality 5 tiers, image_urls max 16)
   - GPT Image 2.5 Sunburst = marketing-studio/image/sunburst (same schema as Flare)
   The app exposes only 3 quality tiers on every model; we mirror that surface
   and send the app-visible value as-is. */
/* The ratio menu is the app's shared image-form menu (Auto first, app order),
   not the API enum — screen parity is the target. */
const GPT_ASPECT = IMAGE_ASPECT;
/* The app's quality menu is Low/Medium/High/Auto - auto asks the service
   to pick; the API enum stops at high, and cloud runs are dead, so an
   "auto" choice travels only as the app menu's mirror. */
const GPT_QUALITY = ["low", "medium", "high", "auto"] as const;
const GPT_RESOLUTION = ["1k", "2k", "4k"] as const;
const GPT_BATCH = ["1", "2", "3", "4"] as const;

export function gptSettings(referenceCap: number): ModelEntry["settings"] {
  return {
    aspectRatio: { type: "enum", values: GPT_ASPECT, default: "auto" },
    quality: { type: "enum", values: GPT_QUALITY, default: "high" },
    resolution: { type: "enum", values: GPT_RESOLUTION, default: "2k" },
    batchSize: { type: "enum", values: GPT_BATCH, default: "1" },
    // reference cap is model-specific server-side (2 on the 2.0 Alpha endpoint)
    ...(referenceCap > 0 ? {} : {}),
  };
}

export const gptImage2: ModelEntry = {
  id: "gpt-image-2",
  surface: "image",
  label: "GPT Image 2",
  roles: { reference: 2 },
  settings: gptSettings(2),
};

export const gptImage15: ModelEntry = {
  id: "gpt-image-1.5",
  surface: "image",
  label: "GPT Image 1.5",
  roles: { reference: 16 },
  settings: gptSettings(16),
};

export const gptImage25Sunburst: ModelEntry = {
  id: "gpt-image-2.5-sunburst",
  surface: "image",
  label: "GPT Image 2.5 Sunburst",
  roles: { reference: 16 },
  settings: gptSettings(16),
};

export const gptImage25Flare: ModelEntry = {
  id: "gpt-image-2.5-flare",
  surface: "image",
  label: "GPT Image 2.5 Flare",
  roles: { reference: 16 },
  settings: gptSettings(16),
};

/** FLUX 3 Image — image-tab tier of the classic app. OH's existing "flux-3"
 *  entry is the text-to-video endpoint; the image tier is not in the API docs
 *  (web-only), so it carries no path and is rejected at submit. */
export const flux3Image: ModelEntry = {
  id: "flux-3-image",
  surface: "image",
  label: "FLUX 3 Image",
  roles: { reference: 14 },
  settings: gptSettings(14),
};
