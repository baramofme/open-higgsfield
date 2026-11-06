import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, OptionList, Slider } from "./ui";
import { SettingPill, SettingPopover } from "./settings";
import { kling25 } from "../generation/catalog/kling-2.5";
import type { ModelEntry } from "../generation/catalog/types";

/**
 * Control primitives from the OHF scoped design system.
 *
 * `Field`, `OptionList` and `Slider` (ui.tsx) are presentational and take plain
 * props. `SettingPill` and `SettingPopover` (settings.tsx) are wired to the
 * generation catalog + the settings store, so a story has to stand on a real
 * `ModelEntry`. We pick the real kling 2.5 entry and derive the keys from the
 * model's own `settings` map so the rendered pill / popover always matches a
 * field that actually exists (never a missing key -> null render).
 */

const meta: Meta = {
  title: "Design System / Components / Primitives",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

function pickKeys(model: ModelEntry) {
  const keys = Object.keys(model.settings);
  const boolKey = keys.find((k) => model.settings[k].type === "boolean") ?? keys[0];
  const popoverKey =
    keys.find((k) => model.settings[k].type !== "boolean") ?? keys[0];
  return { boolKey, popoverKey };
}

// ---- Field ---------------------------------------------------------------

export const Field_WithChildren: Story = {
  name: "Field",
  render: () => (
    <Field label="Aspect ratio">
      <div className="ohf-opts">
        <button type="button" className="ohf-opt" aria-pressed>
          <span className="ohf-opt-label">16:9</span>
        </button>
        <button type="button" className="ohf-opt" aria-pressed={false}>
          <span className="ohf-opt-label">1:1</span>
        </button>
      </div>
    </Field>
  ),
};

export const Field_LabelAndValue: Story = {
  name: "Field — label + value row",
  render: () => (
    <div style={{ maxWidth: 360, display: "grid", gap: 16 }}>
      <Field label="Duration" value="5s">{null}</Field>
      <Field label="Resolution" value="1080p">{null}</Field>
    </div>
  ),
};

// ---- OptionList ----------------------------------------------------------

function OptionListDemo() {
  const [value, setValue] = useState("16:9");
  const options = [
    { value: "Auto", label: "Auto" },
    { value: "21:9", label: "21:9" },
    { value: "16:9", label: "16:9" },
    { value: "4:3", label: "4:3" },
    { value: "1:1", label: "1:1" },
    { value: "9:16", label: "9:16" },
  ];
  return (
    <div style={{ maxWidth: 280 }}>
      <OptionList options={options} value={value} ratio onChange={setValue} />
    </div>
  );
}

export const OptionList_Ratio: Story = {
  name: "OptionList — ratio rail",
  render: () => <OptionListDemo />,
};

// ---- Slider --------------------------------------------------------------

function SliderDemo() {
  const [value, setValue] = useState(5);
  return (
    <div style={{ maxWidth: 280 }}>
      <Slider min={2} max={12} step={1} value={value} label="Duration" onChange={setValue} />
    </div>
  );
}

export const Slider_Interactive: Story = {
  name: "Slider",
  render: () => <SliderDemo />,
};

// ---- SettingPill ---------------------------------------------------------

function SettingPillDemo() {
  const [open, setOpen] = useState(false);
  const model = kling25;
  const { boolKey, popoverKey } = pickKeys(model);
  const flag = model.settings[boolKey]?.type === "boolean";
  const key = flag ? boolKey : popoverKey;
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <SettingPill
        model={model}
        settingKey={key}
        values={{}}
        open={open}
        cinema={false}
        onOpen={(trigger: HTMLElement) => {
          setOpen((v) => !v);
          void trigger;
        }}
      />
      <SettingPill
        model={model}
        settingKey={key}
        values={{}}
        open={false}
        cinema
        onOpen={() => setOpen((v) => !v)}
      />
    </div>
  );
}

export const SettingPill_Rail: Story = {
  name: "SettingPill",
  render: () => <SettingPillDemo />,
};

// ---- SettingPopover ------------------------------------------------------

function SettingPopoverDemo() {
  const model = kling25;
  const { popoverKey } = pickKeys(model);
  return (
    <div style={{ maxWidth: 280 }}>
      <SettingPopover model={model} settingKey={popoverKey} values={{}} />
    </div>
  );
}

export const SettingPopover_Values: Story = {
  name: "SettingPopover",
  render: () => <SettingPopoverDemo />,
};
