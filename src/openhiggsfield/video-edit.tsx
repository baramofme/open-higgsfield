"use client";

/* t_4811a7b2 — the HF video editor stood inside the showcase's 편집 tab.
   HF's real video editor is a full timeline workbench (a playhead over a video
   lane, in/out trim handles, a caption lane) with a row of clip tools docked
   under it and a caption inspector on the rail. The live HF DOM for a VIDEO
   asset could not be harvested from this debug account (its feeds carry only
   images), so this stands the HF *architecture* faithfully — timeline + clip
   tools + captions — on OH's own showcase scaffolding, reusing the image edit
   workspace's patterns and tokens. Exact HF class parity is deferred to the
   sibling ground-truth card. */

import { useCallback, useEffect, useRef, useState } from "react";

/* One caption on the timeline: a span of the clip, as a fraction of its length,
   with the words shown over the picture while it plays. */
export type CaptionSeg = { id: string; start: number; end: number; text: string };

/* Two held captions seed the lane so the editor reads as a working timeline even
   before the visitor adds their own. Fractions are clip-relative, so they render
   whether or not the media has decoded. */
export const SEED_CAPTIONS: CaptionSeg[] = [
  { id: "c1", start: 0.04, end: 0.42, text: "오프닝" },
  { id: "c2", start: 0.5, end: 0.92, text: "마무리" },
];

/* The clip tools HF seats under the timeline. play/seek/volume are real; the cut
   and speed tools mirror HF's clip toolbar but the engine that re-cuts a clip is
   not wired here, so they read as honest inert chrome. */
type ClipTool =
  | "split"
  | "trim"
  | "duplicate"
  | "remove"
  | "speed"
  | "reverse"
  | "loop"
  | "volume";

const CLIP_TOOLS: { id: ClipTool; label: string }[] = [
  { id: "split", label: "클립 분할" },
  { id: "trim", label: "클립 자르기" },
  { id: "duplicate", label: "클립 복제" },
  { id: "remove", label: "클립 삭제" },
  { id: "speed", label: "배속" },
  { id: "reverse", label: "방향 반전" },
  { id: "loop", label: "반복" },
  { id: "volume", label: "볼륨" },
];

/* --------------------------------------------------------------------------- */
/* The centre workbench: the clip, the timeline, the transport and the tools.    */
/* --------------------------------------------------------------------------- */

export function VideoEditor({
  url,
  captions,
}: {
  url: string;
  captions: CaptionSeg[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"seek" | "in" | "out" | null>(null);
  const inRef = useRef(0);
  const outRef = useRef(1);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inPt, setInPt] = useState(0);
  const [outPt, setOutPt] = useState(1);

  inRef.current = inPt;
  outRef.current = outPt;

  /* The fraction of the clip the playhead sits at. A clip with no decoded length
     falls back to a resting head at the very start, never a NaN position. */
  const head = duration > 0 ? Math.min(1, Math.max(0, time / duration)) : 0;
  const activeCaption = captions.find((c) => head >= c.start && head <= c.end) ?? null;

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  /* Read the playhead position straight off the clip while it runs; clamp inside
     the in/out points the way HF loops a selected span. */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const step = () => {
      const v = videoRef.current;
      if (v && duration > 0) {
        const lo = inRef.current * duration;
        const hi = outRef.current * duration;
        if (v.currentTime > hi || v.currentTime < lo) v.currentTime = lo;
        setTime(v.currentTime);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  /* Map a pointer position over the track to a clip fraction (0..1). */
  const toFraction = useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const box = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
  }, []);

  const seekTo = useCallback((fraction: number) => {
    const v = videoRef.current;
    const lo = inRef.current;
    const hi = outRef.current;
    const f = Math.min(hi, Math.max(lo, fraction));
    setTime(f * duration);
    if (v && duration > 0) v.currentTime = f * duration;
  }, [duration]);

  const onTrackDown = useCallback(
    (event: React.PointerEvent<Element>) => {
      dragRef.current = "seek";
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* synthetic */ }
      seekTo(toFraction(event.clientX));
    },
    [seekTo, toFraction],
  );
  const onHandleDown = useCallback(
    (which: "in" | "out") => (event: React.PointerEvent<Element>) => {
      dragRef.current = which;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* synthetic */ }
      event.stopPropagation();
    },
    [],
  );
  const onTrackMove = useCallback(
    (event: React.PointerEvent<Element>) => {
      const f = toFraction(event.clientX);
      if (dragRef.current === "seek") seekTo(f);
      else if (dragRef.current === "in") setInPt((prev) => Math.min(prev === outPt ? prev : f, Math.max(0, f)));
      else if (dragRef.current === "out") setOutPt(Math.max(f, inRef.current));
    },
    [toFraction, seekTo],
  );
  const onTrackUp = useCallback((event: React.PointerEvent<Element>) => {
    dragRef.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* synthetic */ }
  }, []);

  const onLoaded = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = event.currentTarget;
    if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
  }, []);

  const fmt = (secs: number) => {
    if (!Number.isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="ohf-viewer-video-editor">
      {/* The picture the clip plays inside, with the live caption overlaid on it. */}
      <div className="ohf-vedit-stage" aria-label="비디오 편집 화면">
        <video
          ref={videoRef}
          className="ohf-vedit-video"
          src={url}
          muted={muted}
          playsInline
          preload="metadata"
          onLoadedMetadata={onLoaded}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
        {activeCaption && (
          <p className="ohf-vedit-caption-overlay" key={activeCaption.id}>{activeCaption.text}</p>
        )}
      </div>

      {/* Transport: play/pause, the clock, and mute. */}
      <div className="ohf-vedit-transport">
        <button
          type="button"
          className="ohf-vedit-play"
          aria-label={playing ? "일시정지" : "재생"}
          aria-pressed={playing}
          onClick={togglePlay}
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
        <span className="ohf-vedit-clock">{fmt(time)} <span className="ohf-vedit-clock-total">/ {fmt(duration)}</span></span>
        <button
          type="button"
          className="ohf-vedit-mute"
          aria-label={muted ? "소리 켜기" : "소리 끄기"}
          aria-pressed={muted}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? <MuteGlyph /> : <VolumeGlyph />}
        </button>
        <span className="ohf-vedit-transport-fill" aria-hidden />
        <span className="ohf-vedit-transport-lane-label">타임라인</span>
      </div>

      {/* The timeline: a video lane with ticks, a caption lane under it, a playhead
          and the two in/out trim handles you drag to cut the span. */}
      <div
        className="ohf-vedit-timeline"
        ref={trackRef}
        role="slider"
        aria-label="비디오 타임라인"
        aria-valuemin={0}
        aria-valuemax={duration || 1}
        aria-valuenow={time}
        aria-valuetext={`${fmt(time)} / ${fmt(duration)}`}
        tabIndex={0}
        onPointerDown={onTrackDown}
        onPointerMove={onTrackMove}
        onPointerUp={onTrackUp}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") seekTo(head - 0.03);
          else if (event.key === "ArrowRight") seekTo(head + 0.03);
        }}
      >
        <div className="ohf-vedit-lane ohf-vedit-lane--video" aria-hidden>
          <span className="ohf-vedit-lane-strip" />
          {TICKS.map((t) => (
            <span key={t} className="ohf-vedit-tick" style={{ left: `${t * 100}%` }} />
          ))}
        </div>
        <div className="ohf-vedit-lane ohf-vedit-lane--caption" aria-hidden>
          {captions.map((c) => (
            <span
              key={c.id}
              className="ohf-vedit-caption-block"
              style={{ left: `${c.start * 100}%`, width: `${Math.max(0.02, c.end - c.start) * 100}%` }}
            >
              <span className="ohf-vedit-caption-block-text">{c.text}</span>
            </span>
          ))}
        </div>
        <span className="ohf-vedit-playhead" style={{ left: `${head * 100}%` }} aria-hidden>
          <span className="ohf-vedit-playhead-bar" />
        </span>
        <span className="ohf-vedit-in" style={{ left: `${inPt * 100}%` }} aria-hidden>
          <button type="button" className="ohf-vedit-handle" aria-label="시작 지점"
            onPointerDown={onHandleDown("in")} onPointerMove={onTrackMove} onPointerUp={onTrackUp} />
        </span>
        <span className="ohf-vedit-out" style={{ left: `${outPt * 100}%` }} aria-hidden>
          <button type="button" className="ohf-vedit-handle" aria-label="끝 지점"
            onPointerDown={onHandleDown("out")} onPointerMove={onTrackMove} onPointerUp={onTrackUp} />
        </span>
      </div>

      {/* The clip tools, docked under the timeline exactly where HF seats them. */}
      <div role="toolbar" aria-label="클립 도구" className="ohf-vedit-cliptools">
        {CLIP_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="ohf-vedit-cliptool"
            aria-label={tool.label}
            data-tool={tool.id}
            aria-disabled={tool.id === "volume" ? undefined : "true"}
            title={tool.id === "volume" ? undefined : `${tool.label}은(는) 이 빌드에서 아직 경로가 없습니다`}
            onClick={tool.id === "volume" ? () => setMuted((m) => !m) : undefined}
          >
            <span className="ohf-vedit-cliptool-icon"><ClipGlyph id={tool.id} /></span>
            <span className="ohf-vedit-cliptool-label">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* A fixed set of tick marks laid across the video lane — HF's timeline prints a
   tick every tenth of the clip; we mirror that spacing so the lane reads as a
   scale even before a clip reports its length. */
const TICKS = Array.from({ length: 11 }, (_, i) => i / 10);

/* --------------------------------------------------------------------------- */
/* The rail's residual editing panel: the caption track and the clip inspector.  */
/* --------------------------------------------------------------------------- */

export function VideoEditRail({
  captions,
  onCaptions,
}: {
  captions: CaptionSeg[];
  onCaptions: (next: CaptionSeg[]) => void;
}) {
  const addCaption = useCallback(() => {
    const id = `c${Date.now()}`;
    onCaptions([...captions, { id, start: 0.05, end: 0.25, text: "" }]);
  }, [captions, onCaptions]);

  const editText = useCallback((id: string, text: string) => {
    onCaptions(captions.map((c) => (c.id === id ? { ...c, text } : c)));
  }, [captions, onCaptions]);

  const removeCaption = useCallback((id: string) => {
    onCaptions(captions.filter((c) => c.id !== id));
  }, [captions, onCaptions]);

  return (
    <div className="ohf-viewer-edit">
      <section className="ohf-vedit-caption-panel" aria-label="캡션 트랙">
        <div className="ohf-vedit-caption-head">
          <span className="ohf-vedit-caption-head-icon"><TextGlyph /></span>
          <span className="ohf-vedit-caption-head-title">캡션</span>
          <button
            type="button"
            className="ohf-vedit-caption-add"
            aria-label="캡션 추가"
            onClick={addCaption}
          >
            <PlusGlyph />
          </button>
        </div>
        <div className="ohf-vedit-caption-list" role="list">
          {captions.length === 0 ? (
            <p className="ohf-vedit-caption-empty">아직 캡션이 없어요</p>
          ) : (
            captions.map((c, i) => (
              <div key={c.id} role="listitem" className="ohf-vedit-caption-row">
                <span className="ohf-vedit-caption-index">#{i + 1}</span>
                <input
                  className="ohf-vedit-caption-input"
                  aria-label={`캡션 ${i + 1} 텍스트`}
                  placeholder="캡션 문구"
                  value={c.text}
                  onChange={(e) => editText(c.id, e.target.value)}
                />
                <span className="ohf-vedit-caption-span">{Math.round(c.start * 100)}–{Math.round(c.end * 100)}%</span>
                <button
                  type="button"
                  className="ohf-vedit-caption-del"
                  aria-label="캡션 삭제"
                  onClick={() => removeCaption(c.id)}
                >
                  <CloseGlyph />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="ohf-vedit-inspector" aria-label="클립 속성">
        <div className="ohf-vedit-inspector-head"><ClipGlyph id="trim" /><span>클립 속성</span></div>
        {CLIP_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="ohf-vedit-inspector-row"
            aria-disabled="true"
            title={`${tool.label}은(는) 이 빌드에서 아직 경로가 없습니다`}
          >
            <span className="ohf-vedit-inspector-row-icon"><ClipGlyph id={tool.id} /></span>
            <span className="ohf-vedit-inspector-row-label">{tool.label}</span>
            <span className="ohf-vedit-inspector-row-caret"><ChevronGlyph /></span>
          </button>
        ))}
      </section>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Inline line icons, drawn to the same stroke weight as the showcase's own set. */
/* --------------------------------------------------------------------------- */

function S(props: { d: string }) {
  return (
    <path stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d={props.d} />
  );
}
function F(props: { d: string }) {
  return <path fill="currentColor" d={props.d} />;
}
function Icon({ viewBox = "0 0 24 24", children }: { viewBox?: string; children: React.ReactNode }) {
  return (
    <svg width={24} height={24} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {children}
    </svg>
  );
}

function PlayGlyph() { return (<Icon><F d="M8 5.146v13.708a.5.5 0 0 0 .77.417l10.7-6.854a.5.5 0 0 0 0-.834L8.77 4.729A.5.5 0 0 0 8 5.146Z" /></Icon>); }
function PauseGlyph() { return (<Icon><F d="M7.75 4.75h2.5v14.5h-2.5zM13.75 4.75h2.5v14.5h-2.5z" /></Icon>); }
function VolumeGlyph() { return (<Icon><S d="M4 9.75v4.5h3l4.5 4.25V5.5L7 9.75H4z" /><S d="M15.5 9c1.2.9 1.2 5.1 0 6" /></Icon>); }
function MuteGlyph() { return (<Icon><S d="M4 9.75v4.5h3l4.5 4.25V5.5L7 9.75H4z" /><S d="m17 9.5 4 5m0-5-4 5" /></Icon>); }
function PlusGlyph() { return (<Icon><S d="M12 5.25V12m0 0v6.75M12 12H5.25M12 12h6.75" /></Icon>); }
function CloseGlyph() { return (<Icon><S d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" /></Icon>); }
function ChevronGlyph() { return (<Icon><S d="m20 9-7.293 7.293a1 1 0 0 1-1.414 0L4 9" /></Icon>); }
function TextGlyph() { return (<Icon><S d="M5.25 6.25V4.75h13.5v1.5M12 4.75V19.25M9 19.25h6" /></Icon>); }

/* One glyph per clip tool, keyed by the tool id so the toolbar and the inspector
   draw the same mark. */
function ClipGlyph({ id }: { id: ClipTool }) {
  switch (id) {
    case "split":
      return (<Icon><S d="M12 3.75v16.5" /><rect x="4" y="8" width="5" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" /><rect x="15" y="8" width="5" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" /></Icon>);
    case "trim":
      return (<Icon><S d="M4.75 7.25v9.5M19.25 7.25v9.5M7.25 12h9.5" /></Icon>);
    case "duplicate":
      return (<Icon><S d="M8.75 8.75V4.75C8.75 4.19772 9.19772 3.75 9.75 3.75H19.25C19.8023 3.75 20.25 4.19772 20.25 4.75V15.26C20.25 15.8123 19.8023 16.26 19.25 16.26H16.25M3.75 8.75V19.25C3.75 19.8023 4.19772 20.25 4.75 20.25H15.25C15.8023 20.25 16.25 19.8023 16.25 19.25V8.75C16.25 8.19772 15.8023 7.75 15.25 7.75H4.75C4.19772 7.75 3.75 8.19772 3.75 8.75Z" /></Icon>);
    case "remove":
      return (<Icon><S d="M4.75 7.25h14.5M9.5 7.25V5.75C9.5 5.19772 9.94772 4.75 10.5 4.75h3C14.0523 4.75 14.5 5.19772 14.5 5.75v1.5M6 7.25v11.5C6 19.3023 6.44772 19.75 7 19.75h10C17.5523 19.75 18 19.3023 18 18.75V7.25" /></Icon>);
    case "speed":
      return (<Icon><F d="M13 3.75C13 3.33579 13.3358 3 13.75 3H20.25C20.6642 3 21 3.33579 21 3.75V10.25C21 10.6642 20.6642 11 20.25 11C19.8358 11 19.5 10.6642 19.5 10.25V5.56066L14.2803 10.7803C13.9874 11.0732 13.5126 11.0732 13.2197 10.7803C12.9268 10.4874 12.9268 10.0126 13.2197 9.71967L18.4393 4.5H13.75C13.3358 4.5 13 4.16421 13 3.75ZM3 13.75C3 13.3358 3.33579 13 3.75 13C4.16421 13 4.5 13.3358 4.5 13.75V18.4393L9.71967 13.2197C10.0126 12.9268 10.4874 12.9268 10.7803 13.2197C11.0732 13.5126 11.0732 13.9874 10.7803 14.2803L5.56066 19.5H10.25C10.6642 19.5 11 19.8358 11 20.25C11 20.6642 10.6642 21 10.25 21H3.75C3.33579 21 3 20.6642 3 20.25V13.75Z" /></Icon>);
    case "reverse":
      return (<Icon><S d="M4.75 8.5h11.5M12.5 5.25 16.25 8.5 12.5 11.75M19.25 15.5H7.75M11.5 12.25 7.75 15.5 11.5 18.75" /></Icon>);
    case "loop":
      return (<Icon><S d="M4.75 8.5h9.5M9.5 5.25 12.25 8.5 9.5 11.75M19.25 15.5H9.75M14.5 12.25 11.75 15.5 14.5 18.75" /></Icon>);
    case "volume":
      return (<VolumeGlyph />);
    default:
      return (<Icon><S d="M4.75 12h14.5" /></Icon>);
  }
}
