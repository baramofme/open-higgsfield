import type { MediaRole, ModelEntry, PlatformPaths } from "./types";
import { IMAGE_ASPECT } from "./tokens";

const VIDEO_ASPECT = ["16:9", "9:16", "1:1"] as const;

export function t2v(path: string): PlatformPaths {
  if (!path.endsWith("/text-to-video")) return { text: path };
  return { text: path, image: path.replace(/\/text-to-video$/, "/image-to-video") };
}

export function imageModel(id: string, label: string, paths: PlatformPaths): ModelEntry {
  return {
    id,
    surface: "image",
    label,
    roles: { reference: 8 },
    settings: {
      aspectRatio: { type: "enum", values: IMAGE_ASPECT, default: "auto" },
      quality: { type: "enum", values: ["low", "medium", "high", "auto"], default: "high" },
      resolution: { type: "enum", values: ["1k", "2k", "4k"], default: "1k" },
    },
    paths,
  };
}

/** A standalone-audio catalog entry. It carries no roles — the audio endpoint
 *  takes a caption and optional lyrics, not attached media — and its dials are
 *  exactly the seven positional arguments `AudioGen_MiniMax_Music_3` accepts
 *  (caption, lyrics, max_duration, cfg_scale, top_k, steps, seed). The mapper
 *  reads these settings into that fixed order; `duration` becomes max_duration.
 *  `paths.text` is the api_name kept for documentation only — MAP[id] decides
 *  the real dispatch, so the audio plane never maps by paths on its own. */
export function audioModel(
  id: string,
  label: string,
  overrides?: Partial<ModelEntry["settings"]>,
): ModelEntry {
  return {
    id,
    surface: "audio",
    label,
    roles: {},
    settings: {
      /* max_duration in seconds. The backend floor is 5 and its default is 60;
         we default to 10 so a fresh press comes back fast on a slow sampler. */
      duration: { type: "range", min: 5, max: 300, default: 10, step: 1 },
      /* cfg_scale — the backend default is 1.7. */
      cfg: { type: "range", min: 1, max: 10, default: 1.7, step: 0.1 },
      /* top_k for the text encoder — backend default 50. */
      topK: { type: "range", min: 1, max: 100, default: 50, step: 1 },
      /* sampling steps — the backend floor is 10 and its default is 30; we
         default to 10 to keep the first clip quick. */
      steps: { type: "range", min: 10, max: 100, default: 10, step: 1 },
      ...overrides,
    },
    paths: { text: "AudioGen_MiniMax_Music_3" },
  };
}

export function videoModel(
  id: string,
  label: string,
  roles: Partial<Record<MediaRole, number>>,
  paths: PlatformPaths,
  /** Settings that differ from the mirrored video defaults — the local entries
      pass the tiers and formats the comfy-webui backend really accepts, so the
      chip's value is a value the run can act on. */
  overrides?: Partial<ModelEntry["settings"]>,
): ModelEntry {
  return {
    id,
    surface: "video",
    label,
    roles,
    settings: {
      aspectRatio: { type: "enum", values: VIDEO_ASPECT, default: "16:9" },
      resolution: { type: "enum", values: ["720p", "1080p"], default: "720p" },
      duration: { type: "range", min: 4, max: 10, default: 5 },
      ...overrides,
    },
    paths,
  };
}
