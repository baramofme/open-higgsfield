import * as React from "react";
import type { Preview } from "@storybook/react-vite";
// The scoped design system lives on the `.ohf` class; importing it as a global
// side-effect makes every story pick up the tokens, the reset and the paint.
import "../src/openhiggsfield/openhiggsfield.css";

/* The token scope is `.ohf` — the app carries it on a wrapper, never on body, so a
   portal overlay that escapes to document.body lands outside the scope and reads no
   custom properties. Mirror the scope onto the iframe body once so every portaled
   dialog stays styled by the tokens. Guarded because the static build evaluates
   preview in Node, where document is absent. */
if (typeof document !== "undefined") {
  document.body.classList.add("ohf");
}

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
