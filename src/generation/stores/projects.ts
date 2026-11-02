import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";

/** The app gathers elements into projects: general work draws on the default
 *  shelf (내 요소), while the cinematic surface loads a project and keeps its
 *  elements, uploads and runs inside it. The default project is implicit —
 *  it is what an element wears when nothing else is chosen — so it never needs
 *  to be created, listed or deleted. */
export const DEFAULT_PROJECT_ID = "default";
export const DEFAULT_PROJECT_LABEL = "내 요소";

export type Project = {
  id: string;
  name: string;
  /** The app marks a project 비공개 (private) in its chips; invites to a shared
      project sit behind a paid plan we do not run, so private is the only state
      a local project can show. */
  private: boolean;
  createdAt: number;
};

type ProjectState = {
  projects: Project[];
  /** The project the cinematic surface is standing in. Elements, mentions and
      finished runs gather under it while it is chosen. */
  activeProjectId: string;
  addProject: (name: string, isPrivate?: boolean) => Project;
  renameProject: (id: string, name: string) => void;
  removeProject: (id: string) => void;
  setActive: (id: string) => void;
};

function newId(): string {
  return `proj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useProjects = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: DEFAULT_PROJECT_ID,
      addProject: (name) => {
        const project: Project = {
          id: newId(),
          name: name.trim() || "새 프로젝트",
          private: true,
          createdAt: Date.now(),
        };
        set((state) => ({ projects: [...state.projects, project] }));
        return project;
      },
      renameProject: (id, name) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, name } : p)),
        })),
      removeProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? DEFAULT_PROJECT_ID : state.activeProjectId,
        }));
      },
      setActive: (id) => set({ activeProjectId: id }),
    }),
    {
      name: "openhiggsfield.projects.v1",
      storage: browserStorage(),
    },
  ),
);

/** Resolve any project id to the label the chips and dropdowns show. */
export function projectLabel(projects: Project[], id: string): string {
  if (id === DEFAULT_PROJECT_ID) return DEFAULT_PROJECT_LABEL;
  return projects.find((p) => p.id === id)?.name ?? DEFAULT_PROJECT_LABEL;
}
