import { test, expect } from "@playwright/test";

import { openMenu, typePrompt, runMenuEndToEnd } from "../harness";

/**
 * image menu — the 이미지 surface and its inline composer/gallery.
 *
 * The image surface renders its create dock beside a gallery that is always on
 * screen, so a run's card shows up without a panel switch. These two tests cover
 * both halves of the acceptance bar: the full image→backend→tile round-trip, and
 * the menu's own interactions (the composer's prompt field and create button).
 */

test.describe("image menu", () => {
  test("generates an image end-to-end against the mock backend", async ({ page }) => {
    await page.goto("/");
    await runMenuEndToEnd(page, "image", "A cinematic photograph of a lone lighthouse at dusk");
  });

  test("the image composer wires its prompt and create controls", async ({ page }) => {
    await page.goto("/");
    await openMenu(page, "image");

    // the create button stays inert until a caption exists, then arms on text
    const generate = page.locator("button.ohf-generate").first();
    await expect(generate).toBeDisabled();

    await typePrompt(page, "image", "a field of red poppies under soft light");
    await expect(generate).toBeEnabled();

    // the prompt the composer holds is the caption it will send
    await expect(page.locator('textarea[aria-label="Prompt"]').first()).toHaveValue(
      "a field of red poppies under soft light",
    );
  });
});
