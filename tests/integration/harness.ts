/**
 * harness.ts — shared helpers for the UI+BE integration scenarios.
 *
 * Everything a scenario needs to drive one of the three menus (이미지 · 비디오 ·
 * 오디오) end-to-end lives here: open the menu, pick a local model, write a
 * caption, press the create CTA, then watch the run go from a "Rendering"
 * skeleton to a completed tile that carries the backend's media URL. Centralising
 * the selectors here is what makes adding a new scenario cheap — the spec just
 * calls these functions and asserts what matters.
 *
 * The menus are reached through the topbar nav (`nav[aria-label="Main"]`), whose
 * 이미지/비디오/오디오 pills switch the studio surface. The create controls differ
 * per surface, so each menu carries its own selector set below.
 */

import { expect, type Page } from "@playwright/test";

export type Menu = "image" | "video" | "audio";

/** The label the app's topbar pill wears for each menu. */
export const MENU_LABEL: Record<Menu, string> = {
  image: "이미지",
  video: "비디오",
  audio: "오디오",
};

/** The local model each menu runs in LAN mode (so the press reaches the mock
 *  instead of the cloud, which would demand a platform key). These are the
 *  catalogue's first-per-surface models, so switching to a menu selects them;
 *  picking them again through the model control is how a scenario proves the
 *  picker is wired, not how it makes the run work. */
export const LOCAL_MODEL_LABEL: Record<Menu, string> = {
  image: "Krea 2 Turbo",
  video: "LTX 2.5 (Local)",
  audio: "MiniMax Music 3 (Local)",
};

/** The media filename the mock hands back per kind. A completed tile must carry
 *  it so the backend URL round-tripped through the whole pipeline. The substring
 *  is just the filename, not the full path: the image tile runs its URL through
 *  the same-origin proxy (`/api/ohf-image?file=…`), where the slash is
 *  percent-encoded, while video and audio tiles load the raw URL unchanged. Both
 *  forms contain the bare filename, so this assertion holds whichever one lands. */
export const EXPECTED_MEDIA: Record<Menu, string> = {
  image: "out.png",
  video: "out.mp4",
  audio: "out.mp3",
};

type MenuSelectors = {
  prompt: string;
  generate: string;
};

const SELECTORS: Record<Menu, MenuSelectors> = {
  image: {
    prompt: 'textarea[aria-label="Prompt"]',
    generate: "button.ohf-generate",
  },
  video: {
    prompt: 'textarea[aria-label="프롬프트"]',
    generate: "button.ohf-gct-cta",
  },
  audio: {
    prompt: 'textarea[aria-label="프롬프트"]',
    generate: "button.ohf-gct-generate",
  },
};

/** Open a menu by pressing its topbar pill. This switches the studio surface, so
 *  the create controls below the pills re-render for that menu. */
export async function openMenu(page: Page, menu: Menu): Promise<void> {
  await page.locator('nav[aria-label="Main"]').getByRole("button", { name: MENU_LABEL[menu] }).click();
}

/**
 * The image surface keeps its gallery inline, so a run's card appears without a
 * panel switch. The video and audio surfaces land on the showcase panel by
 * default; the 기록 tab moves them to the history gallery where the card renders.
 * Call this for video and audio before pressing generate so the skeleton has
 * somewhere to show up.
 */
export async function showRecordPanel(page: Page, menu: Menu): Promise<void> {
  if (menu === "image") return;
  await page.getByRole("tab", { name: "기록" }).click();
}

/** Write the caption the create card sends to the backend. */
export async function typePrompt(page: Page, menu: Menu, text: string): Promise<void> {
  const field = page.locator(SELECTORS[menu].prompt).first();
  await field.click();
  await field.fill(text);
}

/**
 * Open the model control and choose the local model by its label, then assert the
 * control now reads that label. This is a real menu interaction — the picker
 * opening, listing models, and the card honouring the pick — so it doubles as a
 * regression guard for the model selector, not just a way to make the run land.
 */
export async function selectLocalModel(page: Page, menu: Menu): Promise<void> {
  const label = LOCAL_MODEL_LABEL[menu];
  if (menu === "image") {
    // the image seat opens a Models dialog whose rows are .ohf-model-row
    await page.locator("button.ohf-ctl--model").click();
    await page
      .getByRole("dialog", { name: "Models" })
      .locator(".ohf-model-row")
      .filter({ hasText: label })
      .first()
      .click();
    await expect(page.locator("button.ohf-ctl--model").locator(".ohf-ctl-name")).toHaveText(label);
    return;
  }
  // video and audio seats raise a 모델 dial whose rows are .ohf-gct-model-item
  await page.locator("button[data-model-select-trigger], button.ohf-gct-dial-btn").filter({ hasText: "모델" }).first().click();
  await page.locator(".ohf-gct-model-item").filter({ hasText: label }).first().click();
  // the dial's value now echoes the chosen model
  await expect(page.locator(".ohf-gct-hval-text, .ohf-gct-dial-btn").filter({ hasText: label }).first()).toBeVisible();
}

/** Press the menu's create button and make sure it actually fires. */
export async function pressGenerate(page: Page, menu: Menu): Promise<void> {
  const cta = page.locator(SELECTORS[menu].generate).first();
  await expect(cta).toBeEnabled();
  await cta.click();
}

/** A run in flight reads as a "Rendering" skeleton carrying its model label. */
export async function expectRenderingCard(page: Page, menu: Menu): Promise<void> {
  const modelLabel = LOCAL_MODEL_LABEL[menu];
  await expect(
    page.locator(".ohf-skeleton").filter({ hasText: "Rendering" }).or(
      page.locator(`[aria-label="${modelLabel} rendering"]`),
    ).first(),
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * A completed run renders as a `.ohf-tile` whose media element points at the
 * backend's URL. Asserting the URL substring is what proves the whole pipeline
 * (server action → cfwui submit → poll → history → tile) round-tripped the value
 * the mock returned, rather than a tile merely appearing for some other reason.
 */
export async function expectCompletedTile(page: Page, menu: Menu): Promise<void> {
  const tile = page.locator(".ohf-tile").first();
  await expect(tile).toBeVisible({ timeout: 25_000 });
  const expected = EXPECTED_MEDIA[menu];
  // the tile's media element (img / video / audio) must carry the mock's URL
  await expect(
    tile.locator(`[src*="${expected}"]`).or(
      tile.locator(`[data-feed-image-source*="${expected}"]`),
    ).first(),
  ).toBeVisible({ timeout: 5_000 });
}

/**
 * Run one menu end-to-end: open the menu, switch to the history gallery where the
 * card will render (video/audio only), choose the local model through the picker,
 * write a caption, press generate, then watch a Rendering skeleton resolve into a
 * completed tile that carries the mock's media URL.
 *
 * Returns nothing — the assertions inside are the test. A scenario that wants its
 * own twist calls the granular helpers above instead of this wrapper.
 */
export async function runMenuEndToEnd(
  page: Page,
  menu: Menu,
  prompt: string,
): Promise<void> {
  await openMenu(page, menu);
  await showRecordPanel(page, menu);
  await selectLocalModel(page, menu);
  await typePrompt(page, menu, prompt);
  await pressGenerate(page, menu);
  await expectRenderingCard(page, menu);
  await expectCompletedTile(page, menu);
}
