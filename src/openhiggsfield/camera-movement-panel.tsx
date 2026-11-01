"use client";

/* The cinematic camera movement panel: five movement tiles at the bottom of the
   video form, each carrying the direction toggles its movement can go, an
   intensity slider and a clear. Selecting a direction writes a token through the
   registry's select API; the prompt picks it up because the plane merges active
   tokens into the caption. The tiles read their lit state from isTokenActive, so
   the feedback is the same source of truth the prompt reads — not a separate
   piece of UI state that could drift.

   The registration itself lives in @/generation/camera-movement and runs at
   module load; importing that file from here wires the mapping, so the panel is
   the only thing the composer has to pull in to make camera movement live. The
   core files never change for this — AC3's whole point. */

import {
  CAMERA_MOVEMENTS,
  controlKey,
  DIRECTION_PHRASES,
  INTENSITY_STEPS,
  type CameraDirection,
} from "@/generation/camera-movement";
import { isTokenActive, usePromptTokens } from "@/generation/prompt-registry";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronIcon,
  ArrowUpIcon,
  PlusIcon,
  MinusIcon,
  CloseIcon,
} from "./icons";

/** The glyph for each direction, chosen so the two travel axes read apart: the
 *  lateral moves (pan, orbit) use the chevrons, the vertical moves (tilt) use
 *  the up arrow and its flipped twin, and the push/pull moves (dolly, zoom) use
 *  plus and minus — nearer and further rather than a sideways arrow. */
function DirectionGlyph({ direction }: { direction: CameraDirection }) {
  switch (direction) {
    case "left":
      return <ChevronLeftIcon size={13} />;
    case "right":
      return <ChevronRightIcon size={13} />;
    case "up":
      return <ArrowUpIcon size={13} />;
    case "down":
      return <ChevronIcon size={13} flip />;
    case "in":
      return <PlusIcon size={13} />;
    case "out":
      return <MinusIcon size={13} />;
  }
}

/** The intensity slider: three detents past the rest, walked by a range input
 *  so the keyboard drives it. Zero rests silent — the direction phrase alone
 *  carries a subtle push — and the words arrive from detent 2 up. */
function IntensitySlider({ value }: { value: number }) {
  const select = usePromptTokens((state) => state.select);
  const max = INTENSITY_STEPS.length - 1;

  return (
    <div className="ohf-cam-intensity">
      <span className="ohf-cam-intensity-label">강도</span>
      <input
        type="range"
        className="ohf-cam-intensity-range"
        min={0}
        max={max}
        step={1}
        value={value}
        aria-label="카메라 무브 강도"
        aria-valuetext={INTENSITY_LABELS[value] ?? ""}
        onChange={(event) => select("camera-movement", "intensity", Number(event.target.value))}
      />
      <span className="ohf-cam-intensity-stop" aria-hidden>
        {INTENSITY_LABELS[value] ?? " off"}
      </span>
    </div>
  );
}

const INTENSITY_LABELS: Record<number, string> = {
  0: "off",
  1: "subtle",
  2: "moderate",
  3: "strong",
};

export function CameraMovementPanel() {
  const select = usePromptTokens((state) => state.select);
  const clear = usePromptTokens((state) => state.clear);
  const clearFeature = usePromptTokens((state) => state.clearFeature);
  /* The intensity value, read straight from the token store — the same slot the
     fragment reads, so the thumb and the prompt never disagree. */
  const intensity = usePromptTokens(
    (state) =>
      state.tokens.find((t) => t.featureId === "camera-movement" && t.controlKey === "intensity")
        ?.value as number | undefined,
  ) ?? 0;

  /* Any direction selected across all movements — the clear button appears only
     when there is something to clear, so it never offers to wipe an empty slot. */
  const anyActive = CAMERA_MOVEMENTS.some((movement) =>
    movement.directions.some((dir) => isTokenActive("camera-movement", controlKey(movement.key, dir))),
  );

  return (
    <div className="ohf-cam-move" role="group" aria-label="카메라 무브먼트">
      <div className="ohf-cam-move-tiles">
        {CAMERA_MOVEMENTS.map((movement) => {
          /* A tile is lit when any of its directions is active. That single rule
             is what visual feedback means here — the same isTokenActive the
             prompt reads, so the lit tile and the prompt phrase never drift. */
          const tileActive = movement.directions.some((dir) =>
            isTokenActive("camera-movement", controlKey(movement.key, dir)),
          );
          return (
            <div
              key={movement.key}
              className="ohf-cam-move-tile"
              data-on={tileActive || undefined}
            >
              <span className="ohf-cam-move-label">{movement.label}</span>
              <div className="ohf-cam-move-dirs">
                {movement.directions.map((dir) => {
                  const key = controlKey(movement.key, dir);
                  const active = isTokenActive("camera-movement", key);
                  const phrase = DIRECTION_PHRASES[key] ?? `${movement.key} ${dir}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      className="ohf-cam-dir ohf-tip"
                      data-tip={phrase}
                      aria-pressed={active}
                      aria-label={phrase}
                      data-active={active || undefined}
                      onClick={() => {
                        if (active) {
                          clear("camera-movement", key);
                        } else {
                          select("camera-movement", key, true);
                        }
                      }}
                    >
                      <DirectionGlyph direction={dir} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <IntensitySlider value={intensity} />

      {anyActive && (
        <button
          type="button"
          className="ohf-cam-clear"
          aria-label="카메라 무브 초기화"
          onClick={() => clearFeature("camera-movement")}
        >
          <CloseIcon size={12} />
          <span>초기화</span>
        </button>
      )}
    </div>
  );
}
