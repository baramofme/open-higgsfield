"use client";

/* HF drill-down static screens → OHF, token-styled (card t_2eae8ad5).
 *
 * Every style VALUE in openhiggsfield.css's "drill-down" block traces to a CDP
 * measurement recorded in captures/measured-styles.md (deep-regions.json,
 * pub-project-folders.json, community-projects.json; the auth project-3 inline
 * folder/trash came from auth-drilldown.json on the authenticated CDP :9223).
 * No value is designed or guessed. The 3-layer tokens are reused, never
 * redesigned: --ohf-* primitives + --ohf-on-dark-* roles, re-exposed here under
 * one component-local --drill-* namespace, exactly like the control-plane's
 * --ctl-* aliases — never re-declared here.
 *
 * Ground truth source of truth (per surface):
 *   breadcrumb + recommendation rail  → deep-regions.json (public drill-down
 *     /ko/@higgsfield.studio/projects/cully-hill-boys, 1440×900)
 *   folder panel (220px w-55, rows 36px, expander 24×24, count 40×24)
 *     → pub-project-folders.json
 *   project card (329×186, rounded-10, aspect 1.7647) → community-projects.json
 *   inline folder/trash in a working project → auth-drilldown.json (authed,
 *     same structure as OHF's existing --project rail)
 *
 * HF's folders/<uuid> and trash pages redirect for every capture (they are not
 * standalone-capturable); their content lives INLINE in the project page, so
 * these screens are rebuilt from the inline + public folder-panel measurements.
 * Hosted-only behaviour (folder move, trash delete/restore) stays honest-inert
 * exactly as the surrounding project rail does. */

import { useMemo, useState } from "react";

import { useProjects, projectLabel } from "@/generation/stores/projects";
import { useProjectSurface } from "@/generation/stores/project-surface";

import { timeAgo, type RunRecord } from "./history";
import {
  AssetsIcon,
  CaretDownIcon,
  FolderIcon,
  ImageIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
  TrashIcon,
  VideoIcon,
  WaveBadgeIcon,
} from "./icons";

/* A folder is a grouping of the project's own runs. HF shows named folders
   (ACT, Regenerations, PRE PROD); locally we have no folder backend, so the
   rows are honest: they group the runs by what they are (image / video /
   audio). The count on each row is a real local count, never a copied HF one. */
type DrillFolder = {
  key: string;
  label: string;
  count: number;
  records: RunRecord[];
};

function groupFolders(history: RunRecord[], projectId: string): DrillFolder[] {
  const mine = history.filter((r) => (r.projectId ?? "default") === projectId);
  const buckets = new Map<string, RunRecord[]>();
  for (const record of mine) {
    const key = record.kind;
    const list = buckets.get(key) ?? [];
    list.push(record);
    buckets.set(key, list);
  }
  const order = ["video", "image", "audio"];
  const folders: DrillFolder[] = [];
  for (const key of order) {
    const list = buckets.get(key);
    if (list && list.length) {
      folders.push({
        key,
        label: key === "video" ? "비디오" : key === "image" ? "이미지" : "오디오",
        count: list.length,
        records: list.slice().sort((a, b) => b.createdAt - a.createdAt),
      });
    }
  }
  return folders;
}

function tileIcon(kind: RunRecord["kind"]) {
  if (kind === "video") return <VideoIcon size={16} />;
  if (kind === "audio") return <WaveBadgeIcon size={16} />;
  return <ImageIcon size={16} />;
}

/* ── breadcrumb — HF's nav[aria-label=탐색 경로] ─────────────────────────────
   r=16,62 1393×20 · ol flex gap-4 items-center overflow-hidden · li flex min-w-0
   items-center shrink-0 · link truncate 14px/400 lh20 rgb(137,138,139)
   hover:white · separator "/" 14px/500 lh20 secondary · current flex-1 truncate.
   The auth project-3 page carries NO breadcrumb (crumbs=0 in auth-drilldown.json);
   it belongs to the public drill-down, so this is the drill-down header only. */
function DrillBreadcrumb({
  rootLabel,
  rootHref,
  current,
}: {
  rootLabel: string;
  rootHref: string;
  current: string;
}) {
  return (
    <nav className="ohf-drill-crumb" aria-label="탐색 경로">
      <ol className="ohf-drill-crumb-list">
        <li className="ohf-drill-crumb-item">
          <a className="ohf-drill-crumb-link" href={rootHref}>
            {rootLabel}
          </a>
        </li>
        <li className="ohf-drill-crumb-sep" aria-hidden="true">
          <span className="ohf-drill-crumb-sep-mark">/</span>
        </li>
        <li className="ohf-drill-crumb-item ohf-drill-crumb-item--current">
          <span className="ohf-drill-crumb-current">{current}</span>
        </li>
      </ol>
    </nav>
  );
}

/* ── folder panel — HF's 220px w-55 folder list ──────────────────────────────
   root 220×714 p-2 (8px) border-r 1px rgb(43,43,43) flex-col · inner flex-col
   gap-2 (8px) · header h-7 (28px) px-2 py-1.5, "폴더" 14px/500 lh16 #828282 ·
   scroll flex-col gap-0.5 (2px) overflow auto · row button h-9 (36px) rounded-xl
   (12px) pl-6 pr-6 gap-2 (8px) 14px/500 lh16, selected bg rgba(255,255,255,.1),
   hover rgba(255,255,255,.05), active scale(.96) · icon chip size-6 24×24 ·
   count h-6 min-w-6 12px/500 lh16 #828282 · expander 24×24 rounded-lg. */
function FolderPanel({
  allCount,
  trashCount,
  folders,
  selectedKey,
  expanded,
  onToggle,
  onOpenAll,
  onOpenFolder,
  onAddFolder,
  onOpenTrash,
}: {
  allCount: number;
  trashCount: number;
  folders: DrillFolder[];
  selectedKey: string | null;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onOpenAll: () => void;
  onOpenFolder: (key: string) => void;
  onAddFolder: () => void;
  onOpenTrash: () => void;
}) {
  return (
    <aside className="ohf-drill-folder" aria-label="폴더">
      <div className="ohf-drill-folder-col">
        <div className="ohf-drill-folder-head">
          <p className="ohf-drill-folder-title">폴더</p>
          <div className="ohf-drill-folder-tools">
            <button
              type="button"
              className="ohf-drill-folder-tool"
              data-off
              aria-disabled="true"
              aria-label="폴더 검색"
              title="Screen mirror — folder search is hosted on higgsfield.ai."
            >
              <SearchIcon size={14} />
            </button>
            <button
              type="button"
              className="ohf-drill-folder-tool"
              data-off
              aria-disabled="true"
              aria-label="폴더 정렬"
              title="Screen mirror — folder sorting is hosted on higgsfield.ai."
            >
              <SlidersIcon size={14} />
            </button>
          </div>
        </div>

        <div className="ohf-drill-folder-scroll">
          <div className="ohf-drill-folder-list">
            <div className="ohf-drill-row" data-selected={selectedKey === null ? "true" : undefined}>
              <button
                type="button"
                className="ohf-drill-row-hit"
                onClick={onOpenAll}
                aria-label="모든 에셋"
              >
                <span className="ohf-drill-row-icon">
                  <AssetsIcon size={16} />
                </span>
                <span className="ohf-drill-row-label">모든 에셋</span>
                <span className="ohf-drill-row-count">{allCount}</span>
              </button>
            </div>

            {folders.map((folder) => {
              const open = expanded.has(folder.key);
              const selected = selectedKey === folder.key;
              return (
                <div key={folder.key}>
                  <div
                    className="ohf-drill-row"
                    data-selected={selected ? "true" : undefined}
                  >
                    <button
                      type="button"
                      className="ohf-drill-row-expander"
                      aria-label={`${folder.label} 폴더 펼치기`}
                      aria-expanded={open}
                      onClick={() => onToggle(folder.key)}
                    >
                      <span
                        className="ohf-drill-expander-caret"
                        data-open={open ? "true" : undefined}
                      >
                        <CaretDownIcon size={16} />
                      </span>
                    </button>
                    <button
                      type="button"
                      className="ohf-drill-row-hit"
                      onClick={() => onOpenFolder(folder.key)}
                      aria-label={folder.label}
                    >
                      <span className="ohf-drill-row-icon">
                        <FolderIcon size={16} />
                      </span>
                      <span className="ohf-drill-row-label">{folder.label}</span>
                      <span className="ohf-drill-row-count">{folder.count}</span>
                    </button>
                  </div>

                  {open &&
                    folder.records.slice(0, 6).map((record) => (
                      <div key={record.id} className="ohf-drill-nest">
                        <button
                          type="button"
                          className="ohf-drill-nest-hit"
                          data-off
                          aria-disabled="true"
                          title="Screen mirror — opening a single asset is hosted on higgsfield.ai."
                        >
                          <span className="ohf-drill-row-icon">{tileIcon(record.kind)}</span>
                          <span className="ohf-drill-nest-label">
                            {record.prompt || record.modelLabel}
                          </span>
                        </button>
                      </div>
                    ))}
                </div>
              );
            })}

            <button
              type="button"
              className="ohf-drill-add"
              onClick={onAddFolder}
              aria-label="폴더 추가"
            >
              <span className="ohf-drill-row-icon">
                <PlusIcon size={14} />
              </span>
              <span className="ohf-drill-row-label">폴더 추가</span>
            </button>

            <button
              type="button"
              className="ohf-drill-row ohf-drill-row--standalone"
              onClick={onOpenTrash}
              aria-label="휴지통"
            >
              <span className="ohf-drill-row-icon">
                <TrashIcon size={16} />
              </span>
              <span className="ohf-drill-row-label">휴지통</span>
              <span className="ohf-drill-row-count">{trashCount}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── recommendation rail — right column, "전체 프로젝트 보기" + tiles ─────────
   rail flex-col gap-2 (8px) · tile 383×119 group flex items-start gap-3 (12px)
   px-0 · thumb w-[min(55cqi,31.25rem)]→211×119 aspect-video rounded-xl (12px)
   object-cover · title 14px/500 lh20 white hover:brand line-clamp-3 ·
   secondary flex-col 12px/400 lh18 #828282, two truncate lines mt-2 (2px). */
function RecommendRail({ records }: { records: RunRecord[] }) {
  if (records.length === 0) return null;
  const tiles = records.slice(0, 20);
  return (
    <aside className="ohf-drill-rail" aria-label="추천">
      <h2 className="ohf-drill-rail-head">전체 프로젝트 보기</h2>
      <div className="ohf-drill-rail-list">
        {tiles.map((record) => (
          <a
            key={record.id}
            className="ohf-drill-tile"
            href="#openhiggsfield"
            data-off
            aria-disabled="true"
            title="Screen mirror — recommendations live on higgsfield.ai."
          >
            <span className="ohf-drill-tile-thumb">
              {record.status === "completed" && record.urls[0] ? (
                record.kind === "image" ? (
                  <img className="ohf-drill-tile-media" src={record.urls[0]} alt={record.prompt} loading="lazy" />
                ) : (
                  <video
                    className="ohf-drill-tile-media"
                    src={record.urls[0]}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                )
              ) : (
                <span className="ohf-drill-tile-art" style={{ background: record.art }} />
              )}
            </span>
            <span className="ohf-drill-tile-text">
              <span className="ohf-drill-tile-title">{record.prompt || record.modelLabel}</span>
              <span className="ohf-drill-tile-meta">
                <span className="ohf-drill-tile-meta-line">{record.modelLabel}</span>
                <span className="ohf-drill-tile-meta-line">{timeAgo(record.createdAt)}</span>
              </span>
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}

/* ── project card grid — HF community-project-card ──────────────────────────
   card 329×186 rounded-10 (10px) overflow-hidden · cover aspect 1.7647
   bg rgb(28,30,33) #1c1e21 · grid 4 cols ×329 colGap 20px rowGap 20px.
   For a working project OHF shows its runs as this grid. */
function ProjectCardsGrid({ records }: { records: RunRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="ohf-drill-empty">
        <p className="ohf-drill-empty-title">아직 아무것도 없어요</p>
        <p className="ohf-drill-empty-sub">
          장면을 설명하고 “생성하기”를 눌러 시작해 보세요
        </p>
      </div>
    );
  }
  return (
    <div className="ohf-drill-grid" aria-label="프로젝트 에셋">
      {records.map((record) => (
        <article key={record.id} className="ohf-drill-card">
          <div className="ohf-drill-card-cover">
            {record.status === "completed" && record.urls[0] ? (
              record.kind === "image" ? (
                <img className="ohf-drill-card-media" src={record.urls[0]} alt={record.prompt} loading="lazy" />
              ) : (
                <video
                  className="ohf-drill-card-media"
                  src={record.urls[0]}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              )
            ) : (
              <span className="ohf-drill-card-art" style={{ background: record.art }} />
            )}
            <span className="ohf-drill-card-shade" aria-hidden="true" />
            <span className="ohf-drill-card-foot">
              <span className="ohf-drill-card-name">{record.prompt || record.modelLabel}</span>
              <span className="ohf-drill-card-sub">
                {record.modelLabel} · {timeAgo(record.createdAt)}
              </span>
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ── screen 1 — project drill-down (breadcrumb + folder panel + assets + rail) */
export function ProjectDrillDownView({
  projectId,
  history,
}: {
  projectId: string;
  history: RunRecord[];
}) {
  const projects = useProjects((s) => s.projects);
  const label = projectLabel(projects, projectId);
  const setPanel = useProjectSurface((s) => s.setPanel);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const mine = useMemo(
    () =>
      history
        .filter((r) => (r.projectId ?? "default") === projectId)
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt),
    [history, projectId],
  );
  const folders = useMemo(() => groupFolders(history, projectId), [history, projectId]);

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="ohf-drill" data-view="assets">
      <DrillBreadcrumb rootLabel="커뮤니티" rootHref="#community" current={label} />
      <div className="ohf-drill-body">
        <FolderPanel
          allCount={mine.length}
          trashCount={0}
          folders={folders}
          selectedKey={null}
          expanded={expanded}
          onToggle={toggle}
          onOpenAll={() => setPanel("assets")}
          onOpenFolder={(key) => {
            setExpanded((c) => new Set(c).add(key));
            setPanel("folders");
          }}
          onAddFolder={() => setPanel("folders")}
          onOpenTrash={() => setPanel("trash")}
        />
        <div className="ohf-drill-main">
          <ProjectCardsGrid records={mine} />
        </div>
        <RecommendRail records={history} />
      </div>
    </div>
  );
}

/* ── screen 2 — folders/<uuid> (breadcrumb path + folder panel + folder's
   assets). HF's /folders/<uuid> redirects; the folder content lives inline, so
   this shows the selected folder's real runs next to the folder panel. */
export function FoldersView({
  projectId,
  history,
}: {
  projectId: string;
  history: RunRecord[];
}) {
  const projects = useProjects((s) => s.projects);
  const label = projectLabel(projects, projectId);
  const setPanel = useProjectSurface((s) => s.setPanel);
  const folders = useMemo(() => groupFolders(history, projectId), [history, projectId]);
  const selectedKey = folders[0]?.key ?? null;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((f) => f.key)));
  const selected = folders.find((f) => f.key === selectedKey) ?? null;
  const mine = useMemo(
    () => history.filter((r) => (r.projectId ?? "default") === projectId),
    [history, projectId],
  );

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="ohf-drill" data-view="folders">
      <DrillBreadcrumb
        rootLabel="프로젝트"
        rootHref="#project"
        current={selected ? `${label} / ${selected.label}` : label}
      />
      <div className="ohf-drill-body ohf-drill-body--two">
        <FolderPanel
          allCount={mine.length}
          trashCount={0}
          folders={folders}
          selectedKey={selectedKey}
          expanded={expanded}
          onToggle={toggle}
          onOpenAll={() => setPanel("assets")}
          onOpenFolder={(key) => {
            setExpanded((c) => new Set(c).add(key));
            setPanel("folders");
          }}
          onAddFolder={() => setPanel("folders")}
          onOpenTrash={() => setPanel("trash")}
        />
        <div className="ohf-drill-main">
          <ProjectCardsGrid records={selected ? selected.records : []} />
        </div>
      </div>
    </div>
  );
}

/* ── screen 3 — trash. HF's /trash redirects to the generate surface; the
   delete/restore action is hosted. Locally nothing was deleted, so the trash is
   honestly empty — the empty wording traces to HF's own empty states. */
export function TrashView({
  projectId,
  history,
}: {
  projectId: string;
  history: RunRecord[];
}) {
  const projects = useProjects((s) => s.projects);
  const label = projectLabel(projects, projectId);
  const setPanel = useProjectSurface((s) => s.setPanel);
  const folders = useMemo(() => groupFolders(history, projectId), [history, projectId]);
  const mine = useMemo(
    () => history.filter((r) => (r.projectId ?? "default") === projectId),
    [history, projectId],
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="ohf-drill" data-view="trash">
      <DrillBreadcrumb rootLabel="프로젝트" rootHref="#project" current={`${label} / 휴지통`} />
      <div className="ohf-drill-body ohf-drill-body--two">
        <FolderPanel
          allCount={mine.length}
          trashCount={0}
          folders={folders}
          selectedKey="trash"
          expanded={expanded}
          onToggle={toggle}
          onOpenAll={() => setPanel("assets")}
          onOpenFolder={(key) => {
            setExpanded((c) => new Set(c).add(key));
            setPanel("folders");
          }}
          onAddFolder={() => setPanel("folders")}
          onOpenTrash={() => setPanel("trash")}
        />
        <div className="ohf-drill-main">
          <div className="ohf-drill-trash">
            <p className="ohf-drill-empty-title">휴지통이 비어 있어요</p>
            <p className="ohf-drill-empty-sub">
              삭제한 에셋이 여기 모여요. 다시 복구하거나 완전히 지울 수 있어요.
            </p>
            <button
              type="button"
              className="ohf-drill-trash-btn"
              data-off
              aria-disabled="true"
              title="Screen mirror — restore and delete are hosted on higgsfield.ai."
            >
              <span>모두 복구</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
