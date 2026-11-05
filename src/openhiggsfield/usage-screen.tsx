"use client";

/* HF /ko/me/settings/usage 정적 이식 — OHF.
   모든 텍스트/수치/경로는 ground-truth 실측값(t_c7aae7bd 430 요소 + 2026-11-06
   라이브 CDP 재실측)에서 그대로 옮긴 것이다. 위조 내용 없음.
   인터랙션(HF의 radix 셀렉터/정렬/툴팁)은 OHF에 없는 기능 — 정직하게 inert. */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Topbar } from "./topbar";

const ACCOUNT = {
  workspace: "exploringdonut1792님의 워크스페이스",
  title: "사용 내역",
  subtitle: "크레딧 사용량, 내역, 통계를 확인해 보세요",
} as const;

/* 분포 — HF legend/segment 실측(이름·비율·색·폭) */
const DISTRIBUTION = [
  { name: "MiniMax H3", pct: "79%", color: "var(--us-chart-green)", cls: "ohf-us-seg-1" },
  { name: "Image Auto", pct: "16%", color: "var(--us-chart-pink)", cls: "ohf-us-seg-2" },
  { name: "Z Image", pct: "2%", color: "var(--us-chart-blue)", cls: "ohf-us-seg-3" },
  { name: "Seed Audio 1.0", pct: "2%", color: "var(--us-chart-purple)", cls: "ohf-us-seg-4" },
  { name: "Soul Cinematic", pct: "1%", color: "var(--us-chart-yellow)", cls: "ohf-us-seg-5" },
] as const;

const SPARKLES = [
  {
    d: "M19.25 13C14.1955 13.4375 11.4375 16.1955 11 21.25C10.544 16.1169 7.80041 13.5721 2.75 13C7.88024 12.4083 10.4083 9.88024 11 4.75C11.5721 9.80041 14.1169 12.544 19.25 13Z",
    stroke: "currentColor",
    sw: "1.5",
    lr: "round",
    lj: "round",
  },
  {
    d: "M19.7898 1.25884C19.7731 1.11151 19.6486 1.00015 19.5003 1C19.352 0.999849 19.2272 1.11096 19.2103 1.25825C19.0998 2.21602 18.8134 2.8895 18.3515 3.35146C17.8895 3.81343 17.216 4.09979 16.2582 4.21025C16.111 4.22724 15.9998 4.35203 16 4.5003C16.0002 4.64857 16.1115 4.77313 16.2588 4.78981C17.2008 4.89651 17.8886 5.18275 18.3615 5.64713C18.8327 6.10977 19.125 6.7831 19.2095 7.73414C19.2229 7.88476 19.3491 8.00017 19.5003 8C19.6515 7.99983 19.7775 7.88413 19.7906 7.73349C19.8716 6.79809 20.1636 6.11059 20.6371 5.6371C21.1106 5.16361 21.7981 4.87155 22.7335 4.79058C22.8841 4.77754 22.9998 4.65154 23 4.50033C23.0002 4.34912 22.8848 4.22286 22.7341 4.20948C21.7831 4.125 21.1098 3.83266 20.6471 3.36151C20.1827 2.88857 19.8965 2.20078 19.7898 1.25884Z",
    fill: "currentColor",
  },
];

/* 요약 카드 — HF 실측(값·라벨·아이콘) */
const STATS = [
  {
    value: "US$0.505",
    label: "총 비용",
    paths: [
      {
        d: "M3.75 6.5V17.25C3.75 18.9069 5.09315 20.25 6.75 20.25H19.25C19.8023 20.25 20.25 19.8023 20.25 19.25V9.75C20.25 9.19772 19.8023 8.75 19.25 8.75H16.25M3.75 6.5C3.75 7.74264 4.75736 8.75 6 8.75H16.25M3.75 6.5C3.75 4.98122 4.98122 3.75 6.5 3.75H15.4688C15.9002 3.75 16.25 4.09978 16.25 4.53125V8.75",
        stroke: "currentColor",
        sw: "1.5",
        lr: "square",
        lj: "round",
      },
      {
        d: "M15.5 15.25C15.9142 15.25 16.25 14.9142 16.25 14.5C16.25 14.0858 15.9142 13.75 15.5 13.75C15.0858 13.75 14.75 14.0858 14.75 14.5C14.75 14.9142 15.0858 15.25 15.5 15.25Z",
        fill: "currentColor",
        stroke: "currentColor",
        sw: "0.5",
        lj: "round",
      },
    ],
  },
  {
    value: "12.62",
    label: "사용한 크레딧",
    paths: [
      {
        d: "M14.6766 7.38126C13.686 5.23749 11.5167 3.75 9 3.75C5.54822 3.75 2.75 6.54822 2.75 10C2.75 13.3961 5.45873 16.1596 8.83359 16.2478M21.25 14C21.25 17.4518 18.4518 20.25 15 20.25C12.3406 20.25 10.0691 18.589 9.16641 16.2478C8.89745 15.5503 8.75 14.7924 8.75 14C8.75 10.6039 11.4587 7.84038 14.8336 7.75217C14.8889 7.75073 14.9444 7.75 15 7.75C18.4518 7.75 21.25 10.5482 21.25 14Z",
        stroke: "currentColor",
        sw: "1.5",
        lr: "square",
      },
    ],
  },
  {
    value: "5",
    label: "사용한 기능",
    paths: SPARKLES,
  },
  {
    value: "7",
    label: "총 생성 수",
    paths: SPARKLES,
  },
];

/* 사용 내역 12행 — HF tbody 실측(크레딧·기능·상태·날짜·시각), 순서 그대로 */
const ROWS: {
  credit: string;
  feature: string;
  status: string;
  date: string;
  time: string;
}[] = [
  { credit: "0.2 크레딧", feature: "Seed Audio 1.0", status: "사용", date: "2026년 11월 4일", time: "오전 1:57" },
  { credit: "37.58 크레딧", feature: "Credits Expired", status: "차감됨", date: "2026년 11월 3일", time: "오전 2:30" },
  { credit: "10 크레딧", feature: "MiniMax H3", status: "사용", date: "2026년 11월 1일", time: "오전 2:32" },
  { credit: "+50 크레딧", feature: "Discord Connection Bonus", status: "지급됨", date: "2026년 11월 1일", time: "오전 2:29" },
  { credit: "+40 크레딧", feature: "Credit Package", status: "지급됨", date: "2026년 11월 1일", time: "오전 2:25" },
  { credit: "0.15 크레딧", feature: "Z Image", status: "사용", date: "2026년 11월 1일", time: "오전 1:05" },
  { credit: "0.15 크레딧", feature: "Z Image", status: "사용", date: "2026년 11월 1일", time: "오전 1:03" },
  { credit: "2 크레딧", feature: "Image Auto", status: "사용", date: "2026년 11월 1일", time: "오전 1:02" },
  { credit: "0.12 크레딧", feature: "Soul Cinematic", status: "사용", date: "2026년 10월 31일", time: "오후 9:50" },
  { credit: "+0.12 크레딧", feature: "Soul Cinematic", status: "환불됨", date: "2026년 10월 31일", time: "오후 7:41" },
  { credit: "0.12 크레딧", feature: "Soul Cinematic", status: "사용", date: "2026년 10월 31일", time: "오후 7:41" },
  { credit: "+10 크레딧", feature: "Registration Credits", status: "지급됨", date: "2026년 10월 31일", time: "오후 3:44" },
];

type MenuRow = { k: string; label: string; href: string; self?: boolean; paths: string[] };

/* 사이드바 아이콘 d-값: HF chip svg 실측(2026-11-06 라이브) */
const MENU: MenuRow[] = [
  {
    k: "profile",
    label: "개인 프로필",
    href: "/ko/me/settings",
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
    self: true,
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

const BARS = [
  { d: "M11 3.00098C10.1716 3.00098 9.5 3.67255 9.5 4.50098V19.501C9.5 20.3294 10.1716 21.001 11 21.001H13C13.8284 21.001 14.5 20.3294 14.5 19.501V4.50098C14.5 3.67255 13.8284 3.00098 13 3.00098H11Z" },
  { d: "M4.5 13.001C3.67157 13.001 3 13.6725 3 14.501V19.501C3 20.3294 3.67157 21.001 4.5 21.001H6.5C7.32843 21.001 8 20.3294 8 19.501V14.501C8 13.6725 7.32843 13.001 6.5 13.001H4.5Z" },
  { d: "M16 9.50098C16 8.67255 16.6716 8.00098 17.5 8.00098H19.5C20.3284 8.00098 21 8.67255 21 9.50098V19.501C21 20.3294 20.3284 21.001 19.5 21.001H17.5C16.6716 21.001 16 20.3294 16 19.501V9.50098Z" },
];

const CHEVRON_DOWN = {
  d: "M3.46967 8.46967C3.76256 8.17678 4.23744 8.17678 4.53033 8.46967L12 15.9393L19.4697 8.46967C19.7626 8.17678 20.2374 8.17678 20.5303 8.46967C20.8232 8.76256 20.8232 9.23744 20.5303 9.53033L12.5303 17.5303C12.3897 17.671 12.1989 17.75 12 17.75C11.8011 17.75 11.6103 17.671 11.4697 17.5303L3.46967 9.53033C3.17678 9.23744 3.17678 8.76256 3.46967 8.46967Z",
};
const CHEVRON_LEFT = { d: "M13.7929 16L10.1464 12.3536C9.95118 12.1583 9.95118 11.8417 10.1464 11.6464L13.7929 8", stroke: "currentColor", sw: "1.5", lr: "round", lj: "round" };
const CHEVRON_RIGHT = { d: "M10 16L13.6464 12.3536C13.8417 12.1583 13.8417 11.8417 13.6464 11.6464L10 8", stroke: "currentColor", sw: "1.5", lr: "round", lj: "round" };
const CALENDAR = {
  d: "M7.75 2C8.16421 2 8.5 2.33579 8.5 2.75V4H15.5V2.75C15.5 2.33579 15.8358 2 16.25 2C16.6642 2 17 2.33579 17 2.75V4H19.25C20.2165 4 21 4.7835 21 5.75V19.25C21 20.2165 20.2165 21 19.25 21H4.75C3.7835 21 3 20.2165 3 19.25V5.75C3 4.7835 3.7835 4 4.75 4H7V2.75C7 2.33579 7.33579 2 7.75 2ZM4.5 10.5V19.25C4.5 19.3881 4.61193 19.5 4.75 19.5H19.25C19.3881 19.5 19.5 19.3881 19.5 19.25V10.5H4.5Z",
};
const REFRESH = { d: "M19 7.199C17.03 4.875 15.041 3.5 11.986 3.5a8.5 8.5 0 1 0 8.016 11.333M19.5 3.75v4h-4", stroke: "currentColor", lr: "round", lj: "round" };
const LOGOUT = {
  d: "M20.25 12L9 12M20.25 12L15.75 16.5M20.25 12L15.75 7.5M11.25 20.25H4.75C4.19772 20.25 3.75 19.8023 3.75 19.25L3.75 4.75C3.75 4.19772 4.19772 3.75 4.75 3.75L11.25 3.75",
  stroke: "currentColor",
  sw: "1.5",
  lr: "round",
  lj: "round",
};
const HELP = [
  { d: "M12 15.75c0-4.25 4.25-3.317 4.25-6.976 0-4.987-7.385-5.446-8.388-.774", stroke: "currentColor", sw: "1.5", lr: "round", lj: "round" },
  { d: "M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2", fill: "currentColor" },
];

type IconPath = { d: string; fill?: string; stroke?: string; sw?: string; lr?: string; lj?: string };

function Icon({ paths, size, className }: { paths: IconPath[]; size: "12" | "14" | "16" | "20"; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`ohf-us-ico ohf-us-ico-${size}${className ? ` ${className}` : ""}`}
    >
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? (p.stroke ? "none" : "currentColor")}
          stroke={p.stroke ?? undefined}
          strokeWidth={p.sw ?? undefined}
          strokeLinecap={(p.lr ?? undefined) as "square" | "butt" | "round" | "inherit" | undefined}
          strokeLinejoin={(p.lj ?? undefined) as "round" | "bevel" | "miter" | "inherit" | undefined}
        />
      ))}
    </svg>
  );
}

export function UsageScreen({ fontClassName }: { fontClassName?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  /* 헤더 컨트롤은 스튜디오(/) 표면의 기능 — 설정 라우트에서 누르면 해당 표면으로
     이동하는 것이 정직한 배선이다(형제 t_dca5e311의 Topbar 재사용 결정과 동일). */
  const goStudio = () => router.push("/");

  return (
    <div className={`ohf ohf-usage${fontClassName ? ` ${fontClassName}` : ""}`}>
      {/* HF 최상단 진행바(고정, 렌더 폭 0 — 구조만 미러) */}
      <div className="ohf-us-progress" aria-hidden="true" style={{ pointerEvents: "none" }}>
        <div className="ohf-us-progress-fill" />
      </div>

      <Topbar
        view="image"
        onView={goStudio}
        busy={false}
        keyConfigured={false}
        onKeys={goStudio}
        mode="general"
        onToggle={goStudio}
        query={query}
        onQuery={setQuery}
        onAssets={goStudio}
      />

      <main className="ohf-us-main">
        <div className="ohf-us-container">
          {/* ── 사이드바 레일 ── */}
          <div className="ohf-us-rail-wrap">
            <div className="ohf-us-rail">
              <div className="ohf-us-rail-inner">
                <aside className="ohf-us-aside" aria-label="설정 탐색">
                  <div className="ohf-us-menu-group">
                    <div className="ohf-us-menu-label">
                      <p className="ohf-us-workspace">{ACCOUNT.workspace}</p>
                      <ul className="ohf-us-list">
                        {MENU.map((m) => (
                          <li key={m.k} className="ohf-us-item">
                            <a
                              href={m.href}
                              className="ohf-us-link"
                              {...(m.self ? { "aria-current": "page" as const } : {})}
                            >
                              <span className="ohf-us-chip-wrap" aria-hidden="true">
                                <span className={`ohf-us-chip ohf-us-chip-${m.k}`}>
                                  <span className="ohf-us-chip-ico">
                                    <Icon size="16" paths={m.paths.map((d) => ({ d }))} />
                                  </span>
                                </span>
                              </span>
                              <span className="ohf-us-link-label">{m.label}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="ohf-us-logout-group">
                    <button
                      type="button"
                      className="ohf-us-logout"
                      aria-disabled="true"
                      data-off="1"
                      title="OHF는 로컬 스튜디오라 세션 로그아웃이 없다"
                    >
                      <span className="ohf-us-logout-ico-wrap" aria-hidden="true">
                        <Icon size="16" className="ohf-us-logout-ico" paths={[LOGOUT]} />
                      </span>
                      <span className="ohf-us-logout-label">로그아웃</span>
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          </div>

          {/* ── 본문 컬럼 ── */}
          <div className="ohf-us-content">
            <div className="ohf-us-stack">
              {/* 페이지 헤더 */}
              <div className="ohf-us-head">
                <div className="ohf-us-title-col">
                  <h1 className="ohf-us-title">{ACCOUNT.title}</h1>
                  <p className="ohf-us-subtitle">{ACCOUNT.subtitle}</p>
                </div>
                <div className="ohf-us-toolbar">
                  <button
                    type="button"
                    className="ohf-us-refresh"
                    aria-disabled="true"
                    data-off="1"
                    title="OHF에는 크레딧 새로고침 서버가 없다"
                  >
                    <Icon size="12" paths={[REFRESH]} />
                    <span className="ohf-us-refresh-label">새로고침</span>
                  </button>
                  <div className="ohf-us-trigger-wrap">
                    <button
                      type="button"
                      className="ohf-us-trigger"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      aria-disabled="true"
                      data-off="1"
                      title="OHF에는 기간 선택 팝오버가 없다"
                    >
                      <Icon size="12" paths={[CALENDAR]} />
                      <span className="ohf-us-trigger-label">최근 7일</span>
                      <Icon size="12" paths={[CHEVRON_DOWN]} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="ohf-us-blocks">
                {/* ── 섹션 1: 사용 요약 ── */}
                <section className="ohf-us-section">
                  <div className="ohf-us-sec-head">
                    <div className="ohf-us-sec-left">
                      <Icon size="14" className="ohf-us-sec-ico" paths={BARS} />
                      <span className="ohf-us-sec-label">사용 요약</span>
                    </div>
                    <div className="ohf-us-sec-right">
                      <a
                        href="https://higgsfield.ai/docs"
                        className="ohf-us-more"
                        aria-disabled="true"
                        data-off="1"
                        title="OHF에는 HF 문서로 가는 상세 링크가 없다"
                        onClick={(e) => e.preventDefault()}
                      >
                        자세히 알아보기
                      </a>
                    </div>
                  </div>
                  <div className="ohf-us-sec-body">
                    <div className="ohf-us-cards">
                      {STATS.map((s) => (
                        <div key={s.label} className="ohf-us-card">
                          <div className="ohf-us-card-row">
                            <span className="ohf-us-plate" aria-hidden="true">
                              <Icon size="14" className="ohf-us-plate-ico" paths={s.paths} />
                            </span>
                            <div className="ohf-us-card-text">
                              <span className="ohf-us-card-value">{s.value}</span>
                              <span className="ohf-us-card-label">{s.label}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="ohf-us-itemcard">
                      <div className="ohf-us-dist">
                        <div className="ohf-us-bar" role="img" aria-label="기능별 크레딧 사용 분포">
                          {DISTRIBUTION.map((d) => (
                            <button
                              key={d.name}
                              type="button"
                              className={`ohf-us-seg ${d.cls}`}
                              aria-disabled="true"
                              data-off="1"
                              title={`${d.name} ${d.pct}`}
                              aria-label={`${d.name} ${d.pct}`}
                            />
                          ))}
                        </div>
                        <div className="ohf-us-legend">
                          {DISTRIBUTION.map((d) => (
                            <div key={d.name} className="ohf-us-leg-item">
                              <span className="ohf-us-leg-dot" style={{ background: d.color }} aria-hidden="true" />
                              <span className="ohf-us-leg-name">{d.name}</span>
                              <span className="ohf-us-leg-pct">{d.pct}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── 섹션 2: 사용 내역 ── */}
                <section className="ohf-us-section">
                  <div className="ohf-us-sec-head">
                    <div className="ohf-us-sec-left">
                      <Icon size="14" className="ohf-us-sec-ico" paths={BARS} />
                      <span className="ohf-us-sec-label">사용 내역</span>
                      <span className="ohf-us-badge">8</span>
                    </div>
                  </div>
                  <div className="ohf-us-sec-body">
                    <div className="ohf-us-table-card">
                      <div className="ohf-us-table-wrap">
                        <table className="ohf-us-table">
                          <thead className="ohf-us-thead">
                            <tr>
                              <th className="ohf-us-th ohf-us-th-credit" scope="col">크레딧</th>
                              <th className="ohf-us-th ohf-us-th-feature" scope="col">
                                <button
                                  type="button"
                                  className="ohf-us-th-btn"
                                  aria-haspopup="dialog"
                                  aria-expanded="false"
                                  aria-disabled="true"
                                  data-off="1"
                                  title="OHF에는 기능 필터 팝오버가 없다"
                                >
                                  <span>모든 기능</span>
                                  <Icon size="12" paths={[CHEVRON_DOWN]} />
                                </button>
                              </th>
                              <th className="ohf-us-th ohf-us-th-status" scope="col">
                                <button
                                  type="button"
                                  className="ohf-us-th-btn"
                                  aria-haspopup="dialog"
                                  aria-expanded="false"
                                  aria-disabled="true"
                                  data-off="1"
                                  title="OHF에는 작업 필터 팝오버가 없다"
                                >
                                  <span>모든 작업</span>
                                  <Icon size="12" paths={[CHEVRON_DOWN]} />
                                </button>
                              </th>
                              <th className="ohf-us-th ohf-us-th-date" scope="col">날짜</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ROWS.map((r, i) => (
                              <tr key={i} className="ohf-us-tbody-tr">
                                <td className="ohf-us-td ohf-us-td-credit">
                                  <button
                                    type="button"
                                    className={`ohf-us-credit${r.credit.startsWith("+") ? " ohf-us-credit-plus" : ""}`}
                                    aria-disabled="true"
                                    data-off="1"
                                    title="OHF에는 크레딧 툴팁 서버가 없다"
                                  >
                                    {r.credit}
                                  </button>
                                </td>
                                <td className="ohf-us-td ohf-us-td-feature">
                                  <span className="ohf-us-feature">{r.feature}</span>
                                </td>
                                <td className="ohf-us-td ohf-us-td-status">
                                  <span className="ohf-us-pill">{r.status}</span>
                                </td>
                                <td className="ohf-us-td ohf-us-td-date">
                                  <p className="ohf-us-date">
                                    <span className="ohf-us-date-main">{r.date}</span>{" "}
                                    <span className="ohf-us-date-time">{r.time}</span>
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td className="ohf-us-foot-td" colSpan={4}>
                                <div className="ohf-us-foot">
                                  <button
                                    type="button"
                                    className="ohf-us-pageset"
                                    aria-disabled="true"
                                    data-off="1"
                                    title="OHF에는 페이지 크기 셀렉터가 없다"
                                  >
                                    <span className="ohf-us-pageset-label">표시</span>
                                    <span className="ohf-us-pageset-value">25</span>
                                    <Icon size="12" paths={[CHEVRON_DOWN]} />
                                  </button>
                                  <p className="ohf-us-pageinfo">1페이지 중 1페이지</p>
                                  <div className="ohf-us-pager">
                                    <button type="button" className="ohf-us-page-btn" disabled aria-label="이전 페이지">
                                      <Icon size="20" paths={[CHEVRON_LEFT]} />
                                    </button>
                                    <button type="button" className="ohf-us-page-btn" disabled aria-label="다음 페이지">
                                      <Icon size="20" paths={[CHEVRON_RIGHT]} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* 우하단 도움말 런처 — HF의 fixed 우 20px/하 20px 미러 */}
        <div className="ohf-us-help">
          <div className="ohf-us-help-plate">
            <span className="ohf-us-help-ring" aria-hidden="true" />
            <button
              type="button"
              className="ohf-us-help-btn"
              aria-disabled="true"
              data-off="1"
              title="OHF에는 HF 도움말 패널이 없다"
            >
              <span className="ohf-us-help-ico-wrap" aria-hidden="true">
                <Icon size="16" paths={HELP} />
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
