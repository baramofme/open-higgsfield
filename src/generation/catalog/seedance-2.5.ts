import type { ModelEntry } from "./types";
import { SEEDANCE_ASPECT } from "./tokens";

/* Mirror of the classic video app composer (2026-10-31): resolution tiers are
   480p/720p/1080p (app default 1080p; the API default is 720p) and there is a
   bitrate_mode selector (standard/high, default high). App-visible default
   wins here — we mirror what the user sees on higgsfield.ai. */
const seedance25Settings = {
  resolution: { type: "enum", values: ["480p", "720p", "1080p"], default: "1080p" },
  bitrateMode: { type: "enum", values: ["standard", "high"], default: "high" },
  generateAudio: { type: "boolean", default: true },
  outputFormat: { type: "enum", values: ["mp4", "mov"], default: "mp4" },
} as const satisfies ModelEntry["settings"];

export const seedance25: ModelEntry = {
  id: "seedance-2.5",
  surface: "video",
  label: "Seedance 2.5",
  roles: { start: 1, end: 1, reference: 30, video: 10, audio: 10 },
  settings: {
    aspectRatio: { type: "enum", values: SEEDANCE_ASPECT, default: "16:9" },
    duration: { type: "range", min: 4, max: 30, default: 5 },
    ...seedance25Settings,
  },
};

export const seedance25Edit: ModelEntry = {
  id: "seedance-2.5-edit",
  surface: "video",
  label: "Seedance 2.5 Edit",
  roles: { video: 1, reference: 30, audio: 10 },
  settings: seedance25Settings,
};

export const seedance25Extend: ModelEntry = {
  id: "seedance-2.5-extend",
  surface: "video",
  label: "Seedance 2.5 Extend",
  roles: { video: 1, reference: 30, audio: 10 },
  settings: {
    duration: { type: "range", min: 4, max: 30, default: 5 },
    ...seedance25Settings,
  },
};

/** Seedance 2.5 Draft — listed in the classic app's model selector but absent
 *  from docs.higgsfield.ai (web-only preset). No map: toPlatform rejects it
 *  with "No platform map" until the endpoint is confirmed. */
export const seedance25Draft: ModelEntry = {
  id: "seedance-2.5-draft",
  surface: "video",
  label: "Seedance 2.5 Draft",
  roles: { start: 1, end: 1, reference: 30, video: 10, audio: 10 },
  settings: {
    aspectRatio: { type: "enum", values: SEEDANCE_ASPECT, default: "16:9" },
    duration: { type: "range", min: 4, max: 30, default: 5 },
    ...seedance25Settings,
  },
};
