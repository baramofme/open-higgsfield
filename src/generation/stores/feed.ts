import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "./browser-storage";
import type { RunRecord } from "@/openhiggsfield/history";

/* The feed's filter and view dials, mirroring the live image feed's header:
   the 필터 menu picks a model and a time window and can hide failures, the 활동
   shelf toggles likes and downloads, and the 보기 menu lays the feed out —
   square or masonry — and can break it into days. One store holds all of it so
   the header, the grid and the visible list read the same truth. */

export type FeedPeriod = "all" | "today" | "7d" | "30d";
export type FeedLayout = "square" | "masonry";

export const PERIOD_LABELS: Record<FeedPeriod, string> = {
  all: "전체 기간",
  today: "오늘",
  "7d": "최근 7일",
  "30d": "최근 30일",
};

export const LAYOUT_LABELS: Record<FeedLayout, string> = {
  square: "정사각형",
  masonry: "메이슨리",
};

/** How far back a window reaches, in ms; "all" has no floor. */
const PERIOD_FLOOR: Record<FeedPeriod, number> = {
  all: 0,
  today: 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
};

/** The default column count; the 미리보기 dial can lower it but never raise it. */
export const CARD_COLS = 4;

/* Card-size is a 0..4 zoom, mirroring the live feed's 카드 크기 slider. The two
   tables below are anchored to the two HF data points actually measured on
   2026-11-01 (at zoom 2: square showed 4 columns, masonry showed a 300px row
   height); the neighbours interpolate sensibly and are ours to tune. */
export const ZOOM_COLS = [6, 5, 4, 3, 2] as const;
export const ZOOM_ROW_H = [180, 240, 300, 360, 420] as const;

type FeedState = {
  modelId: string;
  period: FeedPeriod;
  hideFailed: boolean;
  likedOnly: boolean;
  downloadedOnly: boolean;
  layout: FeedLayout;
  splitByDate: boolean;
  day: string | null;
  cardSize: number;
  fit: boolean;
  setModel: (id: string) => void;
  setPeriod: (period: FeedPeriod) => void;
  setHideFailed: (on: boolean) => void;
  setLikedOnly: (on: boolean) => void;
  setDownloadedOnly: (on: boolean) => void;
  setLayout: (layout: FeedLayout) => void;
  setSplitByDate: (on: boolean) => void;
  setDay: (day: string | null) => void;
  setCardSize: (size: number) => void;
  setFit: (on: boolean) => void;
};

export const useFeed = create<FeedState>()(
  persist(
    (set) => ({
      modelId: "all",
      period: "all",
      hideFailed: false,
      likedOnly: false,
      downloadedOnly: false,
      layout: "square",
      splitByDate: false,
      day: null,
      cardSize: 2,
      fit: false,
      setModel: (id) => set({ modelId: id }),
      setPeriod: (period) => set({ period }),
      setHideFailed: (on) => set({ hideFailed: on }),
      setLikedOnly: (on) => set({ likedOnly: on }),
      setDownloadedOnly: (on) => set({ downloadedOnly: on }),
      setLayout: (layout) => set({ layout }),
      setSplitByDate: (on) => set({ splitByDate: on }),
      setDay: (day) => set({ day }),
      setCardSize: (size) => set({ cardSize: size }),
      setFit: (on) => set({ fit: on }),
    }),
    {
      name: "openhiggsfield.feed.v1",
      storage: browserStorage<FeedState>(),
    },
  ),
);

/* The window floor for "today" is the calendar day, not a rolling 24 hours: a
   run made at 09:00 still reads as "오늘" at 23:00 the same day. */
function periodFloor(period: FeedPeriod, now: number): number {
  if (period === "all") return 0;
  if (period === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return now - PERIOD_FLOOR[period];
}

/** Apply every filter dial to the run log. Downloads are tracked on the record
    (`downloadedAt`), so the filter reads that flag rather than a separate log. */
export function applyFeedFilters(
  records: RunRecord[],
  feed: Pick<
    FeedState,
    "modelId" | "period" | "hideFailed" | "likedOnly" | "downloadedOnly" | "day"
  >,
  now = Date.now(),
): RunRecord[] {
  const floor = periodFloor(feed.period, now);
  return records.filter((record) => {
    if (feed.hideFailed && record.status === "failed") return false;
    if (feed.likedOnly && record.favorite !== true) return false;
    if (feed.downloadedOnly && record.downloadedAt === undefined) return false;
    if (feed.modelId !== "all" && record.modelId !== feed.modelId) return false;
    /* A picked day outranks the period window: the visitor named the day. */
    if (feed.day) {
      if (dayKey(record.createdAt) !== feed.day) return false;
    } else if (floor && record.createdAt < floor) {
      return false;
    }
    return true;
  });
}

/* The day a run belongs to, in the visitor's own timezone, keyed for grouping.
   Date keys are local (not ISO-UTC) so the day-break reads the way the clock on
   the wall does rather than sliding by the timezone offset. */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
