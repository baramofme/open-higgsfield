import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, OptionList, Slider } from "./ui";

/**
 * `ui.tsx`의 실재 프리미티브를 변형과 함께 시각화한다.
 * 변형은 props로만 (고정 의도), 인터랙티브는 로컬 상태로 — 인라인 도색 없음.
 */

/** 세 프리미티브를 실제 상태로 조립한 인터랙티브 데모. */
function InteractiveDemo() {
  const [ratio, setRatio] = useState("16:9");
  const [strength, setStrength] = useState(60);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "min(28rem, 90vw)" }}>
      <Field label="비율" value={ratio}>
        <OptionList
          options={[
            { value: "Auto", label: "Auto" },
            { value: "16:9", label: "16:9" },
            { value: "1:1", label: "1:1" },
            { value: "9:16", label: "9:16" },
          ]}
          value={ratio}
          onChange={setRatio}
          ratio
        />
      </Field>
      <Field label="강도" value={`${strength}`}>
        <Slider min={0} max={100} value={strength} onChange={setStrength} label="강도" />
      </Field>
    </div>
  );
}

const meta: Meta<typeof Field> = {
  title: "Design System/Primitives",
  component: Field,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Field>;

/** Field — 라벨만(값 없음) + 자식 컨트롤. */
export const FieldLabelOnly: Story = {
  render: () => (
    <Field label="라벨만(값 없음)">
      <Slider min={0} max={100} value={40} onChange={() => {}} label="예시" />
    </Field>
  ),
};

/** Field — 라벨+현재값 한 행. */
export const FieldWithValue: Story = {
  render: () => (
    <Field label="컨텍스트 크기 (ctx)" value="131072">
      <Slider min={0} max={200000} value={131072} onChange={() => {}} label="ctx" />
    </Field>
  ),
};

/** OptionList — 일반 나열(비율 아님). */
export const OptionListPlain: Story = {
  render: () => (
    <OptionList
      options={[
        { value: "a", label: "선택지 A" },
        { value: "b", label: "선택지 B" },
        { value: "c", label: "선택지 C" },
      ]}
      value="b"
      onChange={() => {}}
    />
  ),
};

/** OptionList — 비율 변형(각 줄이 미리보기 박스를 예약). */
export const OptionListRatio: Story = {
  render: () => (
    <OptionList
      options={[
        { value: "Auto", label: "Auto" },
        { value: "16:9", label: "16:9" },
        { value: "1:1", label: "1:1" },
      ]}
      value="16:9"
      onChange={() => {}}
      ratio
    />
  ),
};

/** Slider — 채움 비율을 `--fill`로 드러낸다. */
export const SliderControl: Story = {
  render: () => (
    <Slider min={0} max={100} value={72} onChange={() => {}} label="채움" />
  ),
};

/** 세 프리미티브를 실제 상태로 조립(변형 + 인터랙션). */
export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
