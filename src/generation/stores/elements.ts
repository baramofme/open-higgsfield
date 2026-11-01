import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

/** Project kinds the element form offers, mirroring the app's 카테고리 menu
 *  (자동 characters place prop) and its 상태 menu (없음 진행중 검토필요). English
 *  values stand per the labels ruling; the display copy stays Korean elsewhere. */
export type ElementCategory = "auto" | "character" | "place" | "prop";
export type ElementStatus = "none" | "progress" | "review";

/** One key/value row the visitor adds under 커스텀 속성. */
export type ElementAttr = { key: string; value: string };

/** A named attachment the prompt can point at with "@name" — the image-form's
 *  요소 feature, grown to the app's element record: the category it files under,
 *  the display name, the version stamp, the @ handle (요소 ID), what it is, the
 *  workflow state it sits in, the visitor's own attributes and — reserved for the
 *  cloud flow we do not run — the performer slot. Elements are chosen from the
 *  plane's attached media, so a mention resolves to something the visitor chose. */
export type ElementItem = {
  id: string;
  name: string;
  url: string;
  projectId: string;
  category: ElementCategory;
  version: string;
  /** The @ handle the app shows as 예: char_oli_v1. It supplements the name;
      mentions keep working by name regardless, so a blank one is harmless. */
  elementId: string;
  description: string;
  status: ElementStatus;
  attrs: ElementAttr[];
  /** Reserved: the app lets an AI influencer perform an element; the local
      backend knows no such thing, so the form offers only "no performer". */
  performer: string | null;
};

/** Everything the form does not ask for lands on these defaults — auto category,
    the default project, no version, no handle, no description, no state. */
export const ELEMENT_DEFAULTS = {
  projectId: "default",
  category: "auto" as ElementCategory,
  version: "",
  elementId: "",
  description: "",
  status: "none" as ElementStatus,
  attrs: [] as ElementAttr[],
  performer: null as string | null,
};

type ElementState = {
  items: ElementItem[];
  add: (item: ElementItem) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<Omit<ElementItem, "id">>) => void;
};

export const useElements = create<ElementState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((state) => ({ items: [...state.items, item] })),
      rename: (id, name) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, name } : item)),
        })),
      remove: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      update: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),
    }),
    {
      name: "openhiggsfield.elements.v1",
      version: 2,
      storage: browserStorage(),
      /* Records saved before the project era carry only id/name/url; they belong
         to the default project and wear the default record. */
      migrate: (persisted, version) => {
        const state = persisted as ElementState;
        if (version < 2 && Array.isArray(state?.items)) {
          state.items = state.items.map((item) => ({ ...ELEMENT_DEFAULTS, ...item }));
        }
        return state;
      },
      partialize: (state) => ({
        items: state.items.filter((item) => !item.url.startsWith("blob:")),
      }),
    },
  ),
);

/** Names start as 요소 1, 요소 2… and the visitor overwrites them; the counter
 *  only advances over names actually taken, so deletes don't skip numbers. */
export function nextElementName(items: ElementItem[]): string {
  const taken = new Set(items.map((item) => item.name));
  let n = 1;
  while (taken.has(`요소 ${n}`)) n += 1;
  return `요소 ${n}`;
}

/** Category display copy — English stands, per the labels ruling; the Korean
    words the app uses are noted beside each value. */
export const ELEMENT_CATEGORY_LABELS: Record<ElementCategory, string> = {
  auto: "Auto",
  character: "Characters",
  place: "Places",
  prop: "Props",
};

export const ELEMENT_STATUS_LABELS: Record<ElementStatus, string> = {
  none: "No status",
  progress: "In progress",
  review: "Needs review",
};
