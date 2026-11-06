import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

/**
 * OpenHiggsfield scoped design system — live documentation.
 *
 * Tokens are custom properties defined on the `.ohf` scope class in
 * `openhiggsfield.css`. The global decorator in `.storybook/preview.ts` wraps
 * every story in a `.ohf` element, so `var()` resolves here. Painted parts use
 * the real `.ohf-*` class names so the stylesheet owns the paint; raw token
 * swatches use `var()` because the gallery SHOWS token usage.
 */

const tokens = {
  bg: "--bg",
  rail: "--rail",
  s1: "--s1",
  s2: "--s2",
  s3: "--s3",
  s4: "--s4",
  line: "--line",
  line2: "--line-2",
  tx: "--tx",
  tx2: "--tx2",
  tx3: "--tx3",
  tx4: "--tx4",
  txOff: "--tx-off",
  accent: "--accent",
  accentInk: "--accent-ink",
  accent08: "--accent-08",
  accent14: "--accent-14",
  accent32: "--accent-32",
  plate: "--plate",
  plateInk: "--plate-ink",
  danger: "--danger",
  dangerBg: "--danger-bg",
  dangerLine: "--danger-line",
} as const;

const meta: Meta = {
  title: "Design System",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

// ---- small building blocks -------------------------------------------------

function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: "1px solid var(--line-2)",
          background: `var(${token})`,
          flexShrink: 0,
        }}
      />
      <code style={{ fontSize: 12, color: "var(--tx2)" }}>{token}</code>
      <span style={{ fontSize: 12.5, color: "var(--tx)" }}>{label}</span>
    </div>
  );
}

function Group({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--tx3)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {name}
      </h2>
      {children}
    </section>
  );
}

// ---- stories ---------------------------------------------------------------

export const Palette: Story = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <Group name="Ground">
        <Swatch token={tokens.bg} label="page paint" />
        <Swatch token={tokens.rail} label="sidebar rail" />
      </Group>
      <Group name="Surfaces">
        <Swatch token={tokens.s1} label="surface primary" />
        <Swatch token={tokens.s2} label="surface secondary" />
        <Swatch token={tokens.s3} label="secondary hover" />
        <Swatch token={tokens.s4} label="canvas highlight" />
      </Group>
      <Group name="Hairlines">
        <Swatch token={tokens.line} label="border subtle (white/5)" />
        <Swatch token={tokens.line2} label="border default (white/10)" />
      </Group>
      <Group name="Text">
        <Swatch token={tokens.tx} label="primary" />
        <Swatch token={tokens.tx2} label="secondary" />
        <Swatch token={tokens.tx3} label="tertiary" />
        <Swatch token={tokens.tx4} label="quaternary" />
        <Swatch token={tokens.txOff} label="disabled" />
      </Group>
      <Group name="Accent">
        <Swatch token={tokens.accent} label="lime — selection / primary / liveness" />
        <Swatch token={tokens.accentInk} label="accent ink (reverted)" />
        <Swatch token={tokens.accent08} label="lime alpha 08" />
        <Swatch token={tokens.accent14} label="lime alpha 14" />
        <Swatch token={tokens.accent32} label="lime alpha 32" />
      </Group>
      <Group name="Plate & Danger">
        <Swatch token={tokens.plate} label="smoked plate (70% black)" />
        <Swatch token={tokens.plateInk} label="plate ink (reverted 90)" />
        <Swatch token={tokens.danger} label="text danger" />
        <Swatch token={tokens.dangerBg} label="surface error alpha" />
        <Swatch token={tokens.dangerLine} label="error line" />
      </Group>
    </div>
  ),
};

export const Surfaces: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {[tokens.s1, tokens.s2, tokens.s3, tokens.s4].map((token) => (
        <div
          key={token}
          style={{
            width: 160,
            height: 96,
            borderRadius: 12,
            border: "1px solid var(--line)",
            background: `var(${token})`,
            boxShadow: "var(--shadow-2)",
            display: "flex",
            alignItems: "flex-end",
            padding: 10,
          }}
        >
          <code style={{ fontSize: 12, color: "var(--tx2)" }}>{token}</code>
        </div>
      ))}
    </div>
  ),
};

export const Elevation: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {(
        [
          ["--shadow-1", "raised sm"],
          ["--shadow-2", "raised"],
          ["--shadow-3", "modal"],
          ["--glint", "sheen"],
        ] as const
      ).map(([token, label]) => (
        <div
          key={token}
          style={{
            width: 160,
            height: 72,
            borderRadius: 12,
            background: "var(--s2)",
            boxShadow: `var(${token})`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 10,
          }}
        >
          <code style={{ fontSize: 11.5, color: "var(--tx2)" }}>{token}</code>
          <span style={{ fontSize: 12, color: "var(--tx3)" }}>{label}</span>
        </div>
      ))}
    </div>
  ),
};

// Type scale + tabular numerals. One face throughout: Inter.
export const Type: Story = {
  render: () => (
    <div style={{ maxWidth: 560, display: "grid", gap: 10 }}>
      <p style={{ fontSize: 11, color: "var(--tx3)" }}>
        --font-ui · var(--font-ohf-inter), system fallback
      </p>
      {[44, 28, 18, 14, 12.5].map((size) => (
        <p key={size} style={{ fontSize: size, color: "var(--tx)" }}>
          The quick brown fox jumps over the lazy dog — {size}px
        </p>
      ))}
      <p
        style={{
          fontSize: 16,
          color: "var(--tx)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        0123456789 · tabular numerals for measured values
      </p>
      <p style={{ fontSize: 13, color: "var(--tx2)" }}>
        Body secondary — <code style={{ color: "var(--tx3)" }}>--tx2</code>
      </p>
    </div>
  ),
};

export const Easing: Story = {
  render: () => (
    <div style={{ maxWidth: 460, display: "grid", gap: 12 }}>
      {(
        [
          ["--ease", "standard — cubic-bezier(0.2, 0, 0, 1)"],
          ["--ease-slide", "scope travel — cubic-bezier(0.16, 1, 0.3, 1)"],
        ] as const
      ).map(([token, label]) => (
        <div key={token} style={{ display: "grid", gap: 6 }}>
          <code style={{ fontSize: 12, color: "var(--tx2)" }}>{token}</code>
          <span style={{ fontSize: 12.5, color: "var(--tx)" }}>{label}</span>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "var(--accent)",
              transition: `width 1.2s var(${token})`,
            }}
          />
        </div>
      ))}
    </div>
  ),
};

// A local interactive wrapper — controls can't render function props, so the
// busy/ready state lives in component state, not story args.
function KeyToggle() {
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("Create");
  const tabs = ["Create", "Explore", "Assets"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start" }}>
      <div className="ohf-bar">
        <div className="ohf-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className="ohf-tab"
              aria-selected={selected === tab}
              onClick={() => setSelected(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="ohf-key" data-busy={busy}>
          <button
            type="button"
            onClick={() => setBusy((b) => !b)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "inherit",
              background: "transparent",
              border: "none",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            <span className="ohf-lamp" />
            <span>{busy ? "Running" : "Idle"}</span>
          </button>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--tx3)" }}>
        Click the lamp to toggle liveness. The lamp is steady when idle, lime and
        pulsing while a job runs.
      </p>
    </div>
  );
}

export const Controls: Story = {
  render: () => <KeyToggle />,
};

// The reserved accent, shown in the three roles it is allowed to occupy.
export const AccentRoles: Story = {
  render: () => (
    <div style={{ maxWidth: 520, display: "grid", gap: 14 }}>
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--accent)",
          background: "var(--accent-08)",
          padding: 14,
          fontSize: 13,
          color: "var(--tx)",
        }}
      >
        Selection — accent hairline + alpha wash
      </div>
      <button
        type="button"
        style={{
          alignSelf: "flex-start",
          borderRadius: 10,
          background: "var(--accent)",
          color: "var(--accent-ink)",
          border: "none",
          padding: "8px 16px",
          fontSize: 12.5,
          fontWeight: 550,
          cursor: "pointer",
        }}
      >
        Primary action
      </button>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--tx2)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
          }}
        />
        Liveness
      </div>
    </div>
  ),
};
