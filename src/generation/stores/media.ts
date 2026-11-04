import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { MediaItem, MediaRole } from "../catalog/types";
import { browserStorage } from "./browser-storage";

type MediaState = {
  items: MediaItem[];
  add: (item: MediaItem) => void;
  remove: (id: string) => void;
  /** Re-tag one held attachment without disturbing its place in the strip.
      "Use as next" re-points the same picture to a different role (start · end ·
      reference); a remove-then-add would send it to the tail and shift every
      `@`-mention index after it, so the role is written in place instead. */
  setRole: (id: string, role: MediaRole) => void;
};

function createMediaStore(name: string) {
  return create<MediaState>()(
    persist(
      (set) => ({
        items: [],
        add: (item) => set((state) => ({ items: [...state.items, item] })),
        remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
        setRole: (id, role) =>
          set((state) => ({
            items: state.items.map((item) => (item.id === id ? { ...item, role } : item)),
          })),
      }),
      {
        name,
        storage: browserStorage(),
        partialize: (state) => ({
          items: state.items.filter((item) => !item.url.startsWith("blob:")),
        }),
      },
    ),
  );
}

export const useImageMedia = createMediaStore("openhiggsfield.imageMedia.v1");
export const useVideoMedia = createMediaStore("openhiggsfield.videoMedia.v1");
