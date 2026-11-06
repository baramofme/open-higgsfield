import { test, expect } from "@playwright/test";

import { openMenu, showRecordPanel, typePrompt, runMenuEndToEnd } from "../harness";

/**
 * audio menu — the 오디오 surface and its single 오디오 만들기 card.
 *
 * Audio runs through the same submit→poll path as image and video, but the local
 * audio endpoint is synchronous: it returns the finished file URL inside the
 * request id, so the run resolves on the poll's first tick. The tile renders as a
 * player card. These tests cover the audio→backend→tile round-trip and the card's
 * own prompt/CTA gating.
 */

test.describe("audio menu", () => {
  test("generates a clip end-to-end against the mock backend", async ({ page }) => {
    await page.goto("/");
    await runMenuEndToEnd(page, "audio", "A warm lo-fi beat with a soft jazzy piano");
  });

  test("the audio card gates its create button on a caption", async ({ page }) => {
    await page.goto("/");
    await openMenu(page, "audio");
    // the audio surface exposes one subtab
    await showRecordPanel(page, "audio");
    const makeTab = page.getByRole("tab", { name: "오디오 만들기" });
    await expect(makeTab).toBeVisible();

    const cta = page.locator("button.ohf-gct-generate").first();
    await expect(cta).toBeDisabled();

    await typePrompt(page, "audio", "a calm ambient loop for focus");
    await expect(cta).toBeEnabled();
    await expect(page.locator('textarea[aria-label="프롬프트"]').first()).toHaveValue(
      "a calm ambient loop for focus",
    );
  });
});
