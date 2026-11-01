"use client";

/* Cinema's two instruments, mirrored from the app's live panels (measured
   2026-10-31 over CDP and by the user's own screenshot). The character side is
   a screen-only mirror: the app's dialog is a learning flow (upload photos,
   train a consistent character) and no such concept exists here, so the rows
   carry the app's own titles and stay inert. The camera side is REAL and
   faithful to the panel's chrome: the title reads 초기화-bearing
   "카메라 설정하기", the columns are labeled 카메라 and 렌즈, the selected item
   wears a white outline and the defaults are the app's own — 35mm Film and
   Warm Vintage, with 초기화 restoring them. */

import { useEffect, useRef, useState } from "react";

import { CAMERAS, CAMERA_AUTO_ART, CHOICE_ART, LENSES, useCamera } from "@/generation/stores/camera";
import { CameraIcon, ChevronIcon, CloseIcon, PersonIcon } from "./icons";

export function CharacterPopover({ onClose }: { onClose: () => void }) {
  return (
    <div className="ohf-popover ohf-popover--cinema" role="dialog" aria-label="캐릭터">
      <div className="ohf-cinema-pop-head">
        <span className="ohf-cinema-pop-title">캐릭터</span>
        <button type="button" className="ohf-icon-btn ohf-icon-btn--ghost" aria-label="Close" onClick={onClose}>
          <CloseIcon size={12} />
        </button>
      </div>
      <p className="ohf-cinema-pop-note">
        사진을 업로드해 일관된 캐릭터를 학습시켜 보세요.
      </p>
      {/* The app's entry rows, verbatim titles, inert until a character
          system exists on this side. */}
      <div className="ohf-cinema-pop-rows">
        <div className="ohf-cinema-pop-row" data-off>
          <span className="ohf-cinema-row-title">캐릭터 만들기</span>
        </div>
        <div className="ohf-cinema-pop-row" data-off>
          <span className="ohf-cinema-row-title">나만의 캐릭터 만들기</span>
        </div>
        <div className="ohf-cinema-pop-row" data-off>
          <span className="ohf-cinema-row-title">전체</span>
          <span className="ohf-cinema-row-sub">Soul · Soul 2.0 · Soul Cinema</span>
        </div>
      </div>
      <span className="ohf-cinema-flag">화면 미러 — 학습 흐름 미구현</span>
    </div>
  );
}

/* The drum, ported row-for-row from the app's own markup (user-supplied HTML,
   2026-10-31). One wheel per choice: rows are absolutely positioned 120px tall
   and ride translateY(distance × step) inside an overflow-hidden listbox with a
   top/bottom mask fade — the selected row sits at the centre reading a white
   ring, its neighbours fade darker the further they are from the detent. The
   list is cyclic: past the end you come back at the front, exactly as the app
   repeats its options around the wheel. Rotation comes from three sources:
   the mouse wheel (one detent per notch), dragging the drum itself (the app
   is a cursor-grab surface), and the hover arrows the app reveals on top and
   bottom of each wheel. */
function CameraWheel<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly T[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const acc = useRef(0);
  const drag = useRef<{ id: number; startY: number; rot: number } | null>(null);
  const [rot, setRot] = useState(0);
  const step = 120; // the app's own --wheel-step
  const index = items.indexOf(value);
  const n = items.length;

  /* The endless drum: every row rides at (its cyclic offset from the selection
     × one detent) plus the live spin, so turning the wheel by any amount —
     more than a full lap included — keeps all n rows in formation and the
     next option always arrives from below. There is no top and no bottom.
     The offset folds into (-n/2, n/2]: the row just past the selection comes
     over from the far side, so the drum shows as many rows above the centre as
     below it. Positive offsets sit below; negative ones rise above. */
  const offset = (i: number) => {
    let d = (((i - index) % n) + n) % n;
    if (d > n / 2) d -= n;
    return d;
  };
  const baseY = (i: number) => offset(i) * step + 150;
  const rowY = (i: number) => baseY(i) + rot;

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      acc.current += event.deltaY;
      const STEP = 110;
      let moved = 0;
      while (Math.abs(acc.current) >= STEP) {
        const dir = acc.current > 0 ? 1 : -1;
        moved += dir;
        acc.current -= dir * STEP;
      }
      if (moved !== 0) onChange(items[((index + moved) % n + n) % n] as T);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [index, items, onChange, n]);

  /* Dragging is endless: the drum spins by however far the pointer travelled,
     in pixels, and only when the finger leaves does the spin snap to the
     nearest detent and settle into the store. Nothing is ever "the first row"
     or "the last row" — the wheel carries no ends at all. */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== event.pointerId) return;
      d.rot = event.clientY - d.startY;
      setRot(d.rot);
    };
    const onUp = (event: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== event.pointerId) return;
      const snap = Math.round(d.rot / step) * step;
      const shift = -Math.round(snap / step);
      drag.current = null;
      setRot(0);
      onChange(items[(((index + shift) % n) + n) % n] as T);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [index, items, onChange, n, step]);

  return (
    <div className="ohf-cine-wheel">
      <span className="ohf-cine-wheel-head">{label}</span>
      <div className="ohf-cine-wheel-body">
        <div
          ref={viewport}
          role="listbox"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={label}
          className="ohf-cine-listbox"
          onPointerDown={(event) => {
            drag.current = { id: event.pointerId, startY: event.clientY, rot: 0 };
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              onChange(items[((index + 1) % n + n) % n] as T);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              onChange(items[((index - 1 + n) % n) % n] as T);
            }
          }}
        >
          {items.map((item, i) => {
            const selected = item === value && rot === 0;
            return (
              <div
                key={item}
                role="option"
                aria-selected={selected}
                data-selected={selected || undefined}
                className="ohf-cine-row"
                style={{ transform: `translateY(${rowY(i)}px)` }}
              >
                <div className="ohf-cine-pill">
                {item === "Auto" ? (
                  /* The app's own auto marks, downloaded from its CDN: a flat
                     plate carries the svg, centred, with the word beneath. */
                  <>
                    <div className="ohf-cine-auto-plate" />
                    <img className="ohf-cine-auto-mark" src={label === "카메라" ? CAMERA_AUTO_ART : CHOICE_ART.Auto} alt="" />
                    <span className="ohf-cine-auto-label">{item}</span>
                  </>
                ) : (
                  /* The app's own cover scene, full-bleed inside the pill;
                     the shade and the bottom label ride it as they did on
                     the wash — the word has to stay readable over a photo. */
                  <>
                    <img className="ohf-cine-art" src={CHOICE_ART[item]} alt="" />
                    <div className="ohf-cine-wash-shade" />
                    <span className="ohf-cine-row-label">{item}</span>
                  </>
                )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="ohf-cine-nav ohf-cine-nav--prev">
          <button
            type="button"
            aria-label="이전"
            className="ohf-cine-arrow"
            onClick={() => onChange(items[((index - 1 + n) % n) % n] as T)}
          >
            <ChevronIcon size={14} flip />
          </button>
        </div>
        <div className="ohf-cine-nav ohf-cine-nav--next">
          <button
            type="button"
            aria-label="다음"
            className="ohf-cine-arrow"
            onClick={() => onChange(items[((index + 1) % n + n) % n] as T)}
          >
            <ChevronIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* The app's sheet has no close button: tapping the camera tile again, or
   anywhere outside the sheet, folds it away — the composer already wires both
   — so onClose is accepted and deliberately unused. */
export function CameraPopover(_props: { onClose: () => void }) {
  const { camera, lens, setCamera, setLens, reset } = useCamera();
  return (
    <div className="ohf-popover ohf-popover--sheet" role="dialog" aria-label="카메라 설정">
      <header className="ohf-cine-head">
        <span className="ohf-cine-title">카메라 설정하기</span>
        <button type="button" className="ohf-cine-reset" onClick={reset}>
          초기화
        </button>
      </header>
      <div className="ohf-cine-grid">
        <CameraWheel items={CAMERAS} value={camera} onChange={setCamera} label="카메라" />
        <CameraWheel items={LENSES} value={lens} onChange={setLens} label="렌즈" />
        <span className="ohf-cine-divider" aria-hidden="true" />
      </div>
    </div>
  );
}

/* The composer's two tiles, as the app lays them: 80×80 character, 120×80
   camera carrying its lens state under the label. */
export function CinemaTiles({
  characterOpen,
  cameraOpen,
  onCharacter,
  onCamera,
}: {
  characterOpen: boolean;
  cameraOpen: boolean;
  onCharacter: (trigger: HTMLElement) => void;
  onCamera: (trigger: HTMLElement) => void;
}) {
  const { camera, lens } = useCamera();
  return (
    <div className="ohf-cinema-tiles">
      <button
        type="button"
        className="ohf-cinema-tile ohf-cinema-tile--character"
        aria-label="캐릭터 설정 열기"
        aria-expanded={characterOpen}
        aria-haspopup="dialog"
        data-tour-anchor="tour-character"
        onClick={(event) => onCharacter(event.currentTarget)}
      >
        <span className="ohf-cinema-tile-ic">
          <PersonIcon size={20} />
        </span>
        <span className="ohf-cinema-tile-label">캐릭터</span>
      </button>
      <button
        type="button"
        className="ohf-cinema-tile ohf-cinema-tile--camera"
        aria-label="카메라 설정 열기"
        aria-expanded={cameraOpen}
        aria-haspopup="dialog"
        data-tour-anchor="tour-camera"
        onClick={(event) => onCamera(event.currentTarget)}
      >
        {/* The preset thumbnail of the app: the selected camera's own scene,
            full-bleed, with the drum it opens stacked at its foot — camera
            name carrying, lens riding underneath, both truncate. */}
        {/* Below 560 the face answers with an icon alone: the camera's own mark
            rides hidden until the column is a thumb's width. */}
        <span className="ohf-cinema-tile-ic ohf-cinema-tile-ic--camera">
          <CameraIcon size={20} />
        </span>
        <img className="ohf-cinema-tile-photo" src={CHOICE_ART[camera]} alt="" />
        <span className="ohf-cinema-tile-stack">
          <span className="ohf-cinema-tile-label">{camera}</span>
          <span className="ohf-cinema-tile-sub">{lens}</span>
        </span>
      </button>
    </div>
  );
}
