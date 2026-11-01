"use client";

import { getModel } from "@/generation/catalog";
import { useActive } from "@/generation/stores/active";

import { ApertureIcon, ClapperIcon, PersonAddIcon } from "./icons";
import { swatchFor } from "./artwork";

/* The cinema panel — the left rail higgsfield.ai/ko/generate/all grew onto the
   studio. Every list here is a mirror of values measured off the live page
   (2026-10-31 REA sweep); the panel is chrome around the same store the
   composer uses, so picking a tier moves the studio, not a second state. */

/** Cinema tiers in the selector's own order (the 14 measured on the page). */
const CINEMA_TIERS = [
  "ai-cast",
  "cinematic-place",
  "soul-cinema",
  "soul-2",
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-flare",
  "nano-banana-2.1",
  "nano-banana-pro",
  "nano-banana-2-lite",
  "seedream-5-pro",
  "seedream-5-flash",
  "seedream-4.5",
  "flux-3-image",
  "ideogram-vector",
] as const;

/** Lens names caught on the wheel (subset — the wheel keeps turning server-side). */
const LENS_MIRROR = [
  "S35 Prime 35mm",
  "Vintage Anamorphic",
  "Warm Vintage",
  "Halation",
] as const;

/** The ratio popover measured on the page: eight, including none of the 4:5/5:4 the classic app lacks. */
const ASPECT_MIRROR = [
  "1:1",
  "16:9",
  "9:16",
  "4:5",
  "5:4",
  "3:2",
  "2:3",
  "21:9",
] as const;

export function CinemaPanel() {
  const surface = useActive((state) => state.surface);
  const modelId = useActive((state) => state.model);
  const setModel = useActive((state) => state.setModel);

  const pickImage = () => setModel("krea-2-turbo");
  const pickVideo = () => setModel("seedance-2.5");

  return (
    <aside className="ohf-cinema" aria-label="Cinema panel">
      <div className="ohf-cinema-scroll ohf-scroll">
        <section className="ohf-cinema-sec">
          <h2 className="ohf-cinema-head">
            <ClapperIcon size={14} />
            모드
          </h2>
          <div className="ohf-cinema-rail">
            <button
              type="button"
              className="ohf-cinema-mode"
              aria-pressed={surface === "image"}
              onClick={pickImage}
            >
              이미지
            </button>
            <button
              type="button"
              className="ohf-cinema-mode"
              aria-pressed={surface === "video"}
              onClick={pickVideo}
            >
              비디오
            </button>
            <button
              type="button"
              className="ohf-cinema-mode"
              data-off
              aria-disabled
              title="Cinema camera controls are mirrored from the page; nothing runs them yet."
            >
              시네마틱
            </button>
          </div>
        </section>

        <section className="ohf-cinema-sec">
          <h2 className="ohf-cinema-head">모델</h2>
          <div className="ohf-cinema-grid">
            {CINEMA_TIERS.map((id) => {
              const entry = getModel(id);
              const selected = modelId === id;
              /* An entry with no settings declared is a pure screen mirror:
                 it shows in the rail but the composer has nothing to dial. */
              const mirrorOnly = Object.keys(entry.settings).length === 0;
              return (
                <button
                  key={id}
                  type="button"
                  className="ohf-cinema-tier"
                  aria-current={selected || undefined}
                  onClick={() => setModel(id)}
                  title={entry.label}
                >
                  <span
                    className="ohf-cinema-dot"
                    style={{ background: swatchFor(entry.surface, id) }}
                    aria-hidden
                  />
                  <span className="ohf-cinema-tier-name">{entry.label}</span>
                  {mirrorOnly && <span className="ohf-cinema-flag">화면만</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="ohf-cinema-sec">
          <h2 className="ohf-cinema-head">
            <ApertureIcon size={14} />
            렌즈
          </h2>
          <div className="ohf-cinema-chips">
            {LENS_MIRROR.map((lens) => (
              <span key={lens} className="ohf-cinema-chip" data-off title="화면 미러 — 실행 미연결">
                {lens}
              </span>
            ))}
          </div>
          <p className="ohf-cinema-note">실측 부분집합 · 실행 미연결</p>
        </section>

        <section className="ohf-cinema-sec">
          <h2 className="ohf-cinema-head">비율</h2>
          <div className="ohf-cinema-chips">
            {ASPECT_MIRROR.map((ratio) => (
              <span key={ratio} className="ohf-cinema-chip" data-off title="화면 미러 — 실행은 컴포저의 Aspect ratio">
                {ratio}
              </span>
            ))}
          </div>
        </section>

        <section className="ohf-cinema-sec">
          <h2 className="ohf-cinema-head">
            <PersonAddIcon size={14} />
            캐릭터 · 레퍼런스
          </h2>
          <div className="ohf-cinema-rail">
            <button
              type="button"
              className="ohf-cinema-mode"
              data-off
              aria-disabled
              title="캐릭터는 화면 미러 — 카탈로그 개념 부재(협의 큐)"
            >
              캐릭터 추가
            </button>
            <span className="ohf-cinema-count">레퍼런스 0 / 50</span>
          </div>
        </section>

        <p className="ohf-cinema-foot">
          시네마 패널 = generate/all 화면 미러 · 생성은 로컬 백엔드 모델만
        </p>
      </div>
    </aside>
  );
}
