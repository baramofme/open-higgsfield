"use client";

/* Reference film's screen: the seat's film tile plus the dialog it opens — a
   row-for-row port of the app's own "필름 설정" dialog, measured live over CDP
   against higgsfield.ai on 2026-11-04 (workspace t_66fe73d4, hf_film_dump.json
   and hf5/6/8/9_full.json). Three wheels stand in for the old chip grid: the
   genre drum (a front card plus two tappable neighbours on a flat arc), the era
   label ruler (decades on 168px spacing under a preview still) and the tempo
   wheel (thumbnail cards on 300px slots). The tab rail, header, pager pill and
   every rect copy the app's own numbers: 800x504 panel, 24px radius, 1px body
   gap, 184px tab rail, 36px tabs, white/5 panes over the #1c1e20 panel.

   Selection model, measured, not guessed: a neighbour card commits its item
   (the seat plate then reads that item's display word — the app spells genre
   English even under a Korean UI); the front card toggles its own item back
   off; prev/next and dragging browse without committing (the pill tracks the
   browse word). Era and tempo labels/rows commit on tap, their Auto entry
   clears the slot. The plate joins live slots in canonical axis order —
   genre, era, tempo — exactly like the app's measured "Epic, 1960s". */

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePromptTokens } from "@/generation/prompt-registry";
import {
  REFERENCE_FILM_FEATURE,
  REFERENCE_AXES,
  FILM_STILLS,
  type ReferenceAxis,
  type ReferenceOption,
} from "@/generation/reference-film";

/** The composer's overlay id for the film dialog. Exported here so the composer
 *  needs no new local constant of its own — it imports this id alongside the
 *  button and the dialog. */
export const REFERENCE_FILM_OVERLAY = "reference-film";

/** The app's pane captions, measured verbatim off the live dialog. */
const FILM_CAPTIONS: Readonly<Record<string, string>> = {
  genre: "모델이 따를 스토리 관습",
  era: "영화가 속한 시대",
  tempo: "몽타주의 속도감",
};

/* The era preview stills: the app swaps this image when an era commits
   (HF live probe CDP :9222 — each decade carries its own art, fetched from
   the CDN cinema_studio_40_creative_controls assets; 1960s rode e06c19b7,
   1980s 5c38606d, the resting wheel the default). 1990s/2000s/2020s ride
   the default until their measured URLs land. */
const ERA_STILLS: Readonly<Record<string, string>> = {
  auto: "/cinema-studio-4/film/era/default.webp",
  "1960s": "/cinema-studio-4/film/era/1960s.webp",
  "1980s": "/cinema-studio-4/film/era/1980s.webp",
  "1990s": "/cinema-studio-4/film/era/1990s.webp",
  "2000s": "/cinema-studio-4/film/era/2000s.webp",
  "2020s": "/cinema-studio-4/film/era/2020s.webp",
};

/** The seat plate's value line: the live slots joined by the app's canonical
 *  axis order (genre, era, tempo) with ", " — 자동 when nothing is stacked. */
function useFilmPlateValue(): string {
  return usePromptTokens((state) => {
    const parts: string[] = [];
    for (const axis of REFERENCE_AXES) {
      const value = state.tokens.find(
        (t) => t.featureId === REFERENCE_FILM_FEATURE && t.controlKey === axis.key,
      )?.value;
      const option = axis.options.find((o) => o.value === String(value));
      if (option && option.display !== "Auto") parts.push(option.display);
    }
    return parts.length ? parts.join(", ") : "자동";
  });
}

/** The composer's film tile: the clapper face that opens the reference dialog.
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
  const value = useFilmPlateValue();
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
      {/* HF's film instrument is the animated camera-roll artwork, not a glyph:
          the 40x35 original rides at h32 with width auto (measured 37x32). */}
      <span className="ohf-vtc-ic ohf-vtc-ic--film" aria-hidden>
        <img src="/cinema-studio-4/camera-roll-animated.svg" alt="" />
      </span>
      <span className="ohf-vtc-col">
        <span className="ohf-vtc-label">필름 설정</span>
        <span className="ohf-vtc-val">{value}</span>
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- icons --
   The tab rail glyphs mirror the app's meanings (film strip, era dial, tempo
   wave); the app's exact vector paths are on the patch list once the live svg
   dump lands. The pager chevrons are the app's own stroke shapes. */

function FilmTabIcon({ kind }: { kind: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 20,
    height: 20,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "ohf-rfd__tab-icon",
  };
  /* The app's own tab glyphs, verbatim from the live svg dump. */
  if (kind === "genre")
    return (
      <svg {...common}>
        <path d="M17.5 5.75h2.75a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1H17.5m-11 0H3.75a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1H6.5m10-2h-9a1 1 0 0 0-1 1v14.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V4.75a1 1 0 0 0-1-1" />
      </svg>
    );
  if (kind === "era")
    return (
      <svg {...common}>
        <path d="M4.75 2.75h14.5M4.75 21.25h14.5M5.75 3v3.75c0 2.645 1.956 4.886 4.5 5.25M5.75 21v-3.75c0-2.644 1.955-4.885 4.498-5.25M18.25 3v3.75c0 2.645-1.956 4.886-4.5 5.25M18.248 21v-3.75c0-2.644-1.955-4.885-4.498-5.25" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M20.25 11.75v-7a1 1 0 0 0-1-1H4.75a1 1 0 0 0-1 1v14.5a1 1 0 0 0 1 1h7" />
      <path d="M4 8.75h16M8.25 8.75l2-5M13.75 8.75l2-5" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === "left" ? <path d="M14.5 18.25L8.25 12L14.5 5.75" /> : <path d="M9.5 18.25L15.75 12L9.5 5.75" />}
    </svg>
  );
}

/* The app's own close mark, verbatim from the live svg dump. */
function CloseMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
      <path d="M4.75 4.75L19.25 19.25M19.25 4.75L4.75 19.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------ card body --
   The app's still-card: a #0f1113 frame with 4px padding around a #0b0b0b
   media well with 20px radius, the scene object-cover inside it. The front
   card scales its media 1.4 about its centre — the app's own "zoom the live
   one" trick (measured 322x181 out of a 230x129 slot). */

function FilmStillCard({ still, alt }: { still: string | undefined; alt: string }) {
  return (
    <div className="ohf-rfd-card">
      <div className="ohf-rfd-card-media">
        {still ? <img src={still} alt={alt} /> : null}
      </div>
    </div>
  );
}

/* Fold a cyclic offset into (-n/2, n/2]: the item just past the far side comes
   over from behind, so the wheel always reads symmetric around the centre. */
function fold(n: number, total: number): number {
  let d = ((n % total) + total) % total;
  if (d > total / 2) d -= total;
  return d;
}

/* A horizontal spin surface: dragging past half a detent moves the browse one
   step per detent on release, exactly like the camera drum's endless spin. */
function useSpin(ref: React.RefObject<HTMLDivElement | null>, step: number, onSteps: (n: number) => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let drag: { id: number; x: number; moved: number } | null = null;
    const onMove = (event: PointerEvent) => {
      if (drag && drag.id === event.pointerId) drag.moved = event.clientX - drag.x;
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      const steps = -Math.round(drag.moved / step);
      drag = null;
      if (steps) onSteps(steps);
    };
    const onDown = (event: PointerEvent) => {
      drag = { id: event.pointerId, x: event.clientX, moved: 0 };
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ref, step, onSteps]);
}

/* ----------------------------------------------------------- genre drum --
   Seven stories ride an arc of seven slots: the browse centre wears the front
   slot (landscape 230x129, media scaled 1.4), its neighbours sit on square
   254 slots 300px either side of centre at the measured 192px drop, the rest
   fall below the fold on the slots the app parks at 505 and 793 (invisible,
   still mounted). Tapping a neighbour commits it; the front toggles off when
   the item under it is the live one; dragging browses. */

function GenreDrum({
  axis,
  value,
  browse,
  onBrowse,
  onCommit,
  onClear,
}: {
  axis: ReferenceAxis;
  value: string | undefined;
  browse: number;
  onBrowse: (next: number) => void;
  onCommit: (option: ReferenceOption) => void;
  onClear: () => void;
}) {
  const n = axis.options.length;
  const area = useRef<HTMLDivElement>(null);
  const step = (delta: number) => onBrowse(((browse + delta) % n + n) % n);
  useSpin(area, 300, step);
  const selIdx = axis.options.findIndex((o) => o.value === value);
  const aligned = browse === (selIdx >= 0 ? selIdx : 0);

  return (
    <div className="ohf-rfd-drum" ref={area} role="group" aria-label="장르" data-aligned={aligned ? "" : undefined}>
      <span className="ohf-rfd-drum-guide" aria-hidden />
      {axis.options.map((option, i) => {
        const e = fold(i - browse, n);
        const front = e === 0;
        const side = Math.abs(e) === 1;
        return (
          <div
            key={option.value}
            className={"ohf-rfd-slot ohf-rfd-slot--e" + e}
            data-e={e}
          >
            <div
              className="ohf-rfd-slot-card"
              role={side ? "button" : undefined}
              tabIndex={side ? 0 : -1}
              aria-label={option.label}
              onClick={() => {
                if (side) {
                  onBrowse(i);
                  /* 일반 is the wheel's resting place: committing it clears the
                     genre the way the app's plate shows the era alone again. */
                  if (option.value === "general") onClear();
                  else onCommit(option);
                } else if (front && option.value === value) onClear();
              }}
              onKeyDown={(event) => {
                if (side && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onBrowse(i);
                  if (option.value === "general") onClear();
                  else onCommit(option);
                }
              }}
            >
              <FilmStillCard still={FILM_STILLS[option.value]} alt={option.label} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- era ruler --
   Decades on the live page's 168px pitch around the browse centre. The tick
   ruler is full pane width: 81 hairlines at 16.8px pitch, every 10th (one
   detent, under a label) taller, and the centre detent carries a yellow
   marker (CDP :9222). The preview still above is the selected era's scene —
   HF swaps it per era; the resting wheel reads the default still. Tapping a
   label commits it — Auto clears the slot — and the wheel carries it to the
   centre. */

function EraRuler({
  axis,
  value,
  browse,
  onBrowse,
  onCommit,
  onClear,
}: {
  axis: ReferenceAxis;
  value: string | undefined;
  browse: number;
  onBrowse: (next: number) => void;
  onCommit: (option: ReferenceOption) => void;
  onClear: () => void;
}) {
  const n = axis.options.length;
  const area = useRef<HTMLDivElement>(null);
  const step = (delta: number) => onBrowse(((browse + delta) % n + n) % n);
  useSpin(area, 168, step);
  const previewKey = value && value !== "auto" ? value : "auto";
  return (
    <div className="ohf-rfd-era" ref={area} role="group" aria-label="시대">
      <div className="ohf-rfd-era-preview">
        <div className="ohf-rfd-card">
          <div className="ohf-rfd-card-media ohf-rfd-card-media--era">
            <img src={ERA_STILLS[previewKey]} alt="Era preview" />
          </div>
        </div>
      </div>
      <div className="ohf-rfd-era-ruler" aria-hidden>
        {Array.from({ length: 81 }, (_, k) => {
          const i = k - 40; // detents around the centre, 16.8px pitch
          const cls =
            "ohf-rfd-tick" +
            (i % 10 === 0 ? " ohf-rfd-tick--lab" : "") +
            (i === 0 ? " ohf-rfd-tick--mid" : "");
          return (
            <span key={i} className={cls} style={{ "--tx": `${i * 16.8}px` } as CSSProperties} />
          );
        })}
      </div>
      <div className="ohf-rfd-era-wheel">
        {axis.options.map((option, i) => {
          const e = fold(i - browse, n);
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className="ohf-rfd-era-label"
              style={{ transform: `translate(-50%, -50%) translateX(${e * 168}px)` }}
              data-selected={selected || undefined}
              aria-pressed={selected}
              aria-label={option.label}
              onClick={() => {
                onBrowse(i);
                if (option.value === "auto") onClear();
                else onCommit(option);
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

/* ----------------------------------------------------------- tempo wheel --
   Five beats on the app's 300px slots: the browse centre grows to 300x190,
   neighbours ride 204x129 at 75% opacity, the rest fade below two steps.
   Tapping any slot commits it (Auto clears); dragging browses. */

function TempoWheel({
  axis,
  value,
  browse,
  onBrowse,
  onCommit,
  onClear,
}: {
  axis: ReferenceAxis;
  value: string | undefined;
  browse: number;
  onBrowse: (next: number) => void;
  onCommit: (option: ReferenceOption) => void;
  onClear: () => void;
}) {
  const n = axis.options.length;
  const area = useRef<HTMLDivElement>(null);
  const step = (delta: number) => onBrowse(((browse + delta) % n + n) % n);
  useSpin(area, 300, step);

  return (
    <div className="ohf-rfd-tempo" ref={area} role="listbox" aria-label="템포">
      {axis.options.map((option, i) => {
        const e = fold(i - browse, n);
        const front = e === 0;
        const selected = option.value === value;
        return (
          <div
            key={option.value}
            className={"ohf-rfd-tempo-slot" + (front ? " ohf-rfd-tempo-slot--front" : "")}
            style={{ transform: `translateX(-50%) translateX(${e * 300}px)` }}
            role="option"
            aria-selected={selected}
            data-e={e}
          >
            <button
              type="button"
              className="ohf-rfd-tempo-hit"
              aria-label={option.label}
              onClick={() => {
                onBrowse(i);
                if (option.value === "auto") onClear();
                else onCommit(option);
              }}
            >
              <div className="ohf-rfd-card ohf-rfd-card--tempo">
                <div className="ohf-rfd-card-media">
                  <img src={FILM_STILLS[option.value]} alt={option.label} />
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- dialog --
   The portal pattern is the camera dialog's proven one: render nothing until
   mounted so the server HTML never carries the portal, then escape to body.
   The dialog centres itself exactly like the app's own fixed panel. The browse
   index lives here — the panes and the pager pill read the same number. */

export function ReferenceFilmDialog({ onClose }: { onClose: () => void }) {
  const [inPortal, setInPortal] = useState(false);
  const [tab, setTab] = useState<string>("genre");
  const [browse, setBrowse] = useState(0);
  useEffect(() => setInPortal(true), []);

  const tokens = usePromptTokens((state) => state.tokens);
  const stringValue = (controlKey: string): string | undefined =>
    tokens.find(
      (t) => t.featureId === REFERENCE_FILM_FEATURE && t.controlKey === controlKey,
    )?.value as string | undefined;

  const axis = REFERENCE_AXES.find((a) => a.key === tab) ?? REFERENCE_AXES[0]!;
  const value = stringValue(axis.key);

  /* Switching panes seats the wheel on the live selection, or on the resting
     Auto/first item when nothing is committed. */
  useEffect(() => {
    const idx = axis.options.findIndex((o) => o.value === value);
    setBrowse(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const commit = (option: ReferenceOption) =>
    usePromptTokens.getState().select(REFERENCE_FILM_FEATURE, axis.key, option.value);
  const clear = () => usePromptTokens.getState().clear(REFERENCE_FILM_FEATURE, axis.key);

  const n = axis.options.length;
  const wrap = (i: number) => ((i % n) + n) % n;
  const shift = (delta: number) => setBrowse((b) => wrap(b + delta));

  const pillWord = axis.options[wrap(browse)]!.label;

  if (!inPortal) return null;
  return createPortal(
    <div className="ohf-rfd" role="dialog" aria-label="필름 설정">
      <div className="ohf-rfd__panel">
        <header className="ohf-rfd__head">
          <span className="ohf-rfd__title">필름 설정</span>
          <button
            type="button"
            className="ohf-rfd__reset"
            onClick={() => {
              usePromptTokens.getState().clearFeature(REFERENCE_FILM_FEATURE);
              setTab("genre"); // HF: reset returns the pane to 장르 (hf_micro after-reset pill "일반")
              setBrowse(0);
            }}
          >
            모두 초기화
          </button>
          <button type="button" className="ohf-rfd__close" aria-label="닫기" onClick={onClose}>
            <CloseMark />
          </button>
        </header>
        <div className="ohf-rfd__body">
          <div className="ohf-rfd__tabs" role="tablist" aria-orientation="vertical">
            {REFERENCE_AXES.map((a) => {
              const on = a.key === tab;
              return (
                <button
                  key={a.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  className={"ohf-rfd__tab" + (on ? " ohf-rfd__tab--on" : "")}
                  onClick={() => setTab(a.key)}
                >
                  <FilmTabIcon kind={a.key} />
                  <span className="ohf-rfd__tab-label">{a.label}</span>
                </button>
              );
            })}
          </div>
          <div className="ohf-rfd__pane">
            <div className="ohf-rfd__caption">
              <div className="ohf-rfd__caption-col">
                <span className="ohf-rfd__caption-title">{axis.label} 선택</span>
                <span className="ohf-rfd__caption-sub">{FILM_CAPTIONS[axis.key]}</span>
              </div>
            </div>
            <div className="ohf-rfd__picker">
              {tab === "genre" && (
                <GenreDrum
                  axis={axis}
                  value={value}
                  browse={browse}
                  onBrowse={setBrowse}
                  onCommit={commit}
                  onClear={clear}
                />
              )}
              {tab === "era" && (
                <EraRuler
                  axis={axis}
                  value={value}
                  browse={browse}
                  onBrowse={setBrowse}
                  onCommit={commit}
                  onClear={clear}
                />
              )}
              {tab === "tempo" && (
                <TempoWheel
                  axis={axis}
                  value={value}
                  browse={browse}
                  onBrowse={setBrowse}
                  onCommit={commit}
                  onClear={clear}
                />
              )}
              {/* HF's era pane carries no pager at all (CDP :9222: no arrows,
                  no pill) — only genre and tempo browse with one. HF's arrow
                  labels name the pane ("이전 장르"), so mirror that. */}
              {tab !== "era" && (
              <div className="ohf-rfd__pager">
                <button
                  type="button"
                  className="ohf-rfd__arrow"
                  aria-label={`이전 ${axis.label}`}
                  onClick={() => shift(-1)}
                >
                  <Chevron dir="left" />
                </button>
                <span className="ohf-rfd__pill">{pillWord}</span>
                <button
                  type="button"
                  className="ohf-rfd__arrow"
                  aria-label={`다음 ${axis.label}`}
                  onClick={() => shift(1)}
                >
                  <Chevron dir="right" />
                </button>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
