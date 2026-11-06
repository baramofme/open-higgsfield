import { delay, http, HttpResponse } from "msw";

/* Canned responses for the AI Director's OpenAI-compatible endpoint. The
   pages that talk to the director (`DirectorPanel` inside `ProjectScreen`,
   `DirectorSettings`) build their URLs as `${baseUrl}/v1/models` and
   `${baseUrl}/v1/chat/completions`, so the handlers hang off the mock base
   URL the state provider seeds — a fixed origin, matched exactly. (MSW
   resolves a bare path against the document origin, so path-only patterns
   would silently miss a configured `baseUrl`; an exact origin is honest.)

   Response shapes are the ones the extraction helpers actually read:
   `extractModels` accepts `{ data: [...] }` / `{ models: [...] }` / a bare
   array; `extractResponseText` reads `choices[0].message.content` first and
   falls back to `choices[0].text`. The canned payloads below are valid for
   both readers, so the stories show real UI states, not error fallbacks. */

export const MOCK_DIRECTOR_BASE_URL = "https://mock.director.local";

export const MOCK_MODEL_IDS = ["mock-llama-3.1-8b", "mock-qwen-3", "mock-gpt-4o-mini"];

export const modelsHandler = http.get(
  `${MOCK_DIRECTOR_BASE_URL}/v1/models`,
  () =>
    HttpResponse.json({
      object: "list",
      data: MOCK_MODEL_IDS.map((id) => ({ id, owned_by: "storybook" })),
    }),
);

export const chatHandler = http.post(
  `${MOCK_DIRECTOR_BASE_URL}/v1/chat/completions`,
  async ({ request }) => {
    const body = (await request.json()) as {
      messages?: Array<{ role: string; content: string }>;
    };
    const asked = body.messages?.at(-1)?.content ?? "";
    return HttpResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: `목업 응답: "${asked.slice(0, 60)}" — msw가 엔드포인트 없이 되돌린 canned reply입니다.`,
          },
        },
      ],
    });
  },
);

/** Initial handlers: registered when the worker starts, survive the
    per-story reset, so every page story can assume them. */
export const mockLlmHandlers = [modelsHandler, chatHandler];

/** Override set for the ErrorState variant: same routes, failing statuses. */
export function failingHandlers(status = 502) {
  return [
    http.get(`${MOCK_DIRECTOR_BASE_URL}/v1/models`, () =>
      HttpResponse.json({ error: `mock ${status}` }, { status }),
    ),
    http.post(`${MOCK_DIRECTOR_BASE_URL}/v1/chat/completions`, () =>
      HttpResponse.json({ error: `mock ${status}` }, { status }),
    ),
  ];
}

/** Override set for the Loading variant: a model list that takes its time. */
export function slowHandlers(ms = 1500) {
  return [
    http.get(`${MOCK_DIRECTOR_BASE_URL}/v1/models`, async () => {
      await delay(ms);
      return HttpResponse.json({
        object: "list",
        data: MOCK_MODEL_IDS.map((id) => ({ id, owned_by: "storybook" })),
      });
    }),
  ];
}
