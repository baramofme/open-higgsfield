"use client";

/* The cinematic camera-angle panel: the image seat's mirror of the video seat's
   camera-movement instrument (see camera-movement-panel.tsx). Three axes of
   chips — 방위, 앙각, 화각 — and a free-text field, all driven through the
   registry's select API; the caption picks the words up because the plane merges
   active tokens into it. A chip reads its lit state from the same store the
   fragment reads — value equality for a selector slot, the exact test the
   composition applies — so the lit chip and the written phrase can never drift.

   The registration itself lives in @/generation/camera-angle and runs at module
   load; importing that file from here wires the mapping, so the panel is the
   only thing the composer has to pull in to make camera angle live. The core
   files never change for this — the same point the movement instrument proved. */

import {
  ANGLE_AXES,
  CAMERA_ANGLE_FEATURE,
  type AngleAxis,
} from "@/generation/camera-angle";
import { usePromptTokens } from "@/generation/prompt-registry";
import { CloseIcon } from "./icons";

/** One axis's live value, read straight from the token store — the same slot the
 *  fragment reads, so a chip and the prompt never disagree. Undefined means the
 *  axis was never picked (or was cleared), which the chips read as "nothing lit". */
function useAxisValue(axis: AngleAxis): string | undefined {
  return usePromptTokens(
    (state) =>
      state.tokens.find((t) => t.featureId === CAMERA_ANGLE_FEATURE && t.controlKey === axis.key)
        ?.value as string | undefined,
  );
}

/** An axis row: its label and one chip per option. A slot is a selector, so a
 *  second pick replaces the first in place — the axis speaks with one word.
 *  Re-tapping the lit chip clears it, the same toggle-off rule the movement
 *  directions use. The tooltip names the English phrase the chip writes. */
function AngleAxisRow({ axis }: { axis: AngleAxis }) {
  const value = useAxisValue(axis);
  const select = usePromptTokens((state) => state.select);
  const clear = usePromptTokens((state) => state.clear);

  return (
    <div className="ohf-angle-axis" role="group" aria-label={`${axis.label} 앵글`}>
      <span className="ohf-angle-axis-label">{axis.label}</span>
      <div className="ohf-angle-chips">
        {axis.options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className="ohf-angle-chip ohf-tip"
              data-tip={option.value}
              aria-pressed={active}
              aria-label={`${axis.label}: ${option.label}`}
              data-active={active || undefined}
              onClick={() => {
                if (active) clear(CAMERA_ANGLE_FEATURE, axis.key);
                else select(CAMERA_ANGLE_FEATURE, axis.key, option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The free-text slot: whatever the visitor types is appended to the prompt
 *  verbatim, the way krea2-anygles appends its `extra_prompt`. Empty text is
 *  cleared rather than stored — an empty slot composes to nothing anyway, and
 *  clearing keeps the store honest. This is where a visitor can say what the
 *  chips cannot (a dutch angle, a custom lens note): neither angle backend
 *  models roll, so the preset vocabulary leaves it out on purpose. */
function AngleCustomField() {
  const custom = usePromptTokens(
    (state) =>
      (state.tokens.find((t) => t.featureId === CAMERA_ANGLE_FEATURE && t.controlKey === "custom")
        ?.value as string | undefined) ?? "",
  );
  const select = usePromptTokens((state) => state.select);
  const clear = usePromptTokens((state) => state.clear);

  return (
    <input
      type="text"
      className="ohf-angle-input"
      value={custom}
      placeholder="직접 입력 — 예: dutch angle, wide lens"
      aria-label="커스텀 앵글 지시문"
      onChange={(event) => {
        const next = event.target.value;
        if (next) select(CAMERA_ANGLE_FEATURE, "custom", next);
        else clear(CAMERA_ANGLE_FEATURE, "custom");
      }}
    />
  );
}

export function CameraAnglePanel() {
  const clearFeature = usePromptTokens((state) => state.clearFeature);
  /* The reset appears only when the feature actually holds something, so it
     never offers to wipe an already-empty slot — the movement panel's rule. */
  const anyActive = usePromptTokens(
    (state) =>
      state.tokens.some(
        (t) =>
          t.featureId === CAMERA_ANGLE_FEATURE &&
          (typeof t.value !== "string" || t.value.trim().length > 0),
      ),
  );

  return (
    <div className="ohf-popover ohf-popover--angle" role="dialog" aria-label="카메라 앵글">
      <header className="ohf-angle-head">
        <span className="ohf-angle-title">카메라 앵글</span>
        {anyActive && (
          <button
            type="button"
            className="ohf-angle-clear"
            aria-label="앵글 초기화"
            onClick={() => clearFeature(CAMERA_ANGLE_FEATURE)}
          >
            <CloseIcon size={12} />
            <span>초기화</span>
          </button>
        )}
      </header>
      {ANGLE_AXES.map((axis) => (
        <AngleAxisRow key={axis.key} axis={axis} />
      ))}
      <AngleCustomField />
    </div>
  );
}
