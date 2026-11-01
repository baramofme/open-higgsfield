import type { ModelEntry } from "./types";
import { gptSettings } from "./gpt-image";

/* Nano Banana tiers from the classic image app's model selector. None of these
   appear in docs.higgsfield.ai's image catalog (2026-10-31 sweep), so they are
   web-app-only for now: they show in the picker with the shared composer
   settings, and toPlatform() rejects them with a clear "no platform map" error
   until console.higgsfield.ai confirms real endpoints. */
export const nanoBanana: ModelEntry = {
  id: "nano-banana",
  surface: "image",
  label: "Nano Banana",
  roles: { reference: 14 },
  settings: gptSettings(14),
};

export const nanoBanana2: ModelEntry = {
  id: "nano-banana-2",
  surface: "image",
  label: "Nano Banana 2",
  roles: { reference: 14 },
  settings: gptSettings(14),
};

export const nanoBanana2Lite: ModelEntry = {
  id: "nano-banana-2-lite",
  surface: "image",
  label: "Nano Banana 2 Lite",
  roles: { reference: 14 },
  settings: gptSettings(14),
};

export const nanoBanana21: ModelEntry = {
  id: "nano-banana-2.1",
  surface: "image",
  label: "Nano Banana 2.1",
  roles: { reference: 14 },
  settings: gptSettings(14),
};

export const nanoBananaPro: ModelEntry = {
  id: "nano-banana-pro",
  surface: "image",
  label: "Nano Banana Pro",
  roles: { reference: 14 },
  settings: gptSettings(14),
};
