import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProjectScreen } from "./project-screen";
import { MOCK_PROJECT, withMockState } from "./story-mocks/mock-state";

/**
 * Page story for the project detail surface — the reference implementation of
 * the Pages tree infrastructure (`story-mocks/`): the mock state provider
 * seeds the zustand singletons the page reads, the MSW worker (started by
 * `.storybook/preview.ts`) answers the AI Director's OpenAI-compatible calls,
 * and `layout: "fullscreen"` shows the surface as a page, not a card.
 *
 * Page units are the screen-composite exports the inventory carved out
 * (ProjectScreen, DirectorPanel, ProjectChat, CinemaStudioScreen, …) — they
 * are deliberately NOT design-system atoms, so this subtree lives under the
 * top-level `Pages/` folder, outside `Design System / Components`.
 *
 * Variants (Loading / ErrorState) must drive state through
 * `parameters["mockState"]` and `parameters.msw` overrides — `ProjectScreen`
 * has no `isLoading` / `hasError` props; its loading and error states are
 * properties of the network call the handlers answer.
 */

const meta: Meta<typeof ProjectScreen> = {
  title: "Pages/ProjectScreen",
  component: ProjectScreen,
  tags: ["autodocs"],
  parameters: {
    // A page reads best across the whole viewport, not inside the storybook
    // chrome's padded center. The global `.ohf` decorator still supplies the
    // tokens; its 32px padding insets the page edges.
    layout: "fullscreen",
  },
  decorators: [withMockState],
  args: {
    projectId: MOCK_PROJECT.id,
    // The dashboard hands the surface a real handler in the app; in the
    // storybook there is no dashboard to go back to, so the exit is a no-op.
    onExit: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ProjectScreen>;

/** The configured state: a named project in the header, the AI Director
    panel talking to the mock endpoint (no live server involved), and the
    local-only project chat seeded with its placeholder peers. */
export const Default: Story = {};
