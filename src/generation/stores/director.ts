import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

/** The AI Director's endpoint configuration — which OpenAI-compatible base
    URL, which model id, and the context size to send. This store is the
    single source of truth for the configured model id; the director call
    and the picker both read it. */
type DirectorState = {
  baseUrl: string;
  modelId: string;
  ctx: number;
  /** Commits a full configuration (baseUrl, model, ctx). Called by the
      settings surface's "추가/저장" button. */
  setConfig: (baseUrl: string, modelId: string, ctx: number) => void;
  /** Clears the configuration — no endpoint, no model. */
  clear: () => void;
};

const DEFAULT_CTX = 4096;

export const useDirector = create<DirectorState>()(
  persist(
    (set) => ({
      baseUrl: "",
      modelId: "",
      ctx: DEFAULT_CTX,
      setConfig: (baseUrl, modelId, ctx) => set({ baseUrl, modelId, ctx }),
      clear: () => set({ baseUrl: "", modelId: "", ctx: DEFAULT_CTX }),
    }),
    {
      name: "openhiggsfield.director.v1",
      storage: browserStorage(),
      partialize: (state) => ({
        baseUrl: state.baseUrl,
        modelId: state.modelId,
        ctx: state.ctx,
      }),
    },
  ),
);
