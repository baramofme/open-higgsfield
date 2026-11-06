"use client";

/* Generate-library surfaces shell — mirrors HF's /ko/generate tab-strip,
   breadcrumb bar, toolbar cluster, and empty-state text measured via CDP
   (1440×900, 2026-11-05). Populated state requires authentication and is
   explicitly deferred (needs_input). Only the static shell is ported here.

   HF surfaces captured:
     /generate/all       — no tabs, title "내 생성" (14px/500 white)
     /generate/elements  — tablist x=252 y=57 w=209 h=40, 4 tabs (전체/캐릭터/장소/소품),
                           toolbar: CSV 내보내기 + 필터|보기 ghost buttons
     /generate/favorites — no tabs, title "내 즐겨찾기"
     /generate?view=projects — tablist x=252 y=57 w=220 h=40, 4 tabs (전체/비공개/공유됨/숨김),
                               toolbar: 정렬 기준 ghost button

   Shell measurements → OHF tokens:
     Top bar: grid h-11 (44px) grid-cols-[1fr auto 1fr] gap-2 (8px) px-1 (4px)
     Tab row: inline-flex gap-1 (4px) h-10 (40px) — each tab: h-8 (32px) r-full
              pad 4px 8px font 12px/500
     Tab active: text white bg white/5; inactive: text white/5
     Ghost toolbar: 14px/500 color #828282 r-8 pad 6px 12px
     Solid (CSV): 14px/500 bg white color #1a1a1a r-8 pad 6px 12px

   Content area: scrollable flex-col area below header at x=252 y=110
   Grid: auto-fill minmax(min(260px,100%),1fr) gap-4 (16px) — existing .ohf-cine-tile-grid.
   Elements empty showcase: 3-tile placeholder grid grid-cols-3 gap-0.5
*/

import { useElements, type ElementItem } from "@/generation/stores/elements";
import type { CinemaView } from "@/generation/stores/project-surface";
import { toProxyImageUrl } from "./image-proxy";
import type { RunRecord } from "./history";

/* ── Tile grid ────────────────────────────────────────────────────────────── */

function GenerationTile({
  record,
  onOpenRun,
  onShowFailure,
}: {
  record: RunRecord;
  onOpenRun?: (id: string) => void;
  onShowFailure?: (id: string) => void;
}) {
  /* A finished run opens the showcase; a failed one opens its failure detail. A
     run still rendering has nothing finished to open yet, so its tile stays
     inert until the result lands. */
  const handleClick = () => {
    if (record.status === "completed" && record.urls[0]) onOpenRun?.(record.id);
    else if (record.status === "failed") onShowFailure?.(record.id);
  };
  return (
    <button
      type="button"
      className="ohf-cine-tile-btn"
      onClick={handleClick}
      aria-label={record.prompt}
    >
      {record.status === "completed" && record.urls[0] ? (
        record.kind === "image" ? (
          <img className="ohf-cine-tile-media" src={toProxyImageUrl(record.urls[0])} alt={record.prompt} loading="lazy" />
        ) : record.kind === "video" ? (
          <video
            className="ohf-cine-tile-media"
            src={record.urls[0]}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="ohf-cine-tile-art" style={{ background: record.art }}>
            <span className="ohf-cine-tile-badge">{record.badge ?? "audio"}</span>
          </div>
        )
      ) : (
        <div className="ohf-cine-tile-art" style={{ background: record.art }}>
          <span className="ohf-cine-tile-badge">
            {record.status === "failed" ? "실패" : "진행 중"}
          </span>
        </div>
      )}
      <span className="ohf-cine-tile-title">{record.modelLabel}</span>
    </button>
  );
}

function ElementTile({
  element,
  onOpenElement,
}: {
  element: ElementItem;
  onOpenElement?: (element: ElementItem) => void;
}) {
  const { name, url, elementId } = element;
  return (
    <div
      className="ohf-cine-tile"
      role="button"
      tabIndex={0}
      aria-label={name}
      onClick={() => onOpenElement?.(element)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenElement?.(element);
        }
      }}
    >
      {url ? (
        <img className="ohf-cine-tile-media" src={toProxyImageUrl(url)} alt={name} loading="lazy" />
      ) : (
        <div className="ohf-cine-tile-art ohf-cine-tile-art--el">
          <span className="ohf-cine-tile-badge">{elementId || "요소"}</span>
        </div>
      )}
      <span className="ohf-cine-tile-title">{name}</span>
    </div>
  );
}

/* ── HF generate shell header bar ─────────────────────────────────────────── */

/* Breadcrumb or title row — HF convention: grey link segments (--tx3) for
   navigable path, white (--tx) for current page. Separator "/" in grey.
   Measured: title at x=252 y=21, breadcrumb segments at x=254 y=21 + gap ~14px.
   14px/500 white (current) / rgb(130,130,130) (link), lh 20px. */
type CrumbSegment = { text: string; link?: boolean };

function GenerateBarTitle({ segments }: { segments: (string | CrumbSegment)[] }) {
  const crumbs = segments.map((s) => typeof s === "string" ? { text: s } : s);
  if (crumbs.length === 1) {
    return <span className="ohf-cine-gen-title">{crumbs[0].text}</span>;
  }
  return (
    <span className="ohf-cine-gen-crumb">
      {crumbs.map((seg, i) => (
        <span key={i} className={seg.link ? "ohf-cine-gen-crumb-link" : "ohf-cine-gen-crumb-current"}>
          {i > 0 ? <span className="ohf-cine-gen-crumb-sep">/</span> : null}
          {seg.text}
        </span>
      ))}
    </span>
  );
}

/* Top bar: grid h-11 grid-cols-[1fr auto 1fr] gap-2 px-1 — title left,
   toolbar right. HF measures this at x=248 y=9 w=1179 h=44. */
function GenerateBar({
  title,
  toolbar,
}: {
  title: (string | CrumbSegment)[];
  toolbar?: React.ReactNode;
}) {
  return (
    <div className="ohf-cine-gen-bar">
      <div className="ohf-cine-gen-bar-left">
        <GenerateBarTitle segments={title} />
      </div>
      <div className="ohf-cine-gen-bar-mid" aria-hidden="true" />
      <div className="ohf-cine-gen-bar-right">
        {toolbar ?? null}
      </div>
    </div>
  );
}

/* Tab strip row: HF's tablist at x=252 y=57 h=40 gap=4px.
   Each tab is a pill: h-8 w-auto r-full pad 4px 8px 12px/500.
   Active: text white bg white/5. Inactive: text white/5.
   Tabs are inert shell (no data to filter). */
const ELEMENT_TABS = ["전체", "캐릭터", "장소", "소품"] as const;

function GenerateTabstrip({ tabs, right }: { tabs: readonly string[]; right?: React.ReactNode }) {
  return (
    <div className="ohf-cine-gen-tabrow">
      <div className="ohf-cine-gen-tabstrip" role="tablist" aria-label="카테고리 탭">
        {tabs.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={i === 0}
            data-active={i === 0 || undefined}
            className="ohf-cine-gen-tab"
            data-off
            title="셸 — populated 필터링은 인증 후속"
          >
            {label}
          </button>
        ))}
      </div>
      {right ?? null}
    </div>
  );
}

/* Ghost toolbar button (필터/보기/정렬 기준): 14px/500 #828282 r-8 pad 6px 12px */
function GhostToolButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="ohf-cine-gen-ghost"
      data-off
      title="셸 — 동작 미구현 (인증 후속)"
      aria-disabled="true"
    >
      {label}
    </button>
  );
}

/* Solid toolbar button (CSV 내보내기): 14px/500 white bg dark text r-8 pad 6px 12px */
function SolidToolButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="ohf-cine-gen-solid"
      data-off
      title="셸 — CSV 내보내기 미구현 (인증 후속)"
      aria-disabled="true"
    >
      {label}
    </button>
  );
}

/* Toolbar cluster — buttons laid inline-flex gap 8px justify-end */
function GenerateToolbar({ children }: { children: React.ReactNode }) {
  return <div className="ohf-cine-gen-tools">{children}</div>;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */

/* HF empty state text — exact wording measured via CDP.
   elements: "아직 요소가 없어요" (16px/600 white) + "요소를 생성해서…" (14px/400 grey)
   favorites: "즐겨찾기한 생성이 여기에 표시돼요" (18px/600 #f7f7f8) + "마음에 드는…" (14px/400 #898a8b)
   generations: "내 생성" hero section at centre (measured in screenshot but exact
                title text is "내 생성" in the header bar, content hero unknown —
                guest sees empty state with "아직 아무것도 없어요"). */
function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="ohf-cine-tile-empty">
      <p className="ohf-cine-tile-empty-title">{title}</p>
      <p className="ohf-cine-tile-empty-sub">{sub}</p>
    </div>
  );
}

/* Elements empty showcase — 3 placeholder tile frames (grid-cols-3 gap-0.5).
   HF's showcase grid at x=518 y=450 w=640 h=252 with 212px columns. */
function ElementShowcase() {
  return (
    <div className="ohf-cine-gen-showcase" aria-hidden="true">
      <span className="ohf-cine-gen-showcase-tile" />
      <span className="ohf-cine-gen-showcase-tile" />
      <span className="ohf-cine-gen-showcase-tile" />
    </div>
  );
}

/* Favorites instruction cards — 3 hint cards below empty text.
   HF renders at y=436 area: 14px/600 title + 12px/400 white/40 sub. */
function FavoriteInstructions() {
  return (
    <div className="ohf-cine-gen-hint-cards" aria-hidden="true">
      <div className="ohf-cine-gen-hint-card">
        <span className="ohf-cine-gen-hint-title">즐겨찾기 표시하기</span>
        <span className="ohf-cine-gen-hint-sub">갈러리에서 하트 아이콘을 누르면 여기에 저장돼요.</span>
      </div>
      <div className="ohf-cine-gen-hint-card">
        <span className="ohf-cine-gen-hint-title">빠른 재방문</span>
        <span className="ohf-cine-gen-hint-sub">즐겨찾기한 생성을 한 곳에서 다시 볼 수 있어요.</span>
      </div>
    </div>
  );
}

/* ── View router ──────────────────────────────────────────────────────────── */

export function CinemaTileView({
  view,
  history,
  onOpenRun,
  onShowFailure,
  onOpenElement,
}: {
  view: CinemaView;
  history: RunRecord[];
  onOpenRun?: (id: string) => void;
  onShowFailure?: (id: string) => void;
  onOpenElement?: (element: ElementItem) => void;
}) {
  const elements = useElements((s) => s.items);

  if (view === "generations") {
    // All completed runs, newest first.
    const items = history
      .filter((r) => r.status === "completed")
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt);

    /* HF 내생성: no tabs, header has title "내 생성" (14px/500 white) + no
       content toolbar captured in guest view. /generate/all: tablists=0, no
       content toolbar buttons. */
    return (
      <div className="ohf-cine-gen-shell" aria-label="내 생성">
        <GenerateBar title={["내 생성"]} />
        <div className="ohf-cine-gen-scroll">
          {items.length === 0 ? (
            <EmptyState
              title="아직 아무것도 없어요"
              sub={'아래 컴포저에서 장면을 설명하고 "생성하기"를 눌러 시작해 보세요.'}
            />
          ) : (
            <div className="ohf-cine-tile-grid">
              {items.map((record) => (
                <GenerationTile
                  key={record.id}
                  record={record}
                  onOpenRun={onOpenRun}
                  onShowFailure={onShowFailure}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "elements") {
    /* HF 내 요소: breadcrumb "내 요소 / 전체" (내 요소=grey link, 전체=white),
       tabs(전체/캐릭터/장소/소품), tab row right: 필터|보기 ghost,
       top bar right: CSV 내보내기 solid.
       Empty showcase grid below text. */
    return (
      <div className="ohf-cine-gen-shell" aria-label="내 요소">
        <GenerateBar
          title={[{ text: "내 요소", link: true }, "전체"]}
          toolbar={
            <GenerateToolbar>
              <SolidToolButton label="CSV 내보내기" />
            </GenerateToolbar>
          }
        />
        <GenerateTabstrip tabs={ELEMENT_TABS} right={<GenerateToolbar><GhostToolButton label="필터" /><GhostToolButton label="보기" /></GenerateToolbar>} />
        <div className="ohf-cine-gen-scroll">
          {elements.length === 0 ? (
            <div className="ohf-cine-gen-empty-wrap">
              <EmptyState
                title="아직 요소가 없어요"
                sub="요소를 생성해서 모든 프로젝트에서 일관되게 사용해 보세요."
              />
              <ElementShowcase />
            </div>
          ) : (
            <div className="ohf-cine-tile-grid">
              {elements.map((item) => (
                <ElementTile key={item.id} element={item} onOpenElement={onOpenElement} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // view === "favorites"
  const favorites = history
    .filter((r) => r.favorite === true && r.status === "completed")
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  /* HF 내 즐겨찾기: title "내 즐겨찾기", no tabs, no toolbar.
     Empty text matches HF exactly. */
  return (
    <div className="ohf-cine-gen-shell" aria-label="내 즐겨찾기">
      <GenerateBar title={["내 즐겨찾기"]} />
      <div className="ohf-cine-gen-scroll">
        {favorites.length === 0 ? (
          <div className="ohf-cine-gen-empty-wrap" data-variant="favorites">
            <EmptyState
              title="즐겨찾기한 생성이 여기에 표시돼요"
              sub="마음에 드는 항목을 표시하면 여기에 저장돼요."
            />
            <FavoriteInstructions />
          </div>
        ) : (
          <div className="ohf-cine-tile-grid">
            {favorites.map((record) => (
              <GenerationTile
                key={record.id}
                record={record}
                onOpenRun={onOpenRun}
                onShowFailure={onShowFailure}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* (tile view owns no inline glyphs — the drawing system lives in cinema-home-content and cinema-sidebar.) */
