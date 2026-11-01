"use client";

import { useCallback, useRef, useState } from "react";

import { MaskEditor, toMask, type MaskEditorCanvasRef } from "react-canvas-masker";

/* Localized inpaint. The backend repaints whatever the start image leaves
   transparent, so the painted brush region becomes a hole in the alpha channel
   and the whole thing is submitted as one RGBA PNG. */
export function InpaintPanel({
  src,
  busy,
  status,
  onInpaint,
}: {
  src: string;
  busy: boolean;
  status?: string;
  onInpaint: (image: string, prompt: string) => void;
}) {
  const canvasRef = useRef<MaskEditorCanvasRef>(null!);
  const [touched, setTouched] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const compose = useCallback(
    async (maskCanvas: HTMLCanvasElement | null): Promise<string | null> => {
      if (!maskCanvas) return null;
      const maskUrl = toMask(maskCanvas);
      const [source, mask] = await Promise.all([
        // The file is CORS-safe (gradio echoes the origin), so drawing it does
        // not taint the canvas and toDataURL stays readable.
        loadImage(src, "anonymous"),
        loadImage(maskUrl),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0);
      // Cut the painted region out of the alpha, leaving the rest of the
      // picture whole; the transparent holes are what the model repaints.
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      return canvas.toDataURL("image/png");
    },
    [src],
  );

  const submit = useCallback(async () => {
    if (busy || working) return;
    if (!touched || !prompt.trim()) return;
    setWorking(true);
    setMessage(null);
    try {
      const image = await compose(canvasRef.current?.maskCanvas ?? null);
      if (!image) {
        setMessage("마스크가 비어 있어요 — 브러시로 다시칠한 다음 다시 시도해주세요.");
      } else {
        onInpaint(image, prompt.trim());
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setWorking(false);
    }
  }, [busy, working, touched, prompt, compose, onInpaint]);

  const clear = useCallback(() => {
    canvasRef.current?.clear?.();
    setTouched(false);
  }, []);

  return (
    <section className="ohf-inpaint">
      <div className="ohf-inpaint-canvas">
        <MaskEditor
          src={src}
          canvasRef={canvasRef}
          onDrawingChange={() => {}}
          onMaskChange={() => setTouched(true)}
        />
      </div>
      <p className="ohf-inpaint-hint">
        브러시로 영역을 칠하면 그 자리만 투명해지지만, Krea 2 Turbo는 마스크를
        무시하고 <strong>이미지 전체를 다시 그립니다</strong> — 칠한 곳만 바뀌는
        국한 편집은 이 백엔드에서 되지 않습니다.
      </p>
      <div className="ohf-inpaint-foot">
        <textarea
          className="ohf-inpaint-input"
          placeholder="영역에 채울 내용을 적으세요"
          value={prompt}
          rows={2}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="ohf-inpaint-actions">
          <button type="button" className="ohf-inpaint-clear" onClick={clear} disabled={!touched}>
            지우기
          </button>
          <button
            type="button"
            className="ohf-inpaint-generate"
            onClick={() => void submit()}
            disabled={busy || working || !touched || !prompt.trim()}
          >
            {working ? "준비 중…" : busy ? "생성 중…" : status ?? "생성하기"}
          </button>
        </div>
      </div>
      {message && (
        <p className="ohf-inpaint-note" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

/** Decode an image once it reports it is fully loaded; an optional crossOrigin
    lets the canvas draw a CORS-approved file without being tainted by it. */
function loadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    image.src = src;
  });
}
