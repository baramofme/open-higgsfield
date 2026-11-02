"use client";

import { type ReactNode } from "react";

import { getModel } from "@/generation/catalog";
import { useActive } from "@/generation/stores/active";

import { ChevronLeftIcon, KeyIcon } from "./icons";
import { LOCAL_USER } from "./local-user";

/* The Cinematic Studio opens as its OWN surface, the way higgsfield.ai/ko/generate
   is a separate page rather than a panel bolted onto the dashboard: a full-screen
   layout around a left model rail and a centred generation stage, with the
   composer docked along the bottom. It replaces the entire main shell while it is
   up, so none of the general layout (topbar, feed header, masonry gallery) rides
   on top of it — no overlap. Unlike 'oh origin' (higgsfield.ai/ko/generate), which
   keeps only the persistent global nav at the top and has no bespoke cinema header,
   this screen no longer carries its own `ohf-cinema-top` bar. The way back to the
   general studio and the platform-key lamp therefore live at the top of the left
   rail, so the platform key stays manageable on the screen. The mode plate rides
   the dock's left edge, outside the composer box, mirroring the reference. */

export function CinemaStudioScreen({
  onExit,
  composer,
  rail,
  busy,
  keyConfigured,
  onKeys,
}: {
  /** Leaves the cinematic surface and returns the dashboard. */
  onExit: () => void;
  /** The studio composer, already wired by the app — docked at the foot. */
  composer: ReactNode;
  /** The cinematic model rail (the app's own cinema panel). */
  rail: ReactNode;
  busy: boolean;
  keyConfigured: boolean;
  onKeys: () => void;
}) {
  const modelId = useActive((state) => state.model);
  const model = getModel(modelId);

  return (
    <div className="ohf-cinema-screen">
      <div className="ohf-cinema-body">
        <div className="ohf-cinema-rail-col">
          {/* The header is gone, so its two live controls move here: the only
              way back to the general studio, and the platform-key lamp. They
              reuse the header's own classes so the look is carried over (user
              ruling: the exit switch stays independent of the mode plate). */}
          <div className="ohf-cinema-railbar">
            <button
              type="button"
              className="ohf-cinema-exit"
              onClick={onExit}
              aria-label="일반 스튜디오로 돌아가기"
              title="Return to the general studio"
            >
              <ChevronLeftIcon />
              <span>일반 스튜디오</span>
            </button>
            <button
              type="button"
              className="ohf-key"
              data-busy={busy}
              data-ready={keyConfigured}
              onClick={onKeys}
              aria-label={keyConfigured ? "Edit platform key" : "Add platform key"}
              title={keyConfigured ? "Edit platform key" : "Add platform key"}
            >
              <KeyIcon />
              <span className="ohf-key-text">{keyConfigured ? "Your key" : "Add key"}</span>
              <span className="ohf-lamp" />
            </button>
            <span className="ohf-avatar" aria-hidden>
              {LOCAL_USER.initial}
            </span>
          </div>
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
