# Integration test framework (UI + BE co-testing)

A lightweight Playwright harness that boots the **real Next server** and a
**mock comfy-webui backend**, then drives each of the three menus — 이미지 · 비디오
· 오디오 — end to end. A real UI press runs the actual pipeline (server action →
platform client → Gradio queue-REST → poll → history → tile), so a future change
to the UI or the backend is caught without manual QA.

## Run it

```bash
# everything (all three menus, end to end)
pnpm test:integration            # or: npm test:integration

# only the menus a change actually touched (what CI runs on a PR)
pnpm test:integration:changed -- --base <merge-base-sha>
pnpm test:integration:changed -- --base <sha> --print-only   # preview the selection
```

First run on a fresh machine needs the browser once: `npx playwright install chromium`.
On this host the Chromium headless shell is already cached, so it is skipped.

## How it is put together

| file | role |
|------|------|
| `playwright.config.ts` | boots `next dev` on :3130 (`webServer`), starts the mock via `globalSetup`, points one headless Chromium at it |
| `global-setup.mts` | starts the mock backend on :3131 before the run, closes it after |
| `mock-gradio-server.mts` | the backend stub — speaks the same Gradio queue-REST contract `cfwui-platform.ts` does, answers every run "completed" instantly with a deterministic media URL |
| `harness.ts` | the selectors + helpers every scenario shares (open a menu, pick the local model, write a caption, press the CTA, watch a card complete) |
| `change-detect.mts` | pure function: changed paths → which menus to run |
| `run-changed.mts` | resolves the git diff and hands the chosen specs to Playwright |
| `scenarios/*.spec.ts` | the three menu suites |

### Why the mock is shaped like Gradio

The app talks to comfy-webui over Gradio's queue-REST
(`POST /gradio_api/call/{api}` → `event_id`, `GET .../{event_id}` → an SSE stream
whose `event: complete` carries the result). The stub reproduces exactly that, so
the production transport code runs unchanged — nothing about the submit/poll path
is faked inside the app. A run's task id is minted with the real family prefix
(`img_task` / `ltx2_5_task`) so the poll routes to the right status endpoint, and
every status answers `completed` on the first call. Media URLs point at the stub's
own origin so the tile loads the bytes from there.

### LAN mode, no key

With `CFWUI_BASE_URL` set (the config passes it to the dev server),
`hasPlatformCredentials()` returns true, so pressing Generate never demands a
platform key. Each menu runs the catalogue's **local** model
(`Krea 2 Turbo` · `LTX 2.5 (Local)` · `MiniMax Music 3 (Local)`), which dispatch to
the stub instead of the cloud.

## How the subset is chosen

`change-detect.mts` classifies changed paths:

- **shared / backend** — `src/generation/**`, `src/app/api/**`, the app shell
  (`openhiggsfield-app.tsx`), `topbar/gallery/viewer/feed-header/data/ui`, any
  `.css`, `next.config.ts` → **run all three** (the change can affect every menu).
- **single-surface UI** — composer/image-workspace/crop/inpaint → image;
  video-edit/media-tray/cinema/camera/lighting → video; use-audio-waveform → audio.
- `general-create-tabs.tsx` is shared by the video **and** audio shells → runs both.

If the diff can't be resolved (no/unknown base), it runs the full suite — it will
never run fewer tests than a change warrants.

## Adding a new scenario

Add a file under `tests/integration/scenarios/` and reuse the helpers in
`harness.ts`. The two-line happy path:

```ts
import { test } from "@playwright/test";
import { runMenuEndToEnd } from "../harness";

test("audio reuses a finished clip end-to-end", async ({ page }) => {
  await page.goto("/");
  await runMenuEndToEnd(page, "audio", "A warm lo-fi beat with soft piano");
});
```

For a focused interaction test, call the granular helpers directly
(`openMenu`, `typePrompt`, `pressGenerate`, `showRecordPanel`, and assert with
`expect`). New selectors belong in `harness.ts`, not inline in a spec — keeping
them in one place is what stops a refactor of the UI from scattering breakage
across every scenario.

Two rules keep the subset honest:

1. **Name the surface you touch.** If a new spec drives the video menu, put its
   selectors under the video seat so `change-detect` still routes video-only
   changes to it. If it drives shared surface behaviour, expect it to run under
   the full suite.
2. **A new menu needs an entry in `harness.ts`.** Add its `MENU_LABEL`,
   `LOCAL_MODEL_LABEL`, `EXPECTED_MEDIA`, and `SELECTORS`, then its owned-file
   lists in `change-detect.mts`, so a change to that menu's components selects it.

## CI

`.github/workflows/integration.yml` runs the relevant subset on every PR by
calling `pnpm test:integration:changed -- --base <pr-base-sha>`.
