import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

/** Whether the project detail screen is up and which project it shows. The
    dashboard swaps its shell for the ProjectScreen while open is true — the
    same swap pattern the cinematic surface uses for its own full-screen mode. */
type ProjectViewState = {
  open: boolean;
  projectId: string | null;
  openProject: (id: string) => void;
  closeProject: () => void;
};

export const useProjectView = create<ProjectViewState>()(
  persist(
    (set) => ({
      open: false,
      projectId: null,
      openProject: (id) => set({ open: true, projectId: id }),
      closeProject: () => set({ open: false, projectId: null }),
    }),
    {
      name: "openhiggsfield.projectView.v1",
      storage: browserStorage(),
      partialize: (state) => ({ open: state.open, projectId: state.projectId }),
    },
  ),
);
