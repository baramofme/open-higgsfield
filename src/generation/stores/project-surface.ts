import { create } from "zustand";
import { persist } from "zustand/middleware";

/* Project surface inside the cinematic mode.
 *
 * Higgsfield's project route replaces the whole studio: the sidebar swaps to
 * the project's own navigation (뒤로 · 프로젝트명 · 프로젝트 브리프 · 설정 ·
 * 요소 · 도구 · Canvas · 채팅 · AI 디렉터 · 폴더 · 모든 에셋 · 휴지통) and the
 * main column swaps to the project's panels. Locally we keep the same switch
 * in store state: opening a surface re-renders the rail, the layout and every
 * panel off this slice. `panel` mirrors HF's query params (?brief=1,
 * ?elements=1, /project/settings?tab=general) — one surface, six panel slots. */

export type ProjectPanel =
  | "assets"
  | "brief"
  | "settings"
  | "elements"
  | "chat"
  | "director"
  /* The drill-down screens this card ports. assets is the project drill-down
     (breadcrumb + folder panel + assets + rail); folders and trash are the
     folders/<uuid> and trash views reached from the folder panel. */
  | "folders"
  | "trash";

/** What the cinema canvas shows when no project is open. null = stage placeholder. */
export type CinemaView = "generations" | "elements" | "favorites";

type ProjectSurfaceState = {
  /** Which project the cinematic studio is standing in; null = studio rail. */
  projectId: string | null;
  /** Which panel the main column shows inside that project. */
  panel: ProjectPanel;
  /** When no project is open, the cinema canvas content. null = stage. */
  cinemaView: CinemaView | null;
  openSurface: (projectId: string) => void;
  closeSurface: () => void;
  setPanel: (panel: ProjectPanel) => void;
  setCinemaView: (view: CinemaView | null) => void;
};

export const useProjectSurface = create<ProjectSurfaceState>()(
  persist(
    (set) => ({
      projectId: null,
      panel: "assets",
      cinemaView: null,
      // Opening a project always starts on its asset feed, the way HF's
      // project route does; the rail's 모든 에셋 carries aria-current there.
      openSurface: (projectId) => set({ projectId, panel: "assets", cinemaView: null }),
      closeSurface: () => set({ projectId: null, panel: "assets", cinemaView: null }),
      setPanel: (panel) => set({ panel }),
      setCinemaView: (view) => set({ cinemaView: view }),
    }),
    { name: "openhiggsfield.projectSurface.v1" },
  ),
);
