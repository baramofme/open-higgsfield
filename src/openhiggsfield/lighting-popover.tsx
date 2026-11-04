"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import { usePromptTokens } from "@/generation/prompt-registry";
/* Importing the instrument registers it with the core the moment this module is
   loaded by the composer — the feature is absent from the core and adds itself,
   exactly the extensibility contract. Nothing here edits the core. */
import {
  classifyLight,
  LIGHT_COMPOSITIONS,
  POSITION_DEG,
  QUICK_POSITIONS,
  defaultOrbitLight,
  lightingChoice,
  loadLightingPresets,
  makePreset,
  saveLightingPresets,
  type LightComposition,
  type LightPosition,
  type OrbitLight,
  type SavedLightingPreset,
} from "@/generation/lighting";

/* ── The lighting pad ──────────────────────────────────────────────────────────
   The live panel opens on a grid of named COMPOSITIONS — a 16:9 thumbnail plus a
   name for each pre-built setup — led by a `새 조명 프리셋` card that opens a 3D
   orbit editor. The panel mirrors the source exactly: the toolbar lays a heading
   and hint on the left with sort and an inline search on the right (the source
   names no `조명 구성`/`직접 배치` tabs — they are only substrings of its hint, so
   the direct path lives in the create card, not a tab). Selecting a composition
   writes a single slot the plate and prompt both read. */

const degToRad = (deg: number) => (deg * Math.PI) / 180;

function polar(deg: number, dist: number): { x: number; y: number } {
  const a = degToRad(deg);
  return {
    x: 50 + 50 * dist * Math.sin(a),
    y: 50 - 50 * dist * Math.cos(a),
  };
}

function pointerToPolar(
  ring: HTMLElement,
  clientX: number,
  clientY: number,
): { deg: number; dist: number } {
  const box = ring.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const r = Math.hypot(dx, dy);
  const dist = Math.max(0.42, Math.min(1, r / (box.width / 2)));
  return { deg: ((deg % 360) + 360) % 360, dist };
}

/* The draggable CSS-3D object at the centre of the editor. It is a preserve-3d
   box of stacked faces; the visitor drags anywhere on the stage to spin it on X
   and Y, exactly the source's `cursor-grab` spin. Faces sit at distinct Z depths
   so the box reads solid from any angle. */
function SpinObject({ rx, ry }: { rx: number; ry: number }) {
  const face: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.18)",
    background: "rgba(255,255,255,.05)",
    backfaceVisibility: "hidden",
  };
  const depths = [0, 14, 28, 42, 56];
  return (
    <div className="ohf-lighting__spin" style={{ transformStyle: "preserve-3d",
      transform: `translate(-50%, -50%) rotateX(${rx}deg) rotateY(${ry}deg)` }} aria-hidden="true">
      {depths.map((d, i) => (
        <div key={i} style={{ ...face, transform: `translateZ(${-d}px)` }} />
      ))}
      <div style={{ ...face, transform: `translateZ(${56}px)` }} />
      <div style={{ ...face, background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,.18), rgba(0,0,0,0) 60%)" }} />
    </div>
  );
}

/* A single orbit marker: the light's position on the ring, draggable, sized by
   brightness and tinted by its colour and diffusion. */
export function LightingPopover({ onClose }: { onClose: () => void }) {
  const tokens = usePromptTokens((s) => s.tokens);
  const select = usePromptTokens((s) => s.select);
  const clear = usePromptTokens((s) => s.clear);
  const clearFeature = usePromptTokens((s) => s.clearFeature);

  const [sort, setSort] = useState<"default" | "az">("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");
  // the create editor view: null = grid, "editor" = orbit editor, "save" = name dialog
  const [view, setView] = useState<null | "editor" | "save">(null);

  // saved presets (round-trip store) — re-read on mount and after each save
  const [presets, setPresets] = useState<SavedLightingPreset[]>([]);
  useEffect(() => { setPresets(loadLightingPresets()); }, []);

  /* The plate's face and the active card read the same single slot the grid
     writes — composition is one controlKey, so exactly one look is live. */
  const activeId = tokens.find((t) => t.featureId === "lighting" && t.controlKey === "composition")?.value as string | undefined;

  const cards: LightComposition[] = useMemo(() => {
    let list = LIGHT_COMPOSITIONS.slice();
    if (sort === "az") list = list.sort((a, b) => a.label.localeCompare(b.label));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => c.label.toLowerCase().includes(q));
    return list;
  }, [sort, query]);

  // user-preset cards appended after the built-in compositions, filtered the same way
  const userCards = useMemo(() => {
    let list = presets.slice();
    if (sort === "az") list = list.sort((a, b) => a.name.localeCompare(b.name));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [presets, sort, query]);

  function pick(c: LightComposition) {
    // Auto is the no-op default: selecting it clears the slot so nothing is
    // injected and the plate falls back to 자동.
    if (c.id === "auto") {
      clear("lighting", "composition");
      return;
    }
    select("lighting", "composition", c.id);
  }
  function pickPreset(p: SavedLightingPreset) {
    select("lighting", "composition", p.id);
  }

  /* ── The orbit editor state ────────────────────────────────────────────────
     The 3D object's spin (rx/ry) is driven by dragging the stage; the lights are
     placed on the ring by dragging a marker or by the quick-select pad; the chip
     row picks which light its per-light controls edit. */
  const [lights, setLights] = useState<OrbitLight[]>([defaultOrbitLight(1)]);
  const [activeLight, setActiveLight] = useState(0);
  const [spin, setSpin] = useState({ rx: -10, ry: -20 });
  const ringRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragLight, setDragLight] = useState<string | null>(null);
  const [dragSpin, setDragSpin] = useState<{ x: number; y: number } | null>(null);

  const cur = lights[activeLight] ?? lights[0];

  function patchLight(id: string, patch: Partial<OrbitLight>) {
    setLights((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  // drag a light marker around the ring — this is the orbit-position change
  function onMarkerDown(e: ReactPointerEvent, id: string) {
    ringRef.current?.setPointerCapture?.(e.pointerId);
    setDragLight(id);
    setActiveLight(lights.findIndex((l) => l.id === id));
  }
  function onRingMove(e: ReactPointerEvent) {
    if (!dragLight || !ringRef.current) return;
    const { deg, dist } = pointerToPolar(ringRef.current, e.clientX, e.clientY);
    patchLight(dragLight, { deg, dist });
  }
  // drag the stage to spin the 3D object
  function onStageDown(e: ReactPointerEvent) {
    stageRef.current?.setPointerCapture?.(e.pointerId);
    setDragSpin({ x: e.clientX, y: e.clientY });
  }
  function onStageMove(e: ReactPointerEvent) {
    if (!dragSpin) return;
    const dx = e.clientX - dragSpin.x;
    const dy = e.clientY - dragSpin.y;
    setSpin((s) => ({ rx: clampRot(s.rx - dy * 0.4), ry: s.ry + dx * 0.4 }));
    setDragSpin({ x: e.clientX, y: e.clientY });
  }
  function onStageUp() { setDragSpin(null); setDragLight(null); }

  function addLight() {
    setLights((ls) => {
      const n = ls.length + 1;
      // seat the new light on a different quadrant so the two read as an orbit
      const deg = n === 2 ? POSITION_DEG["오른쪽"] : POSITION_DEG["상단"];
      return [...ls, { ...defaultOrbitLight(n), deg }];
    });
    setActiveLight(lights.length); // select the just-added light
  }
  function quickSet(pos: LightPosition) {
    if (!cur) return;
    patchLight(cur.id, { deg: POSITION_DEG[pos] });
  }
  // which quick-select button is "selected" for the current light's angle
  function isActivePos(pos: LightPosition): boolean {
    if (!cur) return false;
    return normalizeDeg(cur.deg) === normalizeDeg(POSITION_DEG[pos]);
  }

  /* Apply writes the orbit's lights into the seat controlKeys so the caption
     carries them (the core reads seat tokens and emits a fragment each); then
     the editor closes back to the grid. */
  function apply() {
    lights.forEach((l, i) => {
      const seat = `light-${i + 1}`;
      select("lighting", seat, { deg: l.deg, dist: l.dist, intensity: l.brightness });
    });
    setView(null);
  }

  function openSave() { setView("save"); }
  function commitSave(name: string) {
    const made = makePreset(name, lights, loadLightingPresets());
    const next = [...loadLightingPresets(), made];
    saveLightingPresets(next);
    setPresets(next);
    setView(null);
  }
  function resetEditor() {
    setLights([defaultOrbitLight(1)]);
    setActiveLight(0);
    setSpin({ rx: -10, ry: -20 });
  }

  return (
    <div className="ohf-popover ohf-popover--lighting" role="dialog" aria-label="조명 배치">
      {/* Head: title, reset, close — the source lays them on one line. */}
      <div className="ohf-lighting__head">
        <span className="ohf-lighting__title">조명</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="ohf-lighting__reset" onClick={() => clearFeature("lighting")}>
          모두 초기화
        </button>
        <button type="button" className="ohf-lighting__close" aria-label="닫기" onClick={onClose}>
          <span aria-hidden>✕</span>
        </button>
      </div>

      {view === "editor" || view === "save" ? (
        /* ── 새 조명 프리셋 orbit editor ─────────────────────────────────── */
        <div className="ohf-lighting__editor">
          <div className="ohf-lighting__editor-head">
            <button type="button" className="ohf-lighting__back" aria-label="뒤로" onClick={() => setView(null)}>
              <span aria-hidden>←</span>
            </button>
            <span className="ohf-lighting__title">새 조명 프리셋</span>
            <span style={{ flex: 1 }} />
            <button type="button" className="ohf-lighting__reset" onClick={resetEditor}>모두 초기화</button>
            <button type="button" className="ohf-lighting__close" aria-label="닫기" onClick={onClose}>
              <span aria-hidden>✕</span>
            </button>
          </div>

          {/* light chips: select the light the per-light controls edit, + add */}
          <div className="ohf-lighting__chips" role="tablist" aria-label="조명 목록">
            {lights.map((l, i) => (
              <button key={l.id} type="button" role="tab" aria-selected={i === activeLight}
                data-active={i === activeLight || undefined} className="ohf-lighting__chip"
                onClick={() => setActiveLight(i)}>조명 {i + 1}</button>
            ))}
            <button type="button" className="ohf-lighting__chip-add" onClick={addLight}>조명 추가하기</button>
          </div>

          {/* the stage: a draggable CSS-3D object orbited by draggable light markers */}
          <div className="ohf-lighting__stage" ref={stageRef}
            onPointerDown={onStageDown} onPointerMove={onStageMove} onPointerUp={onStageUp} onPointerLeave={onStageUp}
            aria-label={`조명 ${activeLight + 1}: ${roleOf(cur?.deg ?? 0)}`}>
            {/* orbit ring guides */}
            <div className="ohf-lighting__ring" ref={ringRef} onPointerMove={onRingMove} onPointerUp={onStageUp}>
              <SpinObject rx={spin.rx} ry={spin.ry} />
              {lights.map((l) => (
                <button key={l.id} type="button" onPointerDown={(e) => onMarkerDown(e, l.id)}
                  aria-label={`${l.id} · ${roleOf(l.deg)}`} title={`${roleOf(l.deg)} · 밝기 ${Math.round(l.brightness * 100)}%`}
                  className="ohf-lighting__marker"
                  data-selected={l.id === cur?.id || undefined}
                  style={{ left: `${polar(l.deg, l.dist).x}%`, top: `${polar(l.deg, l.dist).y}%`,
                    width: 14 + 12 * Math.max(0, Math.min(1, l.brightness)),
                    height: 14 + 12 * Math.max(0, Math.min(1, l.brightness)),
                    background: l.color, filter: l.diffusion >= 0.6 ? "blur(1.2px)" : "none",
                    boxShadow: l.brightness > 0.18 ? `0 0 ${4 + 14 * l.brightness}px ${l.color}` : "none",
                    opacity: l.brightness > 0.18 ? 1 : 0.5 }}>
                </button>
              ))}
            </div>

            {/* per-light controls: colour, brightness, diffusion */}
            {cur && (
              <div className="ohf-lighting__console">
                <label className="ohf-lighting__color">
                  <span>색상</span>
                  <input type="color" value={cur.color} aria-label={`${cur.id} 색상`}
                    onChange={(e) => patchLight(cur.id, { color: e.target.value })} />
                </label>
                <label className="ohf-lighting__slider">
                  <span>밝기</span>
                  <input type="range" min={0} max={1} step={0.05} value={cur.brightness} aria-label={`${cur.id} 밝기`}
                    onChange={(e) => patchLight(cur.id, { brightness: Number(e.target.value) })} />
                  <em>{Math.round(cur.brightness * 100)}%</em>
                </label>
                <label className="ohf-lighting__slider">
                  <span>확산</span>
                  <input type="range" min={0} max={1} step={0.05} value={cur.diffusion} aria-label={`${cur.id} 확산`}
                    onChange={(e) => patchLight(cur.id, { diffusion: Number(e.target.value) })} />
                  <em>{Math.round(cur.diffusion * 100)}%</em>
                </label>
              </div>
            )}

            {/* quick-select pad — the source's six positions */}
            <div className="ohf-lighting__pospad" aria-label="빠른 선택">
              <span className="ohf-lighting__pospad-label">빠른 선택</span>
              <div className="ohf-lighting__pospad-grid">
                {QUICK_POSITIONS.map((pos) => (
                  <button key={pos} type="button" className="ohf-lighting__pos"
                    data-selected={isActivePos(pos) || undefined} aria-pressed={isActivePos(pos)}
                    onClick={() => quickSet(pos)}>{pos}</button>
                ))}
              </div>
            </div>
          </div>

          {/* footer: apply + save */}
          <div className="ohf-lighting__foot">
            <button type="button" className="ohf-btn-accent" onClick={apply}>적용하기</button>
            <button type="button" className="ohf-lighting__save-btn" onClick={openSave}>프리셋으로 저장하기</button>
          </div>

          {/* name dialog overlays the editor when saving */}
          {view === "save" && <SaveDialog onCancel={() => setView("editor")} onCommit={commitSave} />}
        </div>
      ) : (
        /* ── composition grid (the panel's face) ─────────────────────────── */
        <>
          {/* Toolbar: heading + hint on the left, sort + inline search on the
              right — the source's single top row. */}
          <div className="ohf-lighting__bar">
            <div className="ohf-lighting__lead">
              <span className="ohf-lighting__lead-title">조명 설정하기</span>
              <span className="ohf-lighting__hint">조명 구성을 선택하거나 직접 조명을 배치하세요</span>
            </div>
            <div className="ohf-lighting__sortwrap">
              <button type="button" className="ohf-lighting__sort" aria-expanded={sortOpen} aria-haspopup="menu"
                onClick={() => setSortOpen((v) => !v)}>정렬 기준</button>
              {sortOpen && (
                <div className="ohf-lighting__menu" role="menu" aria-label="정렬 기준">
                  <button type="button" role="menuitemradio" aria-checked={sort === "default"}
                    data-active={sort === "default" || undefined} className="ohf-lighting__opt"
                    onClick={() => { setSort("default"); setSortOpen(false); }}>기본값</button>
                  <button type="button" role="menuitemradio" aria-checked={sort === "az"}
                    data-active={sort === "az" || undefined} className="ohf-lighting__opt"
                    onClick={() => { setSort("az"); setSortOpen(false); }}>이름 (A–Z)</button>
                </div>
              )}
            </div>
            <div className="ohf-lighting__group-search">
              <span className="ohf-lighting__search-icon" aria-hidden>
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" />
                </svg>
              </span>
              <input className="ohf-lighting__input" type="search" value={query}
                placeholder="프리셋 검색" aria-label="검색"
                onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <div className="ohf-lighting__grid">
            {/* The create card leads the grid, exactly as the source seats it. It
                opens the orbit editor — the direct-placement path the hint names. */}
            <button type="button" className="ohf-lighting__create" aria-label="새 조명 프리셋"
              onClick={() => { resetEditor(); setView("editor"); }}>
              <span className="ohf-lighting__create-plus" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M12 7v10M7 12h10" />
                </svg>
              </span>
              <span className="ohf-lighting__create-label">새 조명 프리셋</span>
            </button>
            {cards.map((c) => {
              const picked = c.id === activeId || (c.id === "auto" && !activeId);
              return (
                <button key={c.id} type="button" className="ohf-lighting__card"
                  data-picked={picked || undefined} aria-pressed={picked} onClick={() => pick(c)}>
                  <span className="ohf-lighting__thumb"><img src={c.thumb} alt={c.label} loading="lazy" /></span>
                  <span className="ohf-lighting__name">{c.label}</span>
                </button>
              );
            })}
            {userCards.map((p) => {
              const picked = p.id === activeId;
              return (
                <button key={p.id} type="button" className="ohf-lighting__card ohf-lighting__card--user"
                  data-picked={picked || undefined} aria-pressed={picked} onClick={() => pickPreset(p)}>
                  <span className="ohf-lighting__thumb ohf-lighting__thumb--user">
                    <PresetThumb lights={p.lights} />
                  </span>
                  <span className="ohf-lighting__name">{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* The plate's face is driven from this same slot; show what the plate
              will read so the screen and the prompt agree. */}
          <div className="ohf-lighting__readout">
            선택 · <span>{lightingChoice(activeId)}</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── helpers ───────────────────────────────────────────────────────────────── */
function clampRot(v: number): number { return Math.max(-70, Math.min(70, v)); }
function normalizeDeg(d: number): number { return ((d % 360) + 360) % 360; }
function roleOf(deg: number | undefined): string {
  if (deg == null) return "";
  return classifyLight(deg);
}

/* The save name dialog: a small panel that asks for the preset's name, matching
   the source's `조명 저장` sheet with 취소 / 저장. */
function SaveDialog({ onCancel, onCommit }: { onCancel: () => void; onCommit: (name: string) => void }) {
  const [name, setName] = useState("");
  const canSave = name.trim().length > 0;
  return (
    <div className="ohf-lighting__savedlg" role="dialog" aria-label="조명 저장">
      <h3 className="ohf-lighting__savedlg-title">조명 저장</h3>
      <input className="ohf-lighting__savedlg-input" autoFocus value={name} placeholder="프리셋 이름을 입력하세요"
        aria-label="프리셋 이름" onChange={(e) => setName(e.target.value)} />
      <div className="ohf-lighting__savedlg-foot">
        <button type="button" className="ohf-lighting__cancel" onClick={onCancel}>취소</button>
        <button type="button" className="ohf-btn-accent" disabled={!canSave} aria-disabled={!canSave || undefined}
          onClick={() => canSave && onCommit(name)}>저장</button>
      </div>
    </div>
  );
}

/* A tiny preview of an orbit for a saved preset card: dots on a ring tinted by
   their colour, sized by brightness. No image asset needed. */
function PresetThumb({ lights }: { lights: OrbitLight[] }) {
  return (
    <span className="ohf-lighting__orbit-preview" aria-hidden>
      {lights.map((l, i) => {
        const p = polar(l.deg, l.dist);
        const size = 6 + 6 * Math.max(0, Math.min(1, l.brightness));
        return (
          <span key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
            width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2,
            borderRadius: "50%", background: l.color,
            boxShadow: l.brightness > 0.18 ? `0 0 4px ${l.color}` : "none",
            opacity: l.brightness > 0.18 ? 1 : 0.5 }} />
        );
      })}
    </span>
  );
}
