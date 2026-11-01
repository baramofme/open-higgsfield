"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* The Higgsfield image-edit workspace mirrored onto a Fabric.js canvas. Fabric
   is loaded only in the browser (a dynamic import inside an effect) so the
   server build never pulls the optional node-canvas native module. The toolbar
   is the tour's workspace-controls set: select, hand/pan, region, lasso, pen,
   eraser, shape — plus zoom, undo/redo, a reference shelf and a prompt with a
   generate press that hands the edit off to the studio. */

type Tool =
  | "select"
  | "hand"
  | "region"
  | "lasso"
  | "pen"
  | "eraser"
  | "shape";

const TOOL_KEYS: Record<Tool, string | null> = {
  select: "V",
  hand: "H",
  region: null,
  lasso: null,
  pen: "D",
  eraser: "E",
  shape: "R",
};

const MIN_SCALE = 0.2;
const MAX_SCALE = 6;

/* A pencil that wipes pixels instead of laying ink — the eraser. */
function makeEraser(fabric: any, canvas: any) {
  const EraserBrush = class extends fabric.PencilBrush {
    constructor(c: any) { super(c); }
    _drawSegment(ctx: any, p1: any, p2: any) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const result = super._drawSegment(ctx, p1, p2);
      ctx.restore();
      return result;
    }
  };
  const brush = new EraserBrush(canvas);
  brush.width = 18;
  brush.color = "rgba(0,0,0,1)";
  return brush;
}

export function ImageWorkspace({
  url,
  onAddReference,
  onPrompt,
  onGenerate,
}: {
  url: string;
  onAddReference?: (canvasPng: string) => void;
  onPrompt?: (text: string) => void;
  onGenerate?: (payload: { prompt: string; maskPng?: string; imagePng: string }) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<any>(null);
  const fabRef = useRef<any>(null);
  const bgRef = useRef<any>(null);
  const penRef = useRef<any>(null);
  const eraserRef = useRef<any>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>("select");
  const [penSize, setPenSize] = useState(6);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const history = useRef<any[]>([]);
  const redo = useRef<any[]>([]);

  const snapshot = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !fabRef.current) return;
    history.current.push(JSON.stringify(c.toJSON()));
    redo.current = [];
  }, []);

  const restore = useCallback((json: string) => {
    const c = canvasRef.current;
    const fab = fabRef.current;
    if (!c || !fab) return;
    c.loadFromJSON(json, () => {
      c.renderAll();
      bgRef.current = c.item(0) ?? null;
    });
  }, []);

  /* Mount the Fabric canvas and lay the run's picture down as the background. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fab: any = await import("fabric/es");
      if (cancelled || !canvasElRef.current || !hostRef.current) return;
      const host = hostRef.current.getBoundingClientRect();
      const width = Math.max(240, Math.floor(host.width));
      const canvas = new fab.Canvas(canvasElRef.current, {
        width,
        height: Math.max(180, Math.floor(host.height)),
        preserveAspectRatio: "xMidYMid meet",
        selection: true,
      });
      fabRef.current = fab;
      canvasRef.current = canvas;

      /* The canvas is live the moment Fabric is up; the picture may still be on
         its way. Mark ready now so the splash clears and the toolbar wakes, then
         lay the background underneath without ever blocking on the fetch. */
      setReady(true);
      setStatus(null);

      const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("image load failed"));
        el.src = url;
      }).catch(() => null);
      if (cancelled) { canvas.dispose(); return; }

      if (imgEl) {
        const bg = new fab.Image(imgEl, { originX: "left", originY: "top" });
        const scale = Math.min(canvas.getWidth() / imgEl.width, canvas.getHeight() / imgEl.height);
        bg.scaleX = scale; bg.scaleY = scale;
        bg.selectable = false; bg.evented = false; bg.lockMovement = true; bg.lockScaling = true;
        canvas.add(bg); canvas.sendToBack(bg);
        bgRef.current = bg;
        canvas.setViewportTransform([scale, 0, 0, scale, (canvas.getWidth() - imgEl.width * scale) / 2, (canvas.getHeight() - imgEl.height * scale) / 2]);
      }
      canvas.on("path:created", () => snapshot());
      canvas.on("object:added", () => { if (!shapeStart.current) snapshot(); });
      canvas.on("object:modified", () => snapshot());
      canvas.on("object:removed", () => snapshot());
      setReady(true);
      setStatus(null);
    })();
    return () => {
      cancelled = true;
      canvasRef.current?.dispose?.();
      canvasRef.current = null;
    };
  }, [url, snapshot]);

  /* Apply the chosen tool to the live canvas. */
  useEffect(() => {
    const c = canvasRef.current; const fab = fabRef.current;
    if (!c || !fab || !ready) return;
    c.isDrawingMode = false; c.selection = true; c.defaultCursor = "default";
    if (tool === "pen") {
      if (!penRef.current) { const b = new fab.PencilBrush(c); penRef.current = b; }
      penRef.current.width = penSize; penRef.current.color = "#f2d24b";
      c.freeDrawingBrush = penRef.current; c.isDrawingMode = true;
    } else if (tool === "eraser") {
      if (!eraserRef.current) eraserRef.current = makeEraser(fab, c);
      c.freeDrawingBrush = eraserRef.current; c.isDrawingMode = true;
    } else if (tool === "hand") {
      c.selection = false; c.defaultCursor = "grab";
    } else if (tool === "shape") {
      c.selection = false; c.defaultCursor = "crosshair";
    }
    // region/lasso fall back to a plain selection surface (marked below).
  }, [tool, penSize, ready]);

  const createShape = useCallback((x: number, y: number, w: number, h: number) => {
    const c = canvasRef.current; const fab = fabRef.current;
    if (!c || !fab) return;
    const rect = new fab.Rect({ left: x, top: y, width: w, height: h, fill: "rgba(210,254,23,0.18)", stroke: "#d1fe17", strokeWidth: 2 });
    const ellipse = new fab.Ellipse({ left: x, top: y, rx: w / 2, ry: h / 2, fill: "rgba(210,254,23,0.18)", stroke: "#d1fe17", strokeWidth: 2 });
    const which = window.localStorage.getItem("ohf-shape") ?? "rect";
    const shape = which === "ellipse" ? ellipse : rect;
    c.add(shape); c.setActiveObject(shape); c.requestRenderAll();
  }, []);

  /* Shape drag: record a start corner, then commit on pointer up. */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !ready || tool !== "shape") return;
    const down = (e: any) => { shapeStart.current = { x: e.absolutePointer.x, y: e.absolutePointer.y }; };
    const up = (e: any) => {
      const s = shapeStart.current; shapeStart.current = null;
      if (!s) return;
      const x = Math.min(s.x, e.absolutePointer.x), y = Math.min(s.y, e.absolutePointer.y);
      const w = Math.abs(e.absolutePointer.x - s.x), h = Math.abs(e.absolutePointer.y - s.y);
      if (w > 4 && h > 4) { snapshot(); createShape(x, y, w, h); }
    };
    c.on("mouse:down", down); c.on("mouse:up", up);
    return () => { c.off("mouse:down", down); c.off("mouse:up", up); };
  }, [tool, ready, createShape, snapshot]);

  const zoomBy = useCallback((factor: number) => {
    const c = canvasRef.current; const fab = fabRef.current;
    if (!c || !fab) return;
    const vpt = c.viewportTransform as number[];
    let s = vpt[0] * factor;
    s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    c.zoomToPoint(new fab.Point(c.getWidth() / 2, c.getHeight() / 2), s);
    c.requestRenderAll();
  }, []);

  const fit = useCallback(() => {
    const c = canvasRef.current; const fab = fabRef.current; const bg = bgRef.current;
    if (!c || !fab || !bg || !bg.element) return;
    const el = bg.element as HTMLImageElement;
    const s = Math.min(c.getWidth() / el.width, c.getHeight() / el.height);
    c.zoomToPoint(new fab.Point(c.getWidth() / 2, c.getHeight() / 2), s);
    c.requestRenderAll();
  }, []);

  const undo = useCallback(() => {
    const h = history.current;
    if (h.length < 2) return;
    const current = h.pop()!;
    redo.current.push(current);
    restore(h[h.length - 1] ?? "[]");
  }, [restore]);

  const redoBtn = useCallback(() => {
    const r = redo.current;
    if (!r.length) return;
    const json = r.pop()!;
    history.current.push(json);
    restore(json);
  }, [restore]);

  const toPng = useCallback(() => {
    const c = canvasRef.current;
    if (!c || !fabRef.current) return null;
    return c.toDataURL({ format: "png", multiplier: 1 });
  }, []);

  const addReference = useCallback(() => {
    const png = toPng();
    if (png) onAddReference?.(png);
  }, [toPng, onAddReference]);

  const generate = useCallback(() => {
    const imagePng = toPng();
    if (!imagePng) { setStatus("Nothing on the canvas yet."); return; }
    onGenerate?.({ prompt: text.trim(), imagePng });
  }, [toPng, text, onGenerate]);

  /* The canvas and its host must exist in the DOM even while the workspace is
     still booting, otherwise the mount effect cannot find them and never sets
     ready — so they are always rendered, and the spinner is an overlay that
     clears itself the moment `ready` flips. */
  return (
    <div className="ohf-workspace">
      <div className={`ohf-workspace-bar${ready ? "" : " ohf-workspace-bar--idle"}`} role="toolbar" aria-label="Image workspace controls">
        {([
          "select",
          "hand",
          "region",
          "lasso",
          "pen",
          "eraser",
          "shape",
        ] as Tool[]).map((t) => (
          <button
            key={t}
            type="button"
            disabled={!ready}
            className={`ohf-workspace-tool${tool === t ? " ohf-workspace-tool--on" : ""}`}
            aria-pressed={tool === t}
            title={TOOL_KEYS[t] ? `${t} (${TOOL_KEYS[t]})` : t}
            onClick={() => setTool(t)}
          >
            {t}
          </button>
        ))}
        {tool === "pen" && (
          <label className="ohf-workspace-size">
            size
            <input type="range" min={2} max={40} value={penSize} onChange={(e) => setPenSize(Number(e.target.value))} />
          </label>
        )}
        <span className="ohf-workspace-spacer" />
        <button type="button" className="ohf-workspace-tool" disabled={!ready} title="축소" onClick={() => zoomBy(1 / 1.2)}>−</button>
        <button type="button" className="ohf-workspace-tool" disabled={!ready} title="화면에 맞추기" onClick={fit}>100%</button>
        <button type="button" className="ohf-workspace-tool" disabled={!ready} title="확대" onClick={() => zoomBy(1.2)}>+</button>
        <button type="button" className="ohf-workspace-tool" disabled={!ready} title="되돌리기" onClick={undo}>↶</button>
        <button type="button" className="ohf-workspace-tool" disabled={!ready} title="다시 실행" onClick={redoBtn}>↷</button>
        <button type="button" className="ohf-workspace-tool" disabled={!ready} title="레퍼런스 이미지 추가" onClick={addReference}>⧉</button>
      </div>

      <div className="ohf-workspace-stage" ref={hostRef}>
        <canvas ref={canvasElRef} className="ohf-workspace-canvas" />
        {!ready && (
          <div className="ohf-workspace-splash" role="status">
            <span className="ohf-spinner" aria-hidden />
            <span>Preparing the canvas…</span>
          </div>
        )}
        {ready && (tool === "region" || tool === "lasso") && (
          <p className="ohf-workspace-note" role="status">
            {tool === "region" ? "영역 편집 — [미구현]" : "올가미 편집 — [미구현]"}
          </p>
        )}
        {status && <p className="ohf-workspace-status" role="status">{status}</p>}
      </div>

      <div className="ohf-workspace-foot">
        <input
          className="ohf-workspace-input"
          placeholder="프롬프트"
          value={text}
          onChange={(e) => { setText(e.target.value); onPrompt?.(e.target.value); }}
        />
        <button type="button" className="ohf-workspace-generate" disabled={!ready} onClick={generate}>생성하기</button>
      </div>
    </div>
  );
}
