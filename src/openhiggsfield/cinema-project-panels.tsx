"use client";

import { useRef, useState } from "react";

import { useElements, ELEMENT_DEFAULTS, nextElementName } from "@/generation/stores/elements";
import { useProjectSurface } from "@/generation/stores/project-surface";
import { useProjects, projectLabel } from "@/generation/stores/projects";

import {
  decodeElementsCsv,
  encodeElementsCsv,
  elementsCsvFileName,
} from "./element-csv";
import type { RunRecord } from "./history";
import { DirectorPanel, ProjectChat } from "./project-screen";
import { ProjectDrillDownView, FoldersView, TrashView } from "./project-drill-down";
import {
  CubeIcon,
  FeedFilterIcon,
  FeedViewIcon,
  PlusIcon,
  SlidersIcon,
  UploadIcon,
} from "./icons";

/* The project surface inside the cinematic mode — Higgsfield's project route
   measured (2026-11-03, CDP). Standing in a project swaps the whole studio:
   the rail becomes the project's own navigation (see cinema-sidebar) and this
   column takes the stage. HF keeps a header strip over the panel — the project
   name on the left, the 작업 클러스터 (필터·보기·업로드·공유·게시) on the right —
   and the panel itself reads from the ?brief=1 / ?elements=1 / settings route
   state, which locally is the store's `panel` field. Every panel is scoped to
   the project it stands in. */

const CLUSTER_ITEMS: ReadonlyArray<{ label: string; icon: "filter" | "view" | "upload"; note: string }> = [
  { label: "필터", icon: "filter", note: "Screen mirror — the feed's filters live in general mode." },
  { label: "보기", icon: "view", note: "Screen mirror — gallery layouts live in general mode." },
  { label: "업로드", icon: "upload", note: "Screen mirror — uploads ride the dock's asset tray here." },
];

/* HF의 클러스터에 있는 공유/게시 단추는 플랫폼 전용 기능(결제·게시)이므로
   로컬에서는 화면 미러로만 놓는다. */
function ProjectHeader({ label }: { label: string }) {
  return (
    <header className="ohf-cproj-head">
      <span className="ohf-cproj-crumb">{label}</span>
      <div className="ohf-cproj-cluster">
        {CLUSTER_ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            className="ohf-cproj-chip"
            data-off
            aria-disabled="true"
            title={item.note}
          >
            {item.icon === "filter" && <FeedFilterIcon size={16} />}
            {item.icon === "view" && <FeedViewIcon size={16} />}
            {item.icon === "upload" && <UploadIcon size={13} />}
            <span className="ohf-cproj-chip-label">{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="ohf-cproj-chip"
          data-off
          aria-disabled="true"
          title="Screen mirror — sharing and publishing live on higgsfield.ai."
        >
          <span className="ohf-cproj-chip-label">공유</span>
        </button>
        <button
          type="button"
          className="ohf-cproj-chip"
          data-off
          aria-disabled="true"
          title="Screen mirror — publishing lives on higgsfield.ai."
        >
          <span className="ohf-cproj-chip-label">게시</span>
        </button>
      </div>
    </header>
  );
}


/* 브리프 — HF의 프로젝트 브리프 창은 AI 디렉터 대화창이다(?brief=1). 로컬에서는
   실제 AI 디렉터 패널이 그대로 그 자리를 채우고, HF에서 실측한 시작 프롬프트
   세 줄이 프롬프트 상자에 실제로 채워진다. */
const BRIEF_STARTERS: ReadonlyArray<string> = [
  "스크립트 작성하기",
  "SF 추격 장면 8샷 스토리보드 생성하기",
  "15초 시네마틱 향수 광고 만들기",
];

function ProjectBrief({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="ohf-cproj-brief">
      <DirectorPanel onOpenSettings={onOpenSettings} starters={BRIEF_STARTERS} />
    </div>
  );
}

/* 프로젝트 설정 — HF의 /project/settings?tab=general 창. 일반 탭만 로컬에서
   진짜로 작동한다(이름은 실제 저장에 붙는다). 슬러그와 설명, 나머지 탭은 로컬에
   없는 것이므로 화면 미러로 놓는다. */
function ProjectSettings({ projectId }: { projectId: string }) {
  const projects = useProjects((state) => state.projects);
  const renameProject = useProjects((state) => state.renameProject);
  const project = projects.find((p) => p.id === projectId);
  const [name, setName] = useState(project?.name ?? "");

  const TABS: ReadonlyArray<{ key: string; label: string; live: boolean; note?: string }> = [
    { key: "general", label: "일반", live: true },
    { key: "members", label: "멤버", live: false, note: "Screen mirror — invites sit behind a paid plan we do not run." },
    { key: "roles", label: "역할 및 권한", live: false, note: "Screen mirror — roles belong to the hosted service." },
    { key: "usage", label: "사용량 통계", live: false, note: "Screen mirror — usage is metered on higgsfield.ai." },
    { key: "requests", label: "요청", live: false, note: "Screen mirror — request logs live on higgsfield.ai." },
    { key: "details", label: "세부 정보", live: false, note: "Screen mirror — hosted metadata is unavailable here." },
  ];

  return (
    <div className="ohf-cproj-settings">
      <div className="ohf-cproj-tabs" role="tablist" aria-label="설정 섹션">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.live}
            className={"ohf-cproj-tab" + (tab.live ? " ohf-cproj-tab--on" : "")}
            data-off={tab.live ? undefined : true}
            aria-disabled={tab.live ? undefined : "true"}
            title={tab.note}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ohf-cproj-fields">
        <label className="ohf-cproj-field">
          <span className="ohf-cproj-field-label">프로젝트 이름</span>
          <input
            className="ohf-cproj-input"
            value={name}
            placeholder="프로젝트 이름"
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const trimmed = name.trim();
              if (project && trimmed && trimmed !== project.name) renameProject(project.id, trimmed);
            }}
          />
        </label>
        <label className="ohf-cproj-field">
          <span className="ohf-cproj-field-label">프로젝트 슬러그</span>
          <input
            className="ohf-cproj-input"
            value={project?.id ?? ""}
            readOnly
            aria-disabled="true"
            data-off
            title="Screen mirror — this build has no project URLs to slug."
          />
          <span className="ohf-cproj-field-help">
            프로젝트 URL에 사용돼요. 변경하면 이미 공유한 링크가 작동하지 않아요.
          </span>
        </label>
        <label className="ohf-cproj-field">
          <span className="ohf-cproj-field-label">설명</span>
          <textarea
            className="ohf-cproj-input ohf-cproj-input--area"
            placeholder="프로젝트를 설명해 주세요"
            rows={3}
            readOnly
            aria-disabled="true"
            data-off
            title="Screen mirror — project descriptions are not stored here."
          />
          <span className="ohf-cproj-field-help">
            프로젝트 카드와 게시된 페이지에 표시되는 짧은 요약이에요
          </span>
        </label>
      </div>
    </div>
  );
}

/* 요소 — HF의 ?elements=1 창. 로컬의 요소 기록이 그대로 이 프로젝트를 따라
   온다: 목록은 이 프로젝트에 속한 것만 보이고, 필터·검색은 실제로 작동한다.
   CSV 내보내기·가져오기·새로 추가도 실제 파일과 저장에 붙는다. */
const ELEMENT_TABS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "all", label: "전체" },
  { key: "character", label: "캐릭터" },
  { key: "place", label: "장소" },
  { key: "prop", label: "소품" },
];

function ProjectElements({ projectId }: { projectId: string }) {
  const items = useElements((state) => state.items);
  const add = useElements((state) => state.add);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const mine = items.filter((item) => item.projectId === projectId);
  const shown = mine
    .filter((item) => tab === "all" || item.category === tab)
    .filter((item) => !query.trim() || item.name.toLowerCase().includes(query.trim().toLowerCase()));

  const downloadCsv = () => {
    const blob = new Blob([encodeElementsCsv(mine)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = elementsCsvFileName();
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = decodeElementsCsv(String(reader.result ?? ""));
      for (const item of result.items) {
        add({ ...item, projectId: item.projectId && item.projectId !== "default" ? item.projectId : projectId });
      }
    };
    reader.readAsText(file);
  };

  const createOne = () => {
    add({
      ...ELEMENT_DEFAULTS,
      id: `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: nextElementName(items),
      url: "",
      projectId,
    });
  };

  return (
    <div className="ohf-cproj-elements">
      <div className="ohf-cproj-elbar">
        <span className="ohf-cproj-elcount">전체 {mine.length}</span>
        <button type="button" className="ohf-cproj-elbtn" onClick={() => fileRef.current?.click()}>
          가져오기
        </button>
        <button type="button" className="ohf-cproj-elbtn" onClick={downloadCsv} disabled={mine.length === 0}>
          CSV 내보내기
        </button>
        <button type="button" className="ohf-cproj-elbtn ohf-cproj-elbtn--new" onClick={createOne}>
          <PlusIcon size={14} />
          <span>새로 추가</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="ohf-cproj-hidden-file"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importCsv(file);
            e.target.value = "";
          }}
        />
      </div>
      <div className="ohf-cproj-elcats">
        {ELEMENT_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={"ohf-cproj-elcat" + (tab === t.key ? " ohf-cproj-elcat--on" : "")}
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <input
          className="ohf-cproj-elsearch"
          value={query}
          placeholder="검색"
          aria-label="요소 검색"
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="ohf-cproj-eltool" data-off aria-disabled="true" title="Screen mirror — element filters are not stored here.">
          <SlidersIcon size={14} />
        </button>
        <button type="button" className="ohf-cproj-eltool" data-off aria-disabled="true" title="Screen mirror — element layouts are fixed here.">
          <CubeIcon size={16} />
        </button>
      </div>
      {shown.length === 0 ? (
        <div className="ohf-cproj-el-empty">
          <p className="ohf-cproj-empty-title">아직 요소가 없어요</p>
          <p className="ohf-cproj-empty-sub">
            요소를 생성해서 모든 프로젝트에서 일관되게 사용해 보세요
          </p>
          <button type="button" className="ohf-cproj-elcreate" onClick={createOne}>
            요소 만들기
          </button>
          <ul className="ohf-cproj-elhints">
            <li>
              프롬프트 박스에 추가하기
              <button type="button" className="ohf-cproj-elcreate" onClick={createOne}>요소 만들기</button>
            </li>
            <li>
              일관성 유지에 사용해 보세요
              <button type="button" className="ohf-cproj-elcreate" onClick={createOne}>요소 만들기</button>
            </li>
          </ul>
        </div>
      ) : (
        <div className="ohf-cproj-ellist" aria-label="요소 목록">
          {shown.map((item) => (
            <div key={item.id} className="ohf-cproj-elrow">
              <span className="ohf-cproj-elthumb">
                {item.url ? <img src={item.url} alt="" loading="lazy" /> : <CubeIcon size={16} />}
              </span>
              <span className="ohf-cproj-elname">{item.name}</span>
              <span className="ohf-cproj-elid">{item.elementId || item.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 채팅·AI 디렉터 — 로컬 패널 그대로 이 프로젝트를 무대로 다시 얹는다. */
function ProjectChatPanel() {
  return (
    <div className="ohf-cproj-chat">
      <ProjectChat />
    </div>
  );
}

function ProjectDirectorPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="ohf-cproj-director">
      <DirectorPanel onOpenSettings={onOpenSettings} />
    </div>
  );
}

/** The whole project column: header strip on top, the chosen panel below.
    Rendered by the cinema screen in place of the stage while a surface is
    open; the dock keeps its own corner unchanged, exactly as HF keeps the
    composer while a project is up. */
export function CinemaProjectSurface({ history }: { history: RunRecord[] }) {
  const projectId = useProjectSurface((state) => state.projectId);
  const panel = useProjectSurface((state) => state.panel);
  const setPanel = useProjectSurface((state) => state.setPanel);
  const projects = useProjects((state) => state.projects);
  if (!projectId) return null;
  const label = projectLabel(projects, projectId);
  const openSettings = () => setPanel("settings");

  return (
    <section className="ohf-cproj" aria-label={`${label} 프로젝트`}>
      {panel === "assets" ? (
        /* The project drill-down screen — breadcrumb + folder panel + assets +
           recommendation rail. Carries its own header, so the cluster strip is
           left out here, exactly as HF's drill-down page has no cluster. */
        <ProjectDrillDownView projectId={projectId} history={history} />
      ) : panel === "folders" ? (
        <FoldersView projectId={projectId} history={history} />
      ) : panel === "trash" ? (
        <TrashView projectId={projectId} history={history} />
      ) : (
        <>
          <ProjectHeader label={label} />
          <div className="ohf-cproj-body">
            {panel === "brief" && <ProjectBrief onOpenSettings={openSettings} />}
            {panel === "settings" && <ProjectSettings projectId={projectId} />}
            {panel === "elements" && <ProjectElements projectId={projectId} />}
            {panel === "chat" && <ProjectChatPanel />}
            {panel === "director" && <ProjectDirectorPanel onOpenSettings={openSettings} />}
          </div>
        </>
      )}
    </section>
  );
}

/* The rail's own marks live in cinema-sidebar — the project rows and this
   column share the store, not an icon table. */
