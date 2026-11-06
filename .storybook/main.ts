import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";

// Storybook 10: autodocs is driven by per-story `tags: ["autodocs"]`, NOT by a
// `docs` key in main.ts (autodocs is no longer a valid DocsOptions field). No
// addons are loaded — the studio background is painted by the `.ohf` global
// decorator in preview.ts, so the design system renders correctly without
// addon-essentials / addon-backgrounds.
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // The repo's static folder holds MSW's `mockServiceWorker.js` (and the
  // studio's public assets). Storybook's vite root is `.storybook`, not the
  // repo root, so its default publicDir misses that folder — map it
  // explicitly: served in `storybook dev`, copied into `storybook-static`.
  staticDirs: ["../public"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config, { configDir }) {
    // The repo's `@/*` -> `src/*` lives only in tsconfig `paths`; Storybook's
    // vite runs separately from Next and does NOT read those paths, so every
    // page module that imports `@/generation/...` fails to resolve. Wire the
    // alias into the vite config itself — anchored to the absolute configDir,
    // never to the caller's cwd. Fixes dev pre-transform and build alike.
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(configDir, "../src"),
    };
    return config;
  },
};

export default config;
