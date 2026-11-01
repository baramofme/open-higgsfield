import type { ModelEntry } from "./types";

/* Higgsfield Genjutsu tiers from the classic video app's model selector
   (720p/1080p, 4–30s). The API docs only expose workflow endpoints
   (motion-transfer / object-swap / restyle) — none of them is a plain
   text-to-video, so generation stays blocked ("no platform map") until the
   web-app's own path is confirmed. Mirrored for the picker for now. */
export const genjutsu: ModelEntry = {
  id: "genjutsu",
  surface: "video",
  label: "Higgsfield Genjutsu",
  roles: { video: 1 },
  settings: {
    duration: { type: "range", min: 4, max: 30, default: 5, step: 1 },
    resolution: { type: "enum", values: ["720p", "1080p"], default: "1080p" },
    aspectRatio: { type: "enum", values: ["16:9", "9:16", "1:1"], default: "16:9" },
  },
};

export const genjutsuLite: ModelEntry = {
  id: "genjutsu-lite",
  surface: "video",
  label: "Higgsfield Genjutsu Lite",
  roles: { video: 1 },
  settings: {
    duration: { type: "range", min: 4, max: 30, default: 5, step: 1 },
    resolution: { type: "enum", values: ["1080p"], default: "1080p" },
    aspectRatio: { type: "enum", values: ["16:9", "9:16", "1:1"], default: "16:9" },
  },
};
