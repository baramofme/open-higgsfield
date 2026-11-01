import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import { useActive } from "./stores/active";
import { useImageMedia, useVideoMedia } from "./stores/media";
import { useImagePrompt, useVideoPrompt } from "./stores/prompt";
import { useSettings } from "./stores/settings";
import { useStudio } from "@/openhiggsfield/studio-mode";
import { useCamera } from "./stores/camera";

export function assemblePlane(): GenerationPlane {
  const { model: modelId, surface } = useActive.getState();
  const model = getModel(modelId);
  const text = (surface === "image" ? useImagePrompt : useVideoPrompt).getState().text;
  const items = (surface === "image" ? useImageMedia : useVideoMedia).getState().items;
  const media: GenerationPlane["media"] = {};
  for (const item of items) {
    const max = model.roles[item.role];
    if (!max) continue;
    const list = media[item.role] ?? [];
    if (list.length >= max) continue;
    list.push(item);
    media[item.role] = list;
  }
  return {
    model: model.id,
    prompt: { text },
    media,
    settings: parseSettings(model, useSettings.getState().byModel[model.id] ?? {}),
    /* The clapper's state rides the plane so the run knows which surface it
       was produced under: plain (general) or cinematic — the cinematic answer
       comes from the mode rail, not the topbar. */
    studio:
      useStudio.getState().mode === "cinema" &&
      useStudio.getState().mode === "cinema"
        ? "cinema"
        : "general",
  };
}

/** On cinematic planes the camera store's chosen camera and lens join the
    run's settings — the tile is the only control the surface offers for them,
    so the store is their record. General planes keep their own untouched. */
export function withCamera(plane: GenerationPlane): GenerationPlane {
  if (plane.studio !== "cinema") return plane;
  const { camera, lens } = useCamera.getState();
  return { ...plane, settings: { ...plane.settings, camera, lens } };
}
