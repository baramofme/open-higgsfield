import type { StorybookConfig } from "@storybook/react-vite";

// Storybook 10: autodocs is driven by per-story `tags: ["autodocs"]`, NOT by a
// `docs` key in main.ts (autodocs is no longer a valid DocsOptions field). No
// addons are loaded — the studio background is painted by the `.ohf` global
// decorator in preview.ts, so the design system renders correctly without
// addon-essentials / addon-backgrounds.
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
