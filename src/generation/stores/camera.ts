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

/* The third column the app seats beside camera and lens, measured live on the
   solo/video camera popup (CDP 2026-11-03): 조리개 — the aperture drum. Its
   rows carry no cover scene the way camera/lens do; the app paints each detent
   with the f-stop text over a flat plate. The pristine default is Auto, the
   same Auto the two neighbouring drums rest on when the popup first opens. */
export const APERTURES = [
  "f/1.4 Wide Open",
  "f/4 Moderate",
  "f/11 Deep Focus",
  "Auto",
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

/* HF's aperture drum carries the SAME full-bleed cover scene as camera and lens —
   measured live on the cinema camera popup over CDP (2026-11-04): each f-stop
   detent paints a depth-of-field cover photo behind the f-stop word (the app uses
   the app's `img.object-cover` for every f-stop row, the identical mechanism the
   camera/lens rows use), and the Auto detent uses its OWN aperture glyph
   (aperture-auto.svg), not the camera's. The earlier "aperture rows are flat
   plates with the f-stop word alone" note was wrong; this map restores the real
   backgrounds. Files downloaded from the app's CDN, served from
   /cinema-studio-4/aperture/. */
export const APERTURE_ART: Partial<Record<string, string>> = {
  "f/1.4 Wide Open": "/cinema-studio-4/aperture/aperture-f1.4-wide.webp",
  "f/4 Moderate": "/cinema-studio-4/aperture/aperture-f4-moderate.webp",
  "f/11 Deep Focus": "/cinema-studio-4/aperture/aperture-f11-deep.webp",
  Auto: "/cinema-studio-4/aperture/aperture-auto.svg",
};

export type CameraChoice = (typeof CAMERAS)[number];
export type LensChoice = (typeof LENSES)[number];
export type ApertureChoice = (typeof APERTURES)[number];

/* The app's pristine state, read off the live solo/video camera popup
   (CDP 2026-11-03): every drum rests on Auto until the writer chooses one, and
   초기화 returns all three drums to this. The popup is Auto/Auto/Auto on first
   open — matching that is what makes the default detent line up with HF. */
const DEFAULTS = { camera: "Auto", lens: "Auto", aperture: "Auto" } as const;

type CameraState = {
  camera: CameraChoice;
  lens: LensChoice;
  aperture: ApertureChoice;
  setCamera: (camera: CameraChoice) => void;
  setLens: (lens: LensChoice) => void;
  setAperture: (aperture: ApertureChoice) => void;
  reset: () => void;
};

export const useCamera = create<CameraState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setCamera: (camera) => set({ camera }),
      setLens: (lens) => set({ lens }),
      setAperture: (aperture) => set({ aperture }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "openhiggsfield.camera.v2",
      storage: browserStorage(),
      partialize: (state) => ({ camera: state.camera, lens: state.lens, aperture: state.aperture }),
    },
  ),
);
