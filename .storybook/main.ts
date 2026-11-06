import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

// Storybook 10: autodocs is driven by per-story `tags: ["autodocs"]`, NOT by a
// `docs` key in main.ts (autodocs is no longer a valid DocsOptions field). No
// addons are loaded — the studio background is painted by the `.ohf` global
// decorator in preview.ts, so the design system renders correctly without
// addon-essentials / addon-backgrounds.
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // Storybook's vite root is `.storybook`, not the repo root, so its default
  // publicDir misses `public/`. Map it explicitly: MSW's `mockServiceWorker.js`
  // (and the studio's public assets) live there — served in `storybook dev`,
  // copied into `storybook-static` for the static build.
  staticDirs: ["../public"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // The repo's tsconfig maps `@/*` -> `./src/*`. Storybook runs a separate
  // vite that does NOT inherit those paths, so any story that transitively
  // imports an aliased module (e.g. ./settings -> @/generation/...) fails to
  // resolve at build time unless the alias is wired here. Map it explicitly.
  async viteFinal(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src"),
    };
    return config;
  },
};

export default config;
