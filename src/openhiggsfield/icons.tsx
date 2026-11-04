/* OpenHiggsfield icon set — 16-grid, 1.5px stroke, round caps, currentColor.
   One drawing system across the surface; fills mark active/media badges only. */

interface IconProps {
  size?: number;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  } as const;
}

export function ImageIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="1.75" y="1.75" width="12.5" height="12.5" rx="3" />
      <circle cx="5.9" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <path d="M14 11.2 10.5 7.8 3.4 14" />
    </svg>
  );
}

export function VideoIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="1.75" y="2.9" width="12.5" height="10.2" rx="2.8" />
      <path d="M6.8 6 10.2 8 6.8 10 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AudioIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.75 6.6v2.8" />
      <path d="M6.25 3.8v8.4" />
      <path d="M9.75 5.6v4.8" />
      <path d="M13.25 7v2" />
    </svg>
  );
}

/* Assets holds every finished run, so the mark is a stack of frames seen
   edge-on — the same frame the Image and Video icons draw, with the ones
   behind it showing only their top edge. */
export function AssetsIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="1.9" y="6.35" width="12.2" height="7.75" rx="2.2" />
      <path d="M4.1 4.15h7.8" />
      <path d="M5.6 1.9h4.8" />
    </svg>
  );
}

export function KeyIcon({ size = 15 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="5.6" cy="10.2" r="3.1" />
      <path d="M7.9 7.9 13.2 2.6M10.8 5l1.7 1.7M8.9 6.9l1.7 1.7" />
    </svg>
  );
}

export function CaretDownIcon({ size = 10 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 6.2 8 10.2 12 6.2" />
    </svg>
  );
}

export function CloseIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function CheckIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.8}>
      <path d="M3 8.4 6.4 11.8 13 4.6" />
    </svg>
  );
}

export function SearchIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="7" cy="7" r="4.4" />
      <path d="M10.4 10.4 13.6 13.6" />
    </svg>
  );
}

export function ShuffleIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M13.4 8a5.4 5.4 0 1 1-1.6-3.85" />
      <path d="M13.6 1.9v2.5h-2.5" />
    </svg>
  );
}

export function RetryIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M13.2 8a5.2 5.2 0 1 1-1.55-3.7" />
      <path d="M13.4 2.2v2.4H11" />
    </svg>
  );
}

export function WarningIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 2.6 14.2 13H1.8Z" />
      <path d="M8 6.6v3" />
      <path d="M8 11.4h.01" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.9 8h9.5" />
      <path d="M8.9 4.5 12.4 8l-3.5 3.5" />
    </svg>
  );
}

export function PlusIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6.2 4.5 9.7 8 6.2 11.5" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9.8 4.5 6.3 8 9.8 11.5" />
    </svg>
  );
}

export function MinusIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3.2 8h9.6" />
    </svg>
  );
}

/* Resolution is the one setting sold as a grade rather than a measurement, so
   it carries the gem — girdle line included, or it reads as a plain lozenge. */
export function GemIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4.3 2.6h7.4l2.4 3.6L8 13.4 1.9 6.2z" />
      <path d="M1.9 6.2h12.2" />
    </svg>
  );
}

export function ClockIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="8" r="5.9" />
      <path d="M8 4.6V8l2.5 1.6" />
    </svg>
  );
}

export function FormatIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9.2 1.9H5a2.1 2.1 0 0 0-2.1 2.1v8a2.1 2.1 0 0 0 2.1 2.1h6a2.1 2.1 0 0 0 2.1-2.1V5.8z" />
      <path d="M9.2 1.9v3.9h3.9" />
    </svg>
  );
}

export function PlayIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M4.9 3.2 12.4 8 4.9 12.8Z" fill="currentColor" />
    </svg>
  );
}

export function PlayBadgeIcon({ size = 9 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M3.6 2.2 13.4 8 3.6 13.8Z" fill="currentColor" />
    </svg>
  );
}

export function DownloadIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 2.6v7.2M4.9 7 8 10.2 11.1 7" />
      <path d="M2.8 13.2h10.4" />
    </svg>
  );
}

/* The shelf's escape hatch: the same 13px frame, opened at one corner with the
   arrow leaving through it. Stands where a save was refused and the file has to
   be handed to a tab instead — a download arrow there would say the wrong
   thing twice. */
export function OpenOutIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M13.2 9.4v3.1a1.7 1.7 0 0 1-1.7 1.7H3.5a1.7 1.7 0 0 1-1.7-1.7V4.5a1.7 1.7 0 0 1 1.7-1.7h3.1" />
      <path d="M9.7 2.2h4.1v4.1M7.3 8.7l6.3-6.3" />
    </svg>
  );
}

/* The mirror of DownloadIcon, on the same shelf line — the pair reads as one
   opposition rather than two unrelated arrows. */
export function UploadIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 10.6V3.4M4.9 6.5 8 3.4l3.1 3.1" />
      <path d="M2.8 13.2h10.4" />
    </svg>
  );
}

/* Two offset sheets, the front one open at the corner the back sheet fills —
   reads as "duplicate" at 13px where a plain double rectangle reads as a box. */
export function CopyIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="5.6" y="5.6" width="8.6" height="8.6" rx="2.2" />
      <path d="M10.4 5.6V4A2.2 2.2 0 0 0 8.2 1.8H4A2.2 2.2 0 0 0 1.8 4v4.2A2.2 2.2 0 0 0 4 10.4h1.6" />
    </svg>
  );
}

export function SlidersIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.2 4.6h3.1M8.3 4.6h5.5" />
      <circle cx="6.8" cy="4.6" r="1.5" />
      <path d="M2.2 11.4h5.5M10.7 11.4h3.1" />
      <circle cx="9.2" cy="11.4" r="1.5" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 15 }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.8}>
      <path d="M8 13V3.4" />
      <path d="M3.8 7.6 8 3.4l4.2 4.2" />
    </svg>
  );
}

/* Keeping a run is one mark in two states: the outline is the offer, the
   solid is the kept run. Same path, so the fill lands exactly on the stroke. */
const HEART =
  "M8 13.2C8 13.2 2.4 9.75 2.4 6.05C2.4 4.28 3.78 3.05 5.4 3.05C6.5 3.05 7.5 3.65 8 4.55C8.5 3.65 9.5 3.05 10.6 3.05C12.22 3.05 13.6 4.28 13.6 6.05C13.6 9.75 8 13.2 8 13.2Z";

export function HeartIcon({ size = 14, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} fill={filled ? "currentColor" : "none"}>
      <path d={HEART} />
    </svg>
  );
}

/* Lid, handle, tapered body — no inner ribs, which silt up at 13px over a
   photograph. The body clears the lid line so the two do not fuse into a box. */
export function TrashIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.9 4.25h10.2" />
      <path d="M6.15 4.25V3.05a1 1 0 0 1 1-1h1.7a1 1 0 0 1 1 1v1.2" />
      <path d="M4.55 6.1h6.9l-.45 6.4a1.5 1.5 0 0 1-1.5 1.4H6.5a1.5 1.5 0 0 1-1.5-1.4Z" />
    </svg>
  );
}

export function UndoIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.8 8a5.2 5.2 0 1 0 1.55-3.7" />
      <path d="M2.6 2.2v2.4H5" />
    </svg>
  );
}

export function WaveBadgeIcon({ size = 12 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.75 6.6v2.8M6.25 4.4v7.2M9.75 6v4M13.25 7v2" />
    </svg>
  );
}

export function ClapperIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="1.75" y="6.75" width="12.5" height="7.5" rx="1.6" />
      <path d="M2.4 4.9 5.6 2.9M7.3 4.4l3.2-2M12.2 3.9l2.4-1.5" />
    </svg>
  );
}

/* The colour-palette instrument HF seats fifth on the video top bar. A painter's
   palette reads as "colour" at a glance; the thumb notch on the right edge and the
   well circles are all stroke, so it joins the one drawing system, never a fill. */
export function PaletteIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 2.5C4.4 2.5 2.5 5 2.5 8s2.1 5.5 5.5 5.5c.9 0 1.5-.7 1.5-1.6 0-.4.2-.8.5-1.1.3-.3.7-.5 1.2-.5h1a2.6 2.6 0 0 0 2.6-2.6C15 5.6 12.6 2.5 8 2.5Z" />
      <circle cx="4.8" cy="8.2" r="1.05" />
      <circle cx="5" cy="5.7" r=".7" />
      <circle cx="9" cy="4.8" r=".7" />
    </svg>
  );
}

export function ApertureIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 1.75V8M14.25 8H8M13.2 13.2 8 8M2.75 8H8M4 4 8 8M12 4 8 8" />
    </svg>
  );
}

export function PersonAddIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="6" cy="5.4" r="2.9" />
      <path d="M1.75 14.25c.6-2.9 2.2-4.4 4.25-4.4s3.65 1.5 4.25 4.4" />
      <path d="M12.25 4h3M13.75 2.5v3" />
    </svg>
  );
}

export function FrameIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="1.75" y="1.75" width="12.5" height="12.5" rx="3" />
      <path d="M4.5 4.5v3M4.5 4.5h3M11.5 11.5v-3M11.5 11.5h-3" opacity="0.9" />
    </svg>
  );
}

/* Cinema's two instruments, as the app draws them: a person for the character
   tile, a lens barrel for the camera tile. 16-grid like every other glyph. */
export function PersonIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="5" r="2.6" />
      <path d="M3.4 13.6c.9-2.6 2.6-4 4.6-4s3.7 1.4 4.6 4" />
    </svg>
  );
}
export function LensIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 2.5v1.4M13.5 8h-1.4M8 13.5v-1.4M2.5 8h1.4" />
    </svg>
  );
}

/* The cinematic mode's own glyph, as the app labels it (시네마): a clapper on a
   base, drawn once more so the mode segment reads apart from 일반's frame. */
export function CinematicIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.5 6.8h11v6.7h-11z" />
      <path d="M2.8 6.6 13 3.4l1.6 2.6" />
      <path d="M5.6 6.8 4.4 4.2M9.2 6.8 8 4.2" opacity="0.9" />
    </svg>
  );
}

/* The drum's hover arrows: the app shows a plain downward chevron at the
   bottom and the same glyph rotated for the top. */
export function ChevronIcon({ size = 14, flip = false }: IconProps & { flip?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={flip ? { transform: "rotate(180deg)" } : undefined}
      aria-hidden="true"
    >
      <path
        d="M5.75 9.5L12 15.75L18.25 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CameraIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 4.4V3.1h4v1.3" />
      <rect x="1.75" y="4.4" width="12.5" height="7.9" rx="2.6" />
      <circle cx="8" cy="8.35" r="2.3" />
    </svg>
  );
}

export function HammerIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4.4" y="2.35" width="7.2" height="3.7" rx="1.2" />
      <path d="M8 6v7.6" />
      <path d="M6.6 13.6h2.8" />
    </svg>
  );
}

export function GaugeIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2.6 10a5.4 5.4 0 1 1 10.8 0" />
      <path d="M8 9.2 10.4 7" />
      <circle cx="8" cy="9.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* The picker's chrome glyphs: what a hovered card offers. Eye opens the full
   view, crop cuts a new frame from it, pencil reopens the element's record. */
export function EyeIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2 8s2.4-3.8 6-3.8S14 8 14 8s-2.4 3.8-6 3.8S2 8 2 8Z" />
      <circle cx="8" cy="8" r="1.7" />
    </svg>
  );
}

export function CropIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4.6 1.8v8.6h8.6" />
      <path d="M1.8 4.6h8.6v8.6" />
    </svg>
  );
}

export function PencilIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M11.3 3.2l2.3 2.3-7.6 7.6-3.1.8.8-3.1Z" />
    </svg>
  );
}

/* Category glyphs for the element library's sidebar: who the file is filed as. */
export function GlobeIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="8" r="5.6" />
      <path d="M2.4 8h11.2" />
      <path d="M8 2.4a7.2 7.2 0 0 1 2.6 5.6A7.2 7.2 0 0 1 8 13.6a7.2 7.2 0 0 1-2.6-5.6A7.2 7.2 0 0 1 8 2.4Z" />
    </svg>
  );
}

export function CubeIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 2.2l5.4 3v5.6L8 13.8l-5.4-3V5.2Z" />
      <path d="M8 2.2v4.4" />
      <path d="M8 6.6 2.6 3.6" />
      <path d="M8 6.6l5.4-3" />
    </svg>
  );
}

export function FolderIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2 5.4h4.2l1.6 1.7H14v6H2Z" />
    </svg>
  );
}

/* The free badge's sparkle — the app's own three-spark path, kept as painted
   fill because strokes would shred its points at this size. */
export function SparkIcon({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      style={{ display: "block" }}
    >
      <path d="M8 14c.18 0 .342.112.407.28l.484 1.255a1 1 0 0 0 .574.574l1.255.484a.436.436 0 0 1 0 .814l-1.255.484a1 1 0 0 0-.574.574l-.484 1.255a.436.436 0 0 1-.814 0l-.484-1.255a1 1 0 0 0-.574-.574l-1.255-.484a.436.436 0 0 1 0-.814l1.255-.484a1 1 0 0 0 .574-.574l.484-1.255A.44.44 0 0 1 8 14M16 6c.361 0 .686.222.815.56l1.125 2.925a1 1 0 0 0 .575.575l2.925 1.125a.874.874 0 0 1 0 1.63l-2.925 1.125a1 1 0 0 0-.575.575l-1.125 2.925a.874.874 0 0 1-1.63 0l-1.125-2.925a1 1 0 0 0-.575-.575l-2.925-1.125a.874.874 0 0 1 0-1.63l2.925-1.125a1 1 0 0 0 .575-.575l1.125-2.925A.87.87 0 0 1 16 6M6 4c.24 0 .457.148.544.373l.696 1.813a1 1 0 0 0 .574.574l1.813.696a.583.583 0 0 1 0 1.088l-1.813.696a1 1 0 0 0-.574.574l-.696 1.813a.583.583 0 0 1-1.088 0L4.76 9.814a1 1 0 0 0-.574-.574l-1.813-.696a.583.583 0 0 1 0-1.088l1.813-.696a1 1 0 0 0 .574-.574l.696-1.813A.58.58 0 0 1 6 4" />
    </svg>
  );
}

/* The feed header's own icons, lifted from the live filter/view buttons. They
   keep the platform's 24-unit box and stroke weight so the header reads exactly
   as the source does, rather than being redrawn into the app's 16-unit glyphs. */
function base24(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    style: { display: "block" },
  } as const;
}

/* Three ruled lines at three lengths — the filter mark. */
export function FeedFilterIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base24(size)}>
      <path d="M2.75 4.75H21.25M8.75 19.25H15.25M5.75 12H18.25" />
    </svg>
  );
}

/* Four rounded-corner cells — the view/layout mark. */
export function FeedViewIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base24(size)}>
      <path d="M3.75 5.35C3.75 4.79 3.75 4.51 3.86 4.3A1.5 1.5 0 0 1 4.3 3.86C4.51 3.75 4.79 3.75 5.35 3.75H10.25V10.25H3.75V5.35Z" />
      <path d="M13.75 3.75H18.65C19.21 3.75 19.49 3.75 19.7 3.86A1.5 1.5 0 0 1 20.14 4.3C20.25 4.51 20.25 4.79 20.25 5.35V10.25H13.75V3.75Z" />
      <path d="M3.75 13.75H10.25V20.25H5.35C4.79 20.25 4.51 20.25 4.3 20.14A1.5 1.5 0 0 1 3.86 19.7C3.75 19.49 3.75 19.21 3.75 18.65V13.75Z" />
      <path d="M13.75 13.75H20.25V18.65C20.25 19.21 20.25 19.49 20.14 19.7A1.5 1.5 0 0 1 19.7 20.14C19.49 20.25 19.21 20.25 18.65 20.25H13.75V13.75Z" />
    </svg>
  );
}

/* The four-point sparkle that opens the model submenu. */
export function FeedModelIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base24(size)}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22.25 15C17.2153 15 15 17.2153 15 22.25C15 17.2153 12.7847 15 7.75 15C12.7847 15 15 12.7847 15 7.75C15 12.7847 17.2153 15 22.25 15Z"
      />
    </svg>
  );
}

/* The calendar mark that opens the period submenu. */
export function FeedCalendarIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base24(size)}>
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" />
      <path d="M3.75 9.5H20.25M8 3.5V6M16 3.5V6" />
    </svg>
  );
}

/* The fit-to-preview mark: four expand corners around an open centre. */
export function FeedFitIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base24(size)}>
      <path d="M3.75 8.5V5.35C3.75 4.4 4.4 3.75 5.35 3.75H8.5" />
      <path d="M15.5 3.75H18.65C19.6 3.75 20.25 4.4 20.25 5.35V8.5" />
      <path d="M20.25 15.5V18.65C20.25 19.6 19.6 20.25 18.65 20.25H15.5" />
      <path d="M8.5 20.25H5.35C4.4 20.25 3.75 19.6 3.75 18.65V15.5" />
    </svg>
  );
}


/* The private-folder mark. Higgsfield's 비공개 프로젝트 row carries a lock at
   16px in the dim tone (measured rgb(137,138,139), which is --fg-dim); this is
   the same silhouette the reference draws — shackle over body. */
export function LockIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base24(size)}>
      <rect x="3.5" y="10.5" width="17" height="10" rx="2.5" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </svg>
  );
}
