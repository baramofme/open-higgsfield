"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { resolutionTierLabel, settingLabel, settingValueLabel } from "./data";
import { timeAgo, type RunRecord } from "./history";
import { ImageWorkspace } from "./image-workspace";
import { toProxyImageUrl } from "./image-proxy";
import { MoreMenu, type MenuItem } from "./context-menu";
import { addComment, loadComments, removeComment, type Comment } from "./comments";
import { CheckIcon } from "./icons";
import { LOCAL_USER } from "./local-user";
import { EditShowcase, EditToolsCard } from "./edit-showcase";
import { ExpandCropEditor } from "./expand-crop";
import { VideoEditor, VideoEditRail, SEED_CAPTIONS, type CaptionSeg } from "./video-edit";
import { SHOWCASE_WAVEFORM, useAudioWaveform } from "./use-audio-waveform";
/* t_114a2802 — the image reference's centre-click "use as next". The plate is
   raised from the viewer's own image branch and the role it writes goes straight
   to the media store; the config card is a sibling file so the showcase keeps no
   new handler threaded through it. */
import { useImageMedia } from "@/generation/stores/media";
import { ReferenceUseNextPopover } from "./reference-use-next";

/* Backstop only: the exit normally ends on the panel's own animationend. */
const EXIT_TIMEOUT_MS = 420;
const COPIED_MS = 1600;
const CREATED = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/* Higgsfield's own name for this surface; the showcase reads the same way. */
const SHOWCASE_DESCRIPTION = "에셋 쇼케이스 대화 상자 보기";

/* ---------------------------------------------------------------------------
   Higgsfield's own icons, copied glyph-for-glyph from the showcase source so the
   mirror's tab strip, action grid and comment thread carry the same line-work as
   the site. Each is a 24×24 line icon stroked in currentColor.
   --------------------------------------------------------------------------- */

const InfoGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M10.75 11H12L12 16.25M21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 7.375C11.6548 7.375 11.375 7.65482 11.375 8C11.375 8.34518 11.6548 8.625 12 8.625C12.3452 8.625 12.625 8.34518 12.625 8C12.625 7.65482 12.3452 7.375 12 7.375Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.25"
    />
  </svg>
);

const EditGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M2.74609 13.5C10.9181 5.42183 14.2879 2.28083 16.2674 4.38617C19.0814 7.37874 4.62803 16.4615 8.62659 18.7676C11.9582 20.6876 17.3347 10.2123 19.5427 12.899C20.8453 14.4822 16.2674 17.9913 17.4862 19.7373C18.3221 20.9346 20.1133 19.7937 21.2468 18.7714"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CommentGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M21.75 12C21.75 6.84375 17.9583 3.75 12 3.75C6.04167 3.75 2.25 6.84375 2.25 12C2.25 13.3368 3.17054 15.6055 3.3145 15.9522C3.32742 15.9833 3.34021 16.0117 3.3518 16.0433C3.45089 16.3136 3.85722 17.7527 2.25 19.8828C4.41667 20.914 6.71766 19.2188 6.71766 19.2188C8.30963 20.0597 10.2038 20.25 12 20.25C17.9583 20.25 21.75 17.1562 21.75 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="round"
    />
  </svg>
);

const PromptGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M3.75 5C3.33579 5 3 5.33579 3 5.75C3 6.16421 3.33579 6.5 3.75 6.5H20.25C20.6642 6.5 21 6.16421 21 5.75C21 5.33579 20.6642 5 20.25 5H3.75Z" fill="currentColor" />
    <path d="M17.6708 10.1646C17.5438 9.9105 17.2841 9.75 17 9.75C16.7159 9.75 16.4562 9.9105 16.3292 10.1646L14.941 12.941L12.1646 14.3292C11.9105 14.4562 11.75 14.7159 11.75 15C11.75 15.2841 11.9105 15.5438 12.1646 15.6708L14.941 17.059L16.3292 19.8354C16.4562 20.0895 16.7159 20.25 17 20.25C17.2841 20.25 17.5438 20.0895 17.6708 19.8354L19.059 17.059L21.8354 15.6708C22.0895 15.5438 22.25 15.2841 22.25 15C22.25 14.7159 22.0895 14.4562 21.8354 14.3292L19.059 12.941L17.6708 10.1646Z" fill="currentColor" />
    <path d="M3.75 11.25C3.33579 11.25 3 11.5858 3 12C3 12.4142 3.33579 12.75 3.75 12.75H9.25C9.66421 12.75 10 12.4142 10 12C10 11.5858 9.66421 11.25 9.25 11.25H3.75Z" fill="currentColor" />
    <path d="M3.75 17.5C3.33579 17.5 3 17.8358 3 18.25C3 18.6642 3.33579 19 3.75 19H7.25C7.66421 19 8 18.6642 8 18.25C8 17.8358 7.66421 17.5 7.25 17.5H3.75Z" fill="currentColor" />
  </svg>
);

const CopyGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M7.75 7.75V4.75C7.75 4.19772 8.19772 3.75 8.75 3.75H19.25C19.8023 3.75 20.25 4.19772 20.25 4.75V15.26C20.25 15.8123 19.8023 16.26 19.25 16.26H16.25M3.75 8.75V19.25C3.75 19.8023 4.19772 20.25 4.75 20.25H15.25C15.8023 20.25 16.25 19.8023 16.25 19.25V8.75C16.25 8.19772 15.8023 7.75 15.25 7.75H4.75C4.19772 7.75 3.75 8.19772 3.75 8.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" />
  </svg>
);

/* A caret used inside the details header; the source uses a down chevron that
   spins when its section collapses. */
const CollapseGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M5.75 9.5L12 15.75L18.25 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VideoGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M2.75 5.75C2.75 5.19771 3.19772 4.75 3.75 4.75H14.25C14.8023 4.75 15.25 5.19772 15.25 5.75V18.25C15.25 18.8023 14.8023 19.25 14.25 19.25H3.75C3.19772 19.25 2.75 18.8023 2.75 18.25V5.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M15.25 10L20.5264 7.3618C20.8588 7.19558 21.25 7.43733 21.25 7.80902V16.191C21.25 16.5627 20.8588 16.8044 20.5264 16.6382L15.25 14V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const RecreateGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M19.25 7.75C19.25 7.19772 18.8023 6.75 18.25 6.75H9.75C9.19772 6.75 8.75 7.19772 8.75 7.75V20.25C8.75 20.8023 9.19772 21.25 9.75 21.25H18.25C18.8023 21.25 19.25 20.8023 19.25 20.25V7.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15.25 6.75V3.75C15.25 3.19772 14.8023 2.75 14.25 2.75H5.75C5.19772 2.75 4.75 3.19772 4.75 3.75V16.25C4.75 16.8023 5.19772 17.25 5.75 17.25H8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* Reference shares a picture into a new prompt; share lifts the asset out of
   its frame. Both are line icons drawn to sit beside the catalogue above. */
const ReferenceGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M3.75 6.75C3.75 6.19772 4.19772 5.75 4.75 5.75H19.25C19.8023 5.75 20.25 6.19772 20.25 6.75V17.25C20.25 17.8023 19.8023 18.25 19.25 18.25H4.75C4.19772 18.25 3.75 17.8023 3.75 17.25V6.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3.75 14.75L7.75 10.75M7.75 10.75L11.5 14.5M7.75 10.75L16.75 10.75M16.75 10.75L20.25 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="15.5" cy="8.75" r="1.25" fill="currentColor" />
  </svg>
);

const ShareGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 14.75V3.75M12 3.75L8.5 7.25M12 3.75L15.5 7.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.75 12.75V18.25C5.75 18.8023 6.19772 19.25 6.75 19.25H17.25C17.8023 19.25 18.25 18.8023 18.25 18.25V12.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20.25 14.75V19.25C20.25 19.8023 19.8023 20.25 19.25 20.25H4.75C4.19772 20.25 3.75 19.8023 3.75 19.25V14.75M12 15V3.75M12 15L8.5 11.5M12 15L15.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* The bottom-right media control that widens the stage. Mirrors the showcase's
   own corner affordance; only image and video carry it, audio has no frame to
   enlarge so it is never rendered for a sound. */
const MediaExpandGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M5.5 12.5v5a1 1 0 0 0 1 1h5m1-13h5a1 1 0 0 1 1 1v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* The video 편집 tab's centre workbench (timeline · clip tools) and its rail
   inspector (caption track · clip properties) stand in video-edit.tsx. */

const HeartGlyph = ({ filled }: { filled?: boolean }) => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5.57193C18.3331 -0.86765 29.1898 11.0916 12 20.75C-5.18982 11.0916 5.66687 -0.867651 12 5.57193Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill={filled ? "currentColor" : "none"}
    />
  </svg>
);

const PlusGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M12 5.25V12m0 0v6.75M12 12H5.25M12 12h6.75" />
  </svg>
);

const HideGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21.769 11.552c-4.841-9.07-14.697-9.07-19.538 0a.96.96 0 0 0 0 .896c4.841 9.07 14.697 9.07 19.538 0a.96.96 0 0 0 0-.896" />
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.25 12a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0" />
  </svg>
);

const WorkGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path fill="currentColor" d="M12.25 3h-.5A1.75 1.75 0 0 0 10 4.75v.5c0 .966.784 1.75 1.75 1.75h.5A1.75 1.75 0 0 0 14 5.25v-.5A1.75 1.75 0 0 0 12.25 3M12.25 10h-.5A1.75 1.75 0 0 0 10 11.75v.5c0 .966.784 1.75 1.75 1.75h.5A1.75 1.75 0 0 0 14 12.25v-.5A1.75 1.75 0 0 0 12.25 10M12.25 17h-.5A1.75 1.75 0 0 0 10 18.75v.5c0 .966.784 1.75 1.75 1.75h.5A1.75 1.75 0 0 0 14 19.25v-.5A1.75 1.75 0 0 0 12.25 17" />
  </svg>
);

const SearchGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20.25 20.25L16.1265 16.1265M16.1265 16.1265C17.4385 14.8145 18.25 13.002 18.25 11C18.25 6.99594 15.0041 3.75 11 3.75C6.99594 3.75 3.75 6.99594 3.75 11C3.75 15.0041 6.99594 18.25 11 18.25C13.002 18.25 14.8145 17.4385 16.1265 16.1265Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FilterGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M2.75 4.75H21.25M8.75 19.25H15.25M5.75 12H18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MarkGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2.76v-.01m0 18.49v.01m3.536-17.786.004-.01M8.464 20.536l-.004.01m10.074-15.08.007-.007M5.467 18.534l-.008.007M20.536 8.464l.01-.004M3.464 15.536l-.01.004M2.76 12h-.01m18.49 0h.01M5.467 5.466l-.008-.007m13.075 13.074.007.008M3.464 8.464l-.01-.004m17.083 7.076.01.004M8.463 3.464l-.004-.01m7.076 17.082.004.01" />
  </svg>
);

const EmojiGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M14.8287 14.8284C13.2666 16.3905 10.734 16.3905 9.17188 14.8284" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.5 9.5H15M15.25 9.5C15.25 9.77614 15.0261 10 14.75 10C14.4739 10 14.25 9.77614 14.25 9.5C14.25 9.22386 14.4739 9 14.75 9C15.0261 9 15.25 9.22386 15.25 9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    <path d="M9 9.5H9.5M9.75 9.5C9.75 9.77614 9.52614 10 9.25 10C8.97386 10 8.75 9.77614 8.75 9.5C8.75 9.22386 8.97386 9 9.25 9C9.52614 9 9.75 9.22386 9.75 9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ResolveGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 9.5L10.5 15L8.5 13M21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FreeDrawGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.855 21.25c-1.032-.26-3.16-.908-5.45-3.222C2.58 14.161 1.6 8.88 4.219 6.233 6.369 4.06 10.55 4.185 14 6.5m3.5 3.5c2.977 3.473 3.86 6.797 1.575 8.644-1.71 1.383-3.876-.217-5.14-1.45M10.75 13.25h2.853a1 1 0 0 0 .708-.294l6.484-6.495a1 1 0 0 0 0-1.414l-1.838-1.84a1 1 0 0 0-1.415 0l-6.5 6.5a1 1 0 0 0-.292.707z" />
  </svg>
);

const SendGlyph = () => (
  <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 20.25V4.5M5.75 10 12 3.75 18.25 10" />
  </svg>
);

type Tab = "info" | "edit" | "comment";

/** The shape the media turned out to be, or null while it has none to report. */
function shapeOf(media: HTMLImageElement | HTMLVideoElement): number | null {
  const [width, height] =
    media instanceof HTMLVideoElement
      ? [media.videoWidth, media.videoHeight]
      : [media.naturalWidth, media.naturalHeight];
  return width > 0 && height > 0 ? width / height : null;
}

export function Viewer({
  item,
  onClose,
  onReuse,
  onFavorite,
  onDownload,
  onDelete,
  onPrev,
  onNext,
  onToVideo,
  onCommentCount,
  onInpaint,
  onOutpaint,
  onApplyCrop,
  busy,
  outpaintBusy,
  inpaintStatus,
  outpaintStatus,
}: {
  item: RunRecord;
  onClose: () => void;
  onReuse: () => void;
  onFavorite: () => void;
  onDownload: () => void;
  onDelete: () => void;
  /* Absent at the ends of the scope, which is how the walk stops. */
  onPrev?: () => void;
  onNext?: () => void;
  /* Re-send this run down the video surface, with its picture as a reference. */
  onToVideo?: () => void;
  /* Reports the thread's length up so the tile bubble under it can refresh. */
  onCommentCount?: (count: number) => void;
  /* Paint a region on the editing canvas and repaint just that hole. */
  onInpaint?: (image: string, prompt: string) => void;
  /* Widen the picture outward by padding; the backend paints the new border. */
  onOutpaint?: (
    image: string,
    pads: { pad_left: number; pad_right: number; pad_top: number; pad_bottom: number },
    prompt: string,
  ) => void;
  /* Cut the picture down to the crop frame, locally, with no backend. */
  onApplyCrop?: (image: string) => void;
  busy?: boolean;
  outpaintBusy?: boolean;
  inpaintStatus?: string;
  outpaintStatus?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  /* The editing tab shows either the freehand repaint surface or, once the
     visitor picks "확장 및 자르기" from the tool card, the crop/expand editor. */
  const [editTool, setEditTool] = useState<"showcase" | "expand">("showcase");
  /* Under 768 the whole showcase collapses into the bottom sheet — the tab rail
     is never rendered there, whatever tab the desktop was on. */
  const [narrow, setNarrow] = useState(false);
  /* The sheet's primary tile swaps the picture for the editing workspace. */
  const [sheetEdit, setSheetEdit] = useState(false);
  const after = useRef(onClose);

  useEffect(() => {
    ref.current?.showModal();
    panelRef.current?.focus();
  }, []);

  /* Track the 768 breakpoint so the sheet takes over from the rail. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      setNarrow(mq.matches);
      setSheetEdit(false);
    };
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  const leave = useCallback(
    (action: () => void) => {
      if (closing) return;
      after.current = action;
      setClosing(true);
    },
    [closing],
  );

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => after.current(), EXIT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyPrompt = useCallback(() => {
    void navigator.clipboard.writeText(item.prompt).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }, [item.prompt]);

  const [w = 3, h = 2] = item.ratio.split("/").map((n) => Number.parseFloat(n));
  const [delivered, setDelivered] = useState<number | null>(null);
  /* The real delivered pixel dimensions (W × H) read off the loaded media.
     shapeOf keeps only the ratio, so this parallel capture is what the info
     tab's resolution tier and size line are allowed to trust. */
  const [dims, setDims] = useState<readonly [number, number] | null>(null);
  const [shown, setShown] = useState(item.id);
  /* The image reference's "use as next" card, open by its own centred plate. */
  const [useNextOpen, setUseNextOpen] = useState(false);
  /* The video editor's caption track. The centre timeline lane and the rail's
     inspector read and write the same list, so one owner keeps them in step. */
  const [captions, setCaptions] = useState<CaptionSeg[]>(SEED_CAPTIONS);
  if (shown !== item.id) {
    setShown(item.id);
    setDelivered(null);
    setDims(null);
    setCopied(false);
    setTab("info");
    setEditTool("showcase");
    setUseNextOpen(false);
    setCaptions(SEED_CAPTIONS);
  }
  const kind = item.kind;
  /* 오디오 has no 편집 tab in HF's showcase, so a stale "edit" tab can never be
     shown here — fall back to the info tab if the kind collapsed under us. */
  const showTab: Tab = tab === "edit" && kind === "audio" ? "info" : tab;
  const aspect = delivered ?? w / h;
  const url = item.urls[0];
  /* The waveform the showcase draws as a hero for an audio run. Non-audio runs
     resolve to null without a fetch, so nothing here changes for images or video. */
  const wave = useAudioWaveform(item.id, url, item.kind === "audio", SHOWCASE_WAVEFORM);

  /* t_114a2802 — the image reference's "use as next". A reference showcase is the
     viewer fed a record the app derives off the attachment, and that record's id
     is tagged `ref-view-` before the attachment's own id; a finished run or an
     element wears a different prefix, so this is how the viewer tells the two
     apart without importing the showcase's own store. Only the image kind gets
     the special centred plate — video and audio references carry none. The held
     attachment is found back through the media store by its url, so choosing a
     role there re-tags the live tile behind the glass, not a detached copy. */
  const imageItems = useImageMedia((s) => s.items);
  const refImageMode = item.id.startsWith("ref-view-") && item.kind === "image";
  const refItem = refImageMode ? imageItems.find((i) => i.url === url) : undefined;

  const measure = useCallback((media: HTMLImageElement | HTMLVideoElement | null) => {
    if (!media) return;
    const shape = shapeOf(media);
    if (shape !== null) setDelivered(shape);
    /* shapeOf keeps only the ratio, so read the raw pixels here as well — the
       info tab must size and name the run by what actually decoded, not by the
       tier that was requested (which an upscale or a backend override can
       leave far below the frame that really landed). */
    const [wpx, hpx] =
      media instanceof HTMLVideoElement
        ? [media.videoWidth, media.videoHeight]
        : [media.naturalWidth, media.naturalHeight];
    if (wpx > 0 && hpx > 0) setDims([wpx, hpx]);
  }, []);

  /* The tier the real delivered pixels imply. The label follows the
     measurement, so a frame that was upscaled — or that the backend forced
     wider than the requested tier — reads as the resolution it actually is
     instead of the tier that was dialed in and then ignored. */
  const resolutionText = dims ? resolutionTierLabel(dims[0], dims[1]) : null;

  const facts: Array<[string, string]> = item.settings
    ? Object.entries(item.settings).map(([key, value]) => [
        settingLabel(key),
        key === "resolution" && resolutionText
          ? resolutionText
          : settingValueLabel(key, value),
      ])
    : item.meta
      ? [["Output", item.meta]]
      : [];

  /* The ⋯ menu the studio reuses: every overflow action the run can take. */
  const menuItems: MenuItem[] = [
    { id: "copy", label: "프롬프트 복사", onSelect: copyPrompt },
    { id: "recreate", label: "다시 만들기", onSelect: () => leave(onReuse) },
    {
      id: "video",
      label: "영상으로 전환",
      onSelect: () => leave(onToVideo ?? onReuse),
      disabled: !onToVideo,
      dividerBefore: true,
    },
    {
      id: "fav",
      label: item.favorite ? "좋아요 취소" : "좋아요",
      onSelect: onFavorite,
    },
    {
      id: "download",
      label: "다운로드",
      onSelect: onDownload,
    },
    {
      id: "delete",
      label: "삭제",
      onSelect: () => leave(onDelete),
      danger: true,
      dividerBefore: true,
    },
  ];

  /* The mobile sheet's overflow keeps only the three sheet actions Higgsfield
     shows there: share (with its sub-menu), report and delete. The desktop rail
     keeps the full list above untouched. Share and report are shown for now;
     their handlers are placeholders until OH grows those features. */
  const mobileMenuItems: MenuItem[] = [
    {
      id: "share",
      label: "공유",
      onSelect: () => {},
      children: [
        { id: "share-link", label: "링크 복사", onSelect: () => {} },
        { id: "share-image", label: "이미지 복사", onSelect: () => {} },
        { id: "share-x", label: "X로 공유", onSelect: () => {} },
      ],
    },
    { id: "report", label: "보고서", onSelect: () => {}, dividerBefore: true },
    {
      id: "delete",
      label: "삭제",
      onSelect: () => leave(onDelete),
      danger: true,
      dividerBefore: true,
    },
  ];

  /* The size line Higgsfield prints reads "1536x2048"; the run carries its
      output as "W × H", so fold the multiplication sign into a plain x. When
      the media has decoded, the measured pixels are the ground truth and win
      over the requested ratio, which is only a guess about the frame. */
  const sizeText = dims
    ? `${dims[0]}x${dims[1]}`
    : item.meta && /\d+\s*[×x]\s*\d+/.test(item.meta)
      ? item.meta.replace(/\s*[×x]\s*/g, "x")
      : `${Math.round(w * 256)}x${Math.round(h * 256)}`;

  /* Wall-clock seconds the run took, recorded on completed rows. Shown in the
     details body so past runtimes inform future predictions. */
  const durationText =
    typeof item.durationSeconds === "number" ? `${item.durationSeconds} s` : null;

  return (
    <dialog
      ref={ref}
      aria-label={`에셋 쇼케이스 — ${item.modelLabel}`}
      aria-description={SHOWCASE_DESCRIPTION}
      className="ohf-viewer"
      data-closing={closing || undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        leave(onClose);
      }}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLVideoElement) return;
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        const step = event.key === "ArrowLeft" ? onPrev : onNext;
        if (!step || closing) return;
        event.preventDefault();
        step();
      }}
    >
      <div ref={panelRef} tabIndex={-1} className="ohf-dialog-panel ohf-viewer-panel"
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget) after.current();
        }}>
        {narrow ? (
          <div className="ohf-viewer-frame ohf-mshow-frame">
            <header className="ohf-mshow-head">
              <div className="ohf-mshow-head-left" />
              <button type="button" className="ohf-mshow-close" aria-label="닫기" onClick={() => leave(onClose)}>
                <CloseGlyph />
              </button>
            </header>
            <div className="ohf-mshow-body">
              <div className="ohf-mshow-image-block">
                {sheetEdit && url ? (
                  <div className="ohf-mshow-edit">
                    <ImageWorkspace url={toProxyImageUrl(url)} />
                  </div>
                ) : (
                  <div
                    className="ohf-mshow-image-inner"
                    style={{
                      backgroundImage:
                        url && item.kind !== "audio" ? `url("${toProxyImageUrl(url)}")` : undefined,
                    }}
                  >
                    {url ? (
                      item.kind === "audio" ? (
                        /* A finished clip has no frame to fill the block — it is
                           the sound itself, so the narrow sheet shows a plain
                           player over the art. The raw url plays here without a
                           proxy because audio needs no CORS preflight. When a
                           waveform could be built it fills the block as the hero
                           and the player rides at the bottom of it; when it could
                           not, the sheet falls back to the plain player, never a
                           broken image. */
                        <>
                          {wave && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              className="ohf-mshow-wave"
                              src={wave}
                              alt="파형"
                              draggable={false}
                            />
                          )}
                          <audio className="ohf-mshow-audio" src={url} controls preload="metadata" />
                        </>
                      ) : item.kind === "video" ? (
                        <video className="ohf-mshow-media" src={url} controls autoPlay loop playsInline />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img className="ohf-mshow-media" src={toProxyImageUrl(url)} alt="원본 미디어 이미지" />
                      )
                    ) : (
                      <span className="ohf-grain" />
                    )}
                  </div>
                )}
              </div>
              <div className="ohf-mshow-sheet">
                <div className="ohf-mshow-handle" aria-hidden><span className="ohf-mshow-handle-bar" /></div>
                <div className="ohf-mshow-tiles ohf-mshow-tiles--flow">
                  <button type="button" className="ohf-mshow-tile ohf-mshow-tile--primary" onClick={() => setSheetEdit((v) => !v)}>
                    <EditGlyph />이미지 편집
                  </button>
                  <button type="button" className="ohf-mshow-tile" onClick={() => leave(onReuse)}>
                    <RecreateGlyph />다시 만들기
                  </button>
                  <button type="button" className="ohf-mshow-tile" onClick={() => leave(onToVideo ?? onReuse)} disabled={!onToVideo} aria-disabled={!onToVideo || undefined}>
                    <VideoGlyph />영상 만들기
                  </button>
                </div>
                <div className="ohf-mshow-tiles ohf-mshow-tiles--3">
                  <button type="button" className="ohf-mshow-tile" aria-pressed={item.favorite === true} onClick={onFavorite}>
                    <HeartGlyph />즐겨찾기
                  </button>
                  <button type="button" className="ohf-mshow-tile" onClick={() => onDownload()}>
                    <DownloadGlyph />다운로드
                  </button>
                  <MoreMenu items={mobileMenuItems} label="더 보기" />
                </div>
                <div className="ohf-mshow-info">
                  <section className="ohf-mshow-prompt">
                    <div className="ohf-mshow-prompt-head">
                      <h3>프롬프트</h3>
                      <button type="button" className="ohf-mshow-prompt-copy" onClick={copyPrompt} aria-label="프롬프트 복사">
                        {copied ? <CheckIcon size={12} /> : <CopyGlyph />}
                        <span>{copied ? "복사됨" : "복사"}</span>
                      </button>
                    </div>
                    <div className="ohf-mshow-prompt-value"><p>{item.prompt}</p></div>
                  </section>
                  <div className="ohf-mshow-details">
                    <div className="ohf-mshow-detail"><span>모델</span><span>{item.modelLabel}</span></div>
                    {facts.map(([label, value]) => (
                      <div className="ohf-mshow-detail" key={label}><span>{label}</span><span>{value}</span></div>
                    ))}
                    <div className="ohf-mshow-detail"><span>크기</span><span>{sizeText}</span></div>
                    <div className="ohf-mshow-detail"><span>생성됨</span><span>{CREATED.format(item.createdAt)}</span></div>
                    {durationText && (
                      <div className="ohf-mshow-detail"><span>Generation Duration</span><span>{durationText}</span></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Higgsfield paints the asset itself, blown up and blurred, behind the
                whole showcase; OH lays the same backdrop down first. */}
            <div className="ohf-viewer-backdrop" aria-hidden>
          {url && (
            <img alt="" draggable={false} className="ohf-viewer-backdrop-img" src={toProxyImageUrl(url)} />
          )}
        </div>

        <div className="ohf-viewer-frame">
          {/* Under the edit tab a narrow strip of edit-history thumbnails stands
              to the left of the canvas, snapping in order; the active step wears a
              lime ring. We hold only the original so far. */}
          {showTab === "edit" && kind === "image" && (
            <div className="ohf-viewer-edit-history">
              <aside className="ohf-viewer-edit-history-inner">
                <ul aria-label="편집 기록" className="ohf-viewer-edit-history-list">
                  <li className="ohf-viewer-edit-history-item">
                    <button
                      type="button"
                      aria-label="Original"
                      aria-pressed="true"
                      className="ohf-viewer-edit-history-thumb"
                    >
                      <span
                        aria-hidden
                        data-selected="true"
                        className="ohf-viewer-edit-history-ring"
                      />
                      <span className="ohf-viewer-edit-history-face">
                        {url && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img className="ohf-viewer-edit-history-img" src={toProxyImageUrl(url)} alt="" />
                        )}
                      </span>
                    </button>
                  </li>
                </ul>
              </aside>
            </div>
          )}
          {/* The stage: the asset shown whole. Clicking its empty ground closes. */}
          <div
            className="ohf-viewer-stage"
            onClick={(event) => {
              if (event.target === event.currentTarget) leave(onClose);
            }}
          >
            {tab !== "edit" && (
            <div className="ohf-viewer-media-wrap">
              <figure
                id="showcase-asset-media"
                className="ohf-viewer-figure"
                data-shaped={delivered !== null || undefined}
                style={{
                  aspectRatio: String(aspect),
                  maxWidth: "100%",
                  maxHeight: "100%",
                  "--a": aspect.toFixed(4),
                } as React.CSSProperties}
              >
                <span className="ohf-viewer-art" style={{ background: item.art }} />
                {url ? (
                  item.kind === "audio" ? (
                    /* Same reasoning as the narrow sheet: the finished clip is the
                       media, shown over the run's art, and it streams straight from
                       the raw gradio url the run stored. When a waveform could be
                       built it stands as the hero above the player; when it could
                       not, the card falls back to the plain centered player it had,
                       never a broken image. */
                    wave ? (
                      <div className="ohf-viewer-audio-stack">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="ohf-viewer-wave"
                          src={wave}
                          alt="파형"
                          draggable={false}
                        />
                        <audio className="ohf-viewer-audio" src={url} controls preload="metadata" />
                      </div>
                    ) : (
                      <audio className="ohf-viewer-audio" src={url} controls preload="metadata" />
                    )
                  ) : item.kind === "video" ? (
                    <video
                      ref={measure}
                      className="ohf-viewer-media"
                      src={url}
                      controls
                      autoPlay
                      loop
                      playsInline
                      onLoadedMetadata={(event) => measure(event.currentTarget)}
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      ref={measure}
                      className="ohf-viewer-media"
                      src={toProxyImageUrl(url)}
                      alt="원본 미디어 이미지"
                      onLoad={(event) => measure(event.currentTarget)}
                    />
                  )
                ) : (
                  <span className="ohf-grain" />
                )}
                {refImageMode && url && (
                  /* The image reference's centred plate — the one control HF's
                     image showcase hides at the centre. It is a real button, so a
                     pointer and the two keys a button answers to both raise the
                     card; clicking the empty ground still closes the dialog. */
                  <button
                    type="button"
                    className="ohf-ref-next-plate"
                    onClick={() => setUseNextOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setUseNextOpen(true);
                      }
                    }}
                    aria-label="다음으로 사용"
                    title="이 이미지를 다음 생성의 입력으로"
                  >
                    <span className="ohf-ref-next-plate-text">다음으로 사용</span>
                  </button>
                )}
              </figure>
              {/* The bottom-right corner cluster rides on the media itself rather than
                  the stage chrome, and it trims itself per asset type: an audio asset
                  has no frame to widen, so its 미디어 보기 확장 is dropped, leaving just
                  댓글 추가하기. Image and video keep both controls. */}
              <div className="ohf-viewer-media-bottom" data-kind={kind}>
                <button
                  type="button"
                  className="ohf-viewer-media-bottom-btn"
                  aria-label="댓글 추가하기"
                  onClick={() => setTab("comment")}
                >
                  <CommentGlyph />
                </button>
                {kind !== "audio" && (
                  <button
                    type="button"
                    className="ohf-viewer-media-bottom-btn"
                    aria-label="미디어 보기 확장"
                    aria-disabled="true"
                    title="미디어 보기 확장은 이 빌드에서 아직 경로가 없습니다"
                  >
                    <MediaExpandGlyph />
                  </button>
                )}
              </div>
              {refImageMode && useNextOpen && refItem && (
                <ReferenceUseNextPopover
                  currentRole={refItem.role}
                  onPick={(role) => useImageMedia.getState().setRole(refItem.id, role)}
                  onClose={() => setUseNextOpen(false)}
                />
              )}
            </div>
            )}
            {showTab === "edit" && kind === "image" && (
              <EditShowcase
                url={toProxyImageUrl(url)}
                aspect={aspect}
                modelLabel="Krea 2 Turbo"
                onInpaint={onInpaint}
                busy={!!busy}
                status={inpaintStatus}
              />
            )}
            {/* A video's 편집 tab is HF's timeline workbench — the clip, the
                timeline lane with its playhead and trim handles, the caption lane
                and the row of clip tools docked under it all stand here. */}
            {showTab === "edit" && kind === "video" && (
              <VideoEditor url={url} captions={captions} />
            )}
            <h2 className="ohf-viewer-heading" hidden>에셋 쇼케이스</h2>
            <p className="ohf-viewer-describe" hidden>{item.id} 에셋 상세 정보</p>
          </div>

          {/* The showcase's right rail: a glass card carrying the author, the
              three tabs, the asset's facts and the row of run actions. */}
          <section className="ohf-viewer-side">
            <div className="ohf-viewer-rail" data-tour-anchor="tour-asset-sidebar">
              <header className="ohf-viewer-rail-head">
                <div className="ohf-viewer-author">
                  <button
                    type="button"
                    className="ohf-viewer-avatar"
                    aria-label={`${LOCAL_USER.handle} 프로필 열기`}
                    aria-disabled="true"
                  >
                    <figure className="ohf-viewer-avatar-figure">
                      <span className="ohf-viewer-avatar-monogram">{LOCAL_USER.initial}</span>
                    </figure>
                  </button>
                  <div className="ohf-viewer-author-meta">
                    <button
                      type="button"
                      className="ohf-viewer-author-name"
                      aria-label={`${LOCAL_USER.handle} 프로필 열기`}
                      aria-disabled="true"
                    >
                      {LOCAL_USER.handle}
                    </button>
                    <p className="ohf-viewer-author-role">{LOCAL_USER.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ohf-viewer-rail-close"
                  aria-label="닫기"
                  onClick={() => leave(onClose)}
                >
                  <CloseGlyph />
                </button>
              </header>

              <div className="ohf-viewer-tabs" role="tablist" aria-label="에셋 쇼케이스 탭">
                {(() => {
                  /* 오디오 has no 편집 tab in HF's showcase — the rail shows only
                     info and 댓글 for a sound, so the strip differs by asset type. */
                  const defs =
                    kind === "audio"
                      ? ([
                          { id: "info", text: "Info", glyph: <InfoGlyph /> },
                          { id: "comment", text: "댓글", glyph: <CommentGlyph /> },
                        ] as const)
                      : ([
                          { id: "info", text: "Info", glyph: <InfoGlyph /> },
                          { id: "edit", text: "편집", glyph: <EditGlyph /> },
                          { id: "comment", text: "댓글", glyph: <CommentGlyph /> },
                        ] as const);
                  const idx = defs.findIndex((d) => d.id === showTab);
                  return (
                    <>
                      {defs.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          aria-selected={showTab === t.id}
                          className={`ohf-viewer-tab${showTab === t.id ? " ohf-viewer-tab--on" : ""}`}
                          onClick={() => setTab(t.id)}
                        >
                          <span className="ohf-viewer-tab-icon">{t.glyph}</span>
                          <span className="ohf-viewer-tab-label">{t.text}</span>
                        </button>
                      ))}
                      <span
                        className="ohf-viewer-tab-indicator"
                        aria-hidden
                        style={{
                          width: `${100 / defs.length}%`,
                          transform: `translateX(${idx * 100}%)`,
                        }}
                      />
                    </>
                  );
                })()}
              </div>

              <div className="ohf-viewer-rail-body">
                {tab === "info" && (
                  <div className="ohf-viewer-info">
                    <section className="ohf-viewer-prompt-block">
                      <div className="ohf-viewer-prompt-head">
                        <span className="ohf-viewer-prompt-icon"><PromptGlyph /></span>
                        <p className="ohf-viewer-prompt-title">프롬프트</p>
                        <button
                          type="button"
                          className="ohf-viewer-prompt-copy"
                          onClick={copyPrompt}
                          aria-label="프롬프트 복사"
                        >
                          {copied ? <CheckIcon size={12} /> : <CopyGlyph />}
                          <span>{copied ? "복사됨" : "복사"}</span>
                        </button>
                      </div>
                      <div className="ohf-viewer-prompt-value">
                        <p>{item.prompt}</p>
                      </div>
                    </section>

                    <section className="ohf-viewer-details">
                      <div className="ohf-viewer-details-head">
                        <span className="ohf-viewer-details-icon"><InfoGlyph /></span>
                        <p className="ohf-viewer-details-title">세부 정보</p>
                        <span className="ohf-viewer-details-caret"><CollapseGlyph /></span>
                      </div>
                      <div className="ohf-viewer-details-body">
                        <div className="ohf-viewer-detail" role="Model">
                          <p className="ohf-viewer-detail-key">모델</p>
                          <p className="ohf-viewer-detail-val">{item.modelLabel}</p>
                        </div>
                        {facts.map(([label, value]) => (
                          <div className="ohf-viewer-detail" key={label}>
                            <p className="ohf-viewer-detail-key">{label}</p>
                            <p className="ohf-viewer-detail-val">{value}</p>
                          </div>
                        ))}
                        <div className="ohf-viewer-detail" role="Size">
                          <p className="ohf-viewer-detail-key">크기</p>
                          <p className="ohf-viewer-detail-val">{sizeText}</p>
                        </div>
                        <div className="ohf-viewer-detail" role="CreatedAt">
                          <p className="ohf-viewer-detail-key">생성됨</p>
                          <p className="ohf-viewer-detail-val">{CREATED.format(item.createdAt)}</p>
                        </div>
                        {durationText && (
                          <div className="ohf-viewer-detail" role="Duration">
                            <p className="ohf-viewer-detail-key">Generation Duration</p>
                            <p className="ohf-viewer-detail-val">{durationText}</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {showTab === "edit" && kind === "image" && (
                  <div className="ohf-viewer-edit">
                    <EditToolsCard onOpenExpandCrop={() => setEditTool("expand")} />
                    <section className="ohf-viewer-layers">
                      <div className="ohf-viewer-layers-head">
                        <span className="ohf-viewer-layers-icon"><HideGlyph /></span>
                        <span className="ohf-viewer-layers-title">Layers</span>
                        <button
                          type="button"
                          className="ohf-viewer-layers-add"
                          aria-label="레이어 추가"
                          aria-haspopup="menu"
                          aria-expanded="false"
                          aria-disabled="true"
                        >
                          <PlusGlyph />
                        </button>
                      </div>
                      <div className="ohf-viewer-layers-list">
                        <div className="ohf-viewer-layer" data-state="closed">
                          <span className="ohf-viewer-layer-thumb">
                            {url && <img alt="" className="ohf-viewer-layer-thumb-img" src={toProxyImageUrl(url)} />}
                          </span>
                          <button type="button" aria-pressed="false" className="ohf-viewer-layer-name">Base</button>
                          <div className="ohf-viewer-layer-acts">
                            <button type="button" className="ohf-viewer-layer-hide" aria-label="레이어 숨기기" aria-disabled="true">
                              <HideGlyph />
                            </button>
                            <button type="button" className="ohf-viewer-layer-work" aria-label="레이어 작업" aria-haspopup="menu" aria-expanded="false" aria-disabled="true">
                              <WorkGlyph />
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* A video's 편집 rail holds the residual editing panel: the caption
                    track and the clip-property inspector (video-edit.tsx). */}
                {showTab === "edit" && kind === "video" && <VideoEditRail captions={captions} onCaptions={setCaptions} />}

                {showTab === "comment" && (
                  <CommentPanel runId={item.id} kind={kind} onCount={onCommentCount} />
                )}
              </div>

              {/* The foot under the rail changes with the tab the way the source
                  changes it: comments clear it and hand the footer to the thread's
                  composer, info spreads the run's whole set of moves with a
                  prominent send-to-video, and editing keeps the three the source
                  pins to the rail. */}
              {showTab !== "comment" && (
                <div className="ohf-viewer-rail-foot" data-tab={showTab} data-kind={kind}>
                  {showTab === "info" ? (
                    kind === "audio" ? (
                      /* HF's audio foot (the kp set off rdUc6zfL2zX8Fqj0.js): 다시
                         만들기 wears the accent as the primary and 다운로드 sits
                         beside it as a secondary tile — three columns each on the
                         first row — while 좋아요 · 공유 · ⋯ split the second row two
                         columns each. So the audio foot stands its five buttons as
                         the rail's own grid children: the foot-row wrapper the image
                         and the video use would drop the download onto a row of its
                         own instead of the accent's, which is exactly the placement
                         the source keeps on one line. */
                      <>
                        <button
                          type="button"
                          className="ohf-viewer-act-recreate"
                          onClick={onReuse}
                        >
                          <RecreateGlyph />
                          <span>다시 만들기</span>
                        </button>
                        <button
                          type="button"
                          className="ohf-viewer-act-download"
                          onClick={() => onDownload()}
                        >
                          <DownloadGlyph />
                          <span>다운로드</span>
                        </button>
                        <button
                          type="button"
                          className="ohf-viewer-act-like"
                          aria-pressed={item.favorite === true}
                          aria-label="좋아요"
                          onClick={onFavorite}
                        >
                          <HeartGlyph filled={item.favorite === true} />
                        </button>
                        <button
                          type="button"
                          className="ohf-viewer-act-share"
                          aria-label="공유"
                          title="미디어 링크 복사"
                          onClick={() => void navigator.clipboard?.writeText(url).catch(() => { /* denied / non-secure context: nothing copied, title still readable */ })}
                        >
                          <ShareGlyph />
                        </button>
                        <MoreMenu
                          items={menuItems}
                          label="자세히"
                          className="ohf-viewer-act-more"
                        />
                      </>
                    ) : (
                      <>
                        {/* The full-width primary differs by asset type: an image sends
                          itself to video and a video re-runs itself — there is no
                          send-to-video for a video, so the rail's accent button
                          changes with the kind. (A sound keeps its own foot above.) */}
                      {kind === "image" ? (
                        <button
                          type="button"
                          className="ohf-viewer-act-video"
                          onClick={onToVideo ?? onReuse}
                          disabled={!onToVideo}
                        >
                          <VideoGlyph />
                          <span>영상으로 전환</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ohf-viewer-act-recreate"
                          onClick={onReuse}
                        >
                          <RecreateGlyph />
                          <span>다시 만들기</span>
                        </button>
                      )}
                      {/* The secondary set carries the reference and download moves
                          for both kinds here, and a video never repeats the recreate
                          that already sits as its primary. (A sound's own foot keeps
                          its reactions on the grid above.) */}
                      <div className="ohf-viewer-foot-row">
                        <button
                          type="button"
                          className="ohf-viewer-act-reference"
                          aria-disabled="true"
                          title="레퍼런스는 이 빌드에서 아직 경로가 없습니다"
                        >
                          <ReferenceGlyph />
                          <span>레퍼런스</span>
                        </button>
                        <button
                          type="button"
                          className="ohf-viewer-act-download"
                          onClick={() => onDownload()}
                        >
                          <DownloadGlyph />
                          <span>다운로드</span>
                        </button>
                        <button
                          type="button"
                          className="ohf-viewer-act-like"
                          aria-pressed={item.favorite === true}
                          aria-label="좋아요"
                          onClick={onFavorite}
                        >
                          <HeartGlyph filled={item.favorite === true} />
                        </button>
                        <button
                          type="button"
                          className="ohf-viewer-act-share"
                          aria-label="공유"
                          title="미디어 링크 복사"
                          onClick={() => void navigator.clipboard?.writeText(url).catch(() => { /* denied / non-secure context: nothing copied, title still readable */ })}
                        >
                          <ShareGlyph />
                        </button>
                        <MoreMenu
                          items={menuItems}
                          label="자세히"
                          className="ohf-viewer-act-more"
                        />
                      </div>
                    </>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ohf-viewer-rail-foot-download"
                        onClick={() => onDownload()}
                      >
                        <DownloadGlyph />
                        다운로드
                      </button>
                      <button
                        type="button"
                        className="ohf-viewer-rail-foot-icon"
                        aria-pressed={item.favorite === true}
                        aria-label="좋아요"
                        onClick={onFavorite}
                      >
                        <HeartGlyph />
                      </button>
                      <MoreMenu items={menuItems} label="자세히" className="ohf-viewer-rail-foot-icon" />
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
          {editTool === "expand" && url && (
            <ExpandCropEditor
              url={toProxyImageUrl(url)}
              onOutpaint={onOutpaint}
              onApplyCrop={onApplyCrop}
              busy={outpaintBusy}
              status={outpaintStatus}
              onBack={() => setEditTool("showcase")}
              onClose={() => setEditTool("showcase")}
            />
          )}
          </>
        )}
      </div>
    </dialog>
  );
}

/* The thread for one run, read from IndexedDB the way the run log is. */
function CommentPanel({
  runId,
  kind,
  onCount,
}: {
  runId: string;
  kind: "image" | "video" | "audio";
  /* Reports the thread's length up so the tile bubble under it can refresh. */
  onCount?: (count: number) => void;
}) {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadComments(runId).then((list) => {
      if (!active) return;
      setItems(list);
      onCount?.(list.length);
    });
    return () => {
      active = false;
    };
  }, [runId, onCount]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const next = await addComment(runId, draft);
    if (next) {
      setItems(next);
      setDraft("");
      onCount?.(next.length);
    }
    setBusy(false);
  }, [busy, draft, runId, onCount]);

  const del = useCallback(
    async (id: string) => {
      const next = await removeComment(runId, id);
      setItems(next);
      onCount?.(next.length);
    },
    [runId, onCount],
  );

  return (
    <section className="ohf-viewer-comments">
      <div className="ohf-viewer-comment-tools">
        <label className="ohf-viewer-comment-search">
          <span className="ohf-viewer-comment-search-icon"><SearchGlyph /></span>
          <input placeholder="검색" type="text" aria-label="댓글 검색" />
        </label>
        <button
          type="button"
          className="ohf-viewer-comment-filter"
          aria-label="댓글 필터"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-disabled="true"
        >
          <FilterGlyph />
          <span>필터</span>
        </button>
      </div>

      <div className="ohf-viewer-comment-list" role="list">
        {items === null ? (
          <p className="ohf-viewer-comment-loading">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="ohf-viewer-comment-empty">아직 댓글이 없어요</p>
        ) : (
          items.map((c, i) => (
            <div key={c.id} role="listitem" className="ohf-viewer-comment">
              <article className="ohf-viewer-comment-row">
                <span className="ohf-viewer-comment-avatar">{c.author.slice(0, 1).toUpperCase()}</span>
                <div className="ohf-viewer-comment-main">
                  <header className="ohf-viewer-comment-meta">
                    <p className="ohf-viewer-comment-author">{c.author}</p>
                    <p className="ohf-viewer-comment-when">{timeAgo(c.createdAt)}</p>
                    <span className="ohf-viewer-comment-index">#{i + 1}</span>
                  </header>
                  <p className="ohf-viewer-comment-body">{c.text}</p>
                  <div className="ohf-viewer-comment-acts">
                    <button type="button" className="ohf-viewer-comment-reply" aria-disabled="true">답장</button>
                    {/* 마크 그리는 소리를 위에 얹을 수 없으니, 오디오의 댓글에서는 마크를
                        빼고 이미지·비디오만 유지한다 — 댓글이 타입마다 다르게 렌더된다. */}
                    {kind !== "audio" && (
                      <button type="button" className="ohf-viewer-comment-mark" aria-label="마크 추가하기" aria-disabled="true"><MarkGlyph /></button>
                    )}
                    <button type="button" className="ohf-viewer-comment-emoji" aria-label="이모지 추가하기" aria-disabled="true"><EmojiGlyph /></button>
                    <button type="button" className="ohf-viewer-comment-resolve" aria-label="댓글 해결" aria-disabled="true"><ResolveGlyph /></button>
                    <button type="button" className="ohf-viewer-comment-work" aria-label="댓글 작업 열기" aria-haspopup="menu" aria-expanded="false" aria-disabled="true"><WorkGlyph /></button>
                    <button type="button" className="ohf-viewer-comment-del" aria-label="댓글 삭제" onClick={() => del(c.id)}><CloseGlyph /></button>
                  </div>
                </div>
              </article>
            </div>
          ))
        )}
      </div>

      <form className="ohf-viewer-composer" onSubmit={(e) => e.preventDefault()}>
        <textarea
          className="ohf-viewer-composer-input"
          placeholder="댓글 추가하기"
          value={draft}
          rows={1}
          name="text"
          maxLength={640}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <fieldset className="ohf-viewer-composer-bar">
          <div className="ohf-viewer-composer-tools">
            {/* 자유 그리기는 이미지에 그리는 도구다. 소리는 그릴 면이 없으니 오디오의
                작성창에서는 이 단추를 빼서 타입마다 다른 작성을 보여준다. */}
            {kind !== "audio" && (
              <button type="button" className="ohf-viewer-composer-draw" aria-label="자유 그리기" aria-disabled="true" data-asset-comment-free-draw-anchor><FreeDrawGlyph /></button>
            )}
            <button type="button" className="ohf-viewer-composer-emoji" aria-label="이모지 추가하기" aria-disabled="true"><EmojiGlyph /></button>
          </div>
          <button
            type="submit"
            className="ohf-viewer-composer-send"
            aria-label="댓글 등록"
            onClick={() => void submit()}
            disabled={busy || !draft.trim()}
          >
            <SendGlyph />
          </button>
        </fieldset>
      </form>
    </section>
  );
}
