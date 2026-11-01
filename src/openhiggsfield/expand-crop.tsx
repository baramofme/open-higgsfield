"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Higgsfield's "확장 및 자르기" editor, mirrored from the live showcase
   (aria labels verbatim). An asset sits in a stage; a dashed frame with eight
   drag handles (4 edges + 4 corners) rides over it. Pulling an edge outward
   expands the canvas beyond the picture (outpaint), pulling it inward crops.
   The empty canvas outside the picture is laid down as a checkerboard. The right
   panel carries the usage notes, an "AI로 채우기" switch and the yellow
   "적용하기" brand button; the top carries "Original" and a spark "생성하기".
   Applying an expansion sends the picture plus per-side pixel padding to the
   cfwui outpaint task; a pure crop is cut locally with no backend call. */

type Edge = "top" | "right" | "bottom" | "left" | "tl" | "tr" | "br" | "bl";

type Rect = { x: number; y: number; w: number; h: number };
type Pads = { pad_left: number; pad_right: number; pad_top: number; pad_bottom: number };

/* The eight handles, each labelled exactly as Higgsfield names them. */
const HANDLES: { edge: Edge; label: string }[] = [
  { edge: "top", label: "위쪽에서 프레임 크기 조절" },
  { edge: "right", label: "오른쪽에서 프레임 크기 조절" },
  { edge: "bottom", label: "아래쪽에서 프레임 크기 조절" },
  { edge: "left", label: "왼쪽에서 프레임 크기 조절" },
  { edge: "tl", label: "왼쪽 위 모서리에서 프레임 크기 조절" },
  { edge: "tr", label: "오른쪽 위 모서리에서 프레임 크기 조절" },
  { edge: "br", label: "오른쪽 아래 모서리에서 프레임 크기 조절" },
  { edge: "bl", label: "왼쪽 아래 모서리에서 프레임 크기 조절" },
];

const MIN = 24; // smallest frame a handle can leave behind, in stage pixels.

/* Resize the frame for a given edge by a pointer delta, keeping the opposite
   edges fixed and clamping the frame to the stage box (px). */
function resize(edge: Edge, f0: Rect, dx: number, dy: number, box: Rect): Rect {
  const right = f0.x + f0.w;
  const bottom = f0.y + f0.h;
  let x = f0.x;
  let y = f0.y;
  let w = f0.w;
  let h = f0.h;

  const moveLeft = (d: number) => {
    x = clamp(f0.x + d, 0, right - MIN);
    w = right - x;
  };
  const moveRight = (d: number) => {
    const r = clamp(right + d, x + MIN, box.x + box.w);
    w = r - x;
  };
  const moveTop = (d: number) => {
    y = clamp(f0.y + d, 0, bottom - MIN);
    h = bottom - y;
  };
  const moveBottom = (d: number) => {
    const b = clamp(bottom + d, y + MIN, box.y + box.h);
    h = b - y;
  };

  switch (edge) {
    case "left": moveLeft(dx); break;
    case "right": moveRight(dx); break;
    case "top": moveTop(dy); break;
    case "bottom": moveBottom(dy); break;
    case "tl": moveLeft(dx); moveTop(dy); break;
    case "tr": moveRight(dx); moveTop(dy); break;
    case "br": moveRight(dx); moveBottom(dy); break;
    case "bl": moveLeft(dx); moveBottom(dy); break;
  }
  return { x, y, w, h };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/* How far the frame reaches past the picture on each side, in source pixels.
   scale maps displayed stage px back to the asset's intrinsic px. */
function padsFrom(frame: Rect, img: Rect, srcW: number, srcH: number): Pads | null {
  const sx = srcW / img.w;
  const sy = srcH / img.h;
  const pl = Math.max(0, img.x - frame.x);
  const pr = Math.max(0, frame.x + frame.w - (img.x + img.w));
  const pt = Math.max(0, img.y - frame.y);
  const pb = Math.max(0, frame.y + frame.h - (img.y + img.h));
  if (pl + pr + pt + pb <= 0) return null; // nothing expanded — this is a crop.
  return {
    pad_left: Math.round(pl * sx),
    pad_right: Math.round(pr * sx),
    pad_top: Math.round(pt * sy),
    pad_bottom: Math.round(pb * sy),
  };
}

export function ExpandCropEditor({
  url,
  onOutpaint,
  onApplyCrop,
  busy,
  status,
  onBack,
  onClose,
}: {
  url: string;
  /* Paint the padding around the picture: the cfwui outpaint path. */
  onOutpaint?: (image: string, pads: Pads, prompt: string) => void;
  /* Cut the picture down to the frame, locally, with no backend. */
  onApplyCrop?: (image: string) => void;
  busy?: boolean;
  status?: string;
  /* Return to the base editing surface, and leave the editor entirely. */
  onBack: () => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [stage, setStage] = useState<Rect | null>(null);   // stage box in px
  const [img, setImg] = useState<Rect | null>(null);        // drawn picture box in px
  const [src, setSrc] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<Rect | null>(null);    // the crop/expand frame
  const [aiFill, setAiFill] = useState(true);
  const [prompt, setPrompt] = useState("");
  const drag = useRef<{ edge: Edge; x0: number; y0: number; f0: Rect } | null>(null);

  /* Measure the stage and contain the picture inside it; the drawn picture box
     is the largest area of the asset's ratio that fits the stage, recomputed on
     every resize. The frame starts as exactly the picture, so dragging can go
     either inward (crop) or outward (expand) from the true edges. */
  const measure = useCallback(() => {
    const el = canvasRef.current;
    const image = imgRef.current;
    if (!el || !image || !src) return;
    const sw = el.clientWidth;
    const sh = el.clientHeight;
    if (!sw || !sh) return;
    const ratio = src.w / src.h;
    const w = Math.min(sw, sh * ratio);
    const h = w / ratio;
    const box: Rect = { x: 0, y: 0, w: sw, h: sh };
    const drawn: Rect = { x: (sw - w) / 2, y: (sh - h) / 2, w, h };
    setStage(box);
    setImg(drawn);
    setFrame((prev) => (prev ? clampFrame(prev, box) : drawn));
  }, [src]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const clampFrame = (f: Rect, box: Rect): Rect => ({
    x: clamp(f.x, 0, box.x + box.w - MIN),
    y: clamp(f.y, 0, box.y + box.h - MIN),
    w: clamp(f.w, MIN, box.w),
    h: clamp(f.h, MIN, box.h),
  });

  // Escape returns to the base editing surface.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const startDrag = useCallback(
    (edge: Edge) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!frame || !img) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Synthetic pointers carry no active capture; real mouse/touch works. */
      }
      drag.current = { edge, x0: event.clientX, y0: event.clientY, f0: frame };
    },
    [frame, img],
  );

  const moveDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const d = drag.current;
      if (!d || !stage) return;
      const dx = event.clientX - d.x0;
      const dy = event.clientY - d.y0;
      setFrame(resize(d.edge, d.f0, dx, dy, stage));
    },
    [stage],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* Capture may never have been set for a synthetic pointer. */
    }
    drag.current = null;
  }, []);

  const resetOriginal = useCallback(() => {
    if (img) setFrame(img);
  }, [img]);

  /* The frame's pixel size is what the showcase prints as its 寸法 line, scaled
     back to the asset's intrinsic resolution the way the real editor reports it. */
  const dims = frame && img && src
    ? `${Math.round((frame.w * src.w) / img.w)} × ${Math.round((frame.h * src.h) / img.h)}`
    : null;

  const pads = frame && img && src ? padsFrom(frame, img, src.w, src.h) : null;
  const canApply = !!frame && !!img && !!src && !busy;

  /* Fetch the picture as a data URI the moment we apply, so the outpaint body
     carries the real bytes (the backend accepts data URIs natively). */
  const ensureDataUrl = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }, [url]);

  const apply = useCallback(async () => {
    if (!canApply || !frame || !img || !src) return;
    const data = await ensureDataUrl();
    if (!data) return;
    if (pads && aiFill && onOutpaint) {
      onOutpaint(data, pads, prompt.trim());
    } else if (pads && !aiFill && onOutpaint) {
      // Expansion without AI fill still asks the backend to extend the canvas.
      onOutpaint(data, pads, prompt.trim());
    } else if (onApplyCrop) {
      // Pure crop: cut the picture to the frame region, in source pixels.
      const sx = src.w / img.w;
      const sy = src.h / img.h;
      const cw = Math.round(frame.w * sx);
      const ch = Math.round(frame.h * sy);
      const cx = Math.max(0, (frame.x - img.x) * sx);
      const cy = Math.max(0, (frame.y - img.y) * sy);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const bitmap = await createImageBitmap(await (await fetch(url)).blob());
      ctx.drawImage(bitmap, cx, cy, cw, ch, 0, 0, cw, ch);
      onApplyCrop(canvas.toDataURL("image/png"));
    }
  }, [canApply, frame, img, src, pads, aiFill, prompt, onOutpaint, onApplyCrop, ensureDataUrl, url]);

  return (
    <div className="ohf-expand-crop">
      <header className="ohf-ec-head">
        <button type="button" className="ohf-ec-back" aria-label="편집 앱으로 돌아가기" onClick={onBack}>
          <BackGlyph />
        </button>
        <span className="ohf-ec-title">확장 및 자르기</span>
        <button type="button" className="ohf-ec-close" aria-label="편집 앱 닫기" onClick={onClose}>
          <CloseGlyph />
        </button>
      </header>

      <div className="ohf-ec-canvas" ref={canvasRef}>
        {stage && img && (
          <>
            {/* The picture itself, drawn at its fit size. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              className="ohf-ec-img"
              src={url}
              alt="원본 미디어 이미지"
              draggable={false}
              style={{ left: `${img.x}px`, top: `${img.y}px`, width: `${img.w}px`, height: `${img.h}px` }}
              onLoad={(e) => setSrc({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            />
            {frame && (
              <>
                {/* The checkerboard fills whatever the frame claims beyond the
                    picture, standing in for the empty canvas the backend paints. */}
                <div className="ohf-ec-checker" aria-hidden style={rectStyle(frame)} />
                {/* The frame's dashed outline with the 寸法 readout beneath it. */}
                <div className="ohf-ec-frame" style={rectStyle(frame)}>
                  <span className="ohf-ec-dims">{dims}</span>
                  {HANDLES.map((h) => (
                    <button
                      key={h.edge}
                      type="button"
                      aria-label={h.label}
                      className={`ohf-ec-handle ohe-${h.edge}`}
                      style={handleStyle(frame, h.edge)}
                      onPointerDown={startDrag(h.edge)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {/* Original + 생성하기, top-right of the canvas. */}
        <div className="ohf-ec-top">
          <button type="button" className="ohf-ec-original" aria-label="Original" onClick={resetOriginal}>
            <OriginalGlyph />
          </button>
        </div>
      </div>

      <div className="ohf-ec-panel">
        <section className="ohf-ec-help" aria-label="이용 방법">
          <h4>이용 방법</h4>
          <p>
            프레임의 가장자리를 이미지 밖으로 끌어당기면 화면이 <strong> 확장</strong>되고, 안으로
            밀면 <strong> 자르기</strong>가 됩니다. 모서리 핸들은 두 방향을 함께 조절합니다.
          </p>
        </section>
        <div className="ohf-ec-ai">
          <span className="ohf-ec-ai-label">AI로 채우기</span>
          <button
            type="button"
            role="switch"
            aria-checked={aiFill}
            aria-label="AI로 채우기"
            className={`ohf-ec-switch${aiFill ? " is-on" : ""}`}
            onClick={() => setAiFill((v) => !v)}
          >
            <span className="ohf-ec-knob" />
          </button>
        </div>
        <input
          className="ohf-ec-prompt"
          placeholder="확장할 영역을 설명해 주세요…"
          aria-label="아웃페인트 프롬프트"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          type="button"
          className="ohf-ec-apply"
          aria-label="적용하기"
          disabled={!canApply}
          onClick={() => void apply()}
        >
          적용하기
        </button>
        {status && <div className="ohf-ec-status" role="status">{status}</div>}
      </div>
    </div>
  );
}

function rectStyle(r: Rect): React.CSSProperties {
  return { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` };
}

/* Place a handle on the frame's edge or corner. Edge handles centre on the
   mid-side; corner handles sit at the vertex. */
function handleStyle(f: Rect, edge: Edge): React.CSSProperties {
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const right = f.x + f.w;
  const bottom = f.y + f.h;
  const pts: Record<Edge, { x: number; y: number }> = {
    top: { x: cx, y: f.y },
    bottom: { x: cx, y: bottom },
    left: { x: f.x, y: cy },
    right: { x: right, y: cy },
    tl: { x: f.x, y: f.y },
    tr: { x: right, y: f.y },
    br: { x: right, y: bottom },
    bl: { x: f.x, y: bottom },
  };
  const p = pts[edge];
  return { left: `${p.x}px`, top: `${p.y}px` };
}

/* Small inline glyphs so the editor stands on its own. */
function BackGlyph() {
  return (<svg width={20} height={20} viewBox="0 0 24 24" fill="none"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5 8 12l7 7" /></svg>);
}
function CloseGlyph() {
  return (<svg width={20} height={20} viewBox="0 0 24 24" fill="none"><path stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" /></svg>);
}
function OriginalGlyph() {
  return (<svg width={20} height={20} viewBox="0 0 24 24" fill="none"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75C3.75 6.19772 4.19772 5.75 4.75 5.75H9.25M3.75 6.75v9.5M3.75 6.75 7 4M11.75 17.25c0 .55229-.44772 1-1 1H6.25M11.75 17.25V7.75c0-.55229.44772-1 1-1h5M11.75 17.25l-3.5 3.5M17.25 6.75l3 3M17.25 6.75c.55228 0 1 .44772 1 1v8.5" /></svg>);
}
