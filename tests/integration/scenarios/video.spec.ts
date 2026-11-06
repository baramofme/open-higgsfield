import { test, expect } from "@playwright/test";

import { openMenu, showRecordPanel, typePrompt, runMenuEndToEnd } from "../harness";

/**
 * video menu — the 비디오 surface and its nested create tabs (비디오 만들기 ·
 * 비디오 편집 · Motion Control).
 *
 * The create grid splits into a left create card and a right feed. The feed lands
 * on the showcase panel by default, so a run's card only renders once the 기록 tab
 * moves the feed to the history gallery. These tests exercise the full
 * video→backend→tile round-trip and the menu's own interactions (the subtab strip
 * and the create card's prompt/CTA gating).
 */

test.describe("video menu", () => {
  test("generates a video end-to-end against the mock backend", async ({ page }) => {
    await page.goto("/");
    await runMenuEndToEnd(page, "video", "A slow drone shot drifting over a snow-covered valley");
  });

  test("the create tab strip and the make card are wired", async ({ page }) => {
    await page.goto("/");
    await openMenu(page, "video");

    // the three video subtabs the shell mirrors are all present
    await expect(page.getByRole("tab", { name: "비디오 만들기" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "비디오 편집" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Motion Control" })).toBeVisible();

    // the make card's create button gates on a non-empty caption
    const cta = page.locator("button.ohf-gct-cta").first();
    await expect(cta).toBeDisabled();
    await typePrompt(page, "video", "a timelapse of city traffic at night");
    await expect(cta).toBeEnabled();

    // switching to Motion Control and back keeps the make card reachable
    await page.getByRole("tab", { name: "Motion Control" }).click();
    await page.getByRole("tab", { name: "비디오 만들기" }).click();
    await showRecordPanel(page, "video");
    await typePrompt(page, "video", "a drone orbiting a cliff at golden hour");
    await expect(page.locator("button.ohf-gct-cta").first()).toBeEnabled();
  });
});
