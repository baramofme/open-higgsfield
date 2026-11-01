"use client";

import type { ReactNode } from "react";

/* The stroke glyphs Higgsfield draws on every row of the asset "추가 작업" menu
   and the selection toolbar. Each path is lifted verbatim from the source's own
   SVG so the mirrored menu carries the same silhouettes; they inherit colour
   from `currentColor` and sit at 24×24. */

type GlyphProps = { size?: number };

function svg(children: ReactNode, size = 20) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function OpenGlyph({ size }: GlyphProps) {
  return svg(<path d="M18.25 15.25V5.75M18.25 5.75H8.75M18.25 5.75L6 18" />, size);
}

export function RegenerateGlyph({ size }: GlyphProps) {
  return svg(
    <path d="M19.7596 14.75C18.627 17.9543 15.5711 20.25 11.979 20.25C7.42266 20.25 3.729 16.5563 3.729 12C3.729 7.44365 7.42266 3.75 11.979 3.75C14.7962 3.75 16.6791 4.95438 18.5 7.00891M19.25 4V7.5C19.25 7.77614 19.0261 8 18.75 8H15.25" />,
    size,
  );
}

export function ReuseGlyph({ size }: GlyphProps) {
  return svg(
    <g>
      <path d="M19.25 7.75C19.25 7.19772 18.8023 6.75 18.25 6.75H9.75C9.19772 6.75 8.75 7.19772 8.75 7.75V20.25C8.75 20.8023 9.19772 21.25 9.75 21.25H18.25C18.8023 21.25 19.25 20.8023 19.25 20.25V7.75Z" />
      <path d="M15.25 6.75V3.75C15.25 3.19772 14.8023 2.75 14.25 2.75H5.75C5.19772 2.75 4.75 3.19772 4.75 3.75V16.25C4.75 16.8023 5.19772 17.25 5.75 17.25H8.75" />
    </g>,
    size,
  );
}

export function ElementGlyph({ size }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M16.868 19.867A9.25 9.25 0 1 1 21.25 12c0 1.98-.984 4.024-3.279 3.816a3.31 3.31 0 0 1-2.978-3.767l.53-3.646m-.585 4.077c-.308 2.188-2.109 3.744-4.023 3.474-1.914-.269-3.217-2.26-2.91-4.448.308-2.187 2.11-3.743 4.023-3.474 1.914.27 3.217 2.26 2.91 4.448Z" />
    </svg>
  );
}

export function AssignGlyph({ size }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M16.8684 19.8667C15.4543 20.7437 13.7863 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 13.9797 20.2662 16.0242 17.9715 15.8156C16.0837 15.644 14.7249 13.9258 14.993 12.0492L15.5226 8.40278M14.9375 12.4805C14.63 14.6681 12.8291 16.2235 10.9149 15.9544C9.00068 15.6854 7.69817 13.6939 8.00562 11.5063C8.31308 9.31862 10.1141 7.76327 12.0283 8.03229C13.9424 8.30131 15.245 10.2928 14.9375 12.4805Z" />
    </svg>
  );
}

export function AddGlyph({ size }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.75518 5.15769C4.65005 4.94744 4.35001 4.94744 4.24488 5.15769L3.59168 6.4641C3.56407 6.51931 3.51931 6.56407 3.4641 6.59168L2.15769 7.24488C1.94744 7.35001 1.94744 7.65005 2.15769 7.75518L3.4641 8.40839C3.51931 8.43599 3.56407 8.48075 3.59168 8.53596L4.24488 9.84237C4.35001 10.0526 4.65005 10.0526 4.75518 9.84237L5.40839 8.53596C5.43599 8.48075 5.48075 8.43599 5.53596 8.40839L6.84237 7.75518C7.05262 7.65005 7.05262 7.35001 6.84237 7.24488L5.53596 6.59168C5.48075 6.56407 5.43599 6.51931 5.40839 6.4641L4.75518 5.15769Z" fill="currentColor" stroke="none" />
      <path d="M9.26447 2.16345C9.1555 1.94552 8.8445 1.94552 8.73553 2.16345L8.25558 3.12335C8.22697 3.18057 8.18057 3.22697 8.12335 3.25558L7.16345 3.73553C6.94552 3.8445 6.94552 4.1555 7.16345 4.26447L8.12335 4.74442C8.18057 4.77303 8.22697 4.81943 8.25558 4.87665L8.73553 5.83655C8.8445 6.05448 9.1555 6.05448 9.26447 5.83655L9.74442 4.87665C9.77303 4.81943 9.81943 4.77303 9.87665 4.74442L10.8365 4.26447C11.0545 4.1555 11.0545 3.8445 10.8365 3.73553L9.87665 3.25558C9.81943 3.22697 9.77303 3.18057 9.74442 3.12335L9.26447 2.16345Z" fill="currentColor" stroke="none" />
      <path d="M18.7551 15.1577C18.65 14.9474 18.35 14.9474 18.2449 15.1577L17.5917 16.4641C17.5641 16.5193 17.5193 16.5641 17.4641 16.5917L16.1577 17.2449C15.9474 17.35 15.9474 17.65 16.1577 17.7551L17.4641 18.4083C17.5193 18.4359 17.5641 18.4807 17.5917 18.5359L18.2449 19.8423C18.35 20.0526 18.65 20.0526 18.7551 19.8423L19.4083 18.5359C19.4359 18.4807 19.4807 18.4359 19.5359 18.4083L20.8423 17.7551C21.0526 17.65 21.0526 17.35 20.8423 17.2449L19.5359 16.5917C19.4807 16.5641 19.4359 16.5193 19.4083 16.4641L18.7551 15.1577Z" fill="currentColor" stroke="none" />
      <path d="M17.2071 4.2072L19.7929 6.79299C20.1834 7.18351 20.1834 7.81667 19.7929 8.2072L8.04289 19.9572C7.85536 20.1447 7.601 20.2501 7.33579 20.2501H3.75V16.6643C3.75 16.3991 3.85536 16.1447 4.04289 15.9572L15.7929 4.2072C16.1834 3.81668 16.8166 3.81668 17.2071 4.2072Z" />
    </svg>
  );
}

export function HeartGlyph({ size, filled }: GlyphProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 5.57193C18.3331 -0.86765 29.1898 11.0916 12 20.75C-5.18982 11.0916 5.66687 -0.867651 12 5.57193Z" />
    </svg>
  );
}

export function ShareGlyph({ size }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M21.8339 11.6275L13.3325 3.998C13.0106 3.7091 12.4985 3.93757 12.4985 4.37012V8.49958C3.99854 8.49958 1.74854 11.7496 1.74854 20.2496C3.24854 17.2496 3.99854 15.4996 12.4985 15.4996V19.629C12.4985 20.0616 13.0106 20.2901 13.3325 20.0012L21.8339 12.3717C22.0553 12.173 22.0553 11.8261 21.8339 11.6275Z" />
    </svg>
  );
}

export function FolderGlyph({ size }: GlyphProps) {
  return svg(
    <path d="M12 19.25V13M12 13L14.5 15.5M12 13L9.5 15.5M7.375 19.25H3.75C3.19772 19.25 2.75 18.8023 2.75 18.25V4.75C2.75 4.19772 3.19772 3.75 3.75 3.75H9.46482C9.79917 3.75 10.1114 3.9171 10.2969 4.1953L11.7031 6.3047C11.8886 6.5829 12.2008 6.75 12.5352 6.75H20.25C20.8023 6.75 21.25 7.19772 21.25 7.75V18.25C21.25 18.8023 20.8023 19.25 20.25 19.25H16.625" />,
    size,
  );
}

export function PublishGlyph({ size }: GlyphProps) {
  return svg(<path d="M3.75 19.25V9.75C3.75 9.19771 4.19772 8.75 4.75 8.75H19.25M16.25 12.75L20.25 8.75L16.25 4.75" />, size);
}

export function DownloadGlyph({ size }: GlyphProps) {
  return svg(<path d="M20.25 14.75V19.25C20.25 19.8023 19.8023 20.25 19.25 20.25H4.75C4.19772 20.25 3.75 19.8023 3.75 19.25V14.75M12 15V3.75M12 15L8.5 11.5M12 15L15.5 11.5" />, size);
}

export function TrashGlyph({ size }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.75 6.5L5.72041 20.32C5.7572 20.8439 6.19286 21.25 6.71796 21.25H17.282C17.8071 21.25 18.2428 20.8439 18.2796 20.32L19.25 6.5" />
      <path d="M3.25 5.75H20.75" />
      <path d="M8.5246 5.58289C8.73079 3.84652 10.2081 2.5 12 2.5C13.7919 2.5 15.2692 3.84652 15.4754 5.58289" />
      <path d="M10 10.5V16.25" />
      <path d="M14 10.5V16.25" />
    </svg>
  );
}

/* The three dots the ⋯ trigger shows on the selection toolbar. */
export function DotsGlyph({ size }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 20} height={size ?? 20} aria-hidden="true" fill="currentColor">
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19.5" cy="12" r="1.4" />
      <circle cx="4.5" cy="12" r="1.4" />
    </svg>
  );
}

/* The diagonal cross that clears the whole selection. */
export function ClearGlyph({ size }: GlyphProps) {
  return svg(<path d="M4.75 4.75L19.25 19.25M19.25 4.75L4.75 19.25" />, size);
}

/* Small media marks the element submenu uses: a framed picture and a film. */
export function ImageGlyph({ size }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 16} height={size ?? 16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.6" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </svg>
  );
}

export function VideoGlyph({ size }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? 16} height={size ?? 16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="15" height="14" rx="2" />
      <path d="M21 8l-3 2v4l3 2z" />
    </svg>
  );
}
