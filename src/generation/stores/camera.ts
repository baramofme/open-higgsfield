import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

/** The app's camera settings, measured from its own panel (CDP 2026-10-31)
    and corrected by the user's screenshot: two scrollable drums — 카메라
    (Modern, 35mm Film, 8mm Film, DV Camcorder, Auto) and 렌즈 (Vintage
    Anamorphic, Warm Vintage, Halation Vintage, Auto, Clean Sharp, Anamorphic).
    InnerText order is not visual order: the selected drum item is hoisted to
    the front, so the screenshot — not the CDP text — is the authority on
    sequence. The app's own defaults, white-bordered in the screenshot, are
    35mm Film + Warm Vintage, not Auto; 초기화 restores those. */
export const CAMERAS = [
  "Modern",
  "35mm Film",
  "8mm Film",
  "DV Camcorder",
  "Auto",
] as const;
export const LENSES = [
  "Vintage Anamorphic",
  "Warm Vintage",
  "Halation Vintage",
  "Auto",
  "Clean Sharp",
  "Anamorphic",
] as const;

/* Each choice owns a look, and the app paints every drum row with a cover
   photo from its CDN. The originals are ours now: every cover and both auto
   icons were downloaded from the app's CDN on 2026-10-31 and are served from
   /public/camera — the rows show the real scenes, not a stand-in. */
export const CHOICE_ART: Record<string, string> = {
  Modern: "/camera/modern.webp",
  "35mm Film": "/camera/35mm-film.webp",
  "8mm Film": "/camera/8mm-film.webp",
  "DV Camcorder": "/camera/dv-camcorder.webp",
  Auto: "/camera/lens-auto.svg",
  "Vintage Anamorphic": "/camera/vintage-anamorphic.webp",
  "Warm Vintage": "/camera/warm-vintage.webp",
  "Halation Vintage": "/camera/halation-vintage.webp",
  "Clean Sharp": "/camera/clean-sharp.webp",
  Anamorphic: "/camera/anamorphic.webp",
};

/** The camera drum's own auto mark; the lens drum uses the shared Auto art. */
export const CAMERA_AUTO_ART = "/camera/camera-auto.svg";

export type CameraChoice = (typeof CAMERAS)[number];
export type LensChoice = (typeof LENSES)[number];

const DEFAULTS = { camera: "35mm Film", lens: "Warm Vintage" } as const;

type CameraState = {
  camera: CameraChoice;
  lens: LensChoice;
  setCamera: (camera: CameraChoice) => void;
  setLens: (lens: LensChoice) => void;
  reset: () => void;
};

export const useCamera = create<CameraState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setCamera: (camera) => set({ camera }),
      setLens: (lens) => set({ lens }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "openhiggsfield.camera.v2",
      storage: browserStorage(),
      partialize: (state) => ({ camera: state.camera, lens: state.lens }),
    },
  ),
);
