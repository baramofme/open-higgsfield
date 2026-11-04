"use client";

import { useEffect, useRef, useState } from "react";

import { MODELS } from "@/generation/catalog";
import {
  LAYOUT_LABELS,
  PERIOD_LABELS,
  useFeed,
  type FeedLayout,
  type FeedPeriod,
} from "@/generation/stores/feed";

import {
  ChevronRightIcon,
  FeedCalendarIcon,
  FeedFilterIcon,
  FeedFitIcon,
  FeedGuideIcon,
  FeedModelIcon,
  FeedRecordIcon,
  FeedViewIcon,
  SparkIcon,
} from "./icons";

/* The feed's header row, mirroring the platform's: a scrollable strip of active
   filter chips flanked by scroll chevrons, and to its right the two dials that
   name the whole feature — 필터 and 보기. Each dial opens a menu of grouped rows;
   the filter menu's 모델 and 기간 rows reach sideways into a submenu, exactly as
   the source's base-ui dropdown does. */

const PERIODS: FeedPeriod[] = ["all", "today", "7d", "30d"];
const LAYOUTS: FeedLayout[] = ["square", "masonry"];

function useDismiss(open: boolean, close: () => void) {
  /* A menu closes on a pointer press that lands outside it. The listener is only
     mounted while open so it never watches the page for no reason. */
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const root = box.current;
      if (root && !root.contains(event.target as Node)) close();
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [open, close]);
  return box;
}

function Switch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      data-ohf-switch={on ? "on" : "off"}
      onClick={() => onChange(!on)}
    >
      <span className="ohf-switch-track">
        <span className="ohf-switch-thumb" />
      </span>
    </button>
  );
}

/* One option row shared by the model and period submenus: the active choice
   reads checked and carries a leading glyph. */
function SubOption({
  selected,
  label,
  icon,
  onSelect,
}: {
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-active={selected ? "true" : "false"}
      onClick={onSelect}
    >
      <span className="ohf-sub-opt-icon">{icon}</span>
      <span className="ohf-sub-opt-label">{label}</span>
      {selected ? <span className="ohf-sub-opt-check">✓</span> : null}
    </button>
  );
}

/* Render a picked day back as a readable date. The key is the local `Y-M-D` the
   calendar writes, so it is read straight back rather than re-derived. */
function formatDayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(y, m - 1, d));
}

/* The date half of the period submenu: a month grid with a walk between months.
   Picking a day sets `day`, and the filter reads it ahead of the period window. */
function PeriodCalendar() {
  const day = useFeed((s) => s.day);
  const setDay = useFeed((s) => s.setDay);
  const [offset, setOffset] = useState(0);
  const base = new Date();
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(view);
  const now = new Date();
  return (
    <div className="ohf-feed-cal">
      <div className="ohf-feed-cal-head">
        <button type="button" aria-label="이전 달" onClick={() => setOffset(offset - 1)}>
          ‹
        </button>
        <span className="ohf-feed-cal-month">{monthLabel}</span>
        <button type="button" aria-label="다음 달" onClick={() => setOffset(offset + 1)}>
          ›
        </button>
      </div>
      <div className="ohf-feed-cal-week">
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
          <span key={w} className="ohf-feed-cal-wd">
            {w}
          </span>
        ))}
      </div>
      <div className="ohf-feed-cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <span key={"blank-" + i} className="ohf-feed-cal-blank" />;
          const key = `${year}-${month + 1}-${d}`;
          const selected = day === key;
          const isToday =
            year === now.getFullYear() && month === now.getMonth() && d === now.getDate();
          return (
            <button
              key={key}
              type="button"
              className="ohf-feed-cal-day"
              data-selected={selected ? "true" : "false"}
              data-today={isToday ? "true" : "false"}
              onClick={() => setDay(key)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterMenu({
  sub,
  setSub,
}: {
  sub: "model" | "period" | null;
  setSub: (sub: "model" | "period" | null) => void;
}) {
  const modelId = useFeed((s) => s.modelId);
  const period = useFeed((s) => s.period);
  const hideFailed = useFeed((s) => s.hideFailed);
  const likedOnly = useFeed((s) => s.likedOnly);
  const downloadedOnly = useFeed((s) => s.downloadedOnly);
  const setModel = useFeed((s) => s.setModel);
  const setPeriod = useFeed((s) => s.setPeriod);
  const setHideFailed = useFeed((s) => s.setHideFailed);
  const setLikedOnly = useFeed((s) => s.setLikedOnly);
  const setDownloadedOnly = useFeed((s) => s.setDownloadedOnly);
  const day = useFeed((s) => s.day);
  const setDay = useFeed((s) => s.setDay);
  const [query, setQuery] = useState("");

  return (
    <div className="ohf-feed-menu ohf-feed-menu--filter">
      <div className="ohf-feed-menu-group">
        <p className="ohf-feed-menu-heading">유형</p>
        {/* The 모델 row is a submenu trigger: it names the current pick and, on
            hover, reaches right into the model list. */}
        <div
          className="ohf-feed-sub-row"
          onMouseEnter={() => setSub("model")}
          onFocus={() => setSub("model")}
        >
          <span className="ohf-feed-row-label">모델 선택</span>
          <button type="button" aria-haspopup="menu" aria-expanded={sub === "model"}>
            <span className="ohf-feed-sub-trigger-icon">
              <SparkIcon size={16} />
            </span>
            <span className="ohf-feed-sub-trigger-label">
              {modelId === "all" ? "모든 모델" : MODELS.find((m) => m.id === modelId)?.label ?? modelId}
            </span>
            <ChevronRightIcon size={14} />
          </button>
          {sub === "model" ? (
            <div className="ohf-feed-submenu" role="menu">
              <input
                className="ohf-feed-search"
                type="search"
                placeholder="모델 검색"
                aria-label="모델 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <SubOption
                selected={modelId === "all"}
                label="모든 모델"
                icon={<FeedModelIcon size={16} />}
                onSelect={() => setModel("all")}
              />
              {MODELS.filter((model) =>
                model.label.toLowerCase().includes(query.trim().toLowerCase()),
              ).map((model) => (
                <SubOption
                  key={model.id}
                  selected={modelId === model.id}
                  label={model.label}
                  icon={<FeedModelIcon size={16} />}
                  onSelect={() => setModel(model.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div
          className="ohf-feed-sub-row"
          onMouseEnter={() => setSub("period")}
          onFocus={() => setSub("period")}
        >
          <span className="ohf-feed-row-label">기간</span>
          <button type="button" aria-haspopup="menu" aria-expanded={sub === "period"}>
            <span className="ohf-feed-sub-trigger-icon">
              <FeedCalendarIcon size={16} />
            </span>
            <span className="ohf-feed-sub-trigger-label">
              {day ? formatDayLabel(day) : PERIOD_LABELS[period]}
            </span>
            <ChevronRightIcon size={14} />
          </button>
          {sub === "period" ? (
            <div className="ohf-feed-submenu" role="menu">
              {PERIODS.map((option) => (
                <SubOption
                  key={option}
                  selected={period === option && !day}
                  label={PERIOD_LABELS[option]}
                  icon={<FeedCalendarIcon size={16} />}
                  onSelect={() => {
                    setPeriod(option);
                    setDay(null);
                  }}
                />
              ))}
              <PeriodCalendar />
            </div>
          ) : null}
        </div>
        <div className="ohf-feed-switch-row">
          <span className="ohf-feed-row-label">실패 항목 숨기기</span>
          <Switch on={hideFailed} onChange={setHideFailed} />
        </div>
      </div>
      <div className="ohf-feed-menu-group">
        <p className="ohf-feed-menu-heading">활동</p>
        <button
          type="button"
          className="ohf-feed-toggle"
          aria-pressed={likedOnly}
          onClick={() => setLikedOnly(!likedOnly)}
        >
          좋아요
        </button>
        <button
          type="button"
          className="ohf-feed-toggle"
          aria-pressed={downloadedOnly}
          onClick={() => setDownloadedOnly(!downloadedOnly)}
        >
          다운로드됨
        </button>
      </div>
    </div>
  );
}

function ViewMenu() {
  const layout = useFeed((s) => s.layout);
  const splitByDate = useFeed((s) => s.splitByDate);
  const setLayout = useFeed((s) => s.setLayout);
  const setSplitByDate = useFeed((s) => s.setSplitByDate);
  const cardSize = useFeed((s) => s.cardSize);
  const setCardSize = useFeed((s) => s.setCardSize);
  const fit = useFeed((s) => s.fit);
  const setFit = useFeed((s) => s.setFit);

  return (
    <div className="ohf-feed-menu ohf-feed-menu--view">
      <div className="ohf-feed-menu-group">
        <p className="ohf-feed-menu-heading">레이아웃</p>
        {/* 정사각형 and 메이슨리 are mutually exclusive; the pressed one reads the
            current layout, matching the source's radio behaviour. */}
        <div className="ohf-feed-layout-row">
          {LAYOUTS.map((option) => (
            <button
              key={option}
              type="button"
              className="ohf-feed-layout-opt"
              aria-pressed={layout === option}
              onClick={() => setLayout(option)}
            >
              {LAYOUT_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
      <div className="ohf-feed-menu-group">
        <p className="ohf-feed-menu-heading">카드 크기</p>
        <div className="ohf-feed-switch-row">
          <span className="ohf-feed-row-label">날짜별로 나누기</span>
          <Switch on={splitByDate} onChange={setSplitByDate} />
        </div>
        {/* Card size is a 0..4 zoom, mirroring the source's 카드 크기 slider; the
            grid reads it through the ZOOM tables in the feed store. */}
        <div className="ohf-feed-size-row ohf-feed-size-row--slider">
          <span className="ohf-feed-row-label">카드 크기</span>
          <input
            type="range"
            className="ohf-feed-slider"
            min="0"
            max="4"
            step="1"
            value={cardSize}
            aria-label="카드 크기"
            onChange={(event) => setCardSize(Number(event.target.value))}
          />
        </div>
        {/* 미리보기에 맞추기 lays a single run across the full width of the
            panel, the way the source's fit icon does; pressing it again
            restores the zoom. */}
        <div className="ohf-feed-size-row">
          <span className="ohf-feed-row-label">미리보기에 맞추기</span>
          <button
            type="button"
            className="ohf-feed-size-btn"
            aria-label="미리보기에 맞추기"
            aria-pressed={fit}
            onClick={() => setFit(!fit)}
          >
            <FeedFitIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" className="ohf-feed-chip" onClick={onClear}>
      <span>{label}</span>
      <span className="ohf-feed-chip-x" aria-hidden>
        ×
      </span>
    </button>
  );
}

/* The chip strip mirrors the source's scrollable filter row: it holds one chip
   per active filter and its side chevrons appear only once the chips overflow,
   exactly the rule the source shows (opacity-0 until the row scrolls). */
function ChipStrip() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const modelId = useFeed((s) => s.modelId);
  const period = useFeed((s) => s.period);
  const hideFailed = useFeed((s) => s.hideFailed);
  const likedOnly = useFeed((s) => s.likedOnly);
  const downloadedOnly = useFeed((s) => s.downloadedOnly);
  const setModel = useFeed((s) => s.setModel);
  const setPeriod = useFeed((s) => s.setPeriod);
  const setHideFailed = useFeed((s) => s.setHideFailed);
  const setLikedOnly = useFeed((s) => s.setLikedOnly);
  const setDownloadedOnly = useFeed((s) => s.setDownloadedOnly);
  const day = useFeed((s) => s.day);
  const setDay = useFeed((s) => s.setDay);

  /* Recompute whether either chevron has room to show after the chips change. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sync = () => {
      setCanLeft(el.scrollLeft > 1);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    sync();
    el.addEventListener("scroll", sync);
    return () => el.removeEventListener("scroll", sync);
  });

  const nudge = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 120, behavior: "smooth" });
  };

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (modelId !== "all")
    chips.push({
      key: "model",
      label: MODELS.find((m) => m.id === modelId)?.label ?? modelId,
      clear: () => setModel("all"),
    });
  if (period !== "all")
    chips.push({ key: "period", label: PERIOD_LABELS[period], clear: () => setPeriod("all") });
  if (day)
    chips.push({ key: "day", label: formatDayLabel(day), clear: () => setDay(null) });
  if (hideFailed)
    chips.push({ key: "failed", label: "실패 숨김", clear: () => setHideFailed(false) });
  if (likedOnly) chips.push({ key: "liked", label: "좋아요", clear: () => setLikedOnly(false) });
  if (downloadedOnly)
    chips.push({
      key: "downloaded",
      label: "다운로드됨",
      clear: () => setDownloadedOnly(false),
    });

  return (
    <div className="ohf-feed-strip-wrap">
      <button
        type="button"
        aria-label="왼쪽으로 스크롤"
        aria-hidden={!canLeft}
        data-visible={canLeft ? "true" : "false"}
        className="ohf-feed-chevron ohf-feed-chevron--left"
        onClick={() => nudge(-1)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14.5 18.25L8.25 12L14.5 5.75" />
        </svg>
      </button>
      <div className="ohf-feed-strip" ref={scrollRef}>
        {chips.map((chip) => (
          <ActiveChip key={chip.key} label={chip.label} onClear={chip.clear} />
        ))}
      </div>
      <button
        type="button"
        aria-label="오른쪽으로 스크롤"
        aria-hidden={!canRight}
        data-visible={canRight ? "true" : "false"}
        className="ohf-feed-chevron ohf-feed-chevron--right"
        onClick={() => nudge(1)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9.5 18.25L15.75 12L9.5 5.75" />
        </svg>
      </button>
    </div>
  );
}

/* 피드 판의 세 가지 상태(t_2adadf77). HF의 라이브 상태기계 그대로:
   showcase = 페이지가 열렸을 때의 기본값(HF는 기록 탭이 선택된 채 쇼케이스를
   보여준다), record = 기록 탭이 고른 로컬 생성 히스토리, guide = 이용 방법
   탭의 HF 가이드 판. 쇼케이스로 돌아오는 길은 HF에도 없다 — 재시작만. */
export type FeedPanel = "showcase" | "record" | "guide";

export function FeedHeader({
  feedTabs = false,
  panel = "showcase",
  onPanel,
}: {
  feedTabs?: boolean;
  panel?: FeedPanel;
  onPanel?: (next: FeedPanel) => void;
}) {
  /* Only one dial is open at a time; the filter dial additionally tracks which
     of its two rows is reaching into a submenu. */
  const [open, setOpen] = useState<"filter" | "view" | null>(null);
  const [sub, setSub] = useState<"model" | "period" | null>(null);
  const dismiss = useDismiss(open !== null, () => {
    setOpen(null);
    setSub(null);
  });

  useEffect(() => {
    if (open !== "filter") setSub(null);
  }, [open]);

  /* HF의 q-tabs는 로빙 tabindex(선택 0·비선택 -1)와 화살표 이동을 쓴다 —
     라이브 실측(기록 tabindex 0, 이용 방법 -1)을 미러한다. 언더라인처럼
     따라붙는 glass indicator(q-tabs-indicator)는 선택된 탭의 기하를
     옮겨입히므로 실측 폭·위치를 DOM에서 읽어 그대로 심는다. */
  const tabsBox = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const recordTab = useRef<HTMLButtonElement>(null);
  const guideTab = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!feedTabs) return;
    const sync = () => {
      const box = tabsBox.current;
      const ind = indicator.current;
      if (!box || !ind) return;
      const chosen = box.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!chosen) return;
      ind.style.transform = `translateX(${chosen.offsetLeft}px)`;
      ind.style.width = `${chosen.offsetWidth}px`;
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [panel, feedTabs]);

  const moveTab = (next: FeedPanel) => {
    onPanel?.(next);
    (next === "guide" ? guideTab : recordTab).current?.focus();
  };

  const onTabsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    moveTab(panel === "guide" ? "record" : "guide");
  };

  return (
    <div className="ohf-feed-header" ref={dismiss}>
      {/* t_b8a39dd7에서 honest inert로 착지했던 탭 2종(실측 기록 x361 y55 58×32 ·
          이용 방법 x423 y55 83×32)을 본 카드에서 실배선으로 전환: 패널을
          갈아끼우는 진짜 전환이므로 inert 마커(aria-disabled/data-off)를 떼었다.
          HF의 image surface에는 이 탭이 없어(라이브 실측 tabs=[]) video/audio
          분기에서만 렌더하는 feedTabs 게이트는 그대로 유지. */}
      {feedTabs ? (
        <div
          className="ohf-feed-header-tabs"
          role="tablist"
          aria-label="피드 뷰"
          ref={tabsBox}
          onKeyDown={onTabsKeyDown}
        >
          <span className="ohf-feed-header-indicator" ref={indicator} aria-hidden />
          <button
            type="button"
            role="tab"
            ref={recordTab}
            aria-selected={panel !== "guide"}
            data-active={panel !== "guide" ? "true" : "false"}
            tabIndex={panel !== "guide" ? 0 : -1}
            className="ohf-feed-header-tab"
            onClick={() => moveTab("record")}
          >
            <span className="ohf-feed-header-tab-content">
              <FeedRecordIcon size={16} />
              <span>기록</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            ref={guideTab}
            aria-selected={panel === "guide"}
            data-active={panel === "guide" ? "true" : "false"}
            tabIndex={panel === "guide" ? 0 : -1}
            className="ohf-feed-header-tab"
            onClick={() => moveTab("guide")}
          >
            <span className="ohf-feed-header-tab-content">
              <FeedGuideIcon size={16} />
              <span>이용 방법</span>
            </span>
          </button>
        </div>
      ) : null}
      <div className="ohf-feed-header-left">
        <ChipStrip />
      </div>
      {/* HF의 guide 상태는 필터/보기 클러스터에 invisible을 얹는다(실측:
         gap-2 invisible, 자리 유지·투명). 같은 규칙을 data-hidden으로 미러. */}
      <div
        className="ohf-feed-header-dials"
        data-hidden={panel === "guide" ? "true" : "false"}
      >
        <div className="ohf-feed-dial">
          <button
            type="button"
            className="ohf-feed-dial-btn"
            aria-label="필터"
            aria-haspopup="menu"
            aria-expanded={open === "filter"}
            data-active={open === "filter" ? "true" : "false"}
            onClick={() => setOpen(open === "filter" ? null : "filter")}
          >
            <FeedFilterIcon size={16} />
            <span>필터</span>
          </button>
          {open === "filter" ? <FilterMenu sub={sub} setSub={setSub} /> : null}
        </div>
        <div className="ohf-feed-dial">
          <button
            type="button"
            className="ohf-feed-dial-btn"
            aria-label="보기"
            aria-haspopup="menu"
            aria-expanded={open === "view"}
            data-active={open === "view" ? "true" : "false"}
            onClick={() => setOpen(open === "view" ? null : "view")}
          >
            <FeedViewIcon size={16} />
            <span>보기</span>
          </button>
          {open === "view" ? <ViewMenu /> : null}
        </div>
      </div>
    </div>
  );
}
