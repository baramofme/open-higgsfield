import * as React from "react";
import type { Preview } from "@storybook/react-vite";

// 실제 스코프 스타일 시스템 — 모든 스토리가 라이브와 같은 색·그림자로 렌더되도록 전역 import.
import "../src/openhiggsfield/openhiggsfield.css";

/**
 * 토큰은 `.ohf` 아래에 산다. 스토리를 `.ohf`로 감싸지 않으면 토큰이 미해석되어
 * 색이 깨진다. 이 전역 decorator가 모든 스토리를 스코프 안에 넣어준다.
 * (`--font-ohf-inter`는 next/font 변수라 Storybook 바깥에서는 미정의 →
 *  `--font-ui`의 폴백 사슬 system-ui가 대신 적용된다. 무해.)
 */
const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "studio",
      values: [
        { name: "studio", value: "#131416" },
        { name: "surface", value: "#1c1e20" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) =>
      React.createElement(
        "div",
        { className: "ohf", style: { minHeight: "12rem", padding: "1rem" } },
        React.createElement(Story),
      ),
  ],
};

export default preview;
