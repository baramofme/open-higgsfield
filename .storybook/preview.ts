import * as React from "react";
import type { Preview } from "@storybook/react-vite";
// The scoped design system lives on the `.ohf` class; importing it as a global
// side-effect makes every story pick up the tokens, the reset and the paint.
import "../src/openhiggsfield/openhiggsfield.css";

// Tokens are defined on the scope class, not globally. A bare story has no
// tokens -> colors break. Wrap every story in the `.ohf` scope element.
// preview.ts is `.ts` (no JSX), so build the wrapper with createElement.
const withScope = (
  Story: () => React.ReactElement,
): React.ReactElement =>
  React.createElement(
    "div",
    {
      className: "ohf",
      style: {
        minHeight: "100vh",
        width: "100%",
        padding: 32,
        background: "var(--bg)",
        color: "var(--tx)",
      },
    },
    React.createElement(Story),
  );

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [withScope],
};

export default preview;
