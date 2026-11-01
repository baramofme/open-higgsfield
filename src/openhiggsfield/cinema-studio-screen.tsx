"use client";

import { type ReactNode } from "react";

import { getModel } from "@/generation/catalog";
import { useActive } from "@/generation/stores/active";

import { ChevronLeftIcon, ClapperIcon, KeyIcon } from "./icons";
import { LOCAL_USER } from "./local-user";

/* The Cinematic Studio opens as its OWN surface, the way higgsfield.ai/ko/generate
   is a separate page rather than a panel bolted onto the dashboard: a full-screen
   layout around a left model rail and a centred generation stage, with the
   composer docked along the bottom. It replaces the entire main shell while it is
   up, so none of the general layout (topbar, feed header, masonry gallery) rides
   on top of it — no overlap. That shell's topbar is gone in this state, so the
   way back is the exit button this header carries, not a nav item. The studio's
   own key lamp is kept here so the platform key is still manageable on the screen. */

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
      <header className="ohf-cinema-top">
        <div className="ohf-cinema-top-left">
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
          <span className="ohf-cinema-brand">
            <ClapperIcon size={14} />
            Cinematic Studio
          </span>
        </div>
        <div className="ohf-cinema-top-right">
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
      </header>

      <div className="ohf-cinema-body">
        <div className="ohf-cinema-rail-col">{rail}</div>
        <main className="ohf-cinema-canvas">
          <div className="ohf-cinema-stage">
            <h2 className="ohf-cinema-stage-title">Cinematic Studio</h2>
            <p className="ohf-cinema-stage-note">
              {model.label} · 아래 컴포저에서 생성합니다. 왼쪽 레일에서 모델·모드·렌즈를 고르세요.
            </p>
          </div>
          <div className="ohf-cinema-dock">{composer}</div>
        </main>
      </div>
    </div>
  );
}
