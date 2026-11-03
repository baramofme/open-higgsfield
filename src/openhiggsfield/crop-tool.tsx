"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "./icons";
import type { AssetKind } from "./data";
import { toProxyImageUrl, toProxyMediaUrl } from "./image-proxy";

/** The app's answer when a reference is the wrong shape: cut the frame down to
    the part that should be seen. Drag inside to move the window, pull an edge
    or a corner to resize it, confirm to hand back a fresh image. A video is
    cut to a single frame — the still at its start is what gets used. */
type Rect = { x: number; y: number; w: number; h: number };
type Handle = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const MIN = 24;

export function CropTool({
  url,
  kind,
  onClose,
  onApply,
}: {
  url: string;
  kind: AssetKind;
  onClose: () => void;
  onApply: (croppedUrl: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  /* The media is centered in the stage; the window lives in the media's own
     coordinates, so the media's offset is what makes the two line up. */
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rect, setRect] = useState<Rect | null>(null);
  const drag = useRef<{ handle: Handle; x: number; y: number; start: Rect } | null>(null);

  /* When the media reports its natural size, the stage takes the contained box
     and the window opens as the centered three-quarters of it. */
  function measure() {
    const media = mediaRef.current;
    const stage = stageRef.current;
    if (!media || !stage) return;
    const natW = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const natH = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    if (!natW || !natH) return;
    /* The element fills the stage but paints contained — the ink is the
       element's box trimmed to the picture's own aspect, and the window is
       measured against that ink, not the letterboxed box. */
    const er = media.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const scale = Math.min(er.width / natW, er.height / natH);
    const w = Math.round(natW * scale);
    const h = Math.round(natH * scale);
    setBox({ w, h });
    setOrigin({ x: er.left - sr.left + (er.width - w) / 2, y: er.top - sr.top + (er.height - h) / 2 });
    setRect({ x: w * 0.125, y: h * 0.125, w: w * 0.75, h: h * 0.75 });
  }

  useEffect(() => {
    const media = mediaRef.current;
    if (media instanceof HTMLVideoElement) {
      /* Any frame will do for a still; the first readable one is the honest
         default and seeking is what makes it visible. */
      media.addEventListener("loadeddata", measure, { once: true });
      media.currentTime = 0.05;
    }
  }, []);

  function clamp(next: Rect): Rect {
    if (!box) return next;
    const w = Math.max(MIN, Math.min(next.w, box.w));
    const h = Math.max(MIN, Math.min(next.h, box.h));
    return {
      w,
      h,
      x: Math.max(0, Math.min(next.x, box.w - w)),
      y: Math.max(0, Math.min(next.y, box.h - h)),
    };
  }

  function startDrag(handle: Handle) {
    return (event: React.PointerEvent) => {
      if (!rect) return;
      event.preventDefault();
      event.stopPropagation();
      drag.current = { handle, x: event.clientX, y: event.clientY, start: rect };
      try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* synthetic pointers have no active capture */ }
    };
  }

  function onDragMove(event: React.PointerEvent) {
    const current = drag.current;
    if (!current || !box) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    const s = current.start;
    const next: Rect = { ...s };
    if (current.handle === "move") {
      next.x = s.x + dx;
      next.y = s.y + dy;
    } else {
      if (current.handle.includes("w")) {
        next.x = s.x + dx;
        next.w = s.w - dx;
      }
      if (current.handle.includes("e")) next.w = s.w + dx;
      if (current.handle.includes("n")) {
        next.y = s.y + dy;
        next.h = s.h - dy;
      }
      if (current.handle.includes("s")) next.h = s.h + dy;
    }
    setRect(clamp(next));
  }

  function endDrag(event: React.PointerEvent) {
    try { (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId); } catch { /* capture may never have been taken */ }
    drag.current = null;
  }

  function confirm() {
    const media = mediaRef.current;
    if (!media || !rect || !box) return;
    const natW = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const natH = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    const scale = box.w / natW;
    const sx = rect.x / scale;
    const sy = rect.y / scale;
    const sw = Math.min(rect.w / scale, natW - sx);
    const sh = Math.min(rect.h / scale, natH - sy);
    /* Data URLs ride along the plane; a cut-out bigger than 2048 on a side
       would strain the URL more than the picture is worth. */
    const cap = Math.min(1, 2048 / Math.max(sw, sh));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw * cap));
    canvas.height = Math.max(1, Math.round(sh * cap));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(media, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    onApply(canvas.toDataURL("image/jpeg", 0.92));
  }

  const handles: readonly Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return createPortal(
    <div className="ohf-v2-scrim" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="ohf-v2-crop-card" role="dialog" aria-label="Edit reference">
        <div className="ohf-v2-crop-head">
          <div className="ohf-v2-crop-title-wrap">
            <h2 className="ohf-v2-project-title">Edit reference</h2>
            <span className="ohf-v2-crop-hint">Crop the part of the image to use</span>
          </div>
          <button type="button" className="ohf-v2-round-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="ohf-v2-crop-stage" ref={stageRef} onLoad={measure}>
          {kind === "video" ? (
            /* The video rides the same-origin proxy too. A raw cross-origin
               gradio url has no CORS headers, so drawing its frame into the crop
               canvas taints it and `confirm()`'s toDataURL throws ("Tainted
               canvases may not be exported"). Same-origin bytes keep the canvas
               clean; the proxy already serves the video extension. */
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              className="ohf-v2-crop-media"
              src={toProxyMediaUrl(url)}
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={measure}
            />
          ) : (
            /* The still rides the same-origin proxy: a raw cross-origin gradio
               url would taint the cut-out canvas and `confirm()`'s toDataURL
               would throw, on top of the PNA block a remote origin gets. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={mediaRef as React.RefObject<HTMLImageElement>}
              className="ohf-v2-crop-media"
              src={toProxyImageUrl(url)}
              alt=""
              onLoad={measure}
            />
          )}
          {rect && (
            <div
              className="ohf-v2-crop-window"
              style={{ left: origin.x + rect.x, top: origin.y + rect.y, width: rect.w, height: rect.h }}
              onPointerDown={startDrag("move")}
              onPointerMove={onDragMove}
              onPointerUp={endDrag}
            >
              <span className="ohf-v2-crop-grid" aria-hidden />
              {handles.map((handle) => (
                <span
                  key={handle}
                  className={`ohf-v2-crop-handle ohf-v2-crop-handle--${handle}`}
                  onPointerDown={startDrag(handle)}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                />
              ))}
            </div>
          )}
        </div>
        <div className="ohf-v2-modal-foot">
          <button type="button" className="ohf-v2-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ohf-v2-solid-btn" disabled={!rect} onClick={confirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
