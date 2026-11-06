import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import * as AppIcons from "./icons";
import * as CinemaIcons from "./cinema-icons";
import * as AssetIcons from "./asset-icons";
import { ModelIcon } from "./model-icon";

/**
 * Integrated icon sheet — the whole reusable glyph library in ONE story.
 *
 * The design system ships 93 icon primitives across four modules (icons.tsx 60,
 * cinema-icons.tsx 16, asset-icons.tsx 16, model-icon.tsx ModelIcon 1). The
 * orchestrator ruling consolidated them into a single sheet rather than 93
 * individual stories. Every glyph takes optional props (`size?`, or an
 * SVGProps bag), so we render each with no arguments via `React.createElement`
 * and label it by its export name. `ModelIcon` resolves a brand file from a
 * model id, so it is shown in its own row over representative ids.
 */

type IconModule = Record<string, unknown>;

function glyphEntries(module: IconModule) {
  return Object.entries(module).filter(
    ([, value]) => typeof value === "function",
  ) as [string, React.ComponentType][];
}

const meta: Meta = {
  title: "Design System / Components / Icons",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

const cellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  width: 72,
  padding: "10px 4px",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "var(--s1)",
  color: "var(--tx2)",
};

function Sheet({
  title,
  entries,
}: {
  title: string;
  entries: [string, React.ComponentType][];
}) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--tx3)",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title} — {entries.length} glyphs
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {entries.map(([name, Comp]) => (
          <div key={name} style={cellStyle}>
            {React.createElement(Comp)}
            <code style={{ fontSize: 9.5, color: "var(--tx4)", textAlign: "center" }}>
              {name}
            </code>
          </div>
        ))}
      </div>
    </section>
  );
}

const modelIds = [
  "kling-2-5",
  "wan-3",
  "flux-3",
  "grok-imagine-2",
  "minimax-h3",
  "recraft-4",
  "ideogram-4",
  "qwen-image-3",
  "pixverse-6",
  "ltx-2-5",
  "dop",
];

export const Icon_Sheet: Story = {
  name: "Icon sheet — all 93 glyphs",
  render: () => (
    <div>
      <Sheet title="App icons (icons.tsx)" entries={glyphEntries(AppIcons)} />
      <Sheet title="Cinema icons (cinema-icons.tsx)" entries={glyphEntries(CinemaIcons)} />
      <Sheet title="Asset glyphs (asset-icons.tsx)" entries={glyphEntries(AssetIcons)} />
      <section style={{ marginBottom: 26 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--tx3)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Model icon (model-icon.tsx) — brand marks
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {modelIds.map((id) => (
            <div key={id} style={{ ...cellStyle, width: 96, flexDirection: "row", gap: 8 }}>
              <ModelIcon modelId={id} size={16} />
              <code style={{ fontSize: 9.5, color: "var(--tx4)" }}>{id}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};
