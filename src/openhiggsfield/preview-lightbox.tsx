"use client";

import { createPortal } from "react-dom";

import { CloseIcon } from "./icons";
import type { AssetKind } from "./data";

/** One asset at full size. The grid tiles are thumbnails by construction; this
    is where a frame is judged before it is chosen or cut. */
export function PreviewLightbox({
  url,
  kind,
  onClose,
}: {
  url: string;
  kind: AssetKind;
  onClose: () => void;
}) {
  return createPortal(
    <div className="ohf-v2-scrim ohf-v2-scrim--preview" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="ohf-v2-lightbox" role="dialog" aria-label="Preview">
        {kind === "video" ? (
          <video className="ohf-v2-lightbox-media" src={url} controls autoPlay playsInline />
        ) : kind === "audio" ? (
          <audio className="ohf-v2-lightbox-audio" src={url} controls />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="ohf-v2-lightbox-media" src={url} alt="" />
        )}
        <button type="button" className="ohf-v2-round-btn ohf-v2-lightbox-close" aria-label="Close" onClick={onClose}>
          <CloseIcon size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
