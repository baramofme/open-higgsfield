import { delay, http, HttpResponse } from "msw";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test";

import { ProjectScreen } from "./project-screen";
import { MOCK_PROJECT, withMockState } from "./story-mocks/mock-state";
import {
  MOCK_DIRECTOR_BASE_URL,
  MOCK_MODEL_IDS,
  failingHandlers,
  slowHandlers,
} from "./story-mocks/handlers";

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
 * VARIANTS drive state through `parameters.msw` overrides — `ProjectScreen`
 * has no `isLoading` / `hasError` props; its loading and error states are
 * properties of the network call the handlers answer. Two distinct families of
 * loading/error surfaces are covered here:
 *
 *   1. Fetch-level (the settings panel's `모델 조회` round trip): `Loading`
 *      parks the panel in `조회 중…`, `ErrorState` shows `조회 실패 (502)` and
 *      proves the retry really re-issues `/v1/models`.
 *   2. Send-level (the director prompt's `전송` round trip): `ChatSendPending`
 *      parks the send button in `전송 중…`, `DirectorSendError` renders the
 *      inline `호출 실패 (502)` alert.
 *
 * RECONCILIATION NOTE (root t_16154220): two sibling branches rewrote this file
 * independently off the same infra base with different Loading/ErrorState
 * semantics — t_b7866ef5 (fetch-level, idiomatic `storybook/test` plays) and
 * t_8774c200 (send-level, raw-DOM). The fetch-level version is canonical here
 * (play-complete, the task's Interaction-Testing ask, twice CDP-verified); the
 * send-level version is preserved as the two extra exports below so neither
 * verified state is discarded. Each export carries exactly one play, so the two
 * families coexist without the single-export conflict the hotspot flagged.
 *
 * Play functions import from `storybook/test` (Storybook 10's own subpath —
 * `@storybook/test` is only a compatibility alias). In `storybook dev` the
 * browser interaction runner executes play automatically (autoplay is on
 * unless the iframe carries `?embed=true`), the instrumented `userEvent`/
 * `expect` report every step to the Interactions panel shipped by the core
 * manager, and a failed assertion lands the story in the `errored` phase
 * (`PLAY_FUNCTION_THREW_EXCEPTION` + `console.error` in the iframe).
 *
 * The store is never mutated from a play function — `withMockState` owns the
 * seed/restore isolation; interactions go through the UI paths the page
 * actually wires.
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

/** Types into a React-controlled <input> the way the component's `onChange`
    actually observes it: set the value through the native setter (bypassing
    React's own value tracking) and dispatch a bubbling `input` event so React's
    `onChange` fires with the new value. Storybook's instrumented `userEvent.type`
    does NOT propagate into these React 19 controlled inputs (a `toBeEnabled()`
    wait after it times out because the state never updates), so every play uses
    this instead. This is the same workaround sibling t_8774c200 verified. */
function typeInto(element: HTMLElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(element, text);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/** The configured state: a named project in the header, the AI Director
    panel talking to the mock endpoint (no live server involved), and the
    local-only project chat seeded with its placeholder peers. */
export const Default: Story = {
  play: async ({ canvas }) => {
    // Phase 1 — modal open/close. The settings panel is the surface's modal:
    // a full-swap of the project body driven by `ProjectScreen`'s local
    // `settingsOpen` state, reachable through the gear button.
    expect(canvas.queryByRole("dialog")).toBeNull();
    expect(canvas.getByRole("log", { name: "채팅 메시지" })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "AI 디렉터 설정" }));
    const dialog = await canvas.findByRole("dialog", { name: "AI 디렉터 설정" });
    expect(dialog).toBeInTheDocument();
    // The body swapped to the settings surface: the chat slot is unmounted
    // while open, and the header exit re-aims at the director.
    expect(canvas.queryByRole("log", { name: "채팅 메시지" })).toBeNull();
    expect(canvas.getByRole("button", { name: "AI 디렉터로 돌아가기" })).toBeInTheDocument();

    await userEvent.click(await canvas.findByRole("button", { name: "설정 닫기" }));
    await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
    expect(canvas.getByRole("log", { name: "채팅 메시지" })).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "대시보드로 돌아가기" })).toBeInTheDocument();
    // 복귀 확인: 설정된 모델은 배지(도구 헤드)와 메타 줄 두 곳에 뜬다 —
    // `getAllByText` 로 두 surfaces 가 모두 살아있음을 셉니다 (findByText 는
    // 모호한 쿼리라 play 를 떨군다).
    expect(canvas.getAllByText("mock-llama-3.1-8b").length).toBe(2);

    // Phase 2 — chat send through the component-local path (no backend):
    // the message list grows by one and the input clears.
    const chatLog = canvas.getByRole("log", { name: "채팅 메시지" });
    const before = chatLog.children.length;
    const chatInput = canvas.getByPlaceholderText("메시지를 입력해 보세요");
    typeInto(chatInput, "플레이 함수 검증");
    // React 19 defers the commit that flips `disabled`; wait for it.
    const sendChatBtn = canvas.getByRole("button", { name: "보내기" });
    await waitFor(() => expect(sendChatBtn).toBeEnabled());
    await userEvent.click(sendChatBtn);
    await waitFor(() => expect(chatLog.children.length).toBe(before + 1), { timeout: 4000 });
    expect(within(chatLog).getByText("플레이 함수 검증")).toBeInTheDocument();
    expect((chatInput as HTMLInputElement).value).toBe("");

    // Phase 3 — director send through the MSW round trip. There is no live
    // server: the worker answers `/v1/chat/completions`, so the reply must be
    // recognised by the mock phrase (`목업 응답:`), not by any real content.
    const promptInput = canvas.getByRole("textbox", { name: "디렉터 프롬프트" });
    const sendButton = canvas.getByRole("button", { name: "전송" });
    expect(sendButton).toBeDisabled();
    typeInto(promptInput, "플레이 함수 검증");
    await waitFor(() => expect(sendButton).toBeEnabled());
    await userEvent.click(sendButton);
    const directorLog = canvas.getByRole("log", { name: "디렉터 응답" });
    const reply = await waitFor(
      () => within(directorLog).getByText(/^목업 응답:/),
      { timeout: 4000 },
    );
    expect(reply.textContent).toContain("플레이 함수 검증");
  },
};

/** Loading state (fetch-level): `slowHandlers` delays `GET /v1/models`, so
    pressing `모델 조회` parks the settings panel in its `조회 중…` state and
    the model list is absent until the delayed response lands. */
export const Loading: Story = {
  parameters: {
    msw: slowHandlers(800),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "AI 디렉터 설정" }));
    const dialog = await canvas.findByRole("dialog", { name: "AI 디렉터 설정" });
    const fetchButton = within(dialog).getByRole("button", { name: "모델 조회" });

    await userEvent.click(fetchButton);
    // Still in flight: the button carries the fetching label, is locked, and
    // no model list has been rendered yet.
    expect(await within(dialog).findByText("조회 중…")).toBeInTheDocument();
    expect(fetchButton).toBeDisabled();
    expect(within(dialog).queryByRole("group")).toBeNull();

    // The delay resolves: content appears — every mock id the canned payload
    // declares is selectable. `waitFor` carries the polling budget because the
    // handler's `delay()` outlives the default `findBy*` timeout.
    const options = await waitFor(
      () => within(dialog).getByRole("group"),
      { timeout: 4000 },
    );
    expect(options).toBeInTheDocument();
    for (const id of MOCK_MODEL_IDS) {
      expect(within(options).getByText(id)).toBeInTheDocument();
    }
    await waitFor(() => expect(fetchButton).toBeEnabled());
    expect(within(dialog).queryByRole("alert")).toBeNull();
  },
};

/** Error state (fetch-level): `failingHandlers` answers the same routes with
    502, so the settings panel shows `조회 실패 (502)` in a live alert. There is
    no literal "Retry" control — pressing `모델 조회` again is the retry path
    the surface actually offers, and a `window.fetch` spy proves the retry
    really re-issues the request instead of only re-rendering the old error. */
export const ErrorState: Story = {
  parameters: {
    msw: failingHandlers(502),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "AI 디렉터 설정" }));
    const dialog = await canvas.findByRole("dialog", { name: "AI 디렉터 설정" });
    const fetchButton = within(dialog).getByRole("button", { name: "모델 조회" });

    const fetchSpy = spyOn(window, "fetch");
    try {
      await userEvent.click(fetchButton);
      const alert = await within(dialog).findByRole("alert");
      expect(alert).toHaveTextContent("조회 실패 (502)");
      const attempted = () =>
        fetchSpy.mock.calls.filter((call) => String(call[0]).includes("/v1/models")).length;
      expect(attempted()).toBe(1);

      // Retry: the same handler must run again — the spy counts a second
      // `/v1/models` call and the alert re-materialises from the fresh
      // failure, not from a stale render.
      await userEvent.click(fetchButton);
      await waitFor(() => expect(attempted()).toBe(2));
      expect(await within(dialog).findByRole("alert")).toHaveTextContent("조회 실패 (502)");
    } finally {
      fetchSpy.mockRestore();
    }
  },
};

/** Send-level loading — a deliberately slow `POST /v1/chat/completions` keeps
    the director send flow parked in its `전송 중…` state: the send button
    switches to the pending label and the prompt input is locked for as long as
    the request is in flight. Preserved from sibling t_8774c200 (d2030c1) so the
    chat-send loading state remains on the design system. */
export const ChatSendPending: Story = {
  parameters: {
    msw: [
      ...slowHandlers(1500),
      http.post(`${MOCK_DIRECTOR_BASE_URL}/v1/chat/completions`, async ({ request }) => {
        // A long delay so the pending state stays on screen long enough to
        // observe and to let the assertions land before the reply arrives.
        await delay(8000);
        const body = (await request.json()) as {
          messages?: Array<{ role: string; content: string }>;
        };
        const asked = body.messages?.at(-1)?.content ?? "";
        return HttpResponse.json({
          choices: [{ message: { role: "assistant", content: `목업 응답: "${asked.slice(0, 60)}"` } }],
        });
      }),
    ],
  },
  play: async ({ canvas }) => {
    const promptInput = canvas.getByRole("textbox", { name: "디렉터 프롬프트" });
    const sendButton = canvas.getByRole("button", { name: "전송" });
    expect(sendButton).toBeDisabled();
    typeInto(promptInput, "테스트 전송");
    await waitFor(() => expect(sendButton).toBeEnabled());
    await userEvent.click(sendButton);
    // `sending` flips synchronously on click, so the pending label and the
    // locked input are observable without a `waitFor`.
    expect(sendButton).toHaveTextContent("전송 중…");
    expect(sendButton).toBeDisabled();
    expect(promptInput).toBeDisabled();
  },
};

/** Send-level error — both routes answer 502, so the director send flow
    catches the non-OK response and renders the inline error
    (`호출 실패 (502) …`) inside `ohf-director-error-inline` with `role="alert"`,
    demonstrating the error-boundary path. The chat surface keeps its seeded
    messages so the project context stays visible next to the error. Preserved
    from sibling t_8774c200 (d2030c1). */
export const DirectorSendError: Story = {
  parameters: {
    msw: failingHandlers(502),
  },
  play: async ({ canvas }) => {
    const promptInput = canvas.getByRole("textbox", { name: "디렉터 프롬프트" });
    const sendButton = canvas.getByRole("button", { name: "전송" });
    typeInto(promptInput, "테스트 전송");
    await waitFor(() => expect(sendButton).toBeEnabled());
    await userEvent.click(sendButton);
    const alert = await canvas.findByRole("alert");
    expect(alert).toHaveTextContent("호출 실패 (502)");
    // After the failure the surface releases `sending`, so the send button is
    // clickable again and the prompt input is re-enabled.
    await waitFor(() => expect(sendButton).toBeEnabled());
    expect(promptInput).toBeEnabled();
  },
};
