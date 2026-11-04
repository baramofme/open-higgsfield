"use client";

/* Tile grid view rendered inside the cinema canvas when the sidebar's
   내 생성 · 내 요소 · 내 즐겨찾기 buttons set cinemaView. The grid mirrors HF's
   Cinema Studio layout: uniform tile cards, image thumbnail, title overlay,
   hover scale. Empty states use the same language as the project feed's
   empty state ("아직 아무것도 없어요"). */

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

/* ── Empty state ──────────────────────────────────────────────────────────── */

function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="ohf-cine-tile-empty">
      <p className="ohf-cine-tile-empty-title">{title}</p>
      <p className="ohf-cine-tile-empty-sub">{sub}</p>
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

    if (items.length === 0) {
      return (
        <section className="ohf-cine-tile-view" aria-label="내 생성">
          <h3 className="ohf-cine-tile-view-title">내 생성</h3>
          <EmptyState
            title="아직 아무것도 없어요"
            sub={'아래 컴포저에서 장면을 설명하고 "생성하기"를 눌러 시작해 보세요.'}
          />
        </section>
      );
    }

    return (
      <section className="ohf-cine-tile-view" aria-label="내 생성">
        <h3 className="ohf-cine-tile-view-title">내 생성</h3>
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
      </section>
    );
  }

  if (view === "elements") {
    if (elements.length === 0) {
      return (
        <section className="ohf-cine-tile-view" aria-label="내 요소">
          <h3 className="ohf-cine-tile-view-title">내 요소</h3>
          <EmptyState
            title="아직 요소가 없어요"
            sub="요소를 생성해서 모든 프로젝트에서 일관되게 사용해 보세요."
          />
        </section>
      );
    }

    return (
      <section className="ohf-cine-tile-view" aria-label="내 요소">
        <h3 className="ohf-cine-tile-view-title">내 요소</h3>
        <div className="ohf-cine-tile-grid">
          {elements.map((item) => (
            <ElementTile key={item.id} element={item} onOpenElement={onOpenElement} />
          ))}
        </div>
      </section>
    );
  }

  // view === "favorites"
  const favorites = history
    .filter((r) => r.favorite === true && r.status === "completed")
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);

  if (favorites.length === 0) {
    return (
      <section className="ohf-cine-tile-view" aria-label="내 즐겨찾기">
        <h3 className="ohf-cine-tile-view-title">내 즐겨찾기</h3>
        <EmptyState
          title="즐겨찾기한 생성이 없어요"
          sub="갈러리의 하트 아이콘을 눌러 생성을 즐겨찾기에 담아 보세요."
        />
      </section>
    );
  }

  return (
    <section className="ohf-cine-tile-view" aria-label="내 즐겨찾기">
      <h3 className="ohf-cine-tile-view-title">내 즐겨찾기</h3>
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
    </section>
  );
}
