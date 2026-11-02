"use client";

import { type ReactNode } from "react";

import { getModel } from "@/generation/catalog";
import { useActive } from "@/generation/stores/active";

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
}: {
  /** The studio composer, already wired by the app — docked at the foot. */
  composer: ReactNode;
  /** The cinematic model rail (the app's own cinema panel). */
  rail: ReactNode;
}) {
  const modelId = useActive((state) => state.model);
  const model = getModel(modelId);

  return (
    <div className="ohf-cinema-screen">
      <div className="ohf-cinema-body">
        <div className="ohf-cinema-rail-col">
          {rail}
        </div>
        <main className="ohf-cinema-canvas">
          <div className="ohf-cinema-stage">
            <h2 className="ohf-cinema-stage-title">Cinematic Studio</h2>
            <p className="ohf-cinema-stage-note">
              {model.label} · 아래 컴포저에서 모델과 모드를 골라 생성합니다. 왼쪽 사이드바는 HG와 같은
              메뉴·프로젝트 레일입니다.
            </p>
          </div>
          <div className="ohf-cinema-dock">{composer}</div>
        </main>
      </div>
    </div>
  );
}
