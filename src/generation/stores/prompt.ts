import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

type PromptState = {
  text: string;
  setText: (text: string) => void;
};

function createPromptStore(name: string) {
  return create<PromptState>()(
    persist(
      (set) => ({
        text: "",
        setText: (text) => set((state) => (state.text === text ? state : { text })),
      }),
      { name, storage: browserStorage(), partialize: (state) => ({ text: state.text }) },
    ),
  );
}

export const useImagePrompt = createPromptStore("openhiggsfield.imagePrompt.v1");
export const useVideoPrompt = createPromptStore("openhiggsfield.videoPrompt.v1");
/* The audio surface keeps its own caption. Reusing the video prompt would bleed
   a music style description into the video field (and back), so audio gets a
   store of its own — the same factory, a distinct persistence key. */
export const useAudioPrompt = createPromptStore("openhiggsfield.audioPrompt.v1");
