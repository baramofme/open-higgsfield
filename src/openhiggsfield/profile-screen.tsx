"use client";

/* ════════════════════════════════════════════════════════════════════════
   t_2afe2cd0 — HF public 프로필(@exploringdonut1792) 이식 v2 (2026-11-06)
   권위 원천: https://higgsfield.ai/ko/@exploringdonut1792 — 2026-11-06 라이브 CDP
   (1440×900, scroll 0, guest) 수확: precise_new.json(런346 hf_precise7).
   HF가 프로필 설계를 재배치했으므로 런1의 구버전 수확은 폐기하고 오늘 구조로 재생산.
   모든 문자열·SVG d·viewBox·인라인 스타일은 HF 실측 원문 그대로(재창작 금지).
   인터랙션(탭전환·팔로우·pinned 상태)은 honest-inert: 렌더 동일, 동작 없음(data-off).
   ════════════════════════════════════════════════════════════════════════ */

const AVATAR_SRC = "/profile/avatar-exploringdonut1792.webp";
const COVER_SRC = "/profile/cover-pattern.svg";

/* HF 실측 라벨/숫자/문구 원문(게스트 상태) */
const TABS = ["모든 작품", "프로젝트", "Shots", "블로그", "업적"] as const;
const STAT_LABELS = ["팔로워", "팔로잉", "조회수", "좋아요"] as const;
const STAT_NUMS = ["0", "0", "0", "0"] as const;
const ACH_TEXT = "아직 업적이 없어요";
const JOIN_TEXT = "가입일: 2026년 10월";
const RATING_TEXT = "5";

/* HF styleattr 실측 인라인 문자열(동등 serialization용) */
const INL_OP1: React.CSSProperties = { opacity: 1 };
const INL_WELL: React.CSSProperties = { opacity: 1, filter: "blur(0px)", transform: "none" };
const INL_RATING_PILL: React.CSSProperties = {
  background:
    "linear-gradient(170.39deg, rgba(255, 255, 255, 0.2) 15.72%, rgba(209, 209, 209, 0.2) 84.28%), rgb(11, 12, 13)",
  boxShadow: "rgba(255, 255, 255, 0.1) 0px 4px 16px",
  /* HF computed 실측 문자열. 시트에 두면 Lightning CSS가 oklab→lab으로 환산해
     HF와 serialization이 어긋난다(실측 확인). 인라인은 미니파이어를 거치지 않는다. */
  borderColor: "oklab(0.999994 0.0000455678 0.0000200868 / 0.5)",
};
const INL_PLATE: React.CSSProperties = {
  backgroundColor: "oklab(0.999994 0.0000455678 0.0000200868 / 0.05)", /* HF computed 실측, 같은 회피 */
};
const INL_LINE: React.CSSProperties = {
  borderColor: "oklab(0.999994 0.0000455678 0.0000200868 / 0.25)", /* HF border-white/25 computed 실측 */
};
const INL_RATING_NUM: React.CSSProperties = {
  backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.8), rgb(121, 121, 121))",
};
const INL_RATING_GLOW: React.CSSProperties = {
  boxShadow:
    "rgba(126, 126, 126, 0.8) 0px 1px 3px inset, rgba(178, 178, 178, 0.5) 0px 4px 8px -2px inset, rgb(180, 180, 180) 0px -2px 3px -2px inset, rgb(143, 143, 143) 0px -3px 8px -2px inset",
};
const INL_FADE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(101.2% 100% at 50% 0%, color(srgb 0 0 0 / 0.4), rgb(0, 0, 0))",
};
const INL_TABS_VARS = {
  "--q-tint": "var(--hf-color-brand-primary)",
  "--q-tint-fg": "var(--hf-color-text-inverse)",
} as React.CSSProperties;
const INL_IND_VARS = {
  "--active-tab-left": "0px",
  "--active-tab-right": "289.7344px",
  "--active-tab-top": "0px",
  "--active-tab-bottom": "0px",
  "--active-tab-width": "87.25px", /* HF 실측 computed width 87.25px 정정(원본 인라인 87.2656px) */
  "--active-tab-height": "32px",
} as React.CSSProperties;
const INL_ASIDE_VARS = {
  "--profile-sidebar-top":
    "min(calc(var(--ohf-pf-header-height-v2) + 3.5rem), calc(100dvh - 491px - 1rem))",
} as React.CSSProperties;

/* ── SVG 원문(HF 라이브 outerHTML verbatim; id만 OHF 네임스페이스로 접두) ── */

function RingSvg() {
  return (
    <svg aria-hidden="true" viewBox="0 0 116 116" fill="none" className="ohf-pf-ring-svg">
      <defs>
        <linearGradient id="ohf-pf-ring-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="116">
          <stop offset="0" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="0.35" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="0.75" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="0.9" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <circle cx="58" cy="58" r="56" stroke="url(#ohf-pf-ring-grad)" strokeWidth="4" />
    </svg>
  );
}

const STAR_D =
  "M5.62782 0.250811C5.79018 -0.0836008 6.20987 -0.0836049 6.37223 0.250807C7.43837 2.44673 8.96106 4.274 10.791 5.55335C11.0697 5.74819 11.0697 6.25181 10.791 6.44664C8.96106 7.726 7.43837 9.55327 6.37223 11.7492C6.20987 12.0836 5.79018 12.0836 5.62782 11.7492C4.56169 9.55328 3.0389 7.72601 1.20899 6.44663C0.930319 6.2518 0.930319 5.7482 1.20899 5.55337C3.0389 4.27399 4.56169 2.44672 5.62782 0.250811Z";

function StarSvg() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" className="ohf-pf-star">
      <defs>
        <clipPath id="ohf-pf-star-shape">
          <path d={STAR_D} />
        </clipPath>
        <linearGradient id="ohf-pf-star-fill" x1="4.43488" y1="-1.25234" x2="4.43923" y2="12.5756" gradientUnits="userSpaceOnUse">
          <stop offset="0.164925" style={{ stopColor: "rgba(255, 255, 255, 0.8)" }} />
          <stop offset="0.852503" style={{ stopColor: "rgba(255, 255, 255, 0.4)" }} />
        </linearGradient>
      </defs>
      <path d={STAR_D} fill="url(#ohf-pf-star-fill)" />
      <g clipPath="url(#ohf-pf-star-shape)" stroke="white" strokeLinejoin="round">
        <path d={STAR_D} stroke="black" strokeOpacity="0.15" strokeWidth="1.5" />
        <path d={STAR_D} stroke="black" strokeOpacity="0.1" strokeWidth="2" />
        <path d={STAR_D} stroke="black" strokeOpacity="0.06" strokeWidth="4" strokeLinejoin="round" />
        <path d={STAR_D} transform="translate(0 2)" fill="#A6A6A6" fillOpacity="0.24" />
      </g>
    </svg>
  );
}

const WAVE_D =
  "M289.775 24.5H8.50292C5.82705 24.5 3.90575 21.9235 4.66915 19.3588L6.53916 13.0765C8.05372 7.98831 12.7316 4.5 18.0404 4.5H280.237C285.546 4.5 290.224 7.9883 291.738 13.0765L293.608 19.3588C294.372 21.9235 292.451 24.5 289.775 24.5Z";

function WaveSvg() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 298.278 29"
      preserveAspectRatio="none"
      overflow="visible"
      fill="none"
      className="ohf-pf-wave-svg"
    >
      <defs>
        <linearGradient id="ohf-pf-wave-fill" x1="263.745" y1="4.30392" x2="263.745" y2="24.5002" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3A434C" />
          <stop offset="1" stopColor="#8D8D8D" />
        </linearGradient>
        <linearGradient id="ohf-pf-wave-edge" x1="3.13883" y1="14.5" x2="295.139" y2="14.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={WAVE_D} stroke="black" strokeOpacity="0.06" strokeWidth="4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={WAVE_D} stroke="black" strokeOpacity="0.1" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={WAVE_D} transform="translate(0 2)" fill="#A6A6A6" fillOpacity="0.24" />
      <path d={WAVE_D} transform="translate(0 1)" fill="url(#ohf-pf-wave-fill)" fillOpacity="0.82" />
      <path d={WAVE_D} fill="url(#ohf-pf-wave-fill)" />
      <path d={WAVE_D} stroke="url(#ohf-pf-wave-edge)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={WAVE_D} stroke="black" strokeOpacity="0.06" strokeWidth="1" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ChevLeftSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ohf-pf-comm-icon">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.5 18.25 8.25 12l6.25-6.25" />
    </svg>
  );
}

function PlusSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ohf-pf-follow-icon">
      <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M12 5.25V12m0 0v6.75M12 12H5.25M12 12h6.75" />
    </svg>
  );
}

function ChevRightSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="ohf-pf-ach-chev">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.5 18.25 15.75 12 9.5 5.75" />
    </svg>
  );
}

const FIRE_D =
  "m20.35 11.844-.016-.173c-.15-1.654-1.238-4.766-4.252-4.766-2.238 0-3.927 2.187-5.419 4.116-1.19 1.544-2.221 2.868-3.356 2.868-.301-.03-.69-.18-.928-.517-.214-.306-.27-.698-.159-1.168.175-.745 1.175-1.434 2.23-2.171.579-.392 1.174-.808 1.586-1.208 1.19-1.136 1.793-1.96 1.793-3.284 0-1.325-.737-1.984-1.356-2.266-1.238-.564-3.054-.235-4.213.753-.174.157-.349.306-.508.447C4.586 5.502 3.801 6.2 2 5.666v2.148c2.388 1.043 4.395-.948 5.157-1.866.587-.603 1.206-.956 1.666-.956h.024c.206.008.38.086.508.227q.307.355.245.816c-.087.643-.761 1.395-1.999 2.218-1.452.965-3.88 2.58-4.07 4.61-.143 1.458.619 2.916 1.81 3.48 2.776 1.302 4.466-.94 6.258-3.308 1.373-1.826 2.674-3.559 4.483-3.559 1.626 0 2.229 1.333 2.229 2.172v.164l-.159.032c-3.943.69-6.093 4.343-6.093 6.028 0 1.686 1.444 3.128 3.221 3.128 2.079 0 4.65-1.756 5.062-6.695l.016-.18H22v-2.281zm-2.15 2.532c-.317 2.955-1.849 4.335-2.777 4.335-.42 0-1.007-.345-1.007-.988 0-.721 1.087-2.908 3.53-3.559l.286-.07z";

function FireSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ohf-pf-join-icon">
      <path fill="currentColor" d={FIRE_D} />
    </svg>
  );
}

export function ProfileScreen({ handle }: { handle: string }) {
  /* HF URL은 /@handle. RSC flight 페이로드가 '@'를 %40로 인코딩해 전달한 실측 버그가 있어
     두 접두를 모두 strip한다(이름 h1=맨 이름, 핸들행=@+맨 이름 — HF 원문과 동자·동폭). */
  const bare = handle.replace(/^(@|%40)+/i, "");

  return (
    <div className="ohf-pf-page">
      <div className="ohf-pf-group">
        {/* ── 커버: fixed, bottom 500px, h400, z -1(HF .profile-cover) ── */}
        <div className="ohf-pf-cover" aria-hidden="true">
          <img className="ohf-pf-cover-img" src={COVER_SRC} alt="" />
          <img className="ohf-pf-cover-img ohf-pf-cover-img-blurred" src={COVER_SRC} alt="" />
          <div className="ohf-pf-cover-fade" style={INL_FADE}></div>
        </div>

        {/* ── aside(w-340) — 커뮤니티 줄 + sticky 프로필 헤더 ── */}
        <aside className="ohf-pf-aside" style={INL_ASIDE_VARS}>
          <div className="ohf-pf-commrow">
            <a className="ohf-pf-comm-btn" href="#ohf-community" data-off="true">
              <ChevLeftSvg />
              <span className="ohf-pf-comm-label">커뮤니티</span>
            </a>
          </div>

          <div className="ohf-pf-aside-sticky">
            <header className="ohf-pf-header">
              {/* 1) 스택: 아바타 + 평점(오버레이) → 이름/핸들 */}
              <div className="ohf-pf-stack">
                <div className="ohf-pf-avatar-wrap">
                  <span className="ohf-pf-glow" style={INL_OP1} aria-hidden="true">
                    <RingSvg />
                    <a
                      className="ohf-pf-rating-a"
                      href="#ohf-rating"
                      data-off="true"
                      aria-label={`평점 ${RATING_TEXT}. 업적 안내`}
                    >
                      <span className="ohf-pf-rating-pill" style={INL_RATING_PILL}>
                        <StarSvg />
                        <span className="ohf-pf-rating-num" aria-hidden="true" style={INL_RATING_NUM}>
                          {RATING_TEXT}
                        </span>
                        <span className="ohf-pf-sr">{`평점 ${RATING_TEXT}`}</span>
                        <span className="ohf-pf-rating-glow" aria-hidden="true" style={INL_RATING_GLOW}></span>
                      </span>
                    </a>
                  </span>
                  <div className="ohf-pf-rel-wrap">
                    <div className="ohf-pf-mat">
                      <span className="ohf-pf-face">
                        <img className="ohf-pf-avatar-img" src={AVATAR_SRC} alt={bare} />
                      </span>
                      <span className="ohf-pf-avatar-line" aria-hidden="true" style={INL_LINE}></span>
                    </div>
                  </div>
                  <span className="ohf-pf-glow2" style={INL_OP1} aria-hidden="true"></span>
                </div>

                <div className="ohf-pf-name-pad">
                  <div className="ohf-pf-name-block">
                    <h1 className="ohf-pf-name">{bare}</h1>
                    <div className="ohf-pf-handle-row">
                      <span className="ohf-pf-handle">{`@${bare}`}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2) 스탯 그리드 + 팔로우 버튼 */}
              <div className="ohf-pf-stat-pad">
                <ul className="ohf-pf-stats-ul">
                  <li className="ohf-pf-stat-li">
                    <button className="ohf-pf-stat-cell" type="button" data-off="true">
                      <span className="ohf-pf-stat-num">
                        <span className="ohf-pf-stat-digit">{STAT_NUMS[0]}</span>
                      </span>
                      <span className="ohf-pf-stat-label">{STAT_LABELS[0]}</span>
                    </button>
                  </li>
                  <li className="ohf-pf-stat-li">
                    <button className="ohf-pf-stat-cell" type="button" data-off="true">
                      <span className="ohf-pf-stat-num">
                        <span className="ohf-pf-stat-digit">{STAT_NUMS[1]}</span>
                      </span>
                      <span className="ohf-pf-stat-label">{STAT_LABELS[1]}</span>
                    </button>
                  </li>
                  <li className="ohf-pf-stat-li">
                    {/* HF 원문: 버튼 대신 div(cursor-default, data-state="closed") — 툴팁 비활성 */}
                    <div className="ohf-pf-stat-cell ohf-pf-stat-div" data-state="closed" data-off="true">
                      <span className="ohf-pf-stat-num">
                        <span className="ohf-pf-stat-digit">{STAT_NUMS[2]}</span>
                      </span>
                      <span className="ohf-pf-stat-label">{STAT_LABELS[2]}</span>
                    </div>
                  </li>
                  <li className="ohf-pf-stat-li">
                    {/* HF 원문: 패딩/음수마진 없는 플레인 div(gap-0.5) */}
                    <div className="ohf-pf-stat-plain">
                      <span className="ohf-pf-stat-num">
                        <span className="ohf-pf-stat-digit">{STAT_NUMS[3]}</span>
                      </span>
                      <span className="ohf-pf-stat-label">{STAT_LABELS[3]}</span>
                    </div>
                  </li>
                </ul>

                <div className="ohf-pf-follow-row">
                  <div className="ohf-pf-follow-wrap">
                    <button className="ohf-pf-follow-btn" type="button" data-off="true" aria-busy="false">
                      <span className="ohf-pf-follow-lead">
                        <span className="ohf-pf-follow-flex">
                          <span className="ohf-pf-follow-icon-box" aria-hidden="true">
                            <span className="ohf-pf-follow-well" style={INL_WELL}>
                              <PlusSvg />
                            </span>
                          </span>
                        </span>
                        <span className="ohf-pf-follow-label" style={INL_WELL}>
                          팔로우
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3) 구분선(그라디언트 1px) */}
              <hr className="ohf-pf-divider" />

              {/* 4) 업적: h-14 행 위에 웨이브 + 알약 */}
              <div className="ohf-pf-ach-outer">
                <div className="ohf-pf-ach-row">
                  <div className="ohf-pf-ach-wave-wrap" aria-hidden="true">
                    <WaveSvg />
                  </div>
                  <a className="ohf-pf-ach-pill" href="#ohf-achievements" data-off="true">
                    {ACH_TEXT}
                    <ChevRightSvg />
                  </a>
                </div>
              </div>

              {/* 5) 메타: 가입일(불꽃 아이콘) */}
              <div className="ohf-pf-meta-gap">
                <div className="ohf-pf-meta-inner">
                  <div className="ohf-pf-join-row">
                    <FireSvg />
                    <span className="ohf-pf-join-label">{JOIN_TEXT}</span>
                  </div>
                </div>
              </div>
            </header>
          </div>
        </aside>

        {/* ── main(콘텐츠 컬럼): 스페이서 196 → select-none → 앵커/탭바/워크 ── */}
        <main className="ohf-pf-main-col">
          <div className="ohf-pf-spacer" aria-hidden="true"></div>
          <div className="ohf-pf-select">
            <div className="ohf-pf-anchor" aria-hidden="true"></div>
            <div className="ohf-pf-tabbar">
              <div className="ohf-pf-tabs" data-orientation="horizontal" style={INL_TABS_VARS}>
                <div className="ohf-pf-tablist" data-orientation="horizontal">
                  {TABS.map((label, i) => (
                    <button
                      key={label}
                      className="ohf-pf-tab"
                      type="button"
                      data-off="true"
                      {...(i === 0 ? { "data-active": "" } : { "data-orientation": "horizontal" })}
                    >
                      <span className="ohf-pf-tab-content">
                        <span className="ohf-pf-tab-text" data-text={label}>
                          {label}
                        </span>
                      </span>
                    </button>
                  ))}
                  <span className="ohf-pf-indicator" data-orientation="horizontal" style={INL_IND_VARS}></span>
                </div>
              </div>
            </div>

            <div className="ohf-pf-work-col">
              <div className="ohf-pf-work-box">
                <div className="ohf-pf-grid" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div className="ohf-pf-tile" key={i}>
                      <div className="ohf-pf-tile-plate" style={INL_PLATE}></div>
                      <div className="ohf-pf-tile-sheen"></div>
                    </div>
                  ))}
                </div>
                <div className="ohf-pf-empty">
                  <div className="ohf-pf-empty-block">
                    <p className="ohf-pf-empty-title">{`${bare} 님이 아직 게시한 작품이 없어요`}</p>
                    <p className="ohf-pf-empty-sub">{`${bare} 님을 팔로우하고 공개되는 작품을 확인해 보세요`}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
