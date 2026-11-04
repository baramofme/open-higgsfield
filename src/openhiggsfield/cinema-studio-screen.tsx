"use client";

import { type ReactNode } from "react";

import { useProjectSurface } from "@/generation/stores/project-surface";
import { type ElementItem } from "@/generation/stores/elements";

import { CinemaProjectSurface } from "./cinema-project-panels";
import { CinemaHomeContent } from "./cinema-home-content";
import { CinemaTileView } from "./cinema-tile-view";
import type { RunRecord } from "./history";

/* The Cinematic Studio opens as its OWN surface, the way higgsfield.ai/ko/generate
   is a separate page rather than a panel bolted onto the dashboard: a full-screen
   layout around a left model rail and a centred generation stage, with the
   composer docked along the bottom. It replaces the entire main shell while it is
   up, so none of the general layout (topbar, feed header, masonry gallery) rides
   on top of it — no overlap. Unlike 'oh origin' (higgsfield.ai/ko/generate), which
   keeps only the persistent global nav at the top and has no bespoke cinema header,
   this screen no longer carries its own `ohf-cinema-top` bar; there is no bespoke
   control strip either — the left rail carries only the model sidebar, and
   navigation (including the way back to the general studio) is the sidebar's
   responsibility, mirroring HF, whose /ko/generate has no such strip. The mode
   plate rides the dock's left edge, outside the composer box, mirroring the
   reference. */

export function CinemaStudioScreen({
  composer,
  rail,
  history,
  onOpenRun,
  onShowFailure,
  onOpenElement,
}: {
  /** The studio composer, already wired by the app — docked at the foot. */
  composer: ReactNode;
  /** The cinematic model rail (the app's own cinema panel). */
  rail: ReactNode;
  /** Finished runs, so a project surface can show the work filed under it. */
  history: RunRecord[];
  /** Opens the showcase for a finished generation tile (내 생성 · 내 즐겨찾기). */
  onOpenRun?: (id: string) => void;
  /** Opens the failure detail for a failed generation tile. */
  onShowFailure?: (id: string) => void;
  /** Opens the showcase for a 내 요소 tile. */
  onOpenElement?: (element: ElementItem) => void;
}) {
  const surfaceId = useProjectSurface((state) => state.projectId);
  const cinemaView = useProjectSurface((state) => state.cinemaView);

  return (
    <div className="ohf-cinema-screen">
      <div className="ohf-cinema-body">
        <div className="ohf-cinema-rail-col">
          {rail}
        </div>
        <main className="ohf-cinema-canvas">
          {/* 서 있는 프로젝트가 있으면 무대가 그 프로젝트의 기둥으로 통째
              갈아끼워진다(HF의 프로젝트 경로가 레일과 본문을 함께 바꾸는 것과
              같게). 프로젝트가 없으면 사이드바가 고른 cinemaView에 따라
              타일 갈러리 또는 모델 안내가 무대에 남는다. */}
          {surfaceId ? (
            <CinemaProjectSurface history={history} />
          ) : cinemaView ? (
            <CinemaTileView
              view={cinemaView}
              history={history}
              onOpenRun={onOpenRun}
              onShowFailure={onShowFailure}
              onOpenElement={onOpenElement}
            />
          ) : (
            <CinemaHomeContent history={history} />
          )}
          <div className="ohf-cinema-dock">{composer}</div>
        </main>
      </div>
    </div>
  );
}
