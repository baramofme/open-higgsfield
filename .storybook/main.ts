import type { StorybookConfig } from "@storybook/react-vite";

/**
 * OpenHiggsfield 디자인 시스템 스토리북(10).
 * stories 글롭은 src/openhiggsfield 옆에 둔 *.stories.tsx를 가리킨다.
 * 스토리 안의 모듈 import는 상대경로 — 창고에 `@/*` alias가 있으나
 * react-vite의 vite 설정은 별개라 상대경로가 안전하다.
 */
const config: StorybookConfig = {
  stories: ["../src/openhiggsfield/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
