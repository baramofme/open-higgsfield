"use client";

/* =============================================================================
   video-header.tsx — HF 상단크롬의 이 서피스 전용 별도 버전 (t_885ea9ce)

   operator 지시: "유사한 컴포넌트는 대체가 아니라 별도의 버전으로. 기존 것은
   그대로 두고 새로운 버전이지, 대체해서 없애는 게 아니다." — 앱 전역 `Topbar`는
   건드리지 않는다(시블링 이미지·설정·사용량 표면이 의존). 이 헤더는 오직
   surface==='video'일 때 `Topbar`를 대체해 렌더를 HF와 동일하게 만든다.

   HF /ko/ai/video?model=minimax_h3 의 상단크롬은 두 겹이다(측정: GT nid 2..100):
     ① header-promotion  — lime(#d1fe17) 배너, h45, y0. 닫기 버튼·"할인 받기" pill.
     ② header→header-visual — 투명, h36, y45. 로고(20×20)·26 pill nav·우측 클러스터.
   합쳐 89px. 전역 Topbar는 이 배너가 없어 서피스가 HF보다 -47px 위에 앉았다.

   이 버전은 그 두 겹을 GT 실측 그대로 그린다. 각 요소는 data-ohf-video="<HF nid>"
   앵커를 가져 비교기가 헤더 band까지 HF와 1:1로 대조할 수 있다. 정직 marking:
   비인터랙티브(HF-only 페이지 pill·게스트 auth·닫기·할인)은 aria-disabled+data-off.
   ============================================================================= */

import { type GalleryView } from "./data";
import type { StudioMode } from "./studio-mode";
import "./video-header.css";

/* HF 가 이 서피스 nav 에 실제로 렌더한 pill 목록( GT nid 26..79 에서 그대로).
   각 항목은 HF 의 <li>(li-nid) + 그 안의 <a>(a-nid) 지오메트리에 1:1로 앵커된다.
   라벨은 GT own-text 원문. 이미지·비디오·오디오·Cinema Studio 는 실배선(스코프/
   모드 전환), 나머지는 HF 의 페이지가 이 앱에 없어 honest inert. */
type Pill = {
  aNid: number;
  liNid: number;
  label: string;
  link?: "image" | "video" | "audio" | "cinema";
  badgeNid?: number; /* HF 가 이 pill 에 신규 배지를 달았다. */
};

const HF_NAV: (Pill | { sepNid: number })[] = [
  { aNid: 27, liNid: 26, label: "둘러보기" },
  { aNid: 29, liNid: 28, label: "이미지", link: "image" },
  { aNid: 31, liNid: 30, label: "비디오", link: "video" },
  { aNid: 33, liNid: 32, label: "오디오", link: "audio" },
  { aNid: 35, liNid: 34, label: "MCP" },
  { aNid: 37, liNid: 36, label: "API" },
  { sepNid: 38 },
  { aNid: 40, liNid: 39, label: "Genjutsu" },
  { aNid: 42, liNid: 41, label: "Content Factory" },
  { aNid: 44, liNid: 43, label: "플레이어블" },
  { aNid: 46, liNid: 45, label: "Mangaka", badgeNid: 47 },
  { aNid: 49, liNid: 48, label: "AI Influencer" },
  { aNid: 51, liNid: 50, label: "Academy", badgeNid: 52 },
  { aNid: 54, liNid: 53, label: "Katana" },
  { aNid: 56, liNid: 55, label: "ChatGPT 플러그인" },
  { aNid: 58, liNid: 57, label: "Ads Studio" },
  { aNid: 60, liNid: 59, label: "이펙트" },
  { aNid: 62, liNid: 61, label: "Cinema Studio", link: "cinema" },
  { aNid: 64, liNid: 63, label: "콘테스트" },
  { aNid: 66, liNid: 65, label: "Marketing Studio" },
  { aNid: 68, liNid: 67, label: "Supercomputer" },
  { aNid: 71, liNid: 70, label: "편집" },
  { aNid: 73, liNid: 72, label: "커뮤니티" },
  { aNid: 75, liNid: 74, label: "플러그인" },
  { aNid: 77, liNid: 76, label: "Canvas" },
  { aNid: 79, liNid: 78, label: "Originals" },
];

/* HF 의 프로모션 배너 본문( GT own-text 원문). 라벨·주석은 정적 레퍼런스계기 content
   → 복제 대상. 게스트 크롬이라 정적으로는 honest inert 이다. */
const PROMO_TEXT = "가입 후 프리미엄 요금제 추가 할인을 받아 보세요";
const PROMO_CTA = "할인 받기";

/* HF 의 로고 glyph path( GT nid 21 원문). white fill 사각 + dark glyph. */
const LOGO_D =
  "M18.3498 9.83713L18.3339 9.65759C18.1831 7.93447 17.0963 4.69261 14.0816 4.69261C11.8445 4.69261 10.1545 6.97097 8.66311 8.97967C7.47302 10.5883 6.4419 11.9683 5.3073 11.9683C5.00574 11.9357 4.61708 11.7805 4.3792 11.4294C4.16497 11.1108 4.10948 10.7026 4.22046 10.2126C4.39489 9.43684 5.39463 8.7182 6.44963 7.95063C7.02864 7.54238 7.6238 7.10955 8.03634 6.69311C9.22643 5.5091 9.82932 4.65164 9.82932 3.2717C9.82932 1.89176 9.09157 1.20565 8.47276 0.911636C7.23514 0.323844 5.41851 0.666781 4.26026 1.69583C4.08583 1.85922 3.91117 2.01418 3.75243 2.16119C2.58622 3.23097 1.80094 3.95781 0 3.40232V5.63972C2.38791 6.72588 4.39512 4.65164 5.15675 3.69633C5.74372 3.06758 6.36253 2.70006 6.82283 2.70006H6.84671C7.05298 2.70825 7.22741 2.78995 7.35454 2.93696C7.56081 3.18204 7.64018 3.46786 7.60038 3.78622C7.51305 4.45594 6.83875 5.23967 5.60113 6.09713C4.14928 7.10159 1.7218 8.78374 1.53122 10.8987C1.3884 12.4177 2.15003 13.9365 3.34012 14.5243C6.11669 15.8798 7.80665 13.5444 9.5994 11.0783C10.9719 9.1756 12.273 7.37103 14.0818 7.37103C15.7081 7.37103 16.311 8.75916 16.311 9.63301V9.80459L16.1523 9.83713C12.2095 10.5558 10.0595 14.3611 10.0595 16.1167C10.0595 17.8724 11.5034 19.375 13.2804 19.375C15.359 19.375 17.9293 17.5458 18.3419 12.4013L18.3578 12.2136H20V9.83737H18.3498V9.83713ZM16.1998 12.4746C15.8826 15.5531 14.3513 16.9904 13.4232 16.9904C13.0027 16.9904 12.4158 16.631 12.4158 15.9615C12.4158 15.2104 13.5026 12.932 15.946 12.2543L16.2316 12.1808L16.1998 12.4748V12.4746Z";

/* HF 배너의 태그 아이콘( GT nid 7/8 원문 stroke). */
const TAG_D =
  "M2 3.75C2 2.784 2.784 2 3.75 2h7.829c.464 0 .91.184 1.237.513l8.757 8.756a1.75 1.75 0 0 1 0 2.475l-7.829 7.83a1.75 1.75 0 0 1-2.475 0l-8.756-8.758A1.75 1.75 0 0 1 2 11.58zM7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3";

/* 닫기 X( GT nid 12/13 원문 stroke). */
const CLOSE_D = "m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5";

/* 우측 클러스터 아이콘의 원문 stroke path( GT nid 84/91/95 ). */
const SEARCH_D =
  "M20.25 20.25L16.1265 16.1265M16.1265 16.1265C17.4306 14.8224 18 13.0711 18 11.25C18 7.5 15 4.5 11.25 4.5C7.5 4.5 4.5 7.5 4.5 11.25C4.5 15 7.5 18 11.25 18C13.0711 18 14.8224 17.4306 16.1265 16.1265Z";
const GLOBE_D =
  "M4.75 3C3.7835 3 3 3.7835 3 4.75V18.5H1.75C1.33579 18.5 1 18.8358 1 19.25C1 19.6642 1.33579 20 1.75 20H22.25C22.6642 20 23 19.6642 23 19.25C23 18.8358 22.6642 18.5 22.25 18.5H21V4.75C21 3.7835 20.2165 3 19.25 3H4.75Z";
const COIN_D =
  "M12.6278 3.33956C12.4892 3.12769 12.2532 3 12 3C11 3 10 4 10 5V19C10 20 11 21 12 21C12.2532 21 12.4892 20.8723 12.6278 20.6604";

export function VideoHeader({
  view,
  onView,
  mode,
  onToggle,
}: {
  view: GalleryView;
  onView: (next: GalleryView) => void;
  mode: StudioMode;
  onToggle: () => void;
}) {
  return (
    <>
      {/* ① header-promotion — lime 배너(GT 2). 정적 레퍼런스계기 content. */}
      <header
        className="vh-promotion"
        data-ohf-video="2"
        aria-label="프로모션"
      >
        <div className="vh-promo-clip" data-ohf-video="3">
          <div className="vh-promo-container" data-ohf-video="4">
            <button
              className="vh-promo-row"
              data-ohf-video="5"
              type="button"
              aria-disabled="true"
              data-off="프로모션 배너 이동(요금제 페이지 미배선)"
            >
              <span className="vh-promo-label" data-ohf-video="6">
                <svg
                  className="vh-promo-icon"
                  data-ohf-video="7"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    className="vh-promo-icon-path"
                    data-ohf-video="8"
                    d={TAG_D}
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                <span className="vh-promo-text" data-ohf-video="9">
                  {PROMO_TEXT}
                </span>
              </span>
              <span className="vh-promo-cta" data-ohf-video="10">
                {PROMO_CTA}
              </span>
            </button>
            <button
              className="vh-promo-close"
              data-ohf-video="11"
              type="button"
              aria-label="프로모션 닫기"
              aria-disabled="true"
              data-off="프로모션 닫기(배너 상태 미배선)"
            >
              <svg
                className="vh-promo-close-icon"
                data-ohf-video="12"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  className="vh-promo-close-path"
                  data-ohf-video="13"
                  d={CLOSE_D}
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ② header→header-visual — 투명(GT 14/15). 로고·nav·우측 클러스터. */}
      <div className="vh-header" data-ohf-video="14">
        <header className="vh-header-visual" data-ohf-video="15">
          <div className="vh-header-container" data-ohf-video="16">
            <a className="vh-logo-link" data-ohf-video="17" href="#main">
              <span
                className="vh-logo"
                data-ohf-video="18"
                role="img"
                aria-label="Higgsfield"
              >
                <span
                  className="vh-logo-fill"
                  data-ohf-video="19"
                  aria-hidden="true"
                />
                <svg
                  className="vh-logo-glyph"
                  data-ohf-video="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    className="vh-logo-glyph-path"
                    data-ohf-video="21"
                    d={LOGO_D}
                    fill="currentColor"
                  />
                </svg>
              </span>
            </a>

            <nav className="vh-nav" data-ohf-video="22" aria-label="Main">
              <div className="vh-nav-scroll" data-ohf-video="23">
                <div className="vh-nav-inner" data-ohf-video="24">
                  <ul className="vh-nav-list" data-ohf-video="25">
                    {HF_NAV.map((entry) => {
                      if ("sepNid" in entry) {
                        return (
                          <li
                            key={`sep-${entry.sepNid}`}
                            className="vh-nav-sep"
                            data-ohf-video={entry.sepNid}
                            aria-hidden
                          />
                        );
                      }
                      const live = !!entry.link;
                      const active =
                        entry.link === "video" && view === "video";
                      const pressed =
                        entry.link === "cinema" && mode === "cinema";
                      return (
                        <li
                          key={entry.aNid}
                          className="vh-nav-li"
                          data-ohf-video={entry.liNid}
                        >
                          <button
                            className="vh-nav-item"
                            data-ohf-video={entry.aNid}
                            type="button"
                            data-active={active || undefined}
                            aria-current={active ? "page" : undefined}
                            aria-pressed={
                              entry.link === "cinema" ? pressed : undefined
                            }
                            aria-disabled={live ? undefined : "true"}
                            data-off={live ? undefined : "HF 페이지 미보유"}
                            onClick={
                              live
                                ? () => {
                                    if (entry.link === "cinema") onToggle();
                                    else onView(entry.link as GalleryView);
                                  }
                                : undefined
                            }
                          >
                            {entry.label}
                            {entry.badgeNid != null && (
                              <span
                                className="vh-nav-badge"
                                data-ohf-video={entry.badgeNid}
                              >
                                신규
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </nav>

            {/* 우측 클러스터 — HF 게스트 actions(GT 80..100). honest inert. */}
            <div className="vh-actions" data-ohf-video="80">
              <div
                className="vh-actions-primary"
                data-ohf-video="81"
              >
                <button
                  className="vh-act vh-act--icon"
                  data-ohf-video="82"
                  type="button"
                  aria-label="Search"
                  aria-disabled="true"
                  data-off="검색(게스트 chrome 이식)"
                >
                  <svg
                    className="vh-act-icon"
                    data-ohf-video="83"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      className="vh-act-icon-path"
                      data-ohf-video="84"
                      d={SEARCH_D}
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
                <div className="vh-lang-wrap" data-ohf-video="85">
                  <button
                    className="vh-lang"
                    data-ohf-video="86"
                    type="button"
                    aria-disabled="true"
                    data-off="언어 전환(게스트 chrome 이식)"
                  >
                    <svg
                      className="vh-act-icon"
                      data-ohf-video="87"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        className="vh-act-icon-path"
                        data-ohf-video="88"
                        d={GLOBE_D}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                </div>
                <a
                  className="vh-ent"
                  data-ohf-video="89"
                  href="#enterprise"
                  aria-disabled="true"
                  data-off="Enterprise 페이지 미보유"
                >
                  <svg
                    className="vh-ent-icon"
                    data-ohf-video="90"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      className="vh-ent-icon-path"
                      data-ohf-video="91"
                      d={GLOBE_D}
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span className="vh-ent-label" data-ohf-video="92">
                    Enterprise
                  </span>
                </a>
                <a
                  className="vh-price"
                  data-ohf-video="93"
                  href="#pricing"
                  aria-disabled="true"
                  data-off="요금제 페이지 미보유"
                >
                  <svg
                    className="vh-price-icon"
                    data-ohf-video="94"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      className="vh-price-icon-path"
                      data-ohf-video="95"
                      d={COIN_D}
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span className="vh-price-label" data-ohf-video="96">
                    요금제
                  </span>
                  <span className="vh-price-off" data-ohf-video="97">
                    -30%
                  </span>
                </a>
              </div>
              <div className="vh-actions-secondary" data-ohf-video="98">
                <button
                  className="vh-auth vh-auth--login"
                  data-ohf-video="99"
                  type="button"
                  aria-disabled="true"
                  data-off="로그인(게스트 chrome 이식)"
                >
                  로그인
                </button>
                <button
                  className="vh-auth vh-auth--signup"
                  data-ohf-video="100"
                  type="button"
                  aria-disabled="true"
                  data-off="가입하기(게스트 chrome 이식)"
                >
                  가입하기
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
