"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";

import type { RunRecord } from "./history";
import { PlayBadgeIcon } from "./icons";
import { MoreMenu } from "./context-menu";
import { buildSelectionMenu } from "./asset-menu";
import type { TileMenuActions } from "./gallery";
import {
  DownloadGlyph,
  FolderGlyph,
  HeartGlyph,
  TrashGlyph,
  ClearGlyph,
} from "./asset-icons";

/** How many runs the count stack shows before it stops drawing new sheets. */
const STACK = 3;

export interface SaveProgress {
  done: number;
  total: number;
}

/* The composer's replacement, not a second floating layer: while runs are
   picked the dock carries this instead, in the same slot and against the same
   bottom edge, so the swap reads as one control becoming another.

   Its shape follows Higgsfield's selection toolbar: a stack of thumbs counting
   the picks, then 다운로드 / 추가 위치, 좋아요, 삭제 and the full ⋯ menu, with a
   cross that clears the whole selection. Bulk rows (keep, delete, clear, file)
   act on every pick; the ⋯ menu and the open / reuse rows act on the first pick.

   It stays mounted once the studio has ever had a selection — the bar has to be
   present to animate away, and it needs the last non-empty selection to avoid
   flashing "0개 선택됨" on its way out. */
export function SelectionBar({
  records,
  saving,
  menuActions,
  onOpen,
  onReuse,
  onDownload,
  onFavorite,
  onDelete,
  onAddToFolder,
  onClose,
}: {
  records: RunRecord[];
  saving: SaveProgress | null;
  menuActions: TileMenuActions;
  onOpen: (id: string) => void;
  onReuse: (record: RunRecord) => void;
  onDownload: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onAddToFolder: () => void;
  onClose: () => void;
}) {
  const on = records.length > 0;
  /* The exiting bar keeps saying what it was acting on. */
  const held = useRef(records);
  if (on) held.current = records;
  const shown = held.current;

  const count = shown.length;
  const saveable = shown.filter((record) => record.urls[0]).length;
  const allKept = shown.every((record) => record.favorite === true);
  /* The ⋯ menu reads the first pick, the same asset a single-row action would. */
  const lead = shown[0];

  const downloadLabel = saving
    ? `Saving ${saving.done} of ${saving.total}`
    : saveable === 0
      ? "Nothing here to download"
      : saveable < count
        ? `Download ${saveable} of ${count}`
        : "Download";

  /* The selection bar's ⋯ draws its own menu, never the per-asset one a tile
     shows — publish lives here, and only while the ⋯ is open. */
  const menu = lead
    ? buildSelectionMenu(lead, menuActions, {
        open: onOpen,
        reuse: onReuse,
        favorite: () => onFavorite(),
        download: () => onDownload(),
        del: () => onDelete(),
      })
    : [];

  return (
    /* A labelled toolbar, the way Higgsfield names its selection bar. */
    <div
      className="ohf-selbar"
      role="toolbar"
      aria-label="선택 항목 작업"
      data-on={on}
      inert={!on}
    >
      {/* Publish is NOT a button bolted onto the bar. It lives inside the
          selection ⋯ menu and only shows while that menu is open. */}
      {/* Picking happens in the grid; the count says the total out loud. */}
      <p className="ohf-selbar-count" role="status">
        <span className="ohf-selstack" aria-hidden>
          {shown.slice(-STACK).map((record, index, sheets) => (
            <span
              key={record.id}
              className="ohf-selchip"
              style={{ "--z": sheets.length - 1 - index, background: record.art } as CSSProperties}
            >
              {record.kind === "image" && record.urls[0] ? (
                /* Platform CDN host, same as the grid: next/image would need
                   every provider domain allow-listed up front. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={record.urls[0]} alt="" />
              ) : (
                record.kind === "video" && (
                  <span className="ohf-selchip-play">
                    <PlayBadgeIcon size={7} />
                  </span>
                )
              )}
            </span>
          ))}
        </span>
        {/* One phrase, one flex item — the stack's gap must not open between
            the number and the word it counts. */}
        <span className="ohf-selbar-text">
          <span className="ohf-selbar-n" key={count}>
            {count}
          </span>
          개 선택됨
        </span>
      </p>

      <span className="ohf-selbar-rule" aria-hidden />

      <button
        type="button"
        className="ohf-selact ohf-selact--wide ohf-tip"
        data-tip={downloadLabel}
        disabled={saveable === 0 || saving !== null}
        aria-label={downloadLabel}
        onClick={onDownload}
      >
        {saving ? <span className="ohf-spinner" aria-hidden /> : <DownloadGlyph size={17} />}
        <span className="ohf-selact-label">
          {saving ? `${saving.done}/${saving.total}` : "다운로드"}
        </span>
      </button>

      <button
        type="button"
        className="ohf-selact ohf-selact--wide ohf-tip"
        data-tip={`폴더 ${count}개 담기`}
        disabled={count === 0}
        aria-label="추가 위치"
        onClick={onAddToFolder}
      >
        <FolderGlyph size={17} />
        <span className="ohf-selact-label">추가 위치</span>
      </button>

      <button
        type="button"
        className="ohf-selact ohf-tip"
        data-tip={allKept ? `좋아요 ${count}개 해제` : `좋아요 ${count}개`}
        data-on={allKept}
        aria-pressed={allKept}
        aria-label="선택 항목 좋아요"
        onClick={onFavorite}
      >
        <HeartGlyph size={18} filled={allKept} />
      </button>

      <button
        type="button"
        className="ohf-selact ohf-selact--danger ohf-tip"
        data-tip={`삭제 ${count}개`}
        aria-label="선택 항목 삭제"
        onClick={onDelete}
      >
        <TrashGlyph size={17} />
      </button>

      <MoreMenu
        className="ohf-selact ohf-selact--quiet ohf-selact--more"
        label="추가 작업"
        align="start"
        floating
        items={menu}
      />

      <span className="ohf-selbar-rule" aria-hidden />

      <button
        type="button"
        className="ohf-selact ohf-selact--quiet ohf-tip ohf-tip--end"
        data-tip="선택 해제 · Esc"
        aria-label="선택 해제"
        onClick={onClose}
      >
        <ClearGlyph size={16} />
      </button>
    </div>
  );
}
