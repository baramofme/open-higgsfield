"use client";

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { Surface } from "@/generation/catalog";
import { dayKey, CARD_COLS, ZOOM_COLS, ZOOM_ROW_H, type FeedLayout } from "@/generation/stores/feed";

import { swatchFor } from "./artwork";
import { CROSS_VIEWS, SAMPLES, pickSamples, type GalleryView } from "./data";
import type { ActiveRun } from "./openhiggsfield-app";
import {
  ArrowRightIcon,
  CheckIcon,
  RetryIcon,
  WarningIcon,
} from "./icons";
import { MoreMenu } from "./context-menu";
import { buildAssetMenu } from "./asset-menu";
import { timeAgo, type RunRecord } from "./history";
import { TILE_WAVEFORM, useAudioWaveform } from "./use-audio-waveform";

const EMPTY: Record<GalleryView, { title: string; hint: string }> = {
  image: {
    title: "Your image runs land here",
    hint: "Describe a subject below, pick a model, press Generate. Every finished run stays in this browser.",
  },
  video: {
    title: "Your video runs land here",
    hint: "Describe the shot below, pick a model, press Generate. Every finished run stays in this browser.",
  },
  audio: {
    title: "Your audio runs land here",
    hint: "Describe the music below, pick a model, press Generate. Each finished clip plays right in this grid.",
  },
  assets: {
    title: "Nothing generated yet",
    hint: "Image and video runs both land in this grid and stay in this browser.",
  },
  favorites: {
    title: "Nothing kept yet",
    hint: "Hover a run and press its heart to keep it here. Kept runs stay put when older ones age out of the history.",
  },
};

/* Hover-reveal glyphs, matching the icons Higgsfield rises onto the photo:
   a filled heart, a download tray, a copy pair, a picture, a film and a cube.
   The dots for ⋯ come from MoreMenu itself, so they are not re-drawn here. */
function HeartGlyph({ filled = false }: { filled?: boolean }) {
  const d =
    "M12 21s-6.7-4.3-9.3-8.1C1 10 2 6.7 5 5.6c2-.8 3.7.3 4.9 1.9L12 9l2.1-1.5c1.2-1.6 2.9-2.7 4.9-1.9 3 1.1 4 4.4 2.3 7.3C18.7 16.7 12 21 12 21z";
  return filled ? (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d={d} />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}
function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M6 9l6 6 6-6" />
      <path d="M4 21h16" />
    </svg>
  );
}
function CopyGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 5h9" />
      <path d="M5 5v9" />
    </svg>
  );
}
function ImageGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9" r="1.6" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </svg>
  );
}
function VideoGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="15" height="14" rx="2" />
      <path d="M21 8l-3 2v4l3 2z" />
    </svg>
  );
}
function CubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" />
      <path d="M12 11L4 6.5M12 11l8-4.5M12 11v9" />
    </svg>
  );
}

/* Action labels name the run they act on — tabbing a long grid otherwise
   reads as forty identical "Delete run"s. */
function shortPrompt(prompt: string): string {
  return prompt.length > 48 ? `${prompt.slice(0, 47)}…` : prompt;
}

const GRID_GAP = 14;
/** Every tile is the same 4:3 slot; media is contained so it keeps its own ratio. */
const CARD_RATIO = 4 / 3;

type Slot =
  | { key: string; kind: "run"; run: ActiveRun }
  | { key: string; kind: "item"; item: RunRecord; index: number };

function slotsOf(
  runs: ActiveRun[],
  items: RunRecord[],
  cancelingIds?: ReadonlySet<string>,
): Slot[] {
  /* A run reads as cancelling once its request id has been acknowledged for a
     cancel — whether the card came from a live skeleton or a running history
     row. Both carry a requestId, so the same check covers both sources. */
  const isCanceling = (requestId?: string): boolean =>
    Boolean(requestId && cancelingIds?.has(requestId));
  const slots: Slot[] = runs.map((run) => ({
    key: run.id,
    kind: "run",
    run: { ...run, canceling: isCanceling(run.requestId) },
  }));
  items.forEach((item, index) => {
    if (item.status === "running") {
      slots.push({
        key: item.id,
        kind: "run",
        run: {
          id: item.id,
          requestId: item.requestId,
          surface: item.surface,
          modelLabel: item.modelLabel,
          ratio: item.ratio,
          startedAt: item.createdAt,
          canceling: isCanceling(item.requestId),
        },
      });
      return;
    }
    slots.push({ key: item.id, kind: "item", item, index });
  });
  return slots;
}

function useInnerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const styles = getComputedStyle(node);
      const pad = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      setWidth(Math.max(0, node.clientWidth - pad));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/* The asset actions the tile's ⋯ menu reaches for: the ones the card itself
   already owns (open, reuse, keep, download, delete) stay on Tile's own props,
   while everything the overflow menu adds — element work, effects, sharing and
   filing under a project — arrives through this bag. */
export type TileMenuActions = {
  makeElement: (item: RunRecord, kind: "image" | "video") => void;
  assignElement: (item: RunRecord) => void;
  addEffect: (item: RunRecord, effect: string) => void;
  share: (
    item: RunRecord,
    target: "link" | "x" | "whatsapp" | "pinterest" | "linkedin",
  ) => void;
  moveToProject: (item: RunRecord, projectId: string) => void;
  newProject: (item: RunRecord) => void;
  /** The projects a run can be filed into, listed for the 폴더에 추가 submenu. */
  projects: () => { id: string; label: string }[];
};

const Tile = memo(function Tile({
  item,
  index,
  fresh,
  picked,
  selecting,
  viewed,
  commentCount,
  onOpen,
  onShowFailure,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onToVideo,
  onDelete,
  menuActions,
}: {
  item: RunRecord;
  index: number;
  fresh: boolean;
  picked: boolean;
  /* Once anything is picked the grid is in selection mode: every checkbox
     stands, and the card body toggles rather than opens. */
  selecting: boolean;
  /* Marks the run the viewer last opened — HF shows the “마지막 조회” overlay on
     exactly that asset, so the tile carries the flag rather than guessing. */
  viewed: boolean;
  /* The run's comment thread length, shown in the bottom-left speech bubble the
     way Higgsfield counts them on the hovered photo. */
  commentCount: number;
  onOpen: (id: string) => void;
  /* Opens the failure-detail dialog for a run that ended failed. The media viewer
     cannot show a run with no output, so failed cards reach their details through
     this callback rather than onOpen. */
  onShowFailure: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => void;
  onToVideo: (item: RunRecord) => void;
  onDelete: (item: RunRecord) => void;
  menuActions: TileMenuActions;
}) {
  const poster = item.urls[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  const named = shortPrompt(item.prompt);
  /* The waveform the card shows in place of the bare player. Unconditional so
     the hook sits ahead of the failed-card early return below; a run that is
     not audio (or carries no url) resolves to null without ever fetching. */
  const wave = useAudioWaveform(item.id, poster, item.kind === "audio", TILE_WAVEFORM);

  /* Top-left, where a selection mark is looked for, and the one control on the
     card that is not about this run alone. It carries the whole checkbox
     semantics rather than a pressed button: a grid of these is a multi-select,
     and a screen reader should hear it as one. */
  const picker = (
    <div
      className="ohf-pick"
      data-feed-selection-checkbox="true"
      data-ignore-marquee="true"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={picked}
        aria-label={`Select run — ${named}`}
        title={picked ? "Deselect" : "Select"}
        onClick={(event) => onPick(item.id, index, event.shiftKey)}
      >
        <span className="ohf-pick-box">
          <CheckIcon size={12} />
        </span>
      </button>
    </div>
  );

  if (item.status === "failed") {
    const failedName = shortPrompt(item.prompt);
    return (
      <div
        className="ohf-tile ohf-tile--failed"
        data-picked={picked}
        data-asset-id={item.id}
        data-asset-status={item.status}
        data-job-status={item.status}
      >
        <div className="ohf-fail">
          <span className="ohf-fail-ic">
            <WarningIcon />
          </span>
          {/* A cancelled run reuses this exact failed layout — same border, same
              icon, same Retry button — but reads as a cancel, not an error: the
              badge says who stopped it instead of blaming the model. */}
          <span className="ohf-fail-title">
            {item.cancelled ? "Cancelled by user" : `${item.modelLabel} didn’t deliver`}
          </span>
          <span className="ohf-fail-why">{item.error}</span>
          {/* The detail view is now an explicit control stacked above Retry, not
              only the stretched overlay under the card. While the grid is picking
              it toggles the selection like the card body does; otherwise it opens
              the failure record the app stored when this run died. Both it and
              Retry ride above that overlay on their own z-index (see the CSS
              `.ohf-fail .ohf-btn-solid` lift), so a press on either never reaches
              the overlay. */}
          <button
            type="button"
            className="ohf-btn-solid ohf-fail-detail"
            title="실패 상세 보기"
            onClick={(event) =>
              selecting ? onPick(item.id, index, event.shiftKey) : onShowFailure(item.id)
            }
          >
            상세보기
          </button>
          <button
            type="button"
            className="ohf-btn-solid"
            title="Reuse prompt and settings"
            onClick={() => onReuse(item)}
          >
            <RetryIcon />
            Retry this run
          </button>
        </div>
        {/* A stretched click that opens the failure record the app stored when this
            run died. Retry rides above the overlay on its own z-index, so a press
            on Retry never reaches the overlay; while the grid is picking, the body
            extends the selection instead — the same bargain a finished tile makes. */}
        <button
          type="button"
          className="ohf-tile-open ohf-fail-open"
          onClick={(event) =>
            selecting ? onPick(item.id, index, event.shiftKey) : onShowFailure(item.id)
          }
          aria-label={
            selecting
              ? `${picked ? "Deselect" : "Select"} run — ${failedName}`
              : `실패 상세 보기 — ${item.modelLabel}: ${item.prompt}`
          }
        />
        {picker}
        {/* A resting hint that the card opens a detail view, rising only on hover
            and never stealing clicks meant for the overlay beneath it. */}
        {!selecting && (
          <span className="ohf-fail-hint" aria-hidden>
            상세 보기
          </span>
        )}
      </div>
    );
  }

  return (
    /* A container, not a button: the card's own actions cannot nest inside the
       control that opens it. The stretched .ohf-tile-open carries the open. */
    <div
      className="ohf-tile"
      data-fresh={fresh}
      data-picked={picked}
      data-asset-id={item.id}
      data-asset-status={item.status}
      data-job-status={item.status}
      data-tour-asset-kind={
        item.kind === "video" ? "video" : item.kind === "audio" ? "audio" : "image"
      }
      data-ignore-marquee="true"
      onMouseEnter={() => void videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        video.currentTime = 0;
      }}
    >
      {poster &&
        (item.kind === "audio" ? (
          /* A finished audio run has no poster frame to show — it IS the sound.
             The card used to carry nothing but its own player, a bare control
             bar over the card's flat ground, which read as a generic icon. It
             now carries a waveform: the cached image fills the card as the tile
             media, and the same player the grid already had rides at the bottom
             so the clip is still audible right here. When no waveform could be
             built — the bytes refused to load, the format was unreadable — the
             image is simply absent and the card falls back to the player it had,
             so an audio tile never trades a working bar for a broken image. */
          <>
            {wave && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="ohf-tile-wave"
                src={wave}
                alt=""
                draggable={false}
                loading="eager"
                decoding="async"
                data-asset-preview={item.id}
              />
            )}
            <audio
              className="ohf-tile-audio"
              src={poster}
              controls
              preload="metadata"
              data-asset-preview={item.id}
              data-tour="asset-card"
            />
          </>
        ) : item.kind === "video" ? (
          <video
            ref={videoRef}
            className="ohf-tile-media"
            src={poster}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          /* Platform-hosted result on an arbitrary CDN host; next/image would
             need every provider domain allow-listed up front. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="ohf-tile-media"
            src={poster}
            alt="image generation"
            loading="eager"
            decoding="async"
            draggable={false}
            data-asset-preview={item.id}
            data-feed-image-source={poster}
            data-tour="asset-card"
          />
        ))}

      {/* HF leaves the picture bare at rest and answers only to the cursor: a
          scrim lifts under it and a selection ring traces the edge. */}
      <div aria-hidden className="ohf-tile-scrim" />
      <div aria-hidden className="ohf-tile-ring" />
      {/* HF marks who-liked in the top corner and keeps two empty bottom rows
          as the source's furniture. */}
      {/* HF marks who-liked in the top corner. We have no like counts or avatars,
          so the corner carries just the pressed heart whenever the run is kept —
          always on, never waiting for the cursor, the way the source's like badge
          rides the photo at rest. */}
      <div
        className="ohf-tile-liked"
        data-feed-liked-by-corner="true"
        data-ignore-marquee="true"
        aria-hidden
      >
        {item.favorite && <HeartGlyph filled />}
      </div>
      <div className="ohf-tile-footrow" data-ignore-marquee="true" />
      {/* HF flags the asset the viewer last opened with this centred label. */}
      {viewed && (
        <div className="ohf-tile-viewed" aria-hidden>
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21.7688 11.5523C16.9278 2.48263 7.0722 2.48252 2.23116 11.5522C2.0831 11.8296 2.0831 12.1702 2.23116 12.4476C7.0722 21.5173 16.9278 21.5174 21.7688 12.4477C21.9169 12.1703 21.9169 11.8297 21.7688 11.5523Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path><path d="M15.25 12C15.25 13.7949 13.7949 15.25 12 15.25C10.2051 15.25 8.75 13.7949 8.75 12C8.75 10.2051 10.2051 8.75 12 8.75C13.7949 8.75 15.25 10.2051 15.25 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
          <span className="ohf-tile-viewed-label">마지막 조회</span>
        </div>
      )}

      {/* While runs are picked the card is part of a selection, so its body
          extends the selection instead of leaving the grid for the viewer —
          the same bargain every OS file grid makes. */}
      <button
        type="button"
        className="ohf-tile-open"
        onClick={(event) =>
          selecting ? onPick(item.id, index, event.shiftKey) : onOpen(item.id)
        }
        aria-label={
          selecting
            ? `${picked ? "Deselect" : "Select"} run — ${named}`
            : `Open run — ${item.modelLabel}: ${item.prompt}`
        }
      />

      {picker}

      {/* HF tiles carry no play badge — the picture speaks for itself. */}
      {/* Keep sits last, hard against the corner: HF's tile carries no caption,
          so the run's words and facts are gone — only the delete survives. */}
      {/* Hover furniture, mirroring the icons Higgsfield rises onto a photo: a
          speech bubble bottom-left counting the run's comments, a vertical
          action column (heart · download · copy · ⋯) down the right edge, and a
          remix trio bottom-right (remake · to-video · 3D, the 3D left inert).
          They rise only on hover, so a resting card shows just the bubble. */}
      {!selecting && (
        <>
          {/* Higgsfield only raises the speech bubble when a thread exists; an
              empty run shows no bubble. */}
          {commentCount > 0 && (
            <button
              type="button"
              className="ohf-tile-comment"
              aria-label={`댓글 ${commentCount}개`}
              title="댓글 열기"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(item.id);
              }}
            >
              {commentCount}
            </button>
          )}
          <div className="ohf-tile-side">
            <button
              type="button"
              className={`ohf-tile-act${item.favorite ? " ohf-tile-act--fav" : ""}`}
              aria-label="좋아요"
              aria-pressed={item.favorite}
              title={item.favorite ? "좋아요 취소" : "좋아요"}
              onClick={(event) => {
                event.stopPropagation();
                onFavorite(item);
              }}
            >
              <HeartGlyph filled={item.favorite} />
            </button>
            <button
              type="button"
              className="ohf-tile-act"
              aria-label="다운로드"
              title="다운로드"
              onClick={(event) => {
                event.stopPropagation();
                onDownload(item);
              }}
            >
              <DownloadGlyph />
            </button>
            <button
              type="button"
              className="ohf-tile-act"
              aria-label="프롬프트 복사"
              title="프롬프트 복사"
              onClick={(event) => {
                event.stopPropagation();
                void navigator.clipboard?.writeText(item.prompt);
              }}
            >
              <CopyGlyph />
            </button>
            <MoreMenu
              className="ohf-tile-act ohf-tile-more"
              label="추가 작업"
              align="end"
              floating
              items={buildAssetMenu(item, menuActions, {
                open: onOpen,
                reuse: onReuse,
                favorite: onFavorite,
                download: onDownload,
                del: onDelete,
              })}
            />
          </div>
          <div className="ohf-tile-remix">
            <button
              type="button"
              className="ohf-tile-act"
              aria-label="이미지로 다시"
              title="이미지로 다시"
              onClick={(event) => {
                event.stopPropagation();
                onReuse(item);
              }}
            >
              <ImageGlyph />
            </button>
            <button
              type="button"
              className="ohf-tile-act"
              aria-label="비디오로 전환"
              title="비디오로 전환"
              onClick={(event) => {
                event.stopPropagation();
                onToVideo(item);
              }}
            >
              <VideoGlyph />
            </button>
            {/* The 3D scene tool is shown to match Higgsfield, but kept inert. */}
            <button
              type="button"
              className="ohf-tile-act ohf-tile-3d"
              aria-label="3D 장면 만들기"
              title="3D 장면 만들기 (지원하지 않음)"
              disabled
            >
              <CubeGlyph />
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export const Gallery = memo(function Gallery({
  view,
  surface,
  items,
  runs,
  freshIds,
  picked,
  onOpen,
  onShowFailure,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onToVideo,
  lastViewedId,
  commentCounts,
  onDelete,
  menuActions,
  onStarter,
  onCancel,
  cancelingIds,
  galleryRef,
  layout,
  splitByDate,
  cardSize,
  fit,
}: {
  view: GalleryView;
  surface: Surface;
  items: RunRecord[];
  runs: ActiveRun[];
  freshIds: string[];
  picked: ReadonlySet<string>;
  onOpen: (id: string) => void;
  /* Opens the failure-detail dialog for a run that ended failed. The media viewer
     cannot show a run with no output, so failed cards reach their details through
     this callback rather than onOpen. */
  onShowFailure: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => void;
  onToVideo: (item: RunRecord) => void;
  lastViewedId: string;
  /* Run id → comment-thread length, feeding each tile's bottom-left bubble. */
  commentCounts: Record<string, number>;
  onDelete: (item: RunRecord) => void;
  menuActions: TileMenuActions;
  onStarter: (prompt: string) => void;
  /* Fires a cancel request for a run that the backend already knows about, once
     the visitor clicks the "Cancel Request" overlay on a Rendering card. */
  onCancel?: (requestId: string) => void;
  /* requestIds whose cancel the backend has acknowledged; forwarded to the grid
     so a Rendering card whose id has arrived can swap its label. */
  cancelingIds?: ReadonlySet<string>;
  galleryRef: RefObject<HTMLDivElement | null>;
  layout: FeedLayout;
  splitByDate: boolean;
  cardSize: number;
  fit: boolean;
}) {
  const selecting = picked.size > 0;
  const panel = {
    id: "ohf-panel",
    role: "tabpanel",
    "aria-labelledby": `ohf-tab-${view}`,
    className: "ohf-gallery ohf-scroll",
  } as const;

  if (items.length === 0 && runs.length === 0) {
    return (
      <div {...panel} ref={galleryRef}>
        <Empty view={view} surface={surface} onStarter={onStarter} key={view} />
      </div>
    );
  }

  return (
    <div {...panel} ref={galleryRef}>
      <VirtualizedGrid
        key={view}
        scrollRef={galleryRef}
        selecting={selecting}
        runs={runs}
        items={items}
        freshIds={freshIds}
        picked={picked}
        onOpen={onOpen}
        onShowFailure={onShowFailure}
        onPick={onPick}
        onReuse={onReuse}
        onFavorite={onFavorite}
        onDownload={onDownload}
        onToVideo={onToVideo}
        lastViewedId={lastViewedId}
        commentCounts={commentCounts}
        onDelete={onDelete}
        menuActions={menuActions}
        layout={layout}
        splitByDate={splitByDate}
        cardSize={cardSize}
        fit={fit}
        onCancel={onCancel}
        cancelingIds={cancelingIds}
      />
    </div>
  );
});

/* The masonry and date-split layouts, computed in one place so the feed reads
   the same whether it is even or packed. The square path keeps the existing
   virtualizer; only the packed and grouped views use these plans. */

function parseRatio(value: string | undefined, fallback: number): number {
  const parts = value?.split(/[/:]/);
  const a = Number(parts?.[0]);
  const b = Number(parts?.[1]);
  if (a > 0 && b > 0) return a / b;
  return fallback;
}

/* Delivered pixels are the only thing a meta chip can carry that means width
   over height: "1280×720", the two numbers joined by a multiplication sign or
   a plain x. The loose pair the old code grabbed read a video's two chips —
   the tier and the clock, "720p · 5s" — as 720×5, and a ratio of 144 packs one
   cell at the container's full width with its height collapsed to a sliver.
   Match the pixel form, and nothing else. */
const PIXEL_SIZE = /(\d{2,5})\s*[×x*]\s*(\d{2,5})\b/i;

/* A packed row is only sane inside the band real media occupies — a 2:5
   portrait to a 5:2 panorama. Every ratio this studio offers sits inside it (9:16
   through 21:9), so the clamp never touches a true shape; it catches the misreads
   that slip through anyway, which is what the full-width slivers were. */
const MIN_ASPECT = 2 / 5;
const MAX_ASPECT = 5 / 2;

function clampAspect(value: number): number {
  return Math.min(Math.max(value, MIN_ASPECT), MAX_ASPECT);
}

function slotTime(slot: Slot): number {
  return slot.kind === "run" ? slot.run.startedAt : slot.item.createdAt;
}

/* The REAL output aspect, read from the run's recorded pixel size (`meta`
   "W × H"), the way the live feed packs by the actual image — not the nominal
   ratio the run asked for. Falls back to the ratio field, then to the surface's
   own shape, only when the size is genuinely unknown. */
function realAspect(item: RunRecord): number {
  const parts = item.meta?.match(PIXEL_SIZE);
  const w = Number(parts?.[1]);
  const h = Number(parts?.[2]);
  const value =
    w > 0 && h > 0
      ? w / h
      : parseRatio(item.ratio, item.surface === "video" || item.kind === "video" ? 16 / 9 : CARD_RATIO);
  return clampAspect(value);
}

/* Square cells are always 1:1 (the source's 정사각형); masonry uses the run's
   real aspect so a packed row shows the image at its true shape. */
function slotAspect(slot: Slot, layout: FeedLayout): number {
  if (layout === "square") return 1;
  if (slot.kind === "run")
    return clampAspect(
      parseRatio(slot.run.ratio, slot.run.surface === "video" ? 16 / 9 : 1),
    );
  return realAspect(slot.item);
}

/* A run, or — when split by date — a header row that opens a day. */
type FeedBlock =
  | { kind: "header"; key: string; time: number }
  | { kind: "tile"; key: string; slot: Slot };

/* When the split dial is on, every change of day earns a full-width header above
   its runs, the way the source groups the feed by date. */
function blocksOf(slots: Slot[], splitByDate: boolean): FeedBlock[] {
  const blocks: FeedBlock[] = [];
  let lastDay: string | null = null;
  slots.forEach((slot) => {
    if (splitByDate) {
      const day = dayKey(slotTime(slot));
      if (day !== lastDay) {
        blocks.push({ kind: "header", key: "day-" + day, time: slotTime(slot) });
        lastDay = day;
      }
    }
    blocks.push({ kind: "tile", key: slot.key, slot });
  });
  return blocks;
}

const DAY_HEADER_H = 40;

type PlannedCell = {
  block: FeedBlock;
  x: number;
  y: number;
  w: number;
  h: number;
  ratio: number;
};

/* Every tile and header gets an exact box, so the grid can be placed once rather
   than measured row by row. Square keeps even rows of COLUMNS; masonry drops each
   tile into whichever column is currently the shortest. */
function planFeed(
  blocks: FeedBlock[],
  width: number,
  layout: FeedLayout,
  cols: number,
  cardSize: number,
  fit: boolean,
): { cells: PlannedCell[]; total: number } {
  const gap = GRID_GAP;
  const boxW = width > 0 ? width : cols * 240;
  const cells: PlannedCell[] = [];

  /* 미리보기에 맞추기: every run reads at the full width of the panel, one per
     row, so a single image fills the preview. */
  if (fit) {
    let y = 0;
    blocks.forEach((block) => {
      if (block.kind === "header") {
        cells.push({ block, x: 0, y, w: boxW, h: DAY_HEADER_H, ratio: 0 });
        y += DAY_HEADER_H + gap;
        return;
      }
      const ratio = slotAspect(block.slot, layout);
      const h = width > 0 ? boxW / ratio : 240;
      cells.push({ block, x: 0, y, w: boxW, h, ratio });
      y += h + gap;
    });
    return { cells, total: y > 0 ? y - gap : 0 };
  }

  /* Masonry is the live feed's justified run: a fixed row height and each
     image's width read from its REAL aspect, packed left-to-right into a row. */
  if (layout === "masonry") {
    const rowH = ZOOM_ROW_H[cardSize] ?? 300;
    let x = 0;
    let y = 0;
    let has = false;
    let rowMaxH = 0;
    blocks.forEach((block) => {
      if (block.kind === "header") {
        if (has) {
          y += rowMaxH + gap;
          x = 0;
        }
        cells.push({ block, x: 0, y, w: boxW, h: DAY_HEADER_H, ratio: 0 });
        y += DAY_HEADER_H + gap;
        has = false;
        rowMaxH = 0;
        return;
      }
      const ratio = slotAspect(block.slot, layout);
      /* Clamp width to the container so an extreme aspect never lets a single
         cell overflow the viewport; recompute height from the clamped width so
         the tile still shows the video's native ratio. */
      const w = Math.min(rowH * ratio, boxW);
      const h = w / ratio;
      rowMaxH = Math.max(rowMaxH, h);
      if (x > 0 && x + w > boxW) {
        y += rowMaxH + gap;
        x = 0;
        rowMaxH = h;
      }
      cells.push({ block, x, y, w, h, ratio });
      x += w + gap;
      has = true;
    });
    const total = y + (has ? rowMaxH : 0);
    return { cells, total: Math.max(0, total) };
  }

  /* Square: equal 1:1 cells, a header breaking the row that precedes it. */
  const colW = width > 0 ? (boxW - gap * (cols - 1)) / cols : 240;
  const colStep = colW + gap;
  let y = 0;
  let row: FeedBlock[] = [];
  const flush = () => {
    if (row.length === 0) return;
    const top = y;
    row.forEach((block, i) =>
      cells.push({ block, x: i * colStep, y: top, w: colW, h: colW, ratio: 1 }),
    );
    y += colW + gap;
    row = [];
  };
  blocks.forEach((block) => {
    if (block.kind === "header") {
      flush();
      cells.push({ block, x: 0, y, w: boxW, h: DAY_HEADER_H, ratio: 0 });
      y += DAY_HEADER_H + gap;
      return;
    }
    row.push(block);
    if (row.length === cols) flush();
  });
  flush();
  const total = y > 0 ? y - gap : 0;
  return { cells, total };
}

/* HF's date headers read relative, not absolute: 오늘 for the calendar day the
   clock sits on, 어제 for the one before, a bare 월 일 inside the same year, and a
   년 월 once the year rolls. Weekdays never appear in the source's headers, so the
   label stays short. */
function dayLabel(time: number, now = Date.now()): string {
  const day = (value: number) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const midnight = day(now);
  const stamp = day(time);
  if (stamp === midnight) return "오늘";
  if (stamp === midnight - 86_400_000) return "어제";
  const d = new Date(time);
  if (d.getFullYear() === new Date(now).getFullYear()) {
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

function VirtualizedGrid({
  scrollRef,
  selecting,
  runs,
  items,
  freshIds,
  picked,
  onOpen,
  onShowFailure,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onToVideo,
  lastViewedId,
  commentCounts,
  onDelete,
  menuActions,
  layout,
  splitByDate,
  cardSize,
  fit,
  onCancel,
  cancelingIds,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  selecting: boolean;
  runs: ActiveRun[];
  items: RunRecord[];
  freshIds: string[];
  picked: ReadonlySet<string>;
  onOpen: (id: string) => void;
  /* Opens the failure-detail dialog for a run that ended failed. The media viewer
     cannot show a run with no output, so failed cards reach their details through
     this callback rather than onOpen. */
  onShowFailure: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => void;
  onToVideo: (item: RunRecord) => void;
  lastViewedId: string;
  commentCounts: Record<string, number>;
  onDelete: (item: RunRecord) => void;
  menuActions: TileMenuActions;
  layout: FeedLayout;
  splitByDate: boolean;
  cardSize: number;
  fit: boolean;
  onCancel?: (requestId: string) => void;
  cancelingIds?: ReadonlySet<string>;
}) {
  const width = useInnerWidth(scrollRef);
  const slots = useMemo(() => slotsOf(runs, items, cancelingIds), [runs, items, cancelingIds]);
  const cols = fit ? 1 : ZOOM_COLS[cardSize] ?? CARD_COLS;
  const rows = Math.max(1, Math.ceil(slots.length / cols));

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: (row) => {
      if (width <= 0) return 240;
      const col = (width - GRID_GAP * (cols - 1)) / cols;
      return col + (row === rows - 1 ? 0 : GRID_GAP);
    },
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [width, slots, virtualizer]);

  const slotNode = (slot: Slot, index: number) =>
    slot.kind === "run" ? (
      <RunningTile key={slot.key} run={slot.run} onCancel={onCancel} />
    ) : (
      <Tile
        key={slot.key}
        item={slot.item}
        index={index}
        fresh={freshIds.includes(slot.item.id)}
        picked={picked.has(slot.item.id)}
        selecting={selecting}
        onOpen={onOpen}
        onShowFailure={onShowFailure}
        onPick={onPick}
        onReuse={onReuse}
        onFavorite={onFavorite}
        onDownload={onDownload}
        onToVideo={onToVideo}
        commentCount={commentCounts[slot.item.id] ?? 0}
        viewed={slot.item.id === lastViewedId}
        onDelete={onDelete}
        menuActions={menuActions}
      />
    );

  /* Square and unsplit is the original even grid: the virtualizer's own path,
     left exactly as it was so the default feed never changes. The packed and
     grouped views lay the whole plan out once and place it absolutely. */
  if (layout === "square" && !splitByDate && !fit) {
    return (
      <div className="ohf-grid-window" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const from = row.index * cols;
          const slice = slots.slice(from, from + cols);
          return (
            <div
              key={row.key}
              className="ohf-grid"
              data-selecting={selecting}
              style={
                {
                  "--ohf-cols": cols,
                  transform: `translateY(${row.start}px)`,
                } as CSSProperties
              }
            >
              {slice.map((slot) =>
                slotNode(slot, slot.kind === "item" ? slot.index : 0),
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const blocks = blocksOf(slots, splitByDate);
  const { cells, total } = planFeed(blocks, width, layout, cols, cardSize, fit);
  return (
    <div className="ohf-grid-window" data-selecting={selecting} style={{ height: total }}>
      {cells.map((cell) => {
        if (cell.block.kind === "header") {
          return (
            <div
              key={cell.block.key}
              className="ohf-feed-day"
              style={{ left: cell.x, top: cell.y, width: cell.w } as CSSProperties}
            >
              <span className="ohf-feed-day-label">{dayLabel(cell.block.time)}</span>
            </div>
          );
        }
        const slot = cell.block.slot;
        return (
          <div
            key={cell.block.key}
            className={`ohf-cell ohf-cell--${layout}${fit ? " ohf-cell--fit" : ""}`}
            style={
              {
                left: cell.x,
                top: cell.y,
                width: cell.w,
                height: (layout === "masonry" || fit) ? cell.h : undefined,
                aspectRatio: String(cell.ratio),
              } as CSSProperties
            }
          >
            {slotNode(slot, slot.kind === "item" ? slot.index : 0)}
          </div>
        );
      })}
    </div>
  );
}

/* First run of the session. No placeholder scenery — the invitation carries
   itself, and the three starters are the only thing on the ground because they
   are the only thing here that is real: sample prompts, each showing the light
   its seed would make. One click loads the
   composer; pressing Generate stays the visitor’s call. Only the surface
   scopes offer them: a starter writes one surface’s prompt, and Assets and
   Favorites span both and are stocked from the other scopes, so they state the
   gesture instead. */
function Empty({
  view,
  surface,
  onStarter,
}: {
  view: GalleryView;
  surface: Surface;
  onStarter: (prompt: string) => void;
}) {
  const thumbRatio = surface === "image" ? "4 / 3" : "16 / 9";
  /* Reshuffled on every page load, and only after mount — picking during
     render would hand the hydrating client a different three than the server
     wrote. Until the picks land the server's three hold their space unseen, so
     the invitation never jumps up the panel to make room for them. */
  const [samples, setSamples] = useState<string[] | null>(null);
  useEffect(() => setSamples(pickSamples(surface)), [surface]);

  return (
    <div className="ohf-empty">
      <div className="ohf-empty-copy">
        <h2 className="ohf-empty-title">{EMPTY[view].title}</h2>
        <p className="ohf-empty-hint">{EMPTY[view].hint}</p>

        {!CROSS_VIEWS.has(view) && (
          <ul
            className="ohf-empty-starters"
            style={samples ? undefined : { visibility: "hidden" }}
          >
            {(samples ?? SAMPLES[surface].slice(0, 3)).map((sample) => (
              <li key={sample}>
                <button type="button" className="ohf-starter" onClick={() => onStarter(sample)}>
                  <span
                    className="ohf-starter-thumb"
                    style={{ background: swatchFor(surface, sample), aspectRatio: thumbRatio }}
                  >
                    <span className="ohf-grain" style={{ opacity: 0.24 }} />
                  </span>
                  <span className="ohf-starter-text">{sample}</span>
                  <span className="ohf-starter-go">
                    <ArrowRightIcon />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RunningTile({
  run,
  onCancel,
}: {
  run: ActiveRun;
  onCancel?: (requestId: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  /* A cancel already fired for this run. Once set, the overlay stops being a
     button and holds a locked "Canceling…" state, so a second click can never
     re-trigger the request. */
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - run.startedAt) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [run.startedAt]);

  /* A cancel only reaches a run the backend already knows by request id. A press
     still waiting on submit carries none, so there is nothing to offer yet. */
  const requestId = run.requestId;
  const cancellable = Boolean(requestId) && Boolean(onCancel);

  /* Once the backend has acknowledged the cancel (run.canceling), the request is
     already in flight — so the "Cancel Request" overlay is gone and the card's
     own label carries the cancelling message instead. With the overlay removed
     there is no button left to fire a second cancel, which is the whole point. */
  const canceling = Boolean(run.canceling);
  const overlay = !cancellable || canceling
    ? null
    : requested
      ? (
        <div className="ohf-skeleton-cancel ohf-skeleton-cancel--requested" aria-live="polite">
          <span className="ohf-skeleton-cancel-label">Canceling…</span>
        </div>
      )
      : (
        <button
          type="button"
          className="ohf-skeleton-cancel"
          aria-label="Cancel Request"
          title="Cancel Request"
          onClick={(event) => {
            event.stopPropagation();
            setRequested(true);
            onCancel!(requestId!);
          }}
        >
          <span className="ohf-skeleton-cancel-label">Cancel Request</span>
        </button>
      );

  return (
    <div
      className="ohf-skeleton"
      role="status"
      aria-label={`${run.modelLabel} ${canceling ? "cancelling" : "rendering"}`}
      data-cancel-requested={requested || undefined}
      data-canceling={canceling || undefined}
    >
      <span className="ohf-skeleton-label">{canceling ? "Canceling…" : "Rendering"}</span>
      <span className="ohf-skeleton-clock">
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
      </span>
      {overlay}
    </div>
  );
}

export function runSubtitle(item: RunRecord): string {
  return timeAgo(item.createdAt);
}
