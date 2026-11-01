import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "@/generation/stores/browser-storage";

/** The studio has two surfaces of the same workbench: "general" is the classic
 *  image/video split the studio was built on, "cinema" opens the app's own
 *  generation panel — whose mode rail (이미지·비디오·시네마틱) and character and
 *  camera instruments live in the dock, not in a side panel. */
export type StudioMode = "general" | "cinema";

type StudioState = {
  mode: StudioMode;
  setMode: (next: StudioMode) => void;
  toggleMode: () => void;
  /** Under the clapper: which of the app's three surfaces is chosen. */
  cinemaMode: CinemaMode;
  setCinemaMode: (next: CinemaMode) => void;
};

export const useStudio = create<StudioState>()(
  persist(
    (set) => ({
      mode: "general",
      setMode: (next) => set({ mode: next }),
      toggleMode: () =>
        set((state) => ({ mode: state.mode === "general" ? "cinema" : "general" })),
      cinemaMode: "image",
      setCinemaMode: (next) => set({ cinemaMode: next }),
    }),
    {
      name: "openhiggsfield.studio-mode.v1",
      merge: (persisted, current) => {
        const next = { ...current, ...(persisted ?? {}) };
        // Cinema implies a surface; image is the safe default if a stored
        // cinema state ever lacks one.
        if (next.mode === "cinema" && !CINEMA_MODES.includes(next.cinemaMode)) {
          next.cinemaMode = "image";
        }
        return next;
      },
      storage: browserStorage(),
      partialize: (state) => ({ mode: state.mode, cinemaMode: state.cinemaMode }),
    },
  ),
);

/* Cinema surface: the modes the app's generation panel offers under the clapper
   (이미지 · 비디오 · 시네마). Selecting the cinematic one keeps the composer but
   adds the character/camera tiles; image and video stay plain. */
export const CINEMA_MODES = ["image", "video", "cinematic"] as const;
export type CinemaMode = (typeof CINEMA_MODES)[number];
