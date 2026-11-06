import { delay, http, HttpResponse } from "msw";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProjectScreen } from "./project-screen";
import { MOCK_PROJECT, withMockState } from "./story-mocks/mock-state";
import { MOCK_DIRECTOR_BASE_URL, failingHandlers, slowHandlers } from "./story-mocks/handlers";

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

/** Fills the director prompt input (a controlled React input) and presses
    the send button, firing the POST /v1/chat/completions request. Returns
    the prompt input and send button elements. */
async function fillAndSend(canvasElement: HTMLElement) {
  const input = canvasElement.querySelector(
    'input[aria-label="디렉터 프롬프트"]',
  ) as HTMLInputElement | null;
  if (!input) return null;
  // React controlled input: native value setter + input event triggers onChange.
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  nativeSetter?.call(input, "테스트 전송");
  input.dispatchEvent(new Event("input", { bubbles: true }));

  const sendBtn = canvasElement.querySelector(
    'button[aria-label="전송"]',
  ) as HTMLButtonElement | null;
  sendBtn?.click();
  return { input, sendBtn };
}

/** The configured state: a named project in the header, the AI Director
    panel talking to the mock endpoint (no live server involved), and the
    local-only project chat seeded with its placeholder peers. */
export const Default: Story = {};

/**
 * Loading variant: the POST /v1/chat/completions endpoint hangs for several
 * seconds while the model list also answers slowly. The DirectorPanel's
 * send flow sets `sending=true`, which disables the prompt input and shows
 * "전송 중…" in the send button — a visible loading state. The `play`
 * function fills a prompt and presses Send to drive this state automatically.
 */
export const Loading: Story = {
  parameters: {
    msw: [
      ...slowHandlers(1500),
      // A deliberately slow chat completion — the sending state persists
      // for 8 seconds, making the loading UI visible for inspection.
      http.post(
        `${MOCK_DIRECTOR_BASE_URL}/v1/chat/completions`,
        async ({ request }) => {
          await delay(8000);
          const body = (await request.json()) as {
            messages?: Array<{ role: string; content: string }>;
          };
          const asked = body.messages?.at(-1)?.content ?? "";
          return HttpResponse.json({
            choices: [
              {
                message: {
                  role: "assistant",
                  content: `목업 응답: "${asked.slice(0, 60)}"`,
                },
              },
            ],
          });
        },
      ),
    ],
  },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
  },
};

/**
 * ErrorState variant: both endpoints return a 502 status. The DirectorPanel's
 * send flow catches the non-OK response and sets the inline error message
 * ("호출 실패 (502) — 모델과 엔드포인트가 올바른지 확인하세요."). The error
 * renders as an `ohf-director-error-inline` element with `role="alert"`,
 * demonstrating the error boundary path. The chat surface keeps its seeded
 * messages so the project context remains visible alongside the error.
 * The `play` function drives the send automatically so the error is visible
 * without manual interaction.
 */
export const ErrorState: Story = {
  parameters: {
    msw: failingHandlers(502),
  },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
  },
};
