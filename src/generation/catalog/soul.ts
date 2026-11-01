import type { ModelEntry } from "./types";
import { IMAGE_ASPECT } from "./tokens";

/* The app's image-form shows the shared Auto-first menu for Soul too; the
   API enums cover a subset — "auto" simply omits aspect_ratio on send. */
const soulSettings = {
  aspectRatio: { type: "enum", values: IMAGE_ASPECT, default: "auto" },
  resolution: { type: "enum", values: ["720p", "1080p"], default: "720p" },
  batchSize: { type: "enum", values: ["1", "2", "3", "4"], default: "1" },
} as const satisfies ModelEntry["settings"];

/* Labels mirror the classic image app's model selector names (2026-10-31). */
export const soul: ModelEntry = {
  id: "soul",
  surface: "image",
  label: "Higgsfield Soul",
  roles: {},
  settings: soulSettings,
};

export const soulCinema: ModelEntry = {
  id: "soul-cinema",
  surface: "image",
  label: "Higgsfield Soul Cinema",
  roles: {},
  settings: soulSettings,
};

export const soul2: ModelEntry = {
  id: "soul-2",
  surface: "image",
  label: "Higgsfield Soul 2.0",
  roles: {},
  settings: soulSettings,
};
