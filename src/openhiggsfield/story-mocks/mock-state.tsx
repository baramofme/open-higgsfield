import { useEffect, type ReactNode } from "react";
import type { Decorator } from "@storybook/react-vite";

import { useDirector } from "../../generation/stores/director";
import { useProjects, type Project } from "../../generation/stores/projects";
import { MOCK_DIRECTOR_BASE_URL } from "./handlers";

/* Page stories stand on global state (zustand singletons) and on the AI
   Director's OpenAI-compatible endpoint. Neither a live server nor a
   configured user exists inside the Storybook iframe: the stores hydrate
   empty and the director store carries no base URL, so a page that reads
   them renders blank or complains "엔드포인트가 설정되지 않았습니다".

   This module is the mock state provider for the Pages tree. The decorator
   seeds the stores synchronously before the story renders — zustand
   `setState` is outside React's render phase, so the first paint already
   sees the seeded state — and restores the previous snapshot when the story
   unmounts, keeping stories isolated from each other.

   Seed source: `parameters["mockState"]` on the story (or its meta), falling
   back to `DEFAULT_MOCK_STATE`. Siblings driving Loading/ErrorState variants
   pass their own mockState (or override `parameters.msw`); nobody should
   invent props that `ProjectScreen` does not actually take. */

/** A full, realistic project shelf: the default implicit shelf plus two named
    projects, so the header label and the picker both have real data to show. */
export const MOCK_PROJECT: Project = {
  id: "proj-story-demo",
  name: "시네마 프로젝트",
  private: true,
  createdAt: 1730000000000,
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-story-archive",
    name: "예전 편집본",
    private: true,
    createdAt: 1729000000000,
  },
  MOCK_PROJECT,
];

/** Shape of the seed. Both halves are optional; a story may replace one and
    leave the other to the default. */
export type MockState = {
  projects?: Project[];
  activeProjectId?: string;
  director?: Partial<{ baseUrl: string; modelId: string; ctx: number }>;
};

export const DEFAULT_MOCK_STATE: Required<MockState> = {
  projects: MOCK_PROJECTS,
  activeProjectId: MOCK_PROJECT.id,
  director: {
    baseUrl: MOCK_DIRECTOR_BASE_URL,
    modelId: "mock-llama-3.1-8b",
    ctx: 4096,
  },
};

function applySeed(mock: MockState) {
  if (mock.projects) useProjects.setState({ projects: mock.projects });
  if (mock.activeProjectId) useProjects.setState({ activeProjectId: mock.activeProjectId });
  if (mock.director) useDirector.setState({ ...useDirector.getState(), ...mock.director });
}

/* Restores the store snapshot the decorator captured, once the story tree
   tears down. Cross-story isolation: the next story re-seeds from its own
   parameters, not from whatever the previous one mutated. */
function RestoreBoundary({ children, onRestore }: { children: ReactNode; onRestore: () => void }) {
  useEffect(() => () => onRestore(), [onRestore]);
  return <>{children}</>;
}

/** Page-story decorator: wraps the story in the mock state provider. */
export const withMockState: Decorator = (Story, context) => {
  const prevProjects = useProjects.getState();
  const prevDirector = useDirector.getState();
  const mock = (context.parameters["mockState"] as MockState | undefined) ?? DEFAULT_MOCK_STATE;
  applySeed(mock);
  const restore = () => {
    useProjects.setState(prevProjects);
    useDirector.setState(prevDirector);
  };
  return <RestoreBoundary onRestore={restore}><Story /></RestoreBoundary>;
};
