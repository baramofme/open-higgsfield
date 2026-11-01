import type { ModelEntry } from "./types";

/* Tiers from the Cinema Studio (generate/all) model selector that have no
   entry in docs.higgsfield.ai and no local backend workflow — mirrored so the
   cinema panel reads as complete, rejected at submit with "No platform map".
   AI Cast and 시네마틱 장소 are cinematic features on the video rail; the rest
   are image tiers. */
export const seedream5Pro: ModelEntry = {
  id: "seedream-5-pro",
  surface: "image",
  label: "Seedream 5.0 Pro",
  roles: { reference: 14 },
  settings: {},
};

export const seedream5Flash: ModelEntry = {
  id: "seedream-5-flash",
  surface: "image",
  label: "Seedream 5.0 Flash",
  roles: { reference: 14 },
  settings: {},
};

export const seedream45: ModelEntry = {
  id: "seedream-4.5",
  surface: "image",
  label: "Seedream 4.5",
  roles: { reference: 14 },
  settings: {},
};

export const ideogramVector: ModelEntry = {
  id: "ideogram-vector",
  surface: "image",
  label: "Ideogram Vector",
  roles: {},
  settings: {},
};

export const aiCast: ModelEntry = {
  id: "ai-cast",
  surface: "video",
  label: "AI Cast",
  roles: {},
  settings: {},
};

export const cinematicPlace: ModelEntry = {
  id: "cinematic-place",
  surface: "video",
  label: "시네마틱 장소",
  roles: {},
  settings: {},
};
