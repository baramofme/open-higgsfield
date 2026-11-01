"use client";

/* Reference film's screen: the instrument's button plus the panel the film tile
   opens. Both read and drive the same prompt-registry store the core owns — the
   button lights its active state and counts the layers stacked, the panel picks
   the reference vocabulary and writes it through the core's select/clear. This
   file is the only place the reference-film feature touches the UI; the mapping
   itself lives in reference-film.ts and the core stays closed.

   The four layers (genre · era · director · colour grading) render as a row of
   film plates each, so a selection is a preview thumbnail you can see before you
   commit — and one layer can hold only one plate at a time, while the others
   stack. The intensity slider rides a detent strip beneath, honest to the
   camera-movement slider it mirrors. */

import { usePromptTokens } from "@/generation/prompt-registry";
import {
  REFERENCE_FILM_FEATURE,
  REFERENCE_AXES,
  INTENSITY_STEPS,
  type ReferenceAxis,
  type ReferenceOption,
} from "@/generation/reference-film";
import { swatchFor, GRAIN_URI } from "./artwork";
import { ClapperIcon, CloseIcon } from "./icons";

/** The composer's overlay id for the film panel. Exported here so the composer
 *  needs no new local constant of its own — it imports this id alongside the
 *  button and the panel. */
export const REFERENCE_FILM_OVERLAY = "reference-film";

/** How many reference layers are currently stacked — the count of distinct
 *  controlKeys this feature holds live. The tile reads its number from here. */
function useReferenceLayerCount(): number {
  return usePromptTokens((state) =>
    state.tokens.reduce(
      (n, t) => (t.featureId === REFERENCE_FILM_FEATURE ? n + 1 : n),
      0,
    ),
  );
}

/** The composer's film tile: the clapper face that opens the reference panel.
 *  The composer owns the overlay and the toggle, so it passes whether the panel
 *  is open and the callback that opens it; this component only renders the face
 *  and reads its own state. */
export function ReferenceFilmButton({
  open,
  onOpen,
}: {
  open: boolean;
  onOpen: (trigger: HTMLElement) => void;
}) {
  const layers = useReferenceLayerCount();
  return (
    <button
      type="button"
      className="ohf-vtc ohf-vtc--film ohf-tip"
      data-tip="필름 레퍼런스"
      data-tour-anchor="tour-video-film"
      aria-label="필름"
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={(event) => onOpen(event.currentTarget)}
    >
      <span className="ohf-vtc-ic" aria-hidden>
        <ClapperIcon size={16} />
      </span>
      <span className="ohf-vtc-col">
        <span className="ohf-vtc-label">필름</span>
        <span className="ohf-vtc-val">{layers > 0 ? `${layers} 레이어` : "자동"}</span>
      </span>
    </button>
  );
}

/** A film plate: the deterministic gradient artwork for one reference option,
 *  carried under the film-grain overlay so every plate reads as film stock, not
 *  a flat swatch. Seeded by the option's own value, so two references never
 *  share the exact same light. */
function ReferencePlate({ seed }: { seed: string }) {
  return (
    <span
      className="ohf-rf-plate"
      style={{ backgroundImage: swatchFor("video", seed) }}
      aria-hidden
    >
      <span className="ohf-rf-grain" style={{ backgroundImage: GRAIN_URI }} />
    </span>
  );
}

/** One reference layer's row: its label, then a plate per option. Tapping a plate
 *  selects that reference; tapping the plate already chosen clears it, so the
 *  layer reads one way at a time. The selected plate wears the white ring the
 *  camera drum gives its detent row. */
function ReferenceAxisRow({
  axis,
  value,
  onPick,
}: {
  axis: ReferenceAxis;
  value: string | undefined;
  onPick: (axis: ReferenceAxis, option: ReferenceOption) => void;
}) {
  return (
    <div className="ohf-rf-axis" role="group" aria-label={axis.label}>
      <span className="ohf-rf-axis-head">{axis.label}</span>
      <div className="ohf-rf-chips">
        {axis.options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className="ohf-rf-chip"
              data-selected={selected || undefined}
              aria-pressed={selected}
              aria-label={option.label}
              onClick={() => onPick(axis, option)}
            >
              <ReferencePlate seed={option.value} />
              <span className="ohf-rf-chip-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The intensity strip: one detent per step. Tapping a detent writes the slider;
 *  tapping the detent already lit drops it back to the resting place. */
function ReferenceIntensityRow({
  value,
  onPick,
}: {
  value: unknown;
  onPick: (step: number) => void;
}) {
  return (
    <div className="ohf-rf-axis ohf-rf-axis--intensity" role="group" aria-label="스타일 강도">
      <span className="ohf-rf-axis-head">스타일 강도</span>
      <div className="ohf-rf-detents">
        {INTENSITY_STEPS.map((step) => {
          const selected = step === value;
          return (
            <button
              key={step}
              type="button"
              className="ohf-rf-detent"
              data-selected={selected || undefined}
              aria-pressed={selected}
              aria-label={`강도 ${step}`}
              onClick={() => onPick(step)}
            >
              {step}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The panel the film tile opens: a preview plate for the active grade, the four
 *  reference rows, the intensity strip, and a one-line receipt saying how many
 *  layers will ride into the prompt. 초기화 clears every reference-film slot. */
export function ReferenceFilmPopover({ onClose }: { onClose: () => void }) {
  const tokens = usePromptTokens((state) => state.tokens);
  /* The selector layers store a string; the intensity slider stores a number.
     Read the raw slot value as unknown for the intensity comparison, and a string
     for the four reference layers, so neither comparison trips the type checker. */
  const rawValue = (controlKey: string): unknown =>
    tokens.find(
      (t) => t.featureId === REFERENCE_FILM_FEATURE && t.controlKey === controlKey,
    )?.value;
  const stringValue = (controlKey: string): string | undefined =>
    rawValue(controlKey) as string | undefined;

  const pick = (axis: ReferenceAxis, option: ReferenceOption) => {
    const store = usePromptTokens.getState();
    if (stringValue(axis.key) === option.value) store.clear(REFERENCE_FILM_FEATURE, axis.key);
    else store.select(REFERENCE_FILM_FEATURE, axis.key, option.value);
  };

  const pickIntensity = (step: number) => {
    const store = usePromptTokens.getState();
    if (rawValue("intensity") === step) store.clear(REFERENCE_FILM_FEATURE, "intensity");
    else store.select(REFERENCE_FILM_FEATURE, "intensity", step);
  };

  const layers = tokens.filter((t) => t.featureId === REFERENCE_FILM_FEATURE).length;
  const previewSeed = stringValue("color") ?? stringValue("genre") ?? "noir";
  const previewLabel =
    stringValue("color") ??
    stringValue("era") ??
    (stringValue("genre") ? `${REFERENCE_AXES[3]!.label}로 채색` : "레퍼런스 없음");

  return (
    <div className="ohf-popover ohf-rf-pop" role="dialog" aria-label="필름 레퍼런스 설정">
      <header className="ohf-rf-head">
        <span className="ohf-rf-title">필름 레퍼런스 설정</span>
        <button
          type="button"
          className="ohf-rf-reset"
          onClick={() => usePromptTokens.getState().clearFeature(REFERENCE_FILM_FEATURE)}
        >
          초기화
        </button>
        <button
          type="button"
          className="ohf-icon-btn ohf-icon-btn--ghost"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon size={12} />
        </button>
      </header>

      <div className="ohf-rf-preview" aria-hidden>
        <ReferencePlate seed={previewSeed} />
        <span className="ohf-rf-preview-shade" />
        <span className="ohf-rf-preview-label">{previewLabel}</span>
      </div>

      <div className="ohf-rf-body">
        {REFERENCE_AXES.map((axis) => (
          <ReferenceAxisRow
            key={axis.key}
            axis={axis}
            value={stringValue(axis.key)}
            onPick={pick}
          />
        ))}
        <ReferenceIntensityRow value={rawValue("intensity")} onPick={pickIntensity} />
      </div>

      <span className="ohf-rf-receipt">
        {layers > 0
          ? `${layers} 레이어 — 생성 프롬프트에 스타일이 주입됩니다`
          : "레퍼런스를 고르면 생성 프롬프트에 스타일이 붙습니다"}
      </span>
    </div>
  );
}
