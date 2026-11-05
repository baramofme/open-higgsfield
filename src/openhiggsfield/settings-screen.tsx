"use client";

/* 정적 이식: HF /ko/me/settings (한국어 로케일, 1440×900 라이브 CDP 수확).
   모든 rect/타이포/색상/아이콘 d-값은 settings 라이브 하베스트 실측에서 왔다.
   헤더는 기존 Topbar 컴포넌트를 그대로 재사용한다(재설계 금지 지시).
   라우트에 없는 페이지(세션/선물/구독/사용량/프로모)와 OHF에 없는 기능
   (과금·토글·언어·계정삭제·로그아웃)은 honest inert — aria-disabled + data-off. */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Topbar } from "./topbar";

/* ── ground-truth 데이터 (HF 실계정 수확값, 위조 없음) ───────────────── */
const ACCOUNT = {
  name: "JIHOON YI",
  email: "baram204@gmail.com",
  workspace: "exploringdonut1792",
  creditsLeft: "49.8 크레딧 남음",
  creditsCap: "최대 크레딧 풀의 100%",
  autoTitle: "새 생성물 자동 게시",
  autoDesc:
    "이 기능을 켜면 새 생성물이 Explore에 자동으로 표시돼요. 기본적으로 비공개로 유지하려면 꺼 주세요.",
  langTitle: "앱 언어",
  langName: "한국어",
  delTitle: "계정 삭제 관리",
  delDesc: "계정 삭제 설정",
} as const;

/* 실측 30개 바 — 높이 4px 28개 + 57px 1개(23번) + 7px 1개(26번) */
const BAR_HEIGHTS = [
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 57, 4, 4,
  7, 4, 4, 4,
] as const;

const USAGE_DATES = ["10월 8", "10월 23", "11월 6"] as const;

type MenuRow = {
  k: string;
  label: string;
  href: string;
  self?: boolean;
  paths: string[];
};

/* 사이드바 아이콘 d-값: HF chip svg 실측 (path 개수·순서 그대로) */
const MENU: MenuRow[] = [
  {
    k: "profile",
    label: "개인 프로필",
    href: "/ko/me/settings",
    self: true,
    paths: [
      "M12 2C6.47715 2 2 6.47715 2 12C2 14.897 3.23192 17.5063 5.20047 19.3326C6.98474 20.9879 9.37418 22 12 22C14.6258 22 17.0153 20.9879 18.7995 19.3326C20.7681 17.5063 22 14.897 22 12C22 6.47715 17.5228 2 12 2ZM5.97605 17.9968C7.29919 16.174 9.41114 15 12 15C14.5889 15 16.7008 16.174 18.0239 17.9968C16.4847 19.543 14.3541 20.5 12 20.5C9.64589 20.5 7.51531 19.543 5.97605 17.9968ZM15 10C15 11.6569 13.6569 13 12 13C10.3431 13 9 11.6569 9 10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10Z",
    ],
  },
  {
    k: "sessions",
    label: "모든 세션",
    href: "/ko/me/settings/sessions",
    paths: [
      "M17.25 17.5C16.8358 17.5 16.5 17.8358 16.5 18.25C16.5 18.6642 16.8358 19 17.25 19H19.5C19.9142 19 20.25 18.6642 20.25 18.25C20.25 17.8358 19.9142 17.5 19.5 17.5H17.25Z",
      "M4.75 3C3.7835 3 3 3.7835 3 4.75V16H1.75C1.33579 16 1 16.3358 1 16.75V19.25C1 20.2165 1.7835 21 2.75 21H13.6684C13.9493 21.5912 14.5519 22 15.25 22H21.25C22.2165 22 23 21.2165 23 20.25V9.75C23 8.7835 22.2165 8 21.25 8H21V4.75C21 3.7835 20.2165 3 19.25 3H4.75ZM15 9.75C15 9.61193 15.1119 9.5 15.25 9.5H21.25C21.3881 9.5 21.5 9.61193 21.5 9.75V20.25C21.5 20.3881 21.3881 20.5 21.25 20.5H15.25C15.1119 20.5 15 20.3881 15 20.25V9.75ZM13.5 17.5V19.5H2.75C2.61193 19.5 2.5 19.3881 2.5 19.25V17.5H13.5Z",
    ],
  },
  {
    k: "gift",
    label: "선물",
    href: "/ko/me/settings/gift",
    paths: [
      "M6.25 4.41667C6.25 3.08198 7.33198 2 8.66667 2C10.043 2 11.2603 2.68092 12 3.72427C12.7397 2.68092 13.957 2 15.3333 2C16.668 2 17.75 3.08198 17.75 4.41667C17.75 5.39677 17.4047 6.29622 16.8291 7H19.25C20.2165 7 21 7.7835 21 8.75V9.5C21 10.4665 20.2165 11.25 19.25 11.25H12.75V7H13.6667C15.0934 7 16.25 5.8434 16.25 4.41667C16.25 3.91041 15.8396 3.5 15.3333 3.5C13.9066 3.5 12.75 4.6566 12.75 6.08333V7H11.25V6.08333C11.25 4.6566 10.0934 3.5 8.66667 3.5C8.16041 3.5 7.75 3.91041 7.75 4.41667C7.75 5.8434 8.9066 7 10.3333 7H11.25V11.25H4.75C3.7835 11.25 3 10.4665 3 9.5V8.75C3 7.7835 3.7835 7 4.75 7H7.1709C6.5953 6.29622 6.25 5.39677 6.25 4.41667Z",
      "M12.75 12.75H20V19.25C20 20.2165 19.2165 21 18.25 21H12.75V12.75Z",
      "M11.25 12.75H4V19.25C4 20.2165 4.7835 21 5.75 21H11.25V12.75Z",
    ],
  },
  {
    k: "subscription",
    label: "구독",
    href: "/ko/me/settings/subscription",
    paths: [
      "M12.9665 2.43976C12.457 1.85341 11.5466 1.85341 11.0371 2.43976L9.19512 4.55979L6.42133 4.11978C5.65416 3.99808 4.95674 4.58328 4.94338 5.35993L4.89504 8.16799L2.48735 9.61388C1.82144 10.0138 1.66336 10.9104 2.15233 11.5139L3.92029 13.6961L3.0053 16.3513C2.75223 17.0857 3.20744 17.8741 3.96996 18.0222L6.72697 18.5574L7.7328 21.1796C8.011 21.9048 8.8665 22.2162 9.54578 21.8394L12.0018 20.4773L14.4578 21.8394C15.1371 22.2162 15.9926 21.9048 16.2708 21.1796L17.2766 18.5574L20.0336 18.0222C20.7962 17.8741 21.2514 17.0857 20.9983 16.3513L20.0833 13.6961L21.8513 11.5139C22.3402 10.9104 22.1821 10.0138 21.5162 9.61388L19.1086 8.16799L19.0602 5.35993C19.0469 4.58328 18.3494 3.99808 17.5823 4.11978L14.8085 4.55979L12.9665 2.43976ZM15.0321 11.2803C15.325 10.9874 15.325 10.5126 15.0321 10.2197C14.7392 9.92678 14.2644 9.92678 13.9715 10.2197L11.0018 13.1893L10.0321 12.2197C9.73923 11.9268 9.26436 11.9268 8.97147 12.2197C8.67857 12.5126 8.67857 12.9874 8.97147 13.2803L10.4715 14.7803C10.6121 14.921 10.8029 15 11.0018 15C11.2007 15 11.3915 14.921 11.5321 14.7803L15.0321 11.2803Z",
    ],
  },
  {
    k: "usage",
    label: "사용량",
    href: "/ko/me/settings/usage",
    paths: [
      "M21.6542 14.6168C21.8797 13.7827 22 12.9054 22 12C22 6.72945 17.9225 2.41124 12.75 2.02771V11.4696L21.6542 14.6168Z",
      "M21.1543 16.031L11.7501 12.7071C11.4504 12.6012 11.25 12.3179 11.25 12V2.02771C6.07745 2.41124 2 6.72945 2 12C2 17.5229 6.47715 22 12 22C16.0886 22 19.6041 19.5463 21.1543 16.031Z",
    ],
  },
  {
    k: "promo",
    label: "프로모 코드",
    href: "/ko/me/settings/promo",
    paths: [
      "M2 5.75C2 4.7835 2.7835 4 3.75 4H20.25C21.2165 4 22 4.7835 22 5.75V9.25C22 9.58821 21.7736 9.88458 21.4473 9.97357C19.4342 10.5226 19.4342 13.4774 21.4473 14.0264C21.7736 14.1154 22 14.4118 22 14.75V18.25C22 19.2165 21.2165 20 20.25 20H3.75C2.7835 20 2 19.2165 2 18.25V14.75C2 14.4118 2.22637 14.1154 2.55266 14.0264C4.56578 13.4774 4.56578 10.5226 2.55266 9.97357C2.22637 9.88458 2 9.58821 2 9.25V5.75ZM15.25 7C15.6642 7 16 7.33579 16 7.75V8.25C16 8.66421 15.6642 9 15.25 9C14.8358 9 14.5 8.66421 14.5 8.25V7.75C14.5 7.33579 14.8358 7 15.25 7ZM15.25 11C15.6642 11 16 11.3358 16 11.75V12.25C16 12.6642 15.6642 13 15.25 13C14.8358 13 14.5 12.6642 14.5 12.25V11.75C14.5 11.3358 15 11.25 15ZM15.25 15C15.6642 15 16 15.3358 16 15.75V16.25C16 16.6642 15.6642 17 15.25 17C14.8358 17 14.5 16.6642 14.5 16.25V15.75C14.5 15.3358 15 15.25 15Z",
    ],
  },
];

/* HF 실측 svg外壳: width/height 24 viewBox 0 0 24 24 fill=none (chip은 16×16 렌더) */
function Icon({
  paths,
  size,
  stroke,
  className,
}: {
  paths: { d: string; fill?: string; stroke?: string; sw?: string }[];
  size: "14" | "16" | "18" | "20";
  stroke?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`ohf-set-ico ohf-set-ico-${size}${className ? ` ${className}` : ""}`}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? (stroke ? "none" : "currentColor")}
          stroke={p.stroke ?? (stroke ? "currentColor" : undefined)}
          strokeWidth={p.sw ?? (stroke ? "1.5" : undefined)}
          strokeLinecap={p.stroke ? "round" : undefined}
          strokeLinejoin={p.stroke ? "round" : undefined}
        />
      ))}
    </svg>
  );
}

export function SettingsScreen({ fontClassName }: { fontClassName?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  /* 헤더 컨트롤은 스튜디오(/) 표면의 기능 — 설정 라우트에서 누르면
     해당 표면으로 이동하는 것이 정직한 배선이다(Topbar 재사용 결정). */
  const goStudio = () => router.push("/");

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(ACCOUNT.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard 없는 브라우저 — 화면 그대로 둔다. */
    }
  };

  return (
    <div className={`ohf ohf-settings${fontClassName ? ` ${fontClassName}` : ""}`}>
      {/* HF 최상단 진행 표시 줄(고정, 렌더 폭 0 — 구조만 미러) */}
      <div
        className="ohf-set-progress"
        aria-hidden="true"
        style={{ pointerEvents: "none" }}
      >
        <div className="ohf-set-progress-fill" />
      </div>

      {/* 재사용 헤더 — 기존 Topbar 그대로 */}
      <Topbar
        view="image"
        onView={goStudio}
        busy={false}
        keyConfigured={false}
        onKeys={goStudio}
        query={query}
        onQuery={setQuery}
        onAssets={goStudio}
        mode="general"
        onToggle={goStudio}
      />

      <main className="ohf-set-main">
        <div className="ohf-set-container">
          {/* ── 사이드바 위젯 ── */}
          <div className="ohf-set-widget" id="widget-account-layout-menu">
            <div className="ohf-set-widget-inner">
              <aside className="ohf-set-aside" aria-label="계정 설정 탐색">
                <div className="ohf-set-aside-body">
                  <div className="ohf-set-group">
                    <div className="ohf-set-group-inner">
                      <div className="ohf-set-label-wrap">
                        <p className="ohf-set-workspace">
                          {ACCOUNT.workspace}님의 워크스페이스
                        </p>
                      </div>
                      <ul className="ohf-set-menu">
                        {MENU.map((row) => {
                          const active = row.self === true;
                          return (
                            <li key={row.k} className="ohf-set-menu-item">
                              {active ? (
                                <a className="ohf-set-menu-link" href={row.href}>
                                  <span className="ohf-set-chip-wrap">
                                    <span
                                      className="ohf-set-chip"
                                      data-k={row.k}
                                      aria-hidden="true"
                                    >
                                      <Icon size="16" paths={row.paths.map((d) => ({ d }))} className="ohf-set-chip-ico" />
                                    </span>
                                  </span>
                                  <span className="ohf-set-menu-label">{row.label}</span>
                                </a>
                              ) : (
                                <a
                                  className="ohf-set-menu-link"
                                  aria-disabled="true"
                                  data-off="1"
                                  title="OHF에 아직 이식되지 않은 HF 설정 페이지"
                                  aria-label={row.label}
                                >
                                  <span className="ohf-set-chip-wrap">
                                    <span
                                      className="ohf-set-chip"
                                      data-k={row.k}
                                      aria-hidden="true"
                                    >
                                      <Icon size="16" paths={row.paths.map((d) => ({ d }))} className="ohf-set-chip-ico" />
                                    </span>
                                  </span>
                                  <span className="ohf-set-menu-label">{row.label}</span>
                                </a>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="ohf-set-logout-wrap">
                  <button
                    type="button"
                    className="ohf-set-logout"
                    aria-disabled="true"
                    data-off="1"
                    title="OHF는 로컬 스튜디오라 세션 로그아웃이 없다"
                  >
                    <span className="ohf-set-logout-ico-wrap" aria-hidden="true">
                      <Icon
                        size="16"
                        stroke
                        className="ohf-set-logout-ico"
                        paths={[
                          {
                            d: "M20.25 12L9 12M20.25 12L15.75 16.5M20.25 12L15.75 7.5M11.25 20.25H4.75C4.19772 20.25 3.75 19.8023 3.75 19.25L3.75 4.75C3.75 4.19772 4.19772 3.75 4.75 3.75L11.25 3.75",
                          },
                        ]}
                      />
                    </span>
                    <span className="ohf-set-logout-label">로그아웃</span>
                  </button>
                </div>
              </aside>
            </div>
          </div>

          {/* ── 본문 컬럼 ── */}
          <div className="ohf-set-content" id="account-layout-content">
            <div className="ohf-set-stack">
              {/* 프로필 헤더 */}
              <div className="ohf-set-profile">
                <div className="ohf-set-avatar-slot">
                  <div className="ohf-set-avatar">
                    <img
                      className="ohf-set-avatar-img"
                      src="/settings/profile-avatar.png"
                      alt="user profile"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
                <div className="ohf-set-profile-text">
                  <div className="ohf-set-name-row">
                    <span className="ohf-set-name">{ACCOUNT.name}</span>
                    <button
                      type="button"
                      className="ohf-set-edit"
                      aria-disabled="true"
                      data-off="1"
                      title="OHF에는 프로필 편집 화면이 없다"
                    >
                      <Icon
                        size="14"
                        stroke
                        paths={[
                          {
                            d: "M13.25 6.24997L16.2929 3.20708C16.6834 2.81655 17.3166 2.81655 17.7071 3.20708L20.7929 6.29286C21.1834 6.68339 21.1834 7.31655 20.7929 7.70708L17.75 10.75M13.25 6.24997L3.04289 16.4571C2.85536 16.6446 2.75 16.899 2.75 17.1642V21.25H6.83579C7.101 21.25 7.35536 21.1446 7.54289 20.9571L17.75 10.75M13.25 6.24997L17.75 10.75",
                          },
                        ]}
                      />
                      <span className="ohf-set-edit-label">편집</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="ohf-set-email"
                    title={copied ? "클립보드에 복사됨" : "클릭하면 이메일이 복사돼요"}
                    onClick={copyEmail}
                  >
                    <span className="ohf-set-email-text">{ACCOUNT.email}</span>
                    <Icon
                      size="16"
                      className="ohf-set-email-ico"
                      paths={[
                        {
                          d: "M8.46967 3.46967C8.76256 3.17678 9.23744 3.17678 9.53033 3.46967L16.8232 10.7625C17.5066 11.446 17.5066 12.554 16.8232 13.2374L9.53033 20.5303C9.23744 20.8232 8.76256 20.8232 8.46967 20.5303C8.17678 20.2374 8.17678 19.7626 8.46967 19.4697L15.7626 12.1768C15.8602 12.0791 15.8602 11.9208 15.7626 11.8232L8.46967 4.53033C8.17678 4.23744 8.17678 3.76256 8.46967 3.46967Z",
                        },
                      ]}
                    />
                  </button>
                  <div className="ohf-set-hidden-sm" />
                </div>
                <div className="ohf-set-empty-block" />
              </div>

              {/* 카드 블록 (249 미러: flex-col gap-4) */}
              <div className="ohf-set-cards">
                {/* 윗줄: 크레딧 + 사용 내역 */}
                <div className="ohf-set-cardrow">
                  <div className="ohf-set-card-half">
                    <div className="ohf-set-credit-card">
                      <div className="ohf-set-credit-head">
                        <Icon
                          size="20"
                          stroke
                          className="ohf-set-credit-ico"
                          paths={[
                            {
                              d: "M14.6766 7.38126C13.686 5.23749 11.5167 3.75 9 3.75C5.54822 3.75 2.75 6.54822 2.75 10C2.75 13.3961 5.45873 16.1596 8.83359 16.2478M21.25 14C21.25 17.4518 18.4518 20.25 15 20.25C12.3406 20.25 10.0691 18.589 9.16641 16.2478C8.89745 15.5503 8.75 14.7924 8.75 14C8.75 10.6039 11.4587 7.84038 14.8336 7.75217C14.8889 7.75073 14.9444 7.75 15 7.75C18.4518 7.75 21.25 10.5482 21.25 14Z",
                              stroke: "currentColor",
                              sw: "1.5",
                            },
                          ]}
                        />
                        <span className="ohf-set-credit-title">크레딧</span>
                        <div className="ohf-set-credit-help">
                          <a
                            className="ohf-set-help-pill"
                            aria-disabled="true"
                            data-off="1"
                            title="HF 크레딧 안내는 OHF에 없는 외부 문서"
                          >
                            자세히 알아보기
                          </a>
                        </div>
                      </div>
                      <div className="ohf-set-credit-foot">
                        <div className="ohf-set-credit-text">
                          <p className="ohf-set-credit-left">{ACCOUNT.creditsLeft}</p>
                          <p className="ohf-set-credit-cap">{ACCOUNT.creditsCap}</p>
                        </div>
                        <button
                          type="button"
                          className="ohf-set-charge"
                          aria-disabled="true"
                          data-off="1"
                          title="OHF는 로컬 모델이라 크레딧 과금이 없다"
                        >
                          충전
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="ohf-set-card-half">
                    <div className="ohf-set-usage-card">
                      <div className="ohf-set-usage-head">
                        <div className="ohf-set-usage-label">
                          <Icon
                            size="20"
                            className="ohf-set-usage-ico"
                            paths={[
                              {
                                d: "M15 6.75C15 6.33579 15.3358 6 15.75 6H21.25C21.6642 6 22 6.33579 22 6.75V12.25C22 12.6642 21.6642 13 21.25 13C20.8358 13 20.5 12.6642 20.5 12.25V8.57067L14.2371 14.8246C13.5535 15.5072 12.4461 15.5068 11.7631 14.8237L9.17678 12.2374C9.07915 12.1398 8.92086 12.1398 8.82322 12.2374L3.28033 17.7803C2.98744 18.0732 2.51256 18.0732 2.21967 17.7803C1.92678 17.4874 1.92678 17.0126 2.21967 16.7197L7.76256 11.1768C8.44598 10.4934 9.55402 10.4934 10.2374 11.1768L12.8237 13.7631C12.9213 13.8607 13.0795 13.8607 13.1772 13.7632L19.4494 7.5H15.75C15.3358 7.5 15 7.16421 15 6.75Z",
                              },
                            ]}
                          />
                          <span className="ohf-set-usage-title">사용 내역</span>
                        </div>
                        <a
                          className="ohf-set-usage-more"
                          aria-disabled="true"
                          data-off="1"
                          title="사용량 페이지는 별도 이식 카드(t_77d03e8b)에서 다룬다"
                        >
                          모두 보기
                        </a>
                      </div>
                      <div className="ohf-set-chart-wrap">
                        <div className="ohf-set-bars">
                          {BAR_HEIGHTS.map((h, i) => (
                            <div key={i} className="ohf-set-bar-slot">
                              <div
                                className="ohf-set-bar"
                                style={{ height: `${h}px` }}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="ohf-set-tt-anchor">
                          <div className="ohf-set-tooltip" data-off="1">
                            <span className="ohf-set-tooltip-text">
                              {" 크레딧 사용 ()"}
                            </span>
                          </div>
                        </div>
                        <div className="ohf-set-dates">
                          {USAGE_DATES.map((d) => (
                            <span key={d} className="ohf-set-date">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 자동 게시 행 카드 */}
                <div className="ohf-set-row-card ohf-set-auto">
                  <div className="ohf-set-auto-row">
                    <div className="ohf-set-auto-text">
                      <span className="ohf-set-auto-title">{ACCOUNT.autoTitle}</span>
                      <span className="ohf-set-auto-desc">{ACCOUNT.autoDesc}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked="false"
                      data-state="off"
                      data-size="sm"
                      data-tone="brand"
                      className="ohf-set-switch"
                      aria-disabled="true"
                      data-off="1"
                      title="OHF에는 Explore 자동 게시가 없다"
                    >
                      <span className="ohf-set-switch-knob" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* 앱 언어 행 카드 */}
                <div className="ohf-set-row-card ohf-set-lang">
                  <div className="ohf-set-lang-row">
                    <div className="ohf-set-lang-text">
                      <span className="ohf-set-lang-title">{ACCOUNT.langTitle}</span>
                      <span className="ohf-set-lang-sub">{ACCOUNT.langName}</span>
                    </div>
                    <div className="ohf-set-lang-select" data-language-selector="">
                      <button
                        type="button"
                        data-language-selector=""
                        aria-label="언어 변경"
                        aria-haspopup="menu"
                        aria-expanded="false"
                        className="ohf-set-lang-trigger"
                        aria-disabled="true"
                        data-off="1"
                        title="OHF는 한국어 고정 단일 로케일이다"
                      >
                        <span className="ohf-set-lang-value">
                          <span className="ohf-set-flag">
                            <img
                              className="ohf-set-flag-img"
                              src="/settings/Korean.png"
                              alt="한국어 국기"
                              loading="lazy"
                              decoding="async"
                            />
                          </span>
                          <span className="ohf-set-lang-name">{ACCOUNT.langName}</span>
                        </span>
                        <Icon
                          size="16"
                          stroke
                          paths={[
                            {
                              d: "m8 10 3.646 3.646a.5.5 0 0 0 .708 0L16 10",
                              stroke: "currentColor",
                              sw: "1.5",
                            },
                          ]}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 계정 삭제 행 카드 */}
                <div className="ohf-set-row-card ohf-set-deletion">
                  <div className="ohf-set-del-row">
                    <div className="ohf-set-del-text">
                      <h3 className="ohf-set-del-title">{ACCOUNT.delTitle}</h3>
                      <p className="ohf-set-del-desc">{ACCOUNT.delDesc}</p>
                    </div>
                    <button
                      type="button"
                      className="ohf-set-del-button"
                      aria-disabled="true"
                      data-off="1"
                      title="OHF에는 계정 삭제 관리 화면이 없다"
                    >
                      <Icon
                        size="18"
                        stroke
                        paths={[
                          {
                            d: "M20 9L12.7071 16.2929C12.3166 16.6834 11.6834 16.6834 11.2929 16.2929L4 9",
                            stroke: "currentColor",
                            sw: "1.5",
                          },
                        ]}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="ohf-set-spacer" />
            </div>
          </div>
        </div>
      </main>

      {/* HF 우하단 지원 버튼 — 기하 미러, honest inert */}
      <div className="ohf-set-help-wrap">
        <div className="ohf-set-help">
          <div className="ohf-set-help-inner">
            <button
              type="button"
              className="ohf-set-help-button"
              aria-label="도움이 필요하세요?"
              aria-haspopup="dialog"
              aria-expanded="false"
              aria-disabled="true"
              data-off="1"
              title="HF 지원 런처는 OHF에 없다 — 기하만 미러"
            >
              <span className="ohf-set-help-ico" aria-hidden="true">
                <Icon
                  size="16"
                  paths={[
                    {
                      d: "M12 15.75c0-4.25 4.25-3.317 4.25-6.976 0-4.987-7.385-5.446-8.388-.774",
                      stroke: "currentColor",
                      sw: "1.5",
                    },
                    { d: "M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2", fill: "currentColor" },
                  ]}
                />
              </span>
            </button>
            <span className="ohf-set-help-ring" aria-hidden="true" />
          </div>
          <span className="ohf-set-help-glow" aria-hidden="true">
            <span className="ohf-set-help-sheen" aria-hidden="true">
              <span className="ohf-set-help-cone" aria-hidden="true" />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
