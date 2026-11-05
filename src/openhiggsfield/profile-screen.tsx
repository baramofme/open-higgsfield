"use client";

import { NumberFlow } from "number-flow-react";

/* ── HF 원문 자산(ground-truth에서 무손실 복제) ────────────────────────
   모든 SVG d경로·viewBox·문구는 https://higgsfield.ai/ko/@exploringdonut1792
   라이브 CDP 수확(hf_detail.json / hf_dom.html / precise.json)의 원문이다. */

const STAR_PATH =
  "M6 0.54834C6.3262 0.54834 6.60313 0.769108 6.71255 1.07966L7.85406 4.26879L11.1726 4.44524C11.4943 4.46231 11.7652 4.67854 11.8583 4.98608C11.9514 5.29362 11.8458 5.62417 11.5911 5.82353L8.92813 7.86215L9.87014 11.0961C9.97296 11.4384 9.83136 11.8036 9.52435 11.991C9.21734 12.1784 8.83147 12.1398 8.56592 11.8931L6 10.0225L3.43408 11.8931C3.16853 12.1398 2.78266 12.1784 2.47565 11.991C2.16864 11.8036 2.02704 11.4384 2.12986 11.0961L3.07187 7.86215L0.408908 5.82353C0.154173 5.62417 0.0485914 5.29362 0.141694 4.98608C0.234797 4.67854 0.505735 4.46231 0.827435 4.44524L4.14594 4.26879L5.28745 1.07966C5.39687 0.769108 5.6738 0.54834 6 0.54834Z";
const ACH_WAVE_PATH =
  "M0.5 22.1667C13.881 22.1667 22.6406 25.733 33.0788 28.3144C44.694 31.1856 56.0918 28.6402 68.5444 26.6042C81.9565 24.4101 94.8507 26.5306 107.006 28.9087C119.176 31.29 131.576 29.0839 143.5 26.6745C156.407 24.0702 169.336 25.9792 181.84 27.8222C193.261 29.5106 205.464 27.4929 217.105 26.6745C229.737 25.788 242.289 27.3768 254.306 28.5542C266.095 29.7073 278.987 28.2672 291.21 26.6745C293.487 26.3875 295.937 25.5589 297.778 24.5";
const PLUS_PATH =
  "M10.5 5.5H14.5C15.0523 5.5 15.5 5.05228 15.5 4.5C15.5 3.94772 15.0523 3.5 14.5 3.5H10.5V2.5C10.5 1.94772 10.0523 1.5 9.5 1.5C8.94772 1.5 8.5 1.94772 8.5 2.5V3.5H4.5C3.94772 3.5 3.5 3.94772 3.5 4.5C3.5 5.05228 3.94772 5.5 4.5 5.5H8.5V6.5C8.5 7.05228 8.94772 7.5 9.5 7.5C10.0523 7.5 10.5 7.05228 10.5 6.5V5.5Z";
const TROPHY_PATH =
  "M12.25 3.5C12.25 3.77614 12.0261 4 11.75 4L10.5 4V5C10.5 6.51039 9.26039 7.75 7.75 7.75L7 7.75L7 11L9 11C9.55228 11 10 11.4477 10 12L10 14.0549C10.5642 14.2145 11 14.7243 11 15.3242L11 17C11 17.5523 10.5523 18 10 18L4 18C3.44772 18 3 17.5523 3 17L3 15.3242C3 14.7243 3.43579 14.2145 4 14.0549L4 12C4 11.4477 4.44772 11 5 11L7 11L7 7.75L6.25 7.75C4.73971 7.75 3.5 6.51039 3.5 5L3.5 4L2.25 4C1.97386 4 1.75 3.77614 1.75 3.5C1.75 3.22386 1.97386 3 2.25 3L11.75 3C12.0261 3 12.25 3.22386 12.25 3.5ZM2 12C2 10.3431 3.34315 9 5 9L5.5 9L5.5 12L5 12C3.34315 12 2 13.3431 2 15L2 18L1 18L1 15C1 12.2386 3.23858 10 6 10L6 9L5 9C3.067 9 1.5 10.567 1.5 12.5L1.5 18.5L0.5 18.5L0.5 12.5C0.5 10.0147 2.51472 8 5 8L5.5 8L5.5 5L5.5 4L2 4L2 5C2 6.20503 2.94493 7.18144 4.13643 7.24636L4.25 7.25L4.25 9.5L3.5 9.5L3.5 12L4.25 12L4.25 14.0549C3.68848 14.2149 3.25136 14.7235 3.25 15.3242L3.25 17L2.25 17L2.25 15C2.25 13.4812 3.48118 12.25 5 12.25L5.5 12.25L5.5 9.5L6 9.5L6 10C3.23858 10 1 12.2386 1 15L1 17.5";
const CAL_PATH =
  "M3.5 2.75C3.5 2.47386 3.72386 2.25 4 2.25L6 2.25C6.27614 2.25 6.5 2.47386 6.5 2.75L6.5 3.75L9.5 3.75L9.5 2.75C9.5 2.47386 9.72386 2.25 10 2.25L12 2.25C12.2761 2.25 12.5 2.47386 12.5 2.75L12.5 3.75L16 3.75C16.6904 3.75 17.25 4.30964 17.25 5L17.25 6L18.25 6C18.9404 6 19.5 6.55964 19.5 7.25L19.5 16.25C19.5 17.4049 18.5711 18.3338 17.4163 18.3338L4.08375 18.3338C2.92893 18.3338 2 17.4049 2 16.25L2 7.25C2 6.55964 2.55964 6 3.25 6L3.5 6L3.5 2.75ZM3.5 6L4 6L4 7C4 7.55228 4.44772 8 5 8L14.5 8L14.5 6L17 6L17 16.25C17 16.592 16.7249 16.8338 16.3837 16.8338L5.11625 16.8338C4.77509 16.8338 4.5 16.592 4.5 16.25L4.5 7L3.5 7L3.5 6Z";

const AVATAR_SRC = "/profile/avatar-exploringdonut1792.webp";
const COVER_SRC = "/profile/cover-pattern.svg";

const TABS = [
  "모든 작품",
  "이미지",
  "동영상",
  "Project",
  "Audio",
] as const;

const STATS: { label: string; value: number; kind: "button" | "div" | "plain" }[] = [
  { label: "팔로워", value: 14, kind: "button" },
  { label: "팔로잉", value: 500, kind: "button" },
  { label: "작품 수", value: 1994, kind: "div" },
  { label: "좋아요 수", value: 813, kind: "plain" },
];

/* HF 원문 인라인 스타일 태그(검은 캔버스 + 헤더 높이 변수) 무손실 미러 */
const HF_STYLE_MIRROR = `
  body {
    --ohf-pf-page-bg: #000;
    background: var(--ohf-pf-page-bg) !important;
  }
  html { --header-height-v2: 36px; color-scheme: light; }
  .ohf, .ohf-shell, .ohf-main { background: var(--ohf-pf-page-bg) !important; }
`;

function RingSvg() {
  return (
    <svg className="ohf-pf-ring-svg" viewBox="0 0 116 116" aria-hidden="true">
      <circle cx="58" cy="58" r="56" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
    </svg>
  );
}

export function ProfileScreen({ handle }: { handle: string }) {
  const name = handle;
  return (
    <div className="ohf-pf-page">
      <style>{HF_STYLE_MIRROR}</style>
      <div className="ohf-pf-group">
        {/* ── 커버(fixed, z -1) — HF .profile-cover 원문 기하 ── */}
        <div className="ohf-pf-cover">
          <img className="ohf-pf-cover-img" src={COVER_SRC} alt="" aria-hidden="true" />
          <img className="ohf-pf-cover-img-blurred" src={COVER_SRC} alt="" aria-hidden="true" />
          <div className="ohf-pf-cover-fade" aria-hidden="true"></div>
        </div>

        {/* ── 좌측 사이드바(HF aside, 340px) ── */}
        <aside className="ohf-pf-aside">
          <div className="ohf-pf-commrow" aria-hidden="true">
            <a className="ohf-pf-comm-btn" data-off aria-disabled="true">
              <span className="ohf-pf-comm-label">커뮤니티</span>
            </a>
          </div>
          <div className="ohf-pf-aside-sticky">
            <header className="ohf-pf-header">
              <div className="ohf-pf-avatar-col">
                <div className="ohf-pf-avatar-wrap">
                  <span className="ohf-pf-ring"><RingSvg /></span>
                  <div className="ohf-pf-avatar-mat">
                    <div className="ohf-pf-avatar-size">
                      <span className="ohf-pf-avatar-face">
                        <img className="ohf-pf-avatar-img" src={AVATAR_SRC} alt="프로필 아바타" />
                      </span>
                      <span className="ohf-pf-avatar-line" aria-hidden="true"></span>
                    </div>
                  </div>
                  <span className="ohf-pf-rating-overlay">
                    <a className="ohf-pf-rating-a" data-off aria-disabled="true">
                      <span className="ohf-pf-rating-pill">
                        <svg className="ohf-pf-rating-svg" viewBox="0 0 12 12" aria-hidden="true">
                          <path fillRule="evenodd" clipRule="evenodd" d={STAR_PATH} />
                        </svg>
                        <span className="ohf-pf-rating-num">5</span>
                        <span className="ohf-pf-sr">평점 5</span>
                        <span className="ohf-pf-rating-glow" aria-hidden="true"></span>
                      </span>
                    </a>
                  </span>
                </div>

                <div className="ohf-pf-name-block">
                  <div className="ohf-pf-name-col">
                    <h1 className="ohf-pf-name">{name}</h1>
                    <div className="ohf-pf-handle-row">
                      <span className="ohf-pf-handle">@{handle}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ohf-pf-stat-block">
                <ul className="ohf-pf-stats">
                  {STATS.map((s) => (
                    <li className="ohf-pf-stat-cell" key={s.label}>
                      {s.kind === "button" ? (
                        <button className="ohf-pf-stat-btn" data-off aria-disabled="true">
                          <span className="ohf-pf-stat-num"><NumberFlow value={s.value} /></span>
                          <span className="ohf-pf-stat-label">{s.label}</span>
                        </button>
                      ) : s.kind === "div" ? (
                        <div className="ohf-pf-stat-div">
                          <span className="ohf-pf-stat-num"><NumberFlow value={s.value} /></span>
                          <span className="ohf-pf-stat-label">{s.label}</span>
                        </div>
                      ) : (
                        <div className="ohf-pf-stat-plain">
                          <span className="ohf-pf-stat-num"><NumberFlow value={s.value} /></span>
                          <span className="ohf-pf-stat-label">{s.label}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="ohf-pf-follow-row">
                  <div className="ohf-pf-follow-wrap">
                    <button className="ohf-pf-follow-btn" data-off aria-disabled="true">
                      <span className="ohf-pf-follow-lead">
                        <span className="ohf-pf-follow-icon-box">
                          <span className="ohf-pf-follow-icon-well">
                            <span className="ohf-pf-follow-icon-center">
                              <svg className="ohf-pf-follow-icon" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" clipRule="evenodd" d={PLUS_PATH} />
                              </svg>
                            </span>
                          </span>
                        </span>
                        <span className="ohf-pf-follow-label">팔로우</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <hr className="ohf-pf-divider" />

              <div className="ohf-pf-ach">
                <div className="ohf-pf-ach-row">
                  <div className="ohf-pf-ach-wave" aria-hidden="true">
                    <svg className="ohf-pf-ach-wave-svg" viewBox="0 0 298.278 29" preserveAspectRatio="none" aria-hidden="true">
                      <path
                        fill="none"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeDasharray="1 3"
                        strokeOpacity="0.3"
                        stroke="rgb(247,247,248)"
                        d={ACH_WAVE_PATH}
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                  <a className="ohf-pf-ach-pill" data-off aria-disabled="true">
                    <svg className="ohf-pf-ach-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d={TROPHY_PATH} />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="ohf-pf-meta">
                <div className="ohf-pf-meta-inner">
                  <div className="ohf-pf-join">
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d={CAL_PATH} />
                    </svg>
                    <span className="ohf-pf-join-text">가입일: 2026년 10월</span>
                  </div>
                </div>
              </div>
            </header>
          </div>
        </aside>

        {/* ── 우측 콘텐츠 컬럼(HF md:grow 서브트리) ── */}
        <div className="ohf-pf-content-col">
          <div className="ohf-pf-spacer" aria-hidden="true"></div>
          <div className="ohf-pf-select">
            <div className="ohf-pf-anchor">
              <div className="ohf-pf-tabbar">
                <div className="ohf-pf-tabs">
                  <div className="ohf-pf-tablist">
                    <span className="ohf-pf-indicator" style={{ width: "87.2656px", height: "32px" }} aria-hidden="true"></span>
                    {TABS.map((label, i) => (
                      <button className="ohf-pf-tab" key={label} data-off aria-disabled={i !== 0 || undefined}>
                        <span className="ohf-pf-tab-content">
                          <span className="ohf-pf-tab-text">{label}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="ohf-pf-work-col">
              <div className="ohf-pf-work-box">
                <div className="ohf-pf-grid" aria-hidden="true">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div className="ohf-pf-tile" key={i}>
                      <div className="ohf-pf-tile-plate"></div>
                      <div className="ohf-pf-tile-sheen"></div>
                    </div>
                  ))}
                </div>
                <div className="ohf-pf-empty">
                  <div className="ohf-pf-empty-block">
                    <p className="ohf-pf-empty-title">{name} 님이 아직 게시한 작품이 없어요</p>
                    <p className="ohf-pf-empty-sub">{name} 님을 팔로우하고 공개되는 작품을 확인해 보세요</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
