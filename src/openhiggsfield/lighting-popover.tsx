"use client";

import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import { isTokenActive, usePromptTokens } from "@/generation/prompt-registry";
/* Importing the instrument registers it with the core the moment this module is
   loaded by the composer — the feature is absent from the core and adds itself,
   exactly the extensibility contract. Nothing here edits the core. */
import { classifyLight, LIGHT_SEATS, type LightValue } from "@/generation/lighting";

/* ── The lighting pad ──────────────────────────────────────────────────────────
   A lit object at the centre of a circle; light seats ride the ring. Drag one
   around and it re-rolls its role (front → key, side → rim, behind → back);
   raise its intensity and it brightens both the pad and its own fragment. Every
   seat is its own controlKey, so several lights are live at once and each keeps
   its own strength — the core stacks them and replaces one in place when it is
   dragged again, never duplicating. Position and intensity land in the
   generation prompt through the same select() call the drag and the slider fire. */

/** The pad's face is a square; everything is placed in percentages of it so the
 *  ring, the object and the seats scale together. */
const PAD = 260;

const degToRad = (deg: number) => (deg * Math.PI) / 180;

/* Polar → cartesian in unit space, then scaled to the pad's percentage. Top is
   0° and angles rise clockwise: right is 90°, the camera (front) is 180°. */
function polar(deg: number, dist: number): { x: number; y: number } {
  const a = degToRad(deg);
  return {
    x: 50 + 50 * dist * Math.sin(a),
    y: 50 - 50 * dist * Math.cos(a),
  };
}

/* Pointer → (angle, radius) relative to the pad centre. The angle is measured
   from straight up, clockwise, the same convention the seats are laid out in. */
function pointerToPolar(
  pad: HTMLElement,
  clientX: number,
  clientY: number,
): { deg: number; dist: number } {
  const box = pad.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const r = Math.hypot(dx, dy);
  const dist = Math.max(0.42, Math.min(1, r / (box.width / 2)));
  return { deg: ((deg % 360) + 360) % 360, dist };
}

/** The lit object. A sphere shaded by a single highlight whose offset is the sum
 *  of the active seats' directions — a light in front brightens the front, one
 *  behind rims the back, so the object visibly answers the arrangement. */
function LitSphere({ dir }: { dir: { x: number; y: number } }) {
  const hx = 50 + dir.x * 26;
  const hy = 50 + dir.y * 26;
  const sphere: CSSProperties = {
    position: "absolute",
    inset: 0,
    margin: "auto",
    width: "116px",
    height: "116px",
    borderRadius: "50%",
    background: `radial-gradient(circle at ${hx}% ${hy}%, #f4f6fb 0%, #9aa6bd 34%, #3b4254 72%, #1c2130 100%)`,
    boxShadow: "inset -10px -14px 26px rgba(0,0,0,.45), inset 8px 10px 18px rgba(255,255,255,.14)",
  };
  return (
    <>
      <div style={sphere} aria-hidden="true" />
      {/* a faint equator line sells the roundness a touch more */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          margin: "auto",
          width: "116px",
          height: "116px",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.06)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/** A seat's dot colour, keyed by the role its angle reads as; brighter as it
 *  runs hotter. */
function seatTone(role: string, intensity: number): { bg: string; glow: number } {
  const alpha = 0.35 + 0.6 * Math.max(0, Math.min(1, intensity));
  const hues: Record<string, string> = {
    key: "255,196,120",
    fill: "150,190,235",
    rim: "120,225,205",
    back: "160,150,235",
  };
  const rgb = hues[role] ?? "180,180,190";
  return { bg: `rgba(${rgb},${alpha.toFixed(2)})`, glow: intensity };
}

export function LightingPopover({ onClose }: { onClose: () => void }) {
  const tokens = usePromptTokens((s) => s.tokens);
  const select = usePromptTokens((s) => s.select);
  const clear = usePromptTokens((s) => s.clear);
  const clearFeature = usePromptTokens((s) => s.clearFeature);
  const padRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  /* Live state per seat: its value, whether it is tracked, and the role its
     current angle reads as. Everything the pad draws and the readout lists
     comes from this, so the screen and the prompt share one source. */
  const seatState = LIGHT_SEATS.map((seat) => {
    const token = tokens.find((t) => t.featureId === "lighting" && t.controlKey === seat.id);
    const value = token?.value as LightValue | undefined;
    const on = isTokenActive("lighting", seat.id);
    const deg = value?.deg ?? seat.deg;
    const dist = value?.dist ?? 0.74;
    const intensity = value?.intensity ?? (on ? 0.5 : 0);
    return { seat, value, on, deg, dist, intensity, role: classifyLight(deg) };
  });

  /* Net light direction for the sphere's highlight — a sum over the seats that
     are actually running, so an off seat moves nothing. */
  let sx = 0;
  let sy = 0;
  for (const s of seatState) {
    if (!s.on || s.intensity <= 0.18) continue;
    const a = degToRad(s.deg);
    sx += s.intensity * Math.sin(a);
    sy += s.intensity * -Math.cos(a);
  }
  const len = Math.hypot(sx, sy) || 1;
  const dir = { x: sx / len, y: sy / len };

  function onSeatDown(event: ReactPointerEvent, id: string) {
    padRef.current?.setPointerCapture?.(event.pointerId);
    setDragging(id);
    // touching a seat also commits a placed default so it reads as on
    const cur = seatState.find((s) => s.seat.id === id)?.value;
    select("lighting", id, {
      deg: cur?.deg ?? seatState.find((s) => s.seat.id === id)!.seat.deg,
      dist: cur?.dist ?? 0.74,
      intensity: cur?.intensity ?? 0.5,
    });
  }
  function onPadMove(event: ReactPointerEvent) {
    if (!dragging || !padRef.current) return;
    const { deg, dist } = pointerToPolar(padRef.current, event.clientX, event.clientY);
    const cur = seatState.find((s) => s.seat.id === dragging)?.value;
    select("lighting", dragging, {
      deg,
      dist,
      intensity: cur?.intensity ?? 0.5,
    });
  }
  function endDrag() {
    setDragging(null);
  }

  return (
    <div className="ohf-popover ohf-popover--sheet" role="dialog" aria-label="조명 배치"
      style={{ width: `min(${PAD + 36}px, 100%)`, padding: 14 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>조명 배치</span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>노드를 드래그해 위치, 슬라이더로 강도</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => clearFeature("lighting")}
          style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, cursor: "pointer",
            border: "1px solid var(--line-2)", background: "transparent" }}
        >
          전체 해제
        </button>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          style={{ fontSize: 12, padding: "3px 8px", borderRadius: 8, cursor: "pointer",
            border: "1px solid var(--line-2)", background: "transparent" }}
        >
          ✕
        </button>
      </header>

      {/* The ring + the lit object + the draggable seats. */}
      <div
        ref={padRef}
        onPointerMove={onPadMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{
          position: "relative",
          width: PAD,
          height: PAD,
          margin: "0 auto",
          borderRadius: "50%",
          touchAction: "none",
          background:
            "radial-gradient(circle, rgba(255,255,255,.02), rgba(0,0,0,0) 60%)," +
            "repeating-radial-gradient(circle, transparent 0 11px, rgba(255,255,255,.05) 11px 12px)",
        }}
      >
        {/* the ring guide */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "8%",
            borderRadius: "50%",
            border: "1px dashed rgba(255,255,255,.16)",
            pointerEvents: "none",
          }}
        />
        <LitSphere dir={dir} />

        {seatState.map((s) => {
          const pos = polar(s.deg, s.dist);
          const tone = seatTone(s.role, s.intensity);
          const size = 12 + 10 * Math.max(0, Math.min(1, s.intensity));
          return (
            <button
              key={s.seat.id}
              type="button"
              onPointerDown={(event) => onSeatDown(event, s.seat.id)}
              aria-label={`${s.seat.id} ${s.role}`}
              title={`${s.role} · 강도 ${Math.round(s.intensity * 100)}%`}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: size,
                height: size,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                padding: 0,
                border: "1px solid rgba(255,255,255,.5)",
                borderRadius: "50%",
                background: tone.bg,
                boxShadow: s.on
                  ? `0 0 ${4 + 10 * tone.glow}px ${tone.bg}`
                  : "none",
                cursor: "grab",
                opacity: s.on ? 1 : 0.5,
                transition: "left .05s, top .05s",
              }}
            />
          );
        })}
      </div>

      {/* Per-seat readout — the role its angle earns, and its own intensity. Each
         slider drives one seat, so several lights stay independently tuned. */}
      <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
        {seatState.map((s) => (
          <div key={s.seat.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: seatTone(s.role, s.intensity).bg,
                flexShrink: 0,
              }}
            />
            <span style={{ width: 52, textTransform: "capitalize" }}>{s.role}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.intensity}
              aria-label={`${s.seat.id} 강도`}
              onChange={(event) => {
                const intensity = Number(event.target.value);
                select("lighting", s.seat.id, {
                  deg: s.deg,
                  dist: s.dist,
                  intensity,
                });
              }}
              style={{ flex: 1, accentColor: "#c98a3a" }}
            />
            <span style={{ width: 38, textAlign: "right", opacity: 0.7 }}>
              {Math.round(s.intensity * 100)}%
            </span>
            <button
              type="button"
              aria-label={`${s.seat.id} 해제`}
              onClick={() => clear("lighting", s.seat.id)}
              style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, cursor: "pointer",
                border: "1px solid var(--line-2)", background: "transparent",
                opacity: s.on ? 1 : 0.35 }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
