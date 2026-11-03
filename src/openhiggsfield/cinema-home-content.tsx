"use client";

/* The cinematic studio HOME right-content panel — a faithful mirror of
   higgsfield.ai/ko/generate's scrollable content column (measured via CDP,
   2026-11-03). It renders the two content blocks HF shows on the home, top to
   bottom in the scroll flow:
     1. the hero: a centred max-1150 column carrying the scattered project
        thumbnail collage (HF's own poster stills, used as STATIC images — the
        user asked for HF pictures embedded and no video playback, which costs
        load time) and the gradient Space-Grotesk headline 스토리에 생명을 불어넣으세요;
        the large centre tile reveals a brand "둘러보기" button on hover, as HF does.
     2. 내 프로젝트: an auto-fill grid (minmax(min(260px,100%),1fr), 16px gutter)
        that opens with the always-present 새 프로젝트 만들기 card, then one card per
        local project. A project with finished runs shows HF's cover mosaic (a wide
        frame + two stacked squares); a project with none shows a neutral placeholder.
        Each footer carries the title, the 비공개 private chip + a lock mark, and a
        hover-revealed overflow trigger.
   The composer is NOT drawn here: the cinematic composer is docked at the foot of
   the canvas by the app (prior port), mirroring the reference architecture; this
   file owns only the scrollable content above it. */

import { useProjects } from "@/generation/stores/projects";
import { useProjectSurface } from "@/generation/stores/project-surface";

import type { RunRecord } from "./history";

/* HF's hero collage stills, downloaded from the origin's open-project posters.
   Positions are the CDP-measured scatter relative to the 687×166 collage stage;
   the centre tile (cully) is the wider one and carries the browse button. */
const HERO_TILES = [
  { src: "/cinema-studio-4/hero-hell-grind.webp", left: -150, top: 27, w: 200, poster: true },
  { src: "/cinema-studio-4/hero-zephyr.webp", left: 66, top: 27, w: 200, poster: true },
  { src: "/cinema-studio-4/hero-cully-hill-boys.webp", left: 205, top: 5, w: 277, browse: true },
  { src: "/cinema-studio-4/hero-hell-grind.webp", left: 421, top: 27, w: 200, poster: true },
  { src: "/cinema-studio-4/hero-zephyr.webp", left: 637, top: 27, w: 200, poster: true },
] as const;

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function HeroCollage() {
  return (
    <div className="ohf-cine-home-collage">
      {HERO_TILES.map((tile, i) => (
        <div
          key={i}
          className="ohf-cine-home-collage-item"
          style={{ left: `${tile.left}px`, top: `${tile.top}px`, width: `${tile.w}px` }}
        >
          <div className="ohf-cine-home-collage-frame">
            <img className="ohf-cine-home-collage-img" src={tile.src} alt="" loading="lazy" />
            <div className="ohf-cine-home-collage-scrim" />
          </div>
          {"browse" in tile && tile.browse ? (
            <a className="ohf-cine-home-browse" href="/ko/contest" aria-label="둘러보기">
              <span className="ohf-cine-home-browse-label">둘러보기</span>
              <ArrowGlyph />
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section className="ohf-cine-home-hero">
      <div className="ohf-cine-home-hero-clip">
        <div className="ohf-cine-home-hero-col">
          <HeroCollage />
          <h1 className="ohf-cine-home-title">스토리에 생명을 불어넣으세요</h1>
        </div>
      </div>
    </section>
  );
}

/* ── 내 프로젝트 ──────────────────────────────────────────────────────────── */

/* Completed image/video runs filed under a project, newest first — the pieces
   the cover mosaic is built from. */
function projectThumbs(history: RunRecord[], projectId: string): string[] {
  return history
    .filter(
      (r) =>
        r.projectId === projectId &&
        r.status === "completed" &&
        (r.kind === "image" || r.kind === "video") &&
        r.urls[0],
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => r.urls[0]);
}

/* HF's cover for a project that has work: one wide frame flexing beside a
   column of two stacked squares (8px between the pieces). With fewer than three
   pieces the mosaic degrades honestly to what the project actually holds. */
function CoverMosaic({ urls }: { urls: string[] }) {
  const wide = urls[0];
  const squares = urls.slice(1, 3);
  if (urls.length === 1) {
    return (
      <div className="ohf-cine-home-cover ohf-cine-home-cover--solo">
        <img className="ohf-cine-home-cover-piece" src={wide} alt="" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="ohf-cine-home-cover">
      <div className="ohf-cine-home-cover-wide">
        <img className="ohf-cine-home-cover-piece" src={wide} alt="" loading="lazy" />
      </div>
      <div className="ohf-cine-home-cover-col">
        {squares.map((u, i) => (
          <div key={i} className="ohf-cine-home-cover-square">
            <img className="ohf-cine-home-cover-piece" src={u} alt="" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* HF's cover for an empty project: a neutral film-frame outline, drawn in
   stroke like every other mark in the app. */
function CoverEmpty() {
  return (
    <div className="ohf-cine-home-cover-empty">
      <FilmGlyph />
    </div>
  );
}

/* The first card is always the create affordance — a rounded film frame holding
   a circled plus, labelled 새 프로젝트 만들기. */
function CreateCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button type="button" className="ohf-cine-home-card" onClick={onCreate}>
      <div className="ohf-cine-home-card-thumb">
        <span className="ohf-cine-home-create-icon">
          <PlusGlyph />
        </span>
      </div>
      <div className="ohf-cine-home-card-foot">
        <span className="ohf-cine-home-card-title">새 프로젝트 만들기</span>
      </div>
    </button>
  );
}

function ProjectCard({
  name,
  isPrivate,
  thumbs,
  onOpen,
}: {
  name: string;
  isPrivate: boolean;
  thumbs: string[];
  onOpen: () => void;
}) {
  return (
    <div className="ohf-cine-home-card" role="button" tabIndex={0} onClick={onOpen}>
      <div className="ohf-cine-home-card-thumb">
        {thumbs.length > 0 ? <CoverMosaic urls={thumbs} /> : <CoverEmpty />}
      </div>
      <div className="ohf-cine-home-card-foot">
        <span className="ohf-cine-home-card-title">{name}</span>
        {isPrivate ? (
          <span className="ohf-cine-home-priv">
            <span className="ohf-cine-home-priv-lock">
              <LockGlyph />
            </span>
            비공개
          </span>
        ) : null}
        <span className="ohf-cine-home-overflow">
          <MoreGlyph />
        </span>
      </div>
    </div>
  );
}

/* ── The home panel ───────────────────────────────────────────────────────── */

export function CinemaHomeContent({ history }: { history: RunRecord[] }) {
  const projects = useProjects((s) => s.projects);
  const addProject = useProjects((s) => s.addProject);
  const openSurface = useProjectSurface((s) => s.openSurface);

  return (
    <div className="ohf-cine-home">
      <Hero />
      <div className="ohf-cine-home-projects-wrap">
        <div className="ohf-cine-home-projects-inner">
          <section className="ohf-cine-home-projects" aria-label="내 프로젝트">
            <div className="ohf-cine-home-projects-head">
              <h2 className="ohf-cine-home-projects-title">내 프로젝트</h2>
            </div>
            <div className="ohf-cine-home-grid">
              <CreateCard onCreate={() => addProject("새 프로젝트")} />
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  name={p.name}
                  isPrivate={p.private}
                  thumbs={projectThumbs(history, p.id)}
                  onOpen={() => openSurface(p.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Inline stroke glyphs, one drawing system ─────────────────────────────── */

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MoreGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="12" cy="6" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="18" r="1.6" fill="currentColor" />
    </svg>
  );
}

function FilmGlyph() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <rect x="9" y="13" width="30" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 13v22M33 13v22" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
