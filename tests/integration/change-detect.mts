/**
 * change-detect.mts — map a set of changed files onto the integration scenarios
 * that are worth running, so a PR that touches only the image menu, say, does not
 * pay for the video and audio runs.
 *
 * Two facts drive the rule:
 *   1. the backend (src/generation/**, the API routes, the platform transport) is
 *      shared by every menu, so any change there invalidates all three — a subset
 *      would miss the regression the change actually risks;
 *   2. the app shell and the gallery/viewer/topbar/feed are shared UI, so changes
 *      there likewise warrant the full suite.
 *
 * A pure-UI change, by contrast, only needs the menu(s) whose components moved.
 * general-create-tabs.tsx is shared by the video and audio surfaces, so it pulls
 * both. Everything else is owned by one surface.
 *
 * This is a pure function — it takes the changed paths and returns which spec
 * files to run — so the selection is auditable and testable on its own.
 */

export type Domain = "image" | "video" | "audio";

/** The spec file each domain maps to. */
export const SPEC_BY_DOMAIN: Record<Domain, string> = {
  image: "tests/integration/scenarios/image.spec.ts",
  video: "tests/integration/scenarios/video.spec.ts",
  audio: "tests/integration/scenarios/audio.spec.ts",
};

export const ALL_SPECS: string[] = [SPEC_BY_DOMAIN.image, SPEC_BY_DOMAIN.video, SPEC_BY_DOMAIN.audio];

/* Files that own a single surface's menu. */
const IMAGE_OWNED = [
  "src/openhiggsfield/composer.tsx",
  "src/openhiggsfield/image-workspace.tsx",
  "src/openhiggsfield/inpaint-panel.tsx",
  "src/openhiggsfield/crop-tool.tsx",
  "src/openhiggsfield/expand-crop.tsx",
  "src/openhiggsfield/image-proxy.ts",
  "src/openhiggsfield/model-picker.tsx",
  "src/openhiggsfield/prompt-optimize-button.tsx",
];

const VIDEO_OWNED = [
  "src/openhiggsfield/video-edit.tsx",
  "src/openhiggsfield/media-tray.tsx",
  "src/openhiggsfield/camera-dialog.tsx",
  "src/openhiggsfield/camera-movement-panel.tsx",
  "src/openhiggsfield/lighting-popover.tsx",
  "src/openhiggsfield/reference-film-popover.tsx",
  "src/openhiggsfield/director-settings.tsx",
  "src/openhiggsfield/movement-presets.ts",
  "src/openhiggsfield/cinema-popover.tsx",
  "src/openhiggsfield/cinema-tile-view.tsx",
  "src/openhiggsfield/cinema-studio-screen.tsx",
  "src/openhiggsfield/cinema-project-panels.tsx",
  "src/openhiggsfield/cinema-sidebar.tsx",
  "src/openhiggsfield/cinema-home-content.tsx",
  "src/openhiggsfield/reference-film.ts",
];

/* general-create-tabs.tsx hosts the video AND audio create shells — a change
   there must re-test both menus. */
const VIDEO_AND_AUDIO = ["src/openhiggsfield/general-create-tabs.tsx", "src/openhiggsfield/audio-workspace.tsx"];

/* Audio-only surfaces. */
const AUDIO_OWNED = ["src/openhiggsfield/use-audio-waveform.ts"];

/* Backend + shared shell + styles: any of these invalidates the whole suite. */
const SHARED_TRIGGERS: Array<(path: string) => boolean> = [
  (p) => p.startsWith("src/generation/"),
  (p) => p.startsWith("src/app/api/"),
  (p) => p === "src/openhiggsfield/openhiggsfield-app.tsx",
  (p) => p === "src/openhiggsfield/topbar.tsx",
  (p) => p === "src/openhiggsfield/gallery.tsx",
  (p) => p === "src/openhiggsfield/viewer.tsx",
  (p) => p === "src/openhiggsfield/feed-header.tsx",
  (p) => p === "src/openhiggsfield/feed-showcase.tsx",
  (p) => p === "src/openhiggsfield/data.ts",
  (p) => p === "src/openhiggsfield/ui.tsx",
  (p) => p.endsWith(".css"),
  (p) => p === "next.config.ts",
  (p) => p.startsWith("src/app/"),
];

/** Classify changed paths into per-menu domains plus a "run everything" flag. */
export function classifyChanges(changed: string[]): { domains: Set<Domain>; runAll: boolean } {
  const domains = new Set<Domain>();
  let runAll = false;

  for (const raw of changed) {
    const path = raw.replace(/\\/g, "/");
    if (SHARED_TRIGGERS.some((test) => test(path))) {
      runAll = true;
      continue;
    }
    if (IMAGE_OWNED.includes(path)) domains.add("image");
    if (VIDEO_OWNED.includes(path)) domains.add("video");
    if (AUDIO_OWNED.includes(path)) domains.add("audio");
    if (VIDEO_AND_AUDIO.includes(path)) {
      domains.add("video");
      domains.add("audio");
    }
  }

  return { domains, runAll };
}

/** Turn a classification into the spec files to run. */
export function selectSpecs(changed: string[]): string[] {
  const { domains, runAll } = classifyChanges(changed);
  // No change signal (e.g. a base we could not diff) → run the whole suite. This
  // errs on the side of catching a regression, never of skipping one.
  if (changed.length === 0 || runAll) return ALL_SPECS;
  const files = [...domains].map((d) => SPEC_BY_DOMAIN[d]);
  return files.length ? files : ALL_SPECS;
}
