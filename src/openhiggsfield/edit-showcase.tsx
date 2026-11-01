"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* HF's edit stage, mirrored row-for-row. The whole column stands in the
   showcase's left pane: a static asset you draw on. The drawing toolbar hangs
   at the bottom centre, the zoom at the lower left, the prompt bar under the
   toolbar. Region and lasso are the inpaint tools: drawing a selection lifts a
   floating prompt+model form over it, and submitting sends that selection to the
   backend as the area to repaint. */

type Tool = "select" | "hand" | "region" | "lasso" | "pen" | "eraser" | "shapes";
type Point = { x: number; y: number };

/* Selection lives in figure-normalised coordinates (0..1 across the displayed
   image), so it survives any resize and maps straight to source pixels. */
type Region = { x: number; y: number; w: number; h: number };

const TOOLS: Tool[] = ["select", "hand", "region", "lasso", "pen", "eraser", "shapes"];

export function EditShowcase({
  url,
  aspect,
  modelLabel = "Krea 2 Turbo",
  onInpaint,
  busy,
  status,
}: {
  url: string;
  aspect: number;
  modelLabel?: string;
  onInpaint?: (image: string, prompt: string) => void;
  busy?: boolean;
  status?: string;
}) {
  const [tool, setTool] = useState<Tool>("select");
  const [scale, setScale] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [committed, setCommitted] = useState<{ kind: "region"; rect: Region } | { kind: "lasso"; points: Point[] } | null>(null);
  const [draft, setDraft] = useState<{ kind: "region"; rect: Region } | { kind: "lasso"; points: Point[] } | null>(null);
  // The asset's source resolution, read off the image once it decodes; the mask
  // is cut at this size so its hole lands on the source pixels the backend uses.
  const [src, setSrc] = useState<{ w: number; h: number } | null>(null);

  const figureRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);
  // The figure is letterboxed inside the stage, so it needs a definite pixel box;
  // aspect-ratio alone collapses to zero when neither edge is fixed. We measure the
  // stage and the decoded source, then size the figure to contain the asset.
  const [fit, setFit] = useState<{ w: number; h: number } | null>(null);

  const editTool = tool === "region" || tool === "lasso";
  const live = draft ?? committed;
  const formVisible = editTool && live !== null;

  // Normalise a pointer position to figure coordinates (0..1).
  const toNorm = useCallback((event: { clientX: number; clientY: number }): Point => {
    const el = figureRef.current;
    if (!el) return { x: 0, y: 0 };
    const box = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    return { x, y };
  }, []);

  const pickTool = useCallback((next: Tool) => {
    setTool(next);
    setCommitted(null);
    setDraft(null);
    setFormPrompt("");
  }, []);

  // Drawing begins: a rectangle for region, a freehand outline for lasso.
  const onDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!editTool) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Synthetic pointers carry no active capture; real mouse/touch capture works. */
      }
      const p = toNorm(event);
      originRef.current = p;
      if (tool === "lasso") {
        pointsRef.current = [p];
        setDraft({ kind: "lasso", points: [p] });
      } else {
        setDraft({ kind: "region", rect: { x: p.x, y: p.y, w: 0, h: 0 } });
      }
    },
    [editTool, tool, toNorm],
  );

  const onMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!editTool || !originRef.current) return;
      const p = toNorm(event);
      if (tool === "lasso") {
        pointsRef.current.push(p);
        setDraft({ kind: "lasso", points: pointsRef.current.slice() });
      } else {
        const o = originRef.current;
        setDraft({
          kind: "region",
          rect: { x: Math.min(o.x, p.x), y: Math.min(o.y, p.y), w: Math.abs(p.x - o.x), h: Math.abs(p.y - o.y) },
        });
      }
    },
    [editTool, tool, toNorm],
  );

  const onUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!editTool || !originRef.current) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* Capture may never have been set for a synthetic pointer. */
      }
      const d = draft;
      if (d && d.kind === "region" && d.rect.w > 0.01 && d.rect.h > 0.01) {
        setCommitted(d);
        setDraft(null);
      } else if (d && d.kind === "lasso" && d.points.length > 8) {
        setCommitted({ kind: "lasso", points: d.points });
        setDraft(null);
      } else {
        setDraft(null);
      }
      originRef.current = null;
      pointsRef.current = [];
    },
    [editTool, draft],
  );

  /* Build the alpha-hole mask for the current selection at source resolution:
     opaque everywhere, punched out where the user selected. The backend repaints
     the transparent hole and keeps the rest. */
  const buildMask = useCallback(
    (selection: { kind: "region"; rect: Region } | { kind: "lasso"; points: Point[] }): string | null => {
      const w = src?.w ?? Math.round(aspect * 1024);
      const h = src?.h ?? 1024;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "destination-out";
      if (selection.kind === "region") {
        ctx.fillRect(selection.rect.x * w, selection.rect.y * h, selection.rect.w * w, selection.rect.h * h);
      } else {
        ctx.beginPath();
        selection.points.forEach((p, i) => {
          const px = p.x * w;
          const py = p.y * h;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      return canvas.toDataURL("image/png");
    },
    [src, aspect],
  );

  const runRegion = useCallback(() => {
    const text = formPrompt.trim();
    if (!text || !committed || !onInpaint) return;
    const mask = buildMask(committed);
    if (mask) onInpaint(mask, text);
  }, [formPrompt, committed, onInpaint, buildMask]);

  const runFull = useCallback(() => {
    const text = prompt.trim();
    if (!text || !onInpaint) return;
    const w = src?.w ?? Math.round(aspect * 1024);
    const h = src?.h ?? 1024;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Whole-frame edit: the entire image is the hole to repaint.
    ctx.clearRect(0, 0, w, h);
    onInpaint(canvas.toDataURL("image/png"), text);
  }, [prompt, onInpaint, src, aspect]);

  // Escape clears the selection.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCommitted(null);
        setDraft(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Contain the asset inside the stage: the figure's box is the largest area of the
  // asset's ratio that fits the stage, recomputed whenever the stage resizes.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;
      if (!cw || !ch) return;
      const ratio = src ? src.w / src.h : aspect;
      const w = Math.min(cw, ch * ratio);
      setFit({ w: Math.round(w), h: Math.round(w / ratio) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [src, aspect]);

  const zoom = (next: "in" | "out" | "fit") => {
    if (next === "in") setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)));
    else if (next === "out") setScale((s) => Math.max(0.4, +(s - 0.2).toFixed(2)));
    else setScale(1);
  };

  // The selection overlay, drawn as a dashed blue outline over the asset.
  const overlay =
    live &&
    (live.kind === "region" ? (
      <svg className="ohf-edit-overlay" viewBox="0 0 1 1" preserveAspectRatio="none">
        <rect
          x={live.rect.x}
          y={live.rect.y}
          width={live.rect.w}
          height={live.rect.h}
          fill="rgba(59,130,246,0.12)"
          stroke="#3b82f6"
          strokeWidth={0.004}
          strokeDasharray="0.02 0.02"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    ) : (
      <svg className="ohf-edit-overlay" viewBox="0 0 1 1" preserveAspectRatio="none">
        <polygon
          points={live.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="rgba(59,130,246,0.12)"
          stroke="#3b82f6"
          strokeWidth={0.004}
          strokeDasharray="0.02 0.02"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    ));

  return (
    <div className="ohf-edit-stage">
      {/* The asset itself, drawn on. */}
      <div className="ohf-edit-figure-wrap" ref={wrapRef}>
        <figure
          id="showcase-asset-media"
          className="ohf-edit-figure"
          ref={figureRef}
          style={fit ? { width: `${fit.w}px`, height: `${fit.h}px` } : { aspectRatio: String(aspect) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ohf-edit-figure-img"
            src={url}
            alt="원본 미디어 이미지"
            draggable={false}
            onLoad={(e) => setSrc({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
          {/* The Base layer composite stands under the annotation surface. */}
          <div className="ohf-edit-layers" data-tour-anchor="tour-layer-stage" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Base" className="ohf-edit-layer-base" src={url} draggable={false} />
          </div>
          {/* The annotation surface: selection drawing happens here. */}
          <div
            className="ohf-edit-surface"
            aria-label="이미지 편집 주석"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
          >
            {overlay}
          </div>
        </figure>

        {/* Expand control, top-right of the stage. */}
        <div className="ohf-edit-expand">
          <button type="button" aria-label="미디어 보기 확장" aria-disabled="true"><ExpandGlyph /></button>
        </div>

        {/* Zoom cluster, lower left. */}
        <div role="toolbar" aria-label="확대/축소 컨트롤" className="ohf-edit-zoom">
          <button type="button" aria-label="축소" onClick={() => zoom("out")}><MinusGlyph /></button>
          <button type="button" aria-label="화면에 맞추기" onClick={() => zoom("fit")}>{Math.round(scale * 100)}%</button>
          <button type="button" aria-label="확대" onClick={() => zoom("in")}><PlusGlyph /></button>
        </div>

        {/* The floating region/lasso form, anchored near the selection. */}
        {formVisible && live && (
          <form
            className="ohf-edit-float"
            style={{ left: `${live.kind === "region" ? live.rect.x * 100 : 4}%`, top: `${(live.kind === "region" ? live.rect.y : 0.4) * 100}%` }}
            onSubmit={(e) => {
              e.preventDefault();
              runRegion();
            }}
          >
            <div className="ohf-edit-float-field">
              <input
                className="ohf-edit-float-input"
                placeholder="여기에 프롬프트를 입력해 주세요…"
                aria-label="영역 편집 프롬프트"
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
              />
              <div className="ohf-edit-float-row">
                <button type="button" className="ohf-edit-float-ref" aria-label="레퍼런스 이미지 추가" aria-disabled="true"><PlusGlyph /></button>
                <div className="ohf-edit-float-actions">
                  <button type="button" className="ohf-edit-float-model" aria-label="모델 선택" aria-haspopup="menu" aria-expanded="false" aria-disabled="true">
                    <BarsGlyph />
                    <span>{modelLabel}</span>
                    <ChevronGlyph />
                  </button>
                  <button type="submit" className="ohf-edit-float-submit" aria-label="생성하기" disabled={busy || !formPrompt.trim() || !onInpaint}><SparkGlyph /></button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Drawing toolbar + prompt bar, both anchored to the stage bottom. */}
      <div className="ohf-edit-foot">
        <div role="toolbar" aria-label="그리기 도구" className={`ohf-edit-tools${formVisible ? " is-detached" : ""}`}>
          {TOOLS.map((t) => (
            <ToolButton key={t} tool={t} active={tool === t} onPick={pickTool} />
          ))}
        </div>
        <form className="ohf-edit-prompt-bar" onSubmit={(e) => { e.preventDefault(); runFull(); }}>
          <button type="button" className="ohf-edit-prompt-ref" aria-label="레퍼런스 이미지 추가" aria-disabled="true"><PlusGlyph /></button>
          <input
            className="ohf-edit-prompt-input"
            placeholder="이미지 편집 방법을 설명해 주세요…"
            aria-label="이미지 편집 프롬프트"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button type="submit" className="ohf-edit-prompt-submit" aria-label="생성하기" disabled={busy || !prompt.trim() || !onInpaint}><SparkGlyph /></button>
        </form>
        {status && <div className="ohf-edit-status" role="status">{status}</div>}
      </div>
    </div>
  );
}

/* One tool in the drawing bar. select/hand/region/lasso are real (region and
   lasso are the inpaint tools); pen/eraser/shapes are present as in HF but the
   brush strokes are not wired here. */
function ToolButton({ tool, active, onPick }: { tool: Tool; active: boolean; onPick: (t: Tool) => void }) {
  const labels: Record<Tool, string> = {
    select: "선택 (V)",
    hand: "손 도구(H) 또는 Space 길게 누르기",
    region: "영역 편집",
    lasso: "올가미 편집",
    pen: "펜 (D)",
    eraser: "지우개 (E)",
    shapes: "도형 (R)",
  };
  const glyph: Record<Tool, React.ReactNode> = {
    select: <CursorGlyph />,
    hand: <HandGlyph />,
    region: <RegionGlyph />,
    lasso: <LassoGlyph />,
    pen: <PenGlyph />,
    eraser: <EraserGlyph />,
    shapes: <ShapesGlyph />,
  };
  const isEditTool = tool === "region" || tool === "lasso";
  return (
    <button
      type="button"
      aria-label={labels[tool]}
      aria-pressed={active}
      data-mode={tool}
      className={`ohf-edit-tool${active ? (isEditTool ? " is-edit" : " is-active") : ""}`}
      onClick={() => onPick(tool)}
    >
      {glyph[tool]}
    </button>
  );
}

/* Inline SVG icons, traced from the showcase's own toolbar. Stroke paths draw a
   rounded 1.5 line in currentColor; fill paths pack it solid. */
function S(props: { d: string; dash?: string }) {
  return (
    <path
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={props.dash}
      d={props.d}
    />
  );
}
function F(props: { d: string }) {
  return <path fill="currentColor" d={props.d} />;
}
function Icon({ viewBox, children }: { viewBox: string; children: React.ReactNode }) {
  return (
    <svg width={24} height={24} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
}
function Icon14({ children }: { children: React.ReactNode }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
}

function CursorGlyph() { return (<Icon viewBox="0 0 24 24"><S d="M3.36 4 9.492 21.03a.5.5 0 0 0 .933.021l3.024-7.332a.5.5 0 0 1 .271-.272l7.333-3.024a.5.5 0 0 0-.021-.932L4 3.36a.5.5 0 0 0-.64.64Z" /></Icon>); }
function HandGlyph() { return (<Icon viewBox="0 0 24 24"><S d="M15.75 7.75v-1a2 2 0 1 1 4 0v4m0 .5v2.83a7.17 7.17 0 0 1-13.516 3.339L3.25 11.75l.75-.938a2 2 0 0 1 2.812-.313l.938.751v-1m0-.25V5.75a2 2 0 1 1 4 0v4.5m0-2.5v-3a2 2 0 1 1 4 0V11" /></Icon>); }
function RegionGlyph() { return (<Icon viewBox="0 0 24 24"><S d="M11.75 4.785h7.5a1 1 0 0 1 1 1v5.5M3.75 12.75v5.5a1 1 0 0 0 1 1h7.5" /><F d="m6.24 4.185-.696-1.812a.582.582 0 0 0-1.088 0L3.76 4.185a1 1 0 0 1-.575.575l-1.812.696a.582.582 0 0 0 0 1.088l1.812.696a1 1 0 0 1 .575.575l.696 1.812a.582.582 0 0 0 1.088 0l.696-1.812a1 1 0 0 1 .575-.575l1.812-.696a.582.582 0 0 0 0-1.088L6.815 4.76a1 1 0 0 1-.575-.575M20.24 16.185l-.696-1.812a.582.582 0 0 0-1.088 0l-.697 1.812a1 1 0 0 1-.574.575l-1.812.696a.582.582 0 0 0 0 1.088l1.812.697a1 1 0 0 1 .575.574l.696 1.812a.582.582 0 0 0 1.088 0l.697-1.812a1 1 0 0 1 .574-.575l1.812-.696a.582.582 0 0 0 0-1.088l-1.812-.697a1 1 0 0 1-.575-.574" /></Icon>); }
function LassoGlyph() { return (<Icon viewBox="0 0 24 24"><S dash="4 4" d="M12 2.75A9.25 9.25 0 1 0 21.25 12c0-7.708-11.306-6.68-12.847-2.056" /></Icon>); }
function PenGlyph() { return (<Icon viewBox="0 0 24 24"><F d="M17.2071 4.2072L19.7929 6.79299C20.1834 7.18351 20.1834 7.81667 19.7929 8.2072L8.04289 19.9572C7.85536 20.1447 7.601 20.2501 7.33579 20.2501H3.75V16.6643C3.75 16.3991 3.85536 16.1447 4.04289 15.9572L15.7929 4.2072C16.1834 3.81668 16.8166 3.81668 17.2071 4.2072Z" /></Icon>); }
function EraserGlyph() { return (<Icon viewBox="0 0 24 24"><S d="m19.5 4.5-15 15m8.75-15.75-9.5 9.5m15.5-9.5H4.75a1 1 0 0 0-1 1v14.5a1 1 0 0 0 1 1h14.5a1 1 0 0 0 1-1V4.75a1 1 0 0 0-1-1" /></Icon>); }
function ShapesGlyph() { return (<Icon viewBox="0 0 24 24"><rect x="4" y="4" width="9" height="9" fill="currentColor" /><circle cx="17" cy="17" r="4" fill="currentColor" /></Icon>); }
function ExpandGlyph() { return (<Icon viewBox="0 0 24 24"><S d="M5.5 12.5v5a1 1 0 0 0 1 1h5m1-13h5a1 1 0 0 1 1 1v5" /></Icon>); }
function MinusGlyph() { return (<Icon viewBox="0 0 24 24"><S d="M5.25 12h13.5" /></Icon>); }
function PlusGlyph() { return (<Icon viewBox="0 0 24 24"><S d="M12 5.25V12m0 0v6.75M12 12H5.25M12 12h6.75" /></Icon>); }
function ChevronGlyph() { return (<Icon viewBox="0 0 24 24"><S d="m20 9-7.293 7.293a1 1 0 0 1-1.414 0L4 9" /></Icon>); }
function SparkGlyph() { return (<Icon viewBox="0 0 24 24"><F d="M11.745 4.666a.75.75 0 0 0-1.49-.002c-.284 2.463-1.02 4.195-2.208 5.383s-2.92 1.924-5.383 2.208a.75.75 0 0 0 .002 1.49c2.422.275 4.19 1.01 5.406 2.205 1.212 1.19 1.964 2.92 2.18 5.366a.75.75 0 0 0 1.495-.001c.208-2.406.96-4.174 2.177-5.391 1.218-1.218 2.985-1.969 5.39-2.177a.75.75 0 0 0 .002-1.494c-2.445-.217-4.177-.969-5.366-2.18-1.194-1.217-1.93-2.985-2.205-5.407M19.79 1.259a.292.292 0 0 0-.58 0c-.11.957-.397 1.63-.858 2.092-.462.462-1.136.749-2.094.86a.292.292 0 0 0 0 .579c.943.107 1.63.393 2.104.857.47.463.763 1.136.848 2.087a.292.292 0 0 0 .58 0c.082-.936.374-1.623.847-2.097.474-.473 1.161-.765 2.096-.846a.292.292 0 0 0 .001-.582c-.95-.084-1.624-.376-2.087-.847-.464-.473-.75-1.161-.857-2.103" /></Icon>); }
function BarsGlyph() { return (<Icon14><path fill="currentColor" d="M2.7601 10.635L0.466553 11.2084V1.04883L2.7601 1.62222V10.635Z" /><path fill="currentColor" d="M13.8448 11.2295L11.5469 11.8029V0.454102L13.8448 1.02324V11.2295Z" /><path fill="currentColor" d="M6.39853 10.9452L4.10498 11.5186V5.53418L6.39853 6.10752V10.9452Z" /><path fill="currentColor" d="M7.89722 4.64663L10.1952 4.07324V10.0577L7.89722 9.48433V4.64663Z" /></Icon14>); }

/* The image-edit tools card, stood in the showcase's right rail. Nine operations
   run down the column, each an h-8 row of icon, name, a 신규 chip and a caret. */
function FE(props: { d: string }) {
  return <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={props.d} />;
}

const EDIT_TOOLS: { label: string; icon: React.ReactNode; isNew?: boolean }[] = [
  {
    label: "레이어 분해", isNew: true,
    icon: <S d="m7.797 12-4.49 2.234c-.743.37-.743 1.437 0 1.807l8.25 4.105c.28.139.607.139.886 0l8.25-4.105c.743-.37.743-1.437 0-1.807L16.203 12m0 0-3.76 1.871a1 1 0 0 1-.886 0L7.797 12l-4.49-2.234c-.743-.37-.743-1.437 0-1.807l8.25-4.105a1 1 0 0 1 .886 0l8.25 4.105c.743.37.743 1.437 0 1.807z" />,
  },
  {
    label: "텍스트 편집", isNew: true,
    icon: <><S d="M8.25 3.75h-3.5a1 1 0 0 0-1 1v3.5M15.75 3.75h3.5a1 1 0 0 1 1 1v3.5M8.25 20.25h-3.5a1 1 0 0 1-1-1v-3.5" /><S d="M8.75 9.75h6.5M8.75 14.25h4.5" /><F d="m19.24 16.185-.696-1.812a.582.582 0 0 0-1.088 0l-.697 1.812a1 1 0 0 1-.574.575l-1.812.696a.582.582 0 0 0 0 1.088l1.812.697a1 1 0 0 1 .575.574l.696 1.812a.582.582 0 0 0 1.088 0l.697-1.812a1 1 0 0 1 .574-.575l1.812-.696a.582.582 0 0 0 0-1.088l-1.812-.697a1 1 0 0 1-.575-.574" /></>,
  },
  {
    label: "확장 및 자르기", isNew: true,
    icon: <S d="M2.75 5.75H17.25C17.8023 5.75 18.25 6.19772 18.25 6.75V21.25M5.75 2.75V17.25C5.75 17.8023 6.19772 18.25 6.75 18.25H21.25" />,
  },
  {
    label: "업스케일",
    icon: <FE d="M13 3.75C13 3.33579 13.3358 3 13.75 3H20.25C20.6642 3 21 3.33579 21 3.75V10.25C21 10.6642 20.6642 11 20.25 11C19.8358 11 19.5 10.6642 19.5 10.25V5.56066L14.2803 10.7803C13.9874 11.0732 13.5126 11.0732 13.2197 10.7803C12.9268 10.4874 12.9268 10.0126 13.2197 9.71967L18.4393 4.5H13.75C13.3358 4.5 13 4.16421 13 3.75ZM3 13.75C3 13.3358 3.33579 13 3.75 13C4.16421 13 4.5 13.3358 4.5 13.75V18.4393L9.71967 13.2197C10.0126 12.9268 10.4874 12.9268 10.7803 13.2197C11.0732 13.5126 11.0732 13.9874 10.7803 14.2803L5.56066 19.5H10.25C10.6642 19.5 11 19.8358 11 20.25C11 20.6642 10.6642 21 10.25 21H3.75C3.33579 21 3 20.6642 3 20.25V13.75Z" />,
  },
  {
    label: "배경 제거",
    icon: <S d="m19.5 4.5-15 15m8.75-15.75-9.5 9.5m15.5-9.5H4.75a1 1 0 0 0-1 1v14.5a1 1 0 0 0 1 1h14.5a1 1 0 0 0 1-1V4.75a1 1 0 0 0-1-1" />,
  },
  {
    label: "Color Grading",
    icon: <FE d="M11.9996 2C9.05028 2 6.65784 4.39493 6.65784 7.35116C6.65784 8.12673 6.82218 8.86229 7.11732 9.52606C7.81846 11.1029 9.25792 12.2762 10.9929 12.6075C11.1528 12.3056 11.3356 12.0178 11.539 11.7466C12.7226 10.1688 14.6088 9.14617 16.7336 9.14617C16.8333 9.14617 16.9325 9.14842 17.0312 9.15289C17.2319 8.59048 17.3413 7.98414 17.3413 7.35116C17.3413 4.39493 14.9489 2 11.9996 2ZM12.7193 19.1794C13.6991 20.2965 15.1344 21 16.7336 21C19.6829 21 22.0753 18.6051 22.0753 15.6488C22.0753 12.8993 20.0052 10.6345 17.3429 10.3321C17.1432 10.3094 16.9399 10.2977 16.7336 10.2977C15.1344 10.2977 13.6991 11.0012 12.7193 12.1183C12.9014 12.3999 13.0624 12.6966 13.2 13.0061C13.5594 13.8143 13.7588 14.709 13.7588 15.6488C13.7588 16.9496 13.3769 18.1625 12.7193 19.1794ZM12.2972 13.8471C12.4979 14.4095 12.6073 15.0159 12.6073 15.6488C12.6073 16.8546 12.2099 17.9657 11.539 18.8601C10.5633 20.1608 9.01222 21 7.26558 21C4.31627 21 1.92383 18.6051 1.92383 15.6488C1.92383 13.0377 3.79085 10.8637 6.25894 10.3925C7.23864 12.2434 9.08541 13.565 11.2602 13.8121C11.5031 13.8397 11.7498 13.8538 11.9996 13.8538C12.0993 13.8538 12.1985 13.8516 12.2972 13.8471Z" />,
  },
  {
    label: "Enhancer",
    icon: <FE d="M17.5124 2.92678C18.1958 2.24336 19.3039 2.24336 19.9873 2.92678L21.0731 4.01256C21.7565 4.69598 21.7565 5.80402 21.0731 6.48744L6.48729 21.0732C5.80387 21.7566 4.69583 21.7566 4.01241 21.0732L2.92663 19.9874C2.24321 19.304 2.24321 18.196 2.92663 17.5126L17.5124 2.92678ZM18.9266 3.98744C18.829 3.88981 18.6707 3.88981 18.5731 3.98744L15.3105 7.25L16.7498 8.68934L20.0124 5.42678C20.11 5.32915 20.11 5.17085 20.0124 5.07322L18.9266 3.98744Z" />,
  },
  {
    label: "Relight",
    icon: <><F d="M15.8929 3.92242C15.9882 3.5193 15.7386 3.11531 15.3355 3.02009H8.66455C8.26143 3.11531 8.01183 3.5193 8.10706 3.92242C8.52378 5.68657 10.1076 7 12 7C13.8924 7 15.4762 5.68657 15.8929 3.92242Z" /><F d="M4.80556 15C4.51195 15 4.24535 15.1713 4.12336 15.4384L2.06781 19.9384C1.96175 20.1706 1.98106 20.4407 2.11904 20.6555C2.25703 20.8702 2.49476 21 2.75 21H10.5C10.9142 21 11.25 20.6642 11.25 20.25V15.75C11.25 15.3358 10.9142 15 10.5 15H4.80556Z" /><F d="M13.5 15C13.0858 15 12.75 15.3358 12.75 15.75V20.25C12.75 20.6642 13.0858 21 13.5 21H21.25C21.5052 21 21.743 20.8702 21.881 20.6555C22.0189 20.4407 22.0383 20.1706 21.9322 19.9384L19.8766 15.4384C19.7547 15.1713 19.488 15 19.1944 15H13.5Z" /></>,
  },
  {
    label: "Angles",
    icon: <><F d="M12.8682 5.63231C12.3302 5.32488 11.6698 5.32487 11.1318 5.63231L6.88176 8.06088C6.83858 8.08555 6.7967 8.11191 6.7562 8.13984L11.9998 11.1362L17.2436 8.13972C17.2032 8.11184 17.1614 8.08552 17.1182 8.06088L12.8682 5.63231Z" /><F d="M6 9.58031C6 9.53277 6.00193 9.48551 6.00573 9.43863L11.2498 12.4352V18.4293C11.2099 18.4103 11.1705 18.3898 11.1318 18.3677L6.88176 15.9391C6.3365 15.6275 6 15.0477 6 14.4197V9.58031Z" /><F d="M12.8682 18.3677C12.8294 18.3899 12.7899 18.4105 12.7498 18.4295V12.4352L17.9943 9.43841C17.9981 9.48537 18 9.5327 18 9.58031V14.4197C18 15.0477 17.6635 15.6275 17.1182 15.9391L12.8682 18.3677Z" /></>,
  },
];

/* One h-8 tool row. Tapping is inert here; the showcase's centre tools carry the
   real work. */
export function EditToolsCard({ onOpenExpandCrop }: { onOpenExpandCrop?: () => void }) {
  return (
    <div className="ohf-edit-tools-card" id="edit-apps-tabs" data-tour="edit-image-tools">
      <div className="ohf-edit-tools-head">
        <Icon viewBox="0 0 24 24"><F d="M4.75518 5.15769C4.65005 4.94744 4.35001 4.94744 4.24488 5.15769L3.59168 6.4641C3.56407 6.51931 3.51931 6.56407 3.4641 6.59168L2.15769 7.24488C1.94744 7.35001 1.94744 7.65005 2.15769 7.75518L3.4641 8.40839C3.51931 8.43599 3.56407 8.48075 3.59168 8.53596L4.24488 9.84237C4.35001 10.0526 4.65005 10.0526 4.75518 9.84237L5.40839 8.53596C5.43599 8.48075 5.48075 8.43599 5.53596 8.40839L6.84237 7.75518C7.05262 7.65005 7.05262 7.35001 6.84237 7.24488L5.53596 6.59168C5.48075 6.56407 5.43599 6.51931 5.40839 6.4641L4.75518 5.15769Z" /></Icon>
        <span>이미지 편집</span>
      </div>
      {EDIT_TOOLS.map((tool) => (
        <button
          key={tool.label}
          type="button"
          className={`ohf-edit-tool-row${tool.label === "확장 및 자르기" ? " is-live" : ""}`}
          aria-disabled={tool.label === "확장 및 자르기" ? undefined : "true"}
          onClick={tool.label === "확장 및 자르기" ? onOpenExpandCrop : undefined}
          data-tour-anchor={tool.label === "레이어 분해" ? "tour-layer-decomposition" : undefined}
        >
          <span className="ohf-edit-tool-row-icon"><Icon viewBox="0 0 24 24">{tool.icon}</Icon></span>
          <span className="ohf-edit-tool-row-label">{tool.label}</span>
          {tool.isNew && <span className="ohf-edit-tool-row-new">신규</span>}
          <span className="ohf-edit-tool-row-caret"><ChevronGlyph /></span>
        </button>
      ))}
    </div>
  );
}
