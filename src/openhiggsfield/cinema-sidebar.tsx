"use client";

/* HG 원본의 시네마 스튜디오 사이드바를 그대로 옮긴 레일. 지상 실측치(1440×900,
   2026-11-02)를 그대로 되살리는 것이 목표 — 칩 그라디언트, 글리프 그라디언트,
   접기 폭, 정렬 팝업 규격까지 CDP로 재고한 값이다. 실제 동작은 OH의的真实 스토어
   (projects / studio / feed favorites)가 채우고, HG에만 존재하는 기능(요금제,
   계정 메뉴, 알림, 커뮤니티)은 화면 미러로 남기되 정직하게 무색·무동작으로 둔다. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useProjects, projectLabel, DEFAULT_PROJECT_ID, type Project } from "@/generation/stores/projects";
import { useProjectSurface } from "@/generation/stores/project-surface";
import { LOCAL_USER } from "./local-user";
import { useStudio } from "./studio-mode";
import { ProjectDialog } from "./project-dialog";
import {
  ApertureIcon,
  AssetsIcon,
  ChevronLeftIcon,
  ClapperIcon,
  CubeIcon,
  HammerIcon,
  PersonIcon,
  SlidersIcon,
  TrashIcon,
} from "./icons";

/* ── 실측된 글리프들 ───────────────────────────────────────────────────────
   HG의 아이콘은 Figma 내그림자 필터와 흰색→투명 그라디언트를 각 아이콘 좌표계에
   맞춰 심는다. 같은 정의를 OH 측 id로 다시 박았다. */

type GlyphProps = { size?: number };

/** 홈 — 지붕과 벽이 한 몸인 집. */
function CineHomeGlyph({ size = 18 }: GlyphProps) {
  const id = "ohfcine-home";
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} fill="none" aria-hidden="true" className="ohf-cine-glyph">
      <defs>
        <linearGradient id={`${id}-fill`} x1="9" y1="0.96904" x2="9" y2="15.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-line`} x1="9" y1="0.96904" x2="9" y2="15.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.32" />
        </linearGradient>
        <filter id={`${id}-insh`} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="bg" />
          <feBlend mode="normal" in="SourceGraphic" in2="bg" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hard" />
          <feOffset dy="-0.297579" />
          <feGaussianBlur stdDeviation="2.67821" />
          <feComposite in2="hard" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0.35 0" />
          <feBlend mode="normal" in2="shape" result="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-insh)`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.83115 1.26572C9.34763 0.87015 8.65237 0.870143 8.16885 1.26572L2.73137 5.71459C2.4267 5.96387 2.25 6.33674 2.25 6.7304V14.4375C2.25 15.1624 2.83763 15.75 3.5625 15.75H14.4375C15.1624 15.75 15.75 15.1624 15.75 14.4375V6.7304C15.75 6.33674 15.5733 5.96387 15.2687 5.71459L9.83115 1.26572Z"
          fill={`url(#${id}-fill)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.48535 1.65263C8.7847 1.40774 9.2153 1.40773 9.51465 1.65263L14.9521 6.10185C15.1406 6.25617 15.25 6.48716 15.25 6.73076V14.4378C15.2498 14.8864 14.8861 15.2503 14.4375 15.2503H3.5625C3.11386 15.2503 2.75016 14.8864 2.75 14.4378V6.73076L2.75488 6.63994C2.77834 6.4304 2.8829 6.23691 3.04785 6.10185L8.48535 1.65263Z"
          stroke={`url(#${id}-line)`}
        />
      </g>
    </svg>
  );
}

/** 내 생성 — 큰 별과 작은 별이 겹친 반짝임. */
function CineSparkGlyph({ size = 18 }: GlyphProps) {
  const id = "ohfcine-spark";
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} fill="none" aria-hidden="true" className="ohf-cine-glyph">
      <defs>
        <linearGradient id={`${id}-a`} x1="9" y1="2" x2="9" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="9" y1="2" x2="9" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="9" y1="2" x2="9" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.32" />
        </linearGradient>
        <filter id={`${id}-insh`} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="bg" />
          <feBlend mode="normal" in="SourceGraphic" in2="bg" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hard" />
          <feOffset dy="-0.297579" />
          <feGaussianBlur stdDeviation="2.67821" />
          <feComposite in2="hard" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0.35 0" />
          <feBlend mode="normal" in2="shape" result="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-insh)`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.5657 5.11111C10.8874 5.11111 11.1762 5.30916 11.2918 5.60937L12.337 8.32755C12.416 8.53278 12.5783 8.69514 12.7836 8.77416L15.5017 9.8193C15.802 9.93487 16 10.2237 16 10.5454V10.5657C16 10.8874 15.802 11.1762 15.5017 11.2918L12.7836 12.337C12.5783 12.416 12.416 12.5783 12.337 12.7836L11.2918 15.5017C11.1762 15.802 10.8874 16 10.5657 16H10.5454C10.2237 16 9.93487 15.802 9.8193 15.5017L8.77416 12.7836C8.69514 12.5783 8.53278 12.416 8.32755 12.337L5.60937 11.2918C5.30916 11.1762 5.11111 10.8874 5.11111 10.5657V10.5454C5.11111 10.2237 5.30916 9.93487 5.60937 9.8193L8.32755 8.77416C8.53278 8.69514 8.69514 8.53278 8.77416 8.32755L9.8193 5.60937C9.93487 5.30916 10.2237 5.11111 10.5454 5.11111H10.5657Z"
          fill={`url(#${id}-a)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.11111 2C5.29873 2 5.46708 2.11555 5.53443 2.29065L6.07624 3.69936C6.15524 3.90471 6.31751 4.06698 6.52286 4.14598L7.93157 4.68779C8.10665 4.75514 8.22222 4.9235 8.22222 5.11111C8.22222 5.29873 8.10665 5.46708 7.93157 5.53443L6.52286 6.07624C6.31751 6.15524 6.15524 6.31751 6.07624 6.52286L5.53443 7.93157C5.46708 8.10665 5.29873 8.22222 5.11111 8.22222C4.9235 8.22222 4.75514 8.10665 4.68779 7.93157L4.14598 6.52286C4.06698 6.31751 3.90471 6.15524 3.69936 6.07624L2.29065 5.53443C2.11554 5.46708 2 5.29873 2 5.11111C2 4.9235 2.11555 4.75514 2.29065 4.68779L3.69936 4.14598C3.90471 4.06698 4.06698 3.90471 4.14598 3.69936L4.68779 2.29065C4.75514 2.11554 4.9235 2 5.11111 2Z"
          fill={`url(#${id}-b)`}
        />
        <path
          d="M10.5459 5.61133H10.5654C10.6806 5.61133 10.784 5.68213 10.8252 5.78906L11.8701 8.50684C11.9999 8.84391 12.2665 9.11137 12.6035 9.24121H12.6045L15.3223 10.2861C15.4291 10.3273 15.5 10.4308 15.5 10.5459V10.5654C15.5 10.6519 15.4597 10.7314 15.3945 10.7832L15.3223 10.8252L12.6045 11.8701H12.6035C12.2666 11.9999 11.9999 12.2666 11.8701 12.6035V12.6045L10.8252 15.3223C10.784 15.4291 10.6806 15.5 10.5654 15.5H10.5459C10.4593 15.5 10.3789 15.4599 10.3271 15.3945L10.2861 15.3223L9.24121 12.6045V12.6035C9.11137 12.2665 8.84391 11.9999 8.50684 11.8701L5.78906 10.8252C5.68213 10.784 5.61133 10.6806 5.61133 10.5654V10.5459C5.61133 10.4307 5.68215 10.3273 5.78906 10.2861L8.50684 9.24121C8.84397 9.1114 9.1114 8.84397 9.24121 8.50684L10.2861 5.78906C10.3273 5.68215 10.4307 5.61133 10.5459 5.61133ZM5.60938 3.87891C5.73916 4.21627 6.00639 4.48252 6.34375 4.6123L7.63867 5.11035L6.34375 5.60938C6.00639 5.73916 5.73916 6.00639 5.60938 6.34375L5.11035 7.63867L4.6123 6.34375C4.48252 6.00639 4.21627 5.73916 3.87891 5.60938L2.58203 5.11035L3.87891 4.6123C4.21617 4.48252 4.48252 4.21617 4.6123 3.87891L5.11035 2.58203L5.60938 3.87891Z"
          stroke={`url(#${id}-c)`}
        />
      </g>
    </svg>
  );
}

/** 내 요소 — 원 주위를 도는 두 화살. */
function CineRefreshGlyph({ size = 18 }: GlyphProps) {
  const id = "ohfcine-refresh";
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} fill="none" aria-hidden="true" className="ohf-cine-glyph">
      <defs>
        <linearGradient id={`${id}-fill`} x1="9.00021" y1="1.09821" x2="9.00021" y2="16.9022" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-line`} x1="9.00021" y1="1.09821" x2="9.00021" y2="16.9022" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.32" />
        </linearGradient>
        <filter id={`${id}-insh`} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="bg" />
          <feBlend mode="normal" in="SourceGraphic" in2="bg" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hard" />
          <feOffset dy="-0.297579" />
          <feGaussianBlur stdDeviation="2.67821" />
          <feComposite in2="hard" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0.35 0" />
          <feBlend mode="normal" in2="shape" result="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-insh)`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.04953 8.49609C5.33684 6.45175 7.07651 4.77754 9.15527 5.06961C9.79817 5.15997 10.3581 5.42203 10.8164 5.80162C11.0112 5.48068 11.3858 5.291 11.7807 5.34835C12.3076 5.425 12.6733 5.91377 12.5968 6.44071L12.1988 9.17536C12.0771 10.0356 12.7007 10.8231 13.5661 10.9018C14.0734 10.9478 14.3642 10.7658 14.5731 10.4787C14.8184 10.1414 14.9736 9.60566 14.9736 8.99958C14.9734 5.70086 12.2983 3.02679 8.99958 3.02679C5.701 3.02701 3.02701 5.701 3.02679 8.99958C3.02679 12.2983 5.70086 14.9734 8.99958 14.9736C10.1546 14.9736 11.2312 14.6467 12.1436 14.0809C12.5961 13.8004 13.1901 13.9398 13.4707 14.3923C13.7511 14.8448 13.6118 15.4388 13.1593 15.7194C11.9506 16.4691 10.524 16.9022 8.99958 16.9022C4.63574 16.902 1.09821 13.3635 1.09821 8.99958C1.09844 4.63588 4.63588 1.09844 8.99958 1.09821C13.3635 1.09821 16.902 4.63574 16.9022 8.99958C16.9022 9.8782 16.6876 10.8522 16.1338 11.6137C15.5436 12.4252 14.6051 12.9318 13.3916 12.8216C12.4921 12.7398 11.7096 12.3194 11.1504 11.7016C10.3884 12.5745 9.28139 13.0936 8.05162 12.9208C5.97319 12.6285 4.76251 10.5401 5.04953 8.49609ZM8.88658 6.97935C8.09425 6.86827 7.13326 7.52687 6.95926 8.76353C6.78541 10.0006 7.52782 10.8996 8.32031 11.011C9.11273 11.1224 10.0737 10.4627 10.2476 9.22559C10.4213 7.98871 9.67891 7.09071 8.88658 6.97935Z"
          fill={`url(#${id}-fill)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.99958 1.59821C13.0874 1.59821 16.4017 4.91195 16.4019 8.99958C16.4019 9.80784 16.2028 10.6686 15.7291 11.3199C15.2377 11.9952 14.4672 12.4173 13.4371 12.3238C12.6684 12.2539 12.0001 11.895 11.5211 11.3658L11.1431 10.9488L10.774 11.3726C10.1051 12.1389 9.1584 12.571 8.12165 12.4254C6.38118 12.1806 5.28637 10.4057 5.5445 8.56599C5.80311 6.72588 7.34474 5.32051 9.08552 5.56501C9.63323 5.64199 10.1079 5.86428 10.4976 6.18708L10.9439 6.55622L11.2437 6.0611C11.3373 5.9069 11.5179 5.81574 11.7086 5.84333C11.9311 5.87571 12.0935 6.05996 12.106 6.27497L12.1021 6.36872L11.7037 9.1031V9.10505C11.5419 10.2484 12.3709 11.2954 13.5211 11.4C13.8439 11.4293 14.1354 11.3883 14.3931 11.2681C14.6504 11.1481 14.8366 10.9661 14.9771 10.773C15.3019 10.3264 15.4732 9.67742 15.4732 8.99958L15.4654 8.66657C15.2974 5.35668 12.6424 2.70245 9.33259 2.53474L8.99958 2.52693C5.42489 2.52717 2.52717 5.42489 2.52693 8.99958L2.53474 9.33259C2.70245 12.6424 5.35668 15.2974 8.66657 15.4654L8.99958 15.4732C10.2503 15.4732 11.4175 15.119 12.4068 14.5054C12.6246 14.3705 12.9103 14.438 13.0455 14.6558C13.1804 14.8737 13.1137 15.1594 12.8961 15.2945C11.7641 15.9965 10.4281 16.4019 8.99958 16.4019C4.91195 16.4017 1.59821 13.0874 1.59821 8.99958L1.60798 8.61872C1.80001 4.83431 4.83431 1.80001 8.61872 1.60798L8.99958 1.59821ZM8.95564 6.48396C7.90891 6.33744 6.81469 7.12821 6.51325 8.42732L6.46443 8.69392C6.25976 10.1502 7.13345 11.3493 8.25056 11.5064C9.36781 11.6635 10.5379 10.7515 10.7427 9.29548C10.9472 7.83931 10.0732 6.64114 8.95661 6.48396H8.95564Z"
          stroke={`url(#${id}-line)`}
        />
      </g>
    </svg>
  );
}

/** 내 즐겨찾기 — HeartIcon의 HF 글리프 판. */
function CineHeartGlyph({ size = 18 }: GlyphProps) {
  const id = "ohfcine-heart";
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} fill="none" aria-hidden="true" className="ohf-cine-glyph">
      <defs>
        <linearGradient id={`${id}-fill`} x1="9" y1="2.25" x2="9" y2="15.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-line`} x1="9" y1="2.25" x2="9" y2="15.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.32" />
        </linearGradient>
        <filter id={`${id}-insh`} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="bg" />
          <feBlend mode="normal" in="SourceGraphic" in2="bg" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hard" />
          <feOffset dy="-0.297579" />
          <feGaussianBlur stdDeviation="2.67821" />
          <feComposite in2="hard" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0.35 0" />
          <feBlend mode="normal" in2="shape" result="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-insh)`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 3.24586C9.14513 3.14047 9.32895 3.01957 9.54893 2.89915C10.1411 2.5751 11.0044 2.25 12.0833 2.25C13.1984 2.25 14.3122 2.69828 15.1441 3.58863C15.9785 4.48172 16.5 5.78636 16.5 7.45312C16.5 9.9402 14.7367 12.0185 13.0445 13.4211C12.1835 14.1348 11.3051 14.7037 10.6018 15.0957C10.2502 15.2917 9.9369 15.4466 9.68633 15.5543C9.56153 15.608 9.44603 15.6527 9.34523 15.6851C9.26333 15.7114 9.13155 15.75 9 15.75C8.86845 15.75 8.73667 15.7114 8.65477 15.6851C8.55397 15.6527 8.43847 15.608 8.31367 15.5543C8.0631 15.4466 7.74983 15.2917 7.39824 15.0957C6.69489 14.7037 5.81654 14.1348 4.95549 13.4211C3.26335 12.0185 1.5 9.9402 1.5 7.45312C1.5 5.78636 2.02146 4.48172 2.85592 3.58863C3.68781 2.69828 4.80156 2.25 5.91667 2.25C6.99564 2.25 7.85895 2.5751 8.45107 2.89915C8.67105 3.01957 8.85487 3.14047 9 3.24586Z"
          fill={`url(#${id}-fill)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.083 2.75C13.0633 2.75 14.0436 3.14352 14.7783 3.92969C15.5133 4.71635 16 5.89282 16 7.45312C16 9.70589 14.3912 11.6556 12.7256 13.0361C11.8912 13.7277 11.0387 14.28 10.3584 14.6592C10.0182 14.8488 9.71985 14.9951 9.48828 15.0947C9.37268 15.1444 9.27313 15.183 9.19238 15.209C9.15759 15.2202 9.12147 15.2313 9.08496 15.2393C9.0476 15.2474 9.01904 15.25 9 15.25C8.98096 15.25 8.9524 15.2474 8.91504 15.2393C8.87853 15.2313 8.84241 15.2202 8.80762 15.209C8.72687 15.183 8.62732 15.1444 8.51172 15.0947C8.28014 14.9951 7.98181 14.8488 7.6416 14.6592C6.96126 14.28 6.10881 13.7277 5.27441 13.0361C3.60885 11.6556 2 9.70588 2 7.45312C2 5.89282 2.48667 4.71635 3.22168 3.92969C3.95641 3.14353 4.93672 2.75 5.91699 2.75C6.89316 2.75007 7.67405 3.04408 8.21094 3.33789C8.41023 3.44699 8.57616 3.55607 8.70605 3.65039L9 3.86426L9.29395 3.65039C9.42384 3.55607 9.58977 3.44699 9.78906 3.33789C10.3259 3.04408 11.1069 2.75006 12.083 2.75Z"
          stroke={`url(#${id}-line)`}
        />
      </g>
    </svg>
  );
}

/** 커뮤니티 — 사선이 겹친 globe. */
function CineGlobeGlyph({ size = 18 }: GlyphProps) {
  const id = "ohfcine-globe";
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} fill="none" aria-hidden="true" className="ohf-cine-glyph">
      <defs>
        <linearGradient id={`${id}-fill`} x1="9" y1="1.25" x2="9" y2="16.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={`${id}-line`} x1="9" y1="1.25" x2="9" y2="16.75" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0.32" />
        </linearGradient>
        <filter id={`${id}-insh`} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="bg" />
          <feBlend mode="normal" in="SourceGraphic" in2="bg" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hard" />
          <feOffset dy="-0.297579" />
          <feGaussianBlur stdDeviation="2.67821" />
          <feComposite in2="hard" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0 0.72549 0 0 0 0.35 0" />
          <feBlend mode="normal" in2="shape" result="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-insh)`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 1.25C10.8468 1.25 12.5426 1.89711 13.874 2.97559L14.2588 2.5918C14.5761 2.27453 15.0909 2.27458 15.4082 2.5918C15.7254 2.90909 15.7254 3.42392 15.4082 3.74121L15.0234 4.125C16.1024 5.45658 16.75 7.15268 16.75 9C16.75 13.2802 13.2802 16.75 9 16.75C7.15268 16.75 5.45658 16.1024 4.125 15.0234L3.74121 15.4082C3.42391 15.7255 2.9091 15.7255 2.5918 15.4082C2.27455 15.0909 2.27452 14.5761 2.5918 14.2588L2.97559 13.874C1.89711 12.5426 1.25 10.8468 1.25 9C1.25 4.71979 4.71979 1.25 9 1.25ZM5.28125 13.8662C6.31247 14.6555 7.60095 15.125 9 15.125C9.8915 15.125 10.7364 14.931 11.5 14.5889C11.3154 14.5131 11.1282 14.4279 10.9404 14.334C9.84076 13.7841 8.59709 12.8912 7.38281 11.7646L5.28125 13.8662ZM8.53223 10.6162C9.64496 11.6421 10.7472 12.4209 11.667 12.8809C12.212 13.1533 12.6513 13.2929 12.9648 13.3301C13.1985 13.3578 13.2887 13.3214 13.3115 13.3096C13.3242 13.2836 13.3569 13.1917 13.3301 12.9648C13.2929 12.6513 13.1534 12.2119 12.8809 11.667C12.421 10.7472 11.6421 9.64501 10.6162 8.53223L8.53223 10.6162ZM3.41016 6.49805C3.06768 7.26198 2.875 8.10799 2.875 9C2.875 10.3986 3.34297 11.6877 4.13184 12.7188L6.23438 10.6162C5.10827 9.40225 4.2157 8.15896 3.66602 7.05957C3.57176 6.87106 3.48615 6.68337 3.41016 6.49805ZM11.7656 7.38281C12.892 8.59703 13.7852 9.84084 14.335 10.9404C14.4287 11.128 14.5142 11.3146 14.5898 11.499C14.9316 10.7357 15.125 9.89102 15.125 9C15.125 7.60095 14.6555 6.31247 13.8662 5.28125L11.7656 7.38281ZM5.03613 4.66992C4.80396 4.64241 4.71202 4.67646 4.68848 4.68848C4.67635 4.71242 4.64258 4.80407 4.66992 5.03516C4.70708 5.34867 4.84664 5.78801 5.11914 6.33301C5.57894 7.25261 6.35816 8.35418 7.38379 9.4668L9.4668 7.38281C8.35435 6.3574 7.25246 5.57887 6.33301 5.11914C5.78831 4.8468 5.3496 4.70716 5.03613 4.66992ZM9 2.875C8.10878 2.875 7.26342 3.06726 6.5 3.40918C6.6849 3.48504 6.87149 3.57198 7.05957 3.66602C8.15898 4.2157 9.4022 5.10828 10.6162 6.23438L12.7188 4.13184C11.6877 3.34297 10.3986 2.875 9 2.875Z"
          fill={`url(#${id}-fill)`}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 1.75C10.7279 1.75 12.3138 2.35514 13.5596 3.36426L13.9092 3.64746L14.2275 3.3291L14.6123 2.94531C14.7191 2.83856 14.8844 2.82509 15.0059 2.90527L15.0547 2.94531C15.1614 3.05213 15.1748 3.21749 15.0947 3.33887L15.0547 3.3877L14.6699 3.77148L14.3516 4.08984L14.6348 4.43945C15.6444 5.68543 16.25 7.27164 16.25 9C16.25 13.004 13.004 16.25 9 16.25C7.27164 16.25 5.68543 15.6444 4.43945 14.6348L4.08984 14.3516L3.77148 14.6699L3.3877 15.0547C3.26566 15.1767 3.06735 15.1767 2.94531 15.0547C2.8385 14.9478 2.82512 14.7825 2.90527 14.6611L2.94531 14.6123L3.3291 14.2275L3.64746 13.9092L3.36426 13.5596C2.35514 12.3138 1.75 10.7279 1.75 9C1.75 4.99593 4.99593 1.75 9 1.75ZM4.52441 13.916L4.97754 14.2637C6.09272 15.1171 7.48724 15.625 9 15.625C9.96481 15.625 10.8789 15.4146 11.7041 15.0449L12.7676 14.5684L11.6895 14.126C11.5169 14.0552 11.3411 13.9752 11.1641 13.8867C10.1175 13.3634 8.9121 12.5019 7.72266 11.3984L7.37012 11.0703L4.52441 13.916ZM7.81055 10.6309L8.19336 10.9834C9.18862 11.901 10.1861 12.6359 11.0713 13.1309L11.4434 13.3281C12.0159 13.6144 12.5137 13.7796 12.9062 13.8262C13.2012 13.8611 13.4009 13.8263 13.541 13.7539L13.6885 13.6777L13.7607 13.5283C13.8295 13.3871 13.8597 13.1899 13.8262 12.9062C13.7797 12.5137 13.6145 12.016 13.3281 11.4434C12.842 10.4711 12.032 9.33079 10.9834 8.19336L10.6309 7.81055L7.81055 10.6309ZM2.9541 6.29395C2.5838 7.12004 2.375 8.03534 2.375 9C2.375 10.5119 2.88111 11.9071 3.73438 13.0225L4.08203 13.4756L6.92871 10.6289L6.60059 10.2764C5.49753 9.08725 4.63641 7.88221 4.11328 6.83594C4.02425 6.65787 3.94398 6.48157 3.87305 6.30859L3.43066 5.23047L2.9541 6.29395ZM13.5127 4.92773L11.4121 7.0293L11.0713 7.37012L11.3994 7.72266C12.5028 8.91206 13.3645 10.1176 13.8877 11.1641C13.9764 11.3415 14.0564 11.5167 14.127 11.6885L14.5703 12.7666L15.0459 11.7031C15.4153 10.8781 15.625 9.96413 15.625 9C15.625 7.48724 15.1171 6.09272 14.2637 4.97754L13.916 4.52441L13.5127 4.92773ZM5.09473 4.17383C4.80814 4.13989 4.60512 4.16958 4.46094 4.24316L4.31641 4.31738L4.24219 4.46289C4.16954 4.60657 4.14004 4.80808 4.17383 5.09375C4.22035 5.4863 4.38555 5.98399 4.67188 6.55664C5.15798 7.52886 5.9684 8.66856 7.0166 9.80566L7.36914 10.1885L7.7373 9.82031L9.82031 7.73633L10.1885 7.36816L9.80566 7.01562C8.66858 5.9675 7.52857 5.15784 6.55664 4.67188C5.98447 4.3858 5.48728 4.22046 5.09473 4.17383ZM9 2.375C8.03617 2.375 7.12151 2.58337 6.2959 2.95312L5.23145 3.42969L6.31055 3.87207C6.48085 3.94195 6.65572 4.02317 6.83594 4.11328C7.88221 4.6364 9.08718 5.49753 10.2764 6.60059L10.6289 6.92871L13.4756 4.08203L13.0225 3.73438C11.9071 2.88111 10.5119 2.375 9 2.375Z"
          stroke={`url(#${id}-line)`}
        />
      </g>
    </svg>
  );
}

/* ── 실측 stroke 아이콘들(접기·검색·정렬·닫기·폴더·점·벨·태그·화살표) ──
   HG의 페더 계열은 모두 1.5 굵기의 라운드 캡이다. viewBox만 16/24로 갈린다. */

function strokePath(d: string, vb: string, size: number, sw = 1.5) {
  return (
    <svg viewBox={vb} width={size} height={size} fill="none" aria-hidden="true" className="ohf-cine-line">
      <path d={d} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PanelIcon = ({ size = 16 }: GlyphProps) =>
  strokePath(
    "M1.83333 3.83333C1.83333 3.46514 2.13181 3.16667 2.5 3.16667H13.5C13.8682 3.16667 14.1667 3.46515 14.1667 3.83333V12.1667C14.1667 12.5349 13.8682 12.8333 13.5 12.8333H2.5C2.13181 12.8333 1.83333 12.5349 1.83333 12.1667V3.83333Z M4.16667 5.5V10.5",
    "0 0 16 16",
    size,
  );

/* 접힌 상태의 펼치기 판은 선이 반대쪽 벽에 선다. */
const PanelOpenIcon = ({ size = 16 }: GlyphProps) =>
  strokePath(
    "M1.83333 3.83333C1.83333 3.46514 2.13181 3.16667 2.5 3.16667H13.5C13.8682 3.16667 14.1667 3.46515 14.1667 3.83333V12.1667C14.1667 12.5349 13.8682 12.8333 13.5 12.8333H2.5C2.13181 12.8333 1.83333 12.5349 1.83333 12.1667V3.83333Z M11.8333 5.5V10.5",
    "0 0 16 16",
    size,
  );

const SearchIcon = ({ size = 16 }: GlyphProps) =>
  strokePath(
    "M20.25 20.25L16.1265 16.1265M16.1265 16.1265C17.4385 14.8145 18.25 13.002 18.25 11C18.25 6.99594 15.0041 3.75 11 3.75C6.99594 3.75 3.75 6.99594 3.75 11C3.75 15.0041 6.99594 18.25 11 18.25C13.002 18.25 14.8145 17.4385 16.1265 16.1265Z",
    "0 0 24 24",
    size,
  );

const SortIcon = ({ size = 16 }: GlyphProps) =>
  strokePath(
    "M6.0016 4.75V19.25M6.0016 19.25L3 16.25M6.0016 19.25L9 16.25M11.75 6.75H20.25M15.75 17.25H20.25M13.75 12H20.25",
    "0 0 24 24",
    size,
  );

const XIcon = ({ size = 16 }: GlyphProps) =>
  strokePath("M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5", "0 0 16 16", size);

const FolderIcon = ({ size = 16 }: GlyphProps) =>
  strokePath(
    "M6.75 3.75h10.5m-12.5 3.5h14.5m.985 3.5H3.765a1 1 0 0 0-.974 1.23l1.777 7.5a1 1 0 0 0 .973.77h12.918a1 1 0 0 0 .973-.77l1.777-7.5a1 1 0 0 0-.974-1.23",
    "0 0 24 24",
    size,
  );

const DotsIcon = ({ size = 16 }: GlyphProps) =>
  strokePath(
    "M12 4.75a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 21.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
    "0 0 24 24",
    size,
  );

const BellIcon = ({ size = 12 }: GlyphProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" className="ohf-cine-line">
    <path
      d="M20.25 16.2441C20.25 16.7964 19.8023 17.25 19.25 17.25H4.75C4.19772 17.25 3.75 16.7964 3.75 16.2441V16.2441C3.75 16.0846 3.78813 15.9261 3.8612 15.7843L5.19785 13.192C5.26311 13.0655 5.30059 12.9264 5.30777 12.7842L5.50351 8.90897C5.6766 5.45882 8.53386 2.75 12 2.75C15.4661 2.75 18.3234 5.45882 18.4965 8.90897L18.6922 12.7842C18.6994 12.9264 18.7369 13.0655 18.8021 13.192L20.1388 15.7843C20.2119 15.9261 20.25 16.0846 20.25 16.2441V16.2441Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 17.25C16 19.4591 14.2091 21.25 12 21.25C9.79086 21.25 8 19.4591 8 17.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TagIcon = ({ size = 16 }: GlyphProps) =>
  strokePath(
    "M8.5 7.75L6.25 10L8.5 12.25M12.7071 20.0429L22.049 10.701C22.4371 10.3129 22.4398 9.68443 22.0551 9.29295L16.901 4.04903C16.713 3.85774 16.4561 3.75 16.1879 3.75H7.81214C7.54393 3.75 7.28696 3.85774 7.09895 4.04903L1.94493 9.29295C1.56016 9.68443 1.56288 10.3129 1.95102 10.701L11.2929 20.0429C11.6834 20.4334 12.3166 20.4334 12.7071 20.0429Z",
    "0 0 24 24",
    size,
  );

const RightChevron = ({ size = 16 }: GlyphProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className="ohf-cine-line">
    <path d="M8.97 5.22a.75.75 0 0 1 1.06 0l6.25 6.25a.75.75 0 0 1 0 1.06l-6.25 6.25a.75.75 0 1 1-1.06-1.06L14.69 12 8.97 6.28a.75.75 0 0 1 0-1.06" />
  </svg>
);

const PlusIcon = ({ size = 18 }: GlyphProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className="ohf-cine-line">
    <path d="M12 6C12.4142 6 12.75 6.33579 12.75 6.75V11.25H17.25C17.6642 11.25 18 11.5858 18 12C18 12.4142 17.6642 12.75 17.25 12.75H12.75V17.25C12.75 17.6642 12.4142 18 12 18C11.5858 18 11.25 17.6642 11.25 17.25V12.75H6.75C6.33579 12.75 6 12.4142 6 12C6 11.5858 6.33579 11.25 6.75 11.25H11.25V6.75C11.25 6.33579 11.5858 6 12 6Z" />
  </svg>
);

/* 선택 트리거의 두 뿔(위·아래) — 펼치면 아래쪽이 벌어지는 접힌 화살. */
function FoldChevron({ size = 10 }: GlyphProps) {
  return (
    <svg viewBox="0 0 6 10" width={size} height={size * (6 / 10)} fill="currentColor" aria-hidden="true" className="ohf-cine-chev">
      <path d="M5.85459 0.800205C6.04399 0.617147 6.04399 0.320351 5.85459 0.137293C5.66518 -0.0457647 5.35809 -0.0457647 5.16868 0.137293L2.99664 2.23652L0.827959 0.140547C0.638552 -0.0425103 0.331462 -0.0425097 0.142055 0.140549C-0.0473518 0.323607 -0.0473521 0.620403 0.142056 0.80346L2.65369 3.23089C2.8431 3.41395 3.15019 3.41395 3.3396 3.23089L5.85459 0.800205Z" />
      <path d="M0.145444 9.1998C-0.0439625 9.38285 -0.0439617 9.67965 0.145446 9.86271C0.334853 10.0458 0.641943 10.0458 0.83135 9.86271L3.00339 7.76347L5.17204 9.85942C5.36145 10.0425 5.66854 10.0425 5.85794 9.85942C6.04735 9.67636 6.04735 9.37956 5.85794 9.19651L3.34635 6.7691C3.25539 6.68119 3.13203 6.63181 3.00339 6.63181C2.87476 6.63181 2.7514 6.68119 2.66044 6.7691L0.145444 9.1998Z" />
    </svg>
  );
}

/* HF의 라임 타일(트리거의 브랜드 글리프). 실측 viewBox와 두 경로를 그대로 쓴다. */
const BrandTile = ({ size = 24 }: GlyphProps) => (
  <svg viewBox="4 0 24 24" width={size} height={size} aria-hidden="true" className="ohf-cine-tile">
    <defs>
      <linearGradient id="ohfcine-tile-light" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="white" stopOpacity="0.18" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M4 6a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z" fill="#D1FE17" />
    {/* 위쪽에서 내려오는 은은한 빛 — HG의 타일 그라디언트 근사치. */}
    <path d="M4 6a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z" fill="url(#ohfcine-tile-light)" />
    <path
      d="m26.02 11.805-.02-.216c-.18-2.068-1.484-5.958-5.102-5.958-2.685 0-4.713 2.734-6.502 5.145-1.428 1.93-2.666 3.586-4.027 3.586-.362-.04-.828-.225-1.114-.647-.257-.382-.324-.872-.19-1.46.209-.93 1.409-1.793 2.675-2.714.694-.49 1.409-1.01 1.904-1.51 1.428-1.42 2.151-2.449 2.151-4.105s-.885-2.48-1.628-2.832C12.682.389 10.502.8 9.112 2.035c-.209.196-.419.382-.61.558C7.104 3.877 6.163 4.75 4 4.083v2.685c2.865 1.303 5.274-1.186 6.188-2.332.704-.755 1.447-1.196 2-1.196h.028c.248.01.457.108.61.284.247.294.342.637.294 1.02-.104.803-.913 1.744-2.399 2.773-1.742 1.205-4.655 3.223-4.884 5.762-.17 1.822.743 3.645 2.171 4.35 3.332 1.627 5.36-1.176 7.511-4.135 1.647-2.283 3.208-4.449 5.38-4.449 1.95 0 2.674 1.666 2.674 2.715v.205l-.19.04c-4.732.862-7.312 5.428-7.312 7.535s1.733 3.91 3.865 3.91c2.495 0 5.58-2.195 6.074-8.368l.02-.226H28v-2.851zm-2.58 3.165c-.38 3.694-2.218 5.418-3.332 5.418-.505 0-1.21-.43-1.21-1.234 0-.902 1.305-3.636 4.237-4.449l.343-.088z"
      fill="#1A1A1A"
    />
  </svg>
);

/* 하위 목록 줄의 16px 브랜드 하트. */
const BrandHeart = ({ size = 16 }: GlyphProps) => (
  <svg viewBox="0 0 36 36" width={size} height={size} fill="currentColor" aria-hidden="true" className="ohf-cine-line">
    <path
      d="m33.03 17.717-.03-.312c-.271-2.997-2.228-8.634-7.654-8.634-4.027 0-7.069 3.962-9.753 7.455-2.143 2.797-3.999 5.197-6.04 5.197-.544-.057-1.243-.327-1.671-.937-.386-.554-.486-1.264-.286-2.116.314-1.35 2.113-2.599 4.012-3.934 1.043-.71 2.114-1.462 2.856-2.186 2.143-2.059 3.228-3.55 3.228-5.95 0-2.399-1.328-3.592-2.442-4.103-2.228-1.022-5.498-.426-7.583 1.363-.314.284-.628.554-.914.81C4.655 6.23 3.242 7.493 0 6.527v3.89c4.298 1.889 7.911-1.718 9.282-3.38 1.057-1.092 2.17-1.732 3-1.732h.042c.371.015.685.157.914.412.372.427.514.924.443 1.477-.157 1.165-1.371 2.528-3.599 4.018-2.613 1.747-6.983 4.672-7.326 8.35-.257 2.641 1.114 5.282 3.256 6.304 4.998 2.357 8.04-1.704 11.267-5.992 2.47-3.308 4.812-6.446 8.068-6.446 2.928 0 4.013 2.413 4.013 3.933v.298l-.286.057c-7.097 1.25-10.967 7.867-10.967 10.92 0 3.052 2.6 5.665 5.798 5.665 3.741 0 8.368-3.18 9.11-12.126l.029-.327H36v-4.132h-2.97Zm-3.87 4.586c-.571 5.353-3.328 7.852-4.998 7.852-.757 0-1.814-.624-1.814-1.789 0-1.306 1.957-5.267 6.355-6.446l.514-.128-.057.511Z"
    />
  </svg>
);

/* ── 칩 팔레트(실측 135° 그라디언트) ─────────────────────────────────────── */
const CHIP_STOPS = {
  home: ["#222221", "#3B3C3A"],
  generations: ["#51E2E0", "#125C8D"],
  elements: ["#4188BE", "#0E2772"],
  favorites: ["#E251B4", "#8D1237"],
  community: ["#A5A5A5", "#3D3D3D"],
} as const;

function GlassChip({ kind, glyph }: { kind: keyof typeof CHIP_STOPS; glyph: ReactNode }) {
  const [a, b] = CHIP_STOPS[kind];
  return (
    <span className="ohf-cine-chip" aria-hidden="true">
      <span className="ohf-cine-chip-base" style={{ backgroundImage: `linear-gradient(135deg, ${a} 3.87%, ${b} 93.45%)` }} />
      <span className="ohf-cine-chip-over" />
      <span className="ohf-cine-chip-hard" />
      <span className="ohf-cine-chip-line" />
      <span className="ohf-cine-chip-glyph">{glyph}</span>
    </span>
  );
}

/* ── 접기·너비 기억(浏览器 저장) ───────────────────────────────────────────
   HG는 접힌 여부와 너비를 사용자에 되돌려 준다. OH에는 서버가 없으므로
   브라우저가 대신 기억한다. */
const BAR_PREF_KEY = "openhiggsfield.cinema-sidebar.v1";
type BarPref = { collapsed: boolean; width: number };

function readBarPref(): BarPref {
  const fallback: BarPref = { collapsed: false, width: 231 };
  try {
    const raw = window.localStorage.getItem(BAR_PREF_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<BarPref>;
    return {
      collapsed: parsed.collapsed === true,
      width: clampWidth(Number(parsed.width) || fallback.width),
    };
  } catch {
    return fallback;
  }
}

function clampWidth(w: number): number {
  /* HG의 자유 한계는 번들에서 읽히지 않았다. 실측 기본값 231을 중심으로
     OH가 안전하다고 본 구간만 허용한다(의도된 플랫폼 적응). */
  return Math.min(320, Math.max(180, Math.round(w)));
}

function writeBarPref(pref: BarPref) {
  try {
    window.localStorage.setItem(BAR_PREF_KEY, JSON.stringify(pref));
  } catch {
    /* 저장 없는 브라우저에서는 그날만 기억하면 충분하다. */
  }
}

/* 정렬 규격 — HG 팝업의 실제 항목과 순서 그대로. */
const SORT_KEYS = ["oldest", "newest", "recent", "az", "za"] as const;
type SortKey = (typeof SORT_KEYS)[number];
const SORT_LABELS: Record<SortKey, string> = {
  oldest: "처음 생성된 순",
  newest: "최근 생성 순",
  recent: "최근 변경 순",
  az: "이름 A-Z",
  za: "이름 Z-A",
};

/* 프로젝트 목록의 스토어는 생성 시각만 안다. "최근 변경 순"은 변경 기록이
   없는 곳에서 생성 역순과 같은 줄이 된다(의도된 적응). */
function sortProjects(list: Project[], key: SortKey): Project[] {
  const by = <T,>(f: (p: Project) => T) => [...list].sort((a, b) => (f(a) < f(b) ? -1 : f(a) > f(b) ? 1 : 0));
  switch (key) {
    case "oldest":
      return by((p) => p.createdAt);
    case "newest":
    case "recent":
      return by((p) => -p.createdAt);
    case "az":
      return [...list].sort((a, b) => a.name.localeCompare(b.name, "ko"));
    case "za":
      return [...list].sort((a, b) => b.name.localeCompare(a.name, "ko"));
  }
}

/* 목록이 넘칠 때만 HG가 "모든 프로젝트" 줄을 내민다. OH의 가시 용량은
   한 화면에 약 5줄 — 그 넘침으로만 줄을 보여준다. */
const VISIBLE_FOLDERS = 5;

/** HG 시네마 스튜디오의 왼쪽 레일. */
export function CinemaSidebar() {
  const { collapsed: initialCollapsed, width: initialWidth } = useMemo(readBarPref, []);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [width, setWidth] = useState(initialWidth);
  const [selectOpen, setSelectOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const projects = useProjects((s) => s.projects);
  const activeProjectId = useProjects((s) => s.activeProjectId);
  const addProject = useProjects((s) => s.addProject);
  const renameProject = useProjects((s) => s.renameProject);
  const removeProject = useProjects((s) => s.removeProject);
  const setActive = useProjects((s) => s.setActive);
  const setMode = useStudio((s) => s.setMode);
  const surfaceId = useProjectSurface((s) => s.projectId);
  const panel = useProjectSurface((s) => s.panel);
  const cinemaView = useProjectSurface((s) => s.cinemaView);
  const openSurface = useProjectSurface((s) => s.openSurface);
  const closeSurface = useProjectSurface((s) => s.closeSurface);
  const setPanel = useProjectSurface((s) => s.setPanel);
  const setCinemaView = useProjectSurface((s) => s.setCinemaView);

  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ startX: number; startW: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  /* 접힌/펼친 판과 너비를 브라우저에 되돌려 놓는다. */
  useEffect(() => {
    writeBarPref({ collapsed, width });
  }, [collapsed, width]);

  /* 스크롤이 헤더 아래로 밀려야 그라디언트 장막이 드러난다(HG와 같게). */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 0);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* 검색창이 열리면 커서가 먼저 들어간다. */
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : projects;
    return sortProjects(filtered, sortKey);
  }, [projects, query, sortKey]);

  const overflow = visible.length > VISIBLE_FOLDERS;

  /* 메뉴가 열려 있는 동안 Escape는 모두 물러난다 — HG의 모든 메뉴가 그러하다. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sortOpen) setSortOpen(false);
      else if (folderMenuId) setFolderMenuId(null);
      else if (searchOpen) {
        setSearchOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sortOpen, folderMenuId, searchOpen]);

  /* 바깥 클릭은 팝업만 닫는다. */
  useEffect(() => {
    if (!sortOpen && !folderMenuId) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-ohf-cine-popup]")) return;
      /* 트리거(점 세 개)의 pointerdown은 '바깥'이 아니다 — 여기서 닫히면
         직후의 click이 토글되어 다시 열려버린다(재클릭 토글이 죽는 현상). */
      if (target?.closest(".ohf-cinebar-dots")) return;
      setSortOpen(false);
      setFolderMenuId(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [sortOpen, folderMenuId]);

  const onDragStart = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startW: width };
    setDragging(true);
  };
  const onDragMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    setWidth(clampWidth(drag.current.startW + (event.clientX - drag.current.startX)));
  };
  const onDragEnd = () => {
    drag.current = null;
    setDragging(false);
  };

  /* 프로젝트 surface가 서 있는 동안 레일 전체가 HF의 프로젝트 내비게이션으로
     바뀐다(지상 실측 2026-11-03). 스튜디오 레일의 선택 트리거·메뉴 다섯 줄·
     프로젝트 목록은 그 자리를 비우고, 대신 뒤로 — 프로젝트명 — 여섯 이동 줄 —
     폴더 — 모든 에셋 — 폴더 추가 — 휴지통이 36px 줄간격 2px로 쌓인다. 각 줄은
     스토어의 panel을 옮겨 기둥(레이아웃·패널)과 레일을 그 프로젝트로 함께
     갈아끼운다. HF가 Canvas·도구·휴지통을 유료· hosted 기능으로 둔 곳은 정직하게
     화면 미러로 남긴다. */
  if (surfaceId) {
    const surfaceLabel = projectLabel(projects, surfaceId);
    return (
      <aside
        className="ohf-cinebar ohf-cinebar--project"
        data-collapsed={collapsed ? "true" : "false"}
        aria-label={`${surfaceLabel} 프로젝트 사이드바`}
        style={{ width: collapsed ? 52 : width }}
      >
        <div className="ohf-cinebar-scroll" ref={scrollRef}>
          {/* ── 머리: 뒤로 + 접기 ── */}
          <div className="ohf-cinebar-phead">
            <button type="button" className="ohf-cinebar-pback" onClick={closeSurface}>
              <ChevronLeftIcon size={16} />
              <span className="ohf-cinebar-pback-label">뒤로</span>
            </button>
            <button
              type="button"
              className="ohf-cinebar-fold"
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <PanelOpenIcon /> : <PanelIcon />}
            </button>
          </div>

          {/* ── 프로젝트 이름 줄: 접기 메뉴의 부채표와 같은 실 ── */}
          <div className="ohf-cinebar-ptitle">
            {renamingId === surfaceId ? (
              <input
                className="ohf-cinebar-rename-input"
                value={renameDraft}
                autoFocus
                aria-label="프로젝트 이름"
                onChange={(event) => setRenameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && renameDraft.trim()) {
                    renameProject(surfaceId, renameDraft.trim());
                    setRenamingId(null);
                  }
                  if (event.key === "Escape") setRenamingId(null);
                }}
                onBlur={() => {
                  if (renameDraft.trim()) renameProject(surfaceId, renameDraft.trim());
                  setRenamingId(null);
                }}
              />
            ) : (
              <>
                <span className="ohf-cinebar-ptitle-chip">
                  <FolderIcon />
                </span>
                <span className="ohf-cinebar-ptitle-label">{surfaceLabel}</span>
                <button
                  type="button"
                  className="ohf-cinebar-dots"
                  aria-label="폴더 옵션"
                  aria-haspopup="menu"
                  aria-expanded={folderMenuId === surfaceId}
                  onClick={() => setFolderMenuId(folderMenuId === surfaceId ? null : surfaceId)}
                >
                  <DotsIcon />
                </button>
              </>
            )}
            {folderMenuId === surfaceId && renamingId !== surfaceId && (
              <div className="ohf-cinebar-popup" data-ohf-cine-popup role="menu" aria-label={`${surfaceLabel} 폴더 옵션`}>
                <button type="button" className="ohf-cinebar-menuitem" data-off title="화면 미러 — 고정 대상 미구현" role="menuitem">고정</button>
                <button
                  type="button"
                  className="ohf-cinebar-menuitem"
                  role="menuitem"
                  onClick={() => {
                    setFolderMenuId(null);
                    setRenamingId(surfaceId);
                    setRenameDraft(surfaceLabel);
                  }}
                >
                  편집
                </button>
                <button
                  type="button"
                  className="ohf-cinebar-menuitem"
                  role="menuitem"
                  onClick={() => {
                    setFolderMenuId(null);
                    setDialogOpen(true);
                  }}
                >
                  폴더 추가
                </button>
                <button type="button" className="ohf-cinebar-menuitem" data-off title="화면 미러 — 링크 복사 대상 미구현" role="menuitem">링크 복사</button>
                <button type="button" className="ohf-cinebar-menuitem" data-off title="화면 미러 — 숨김 상태 미구현" role="menuitem">숨기기</button>
                <button
                  type="button"
                  className="ohf-cinebar-menuitem ohf-cinebar-menuitem--danger"
                  role="menuitem"
                  onClick={() => {
                    removeProject(surfaceId);
                    closeSurface();
                    setActive(DEFAULT_PROJECT_ID);
                    setFolderMenuId(null);
                  }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>

          {/* ── 이동 여섯 줄 + 도구 + Canvas ── */}
          <nav className="ohf-cinebar-pnav" aria-label="프로젝트 내비게이션">
            <button
              type="button"
              className="ohf-cinebar-prow"
              aria-current={panel === "brief" ? "page" : undefined}
              aria-label="프로젝트 브리프"
              onClick={() => setPanel("brief")}
            >
              <span className="ohf-cinebar-prow-chip"><ClapperIcon size={16} /></span>
              <span className="ohf-cinebar-prow-label">프로젝트 브리프</span>
            </button>
            <button
              type="button"
              className="ohf-cinebar-prow"
              aria-current={panel === "settings" ? "page" : undefined}
              aria-label="설정"
              onClick={() => setPanel("settings")}
            >
              <span className="ohf-cinebar-prow-chip"><SlidersIcon size={16} /></span>
              <span className="ohf-cinebar-prow-label">설정</span>
            </button>
            <button
              type="button"
              className="ohf-cinebar-prow"
              aria-current={panel === "elements" ? "page" : undefined}
              aria-label="요소"
              onClick={() => setPanel("elements")}
            >
              <span className="ohf-cinebar-prow-chip"><CubeIcon size={16} /></span>
              <span className="ohf-cinebar-prow-label">요소</span>
            </button>
            <button type="button" className="ohf-cinebar-prow" data-off aria-label="도구" title="화면 미러 — 도구 갈러리 미구현">
              <span className="ohf-cinebar-prow-chip"><HammerIcon size={16} /></span>
              <span className="ohf-cinebar-prow-label">도구</span>
            </button>
            <button type="button" className="ohf-cinebar-prow" data-off aria-label="Canvas" title="화면 미러 — Canvas 미구현">
              <span className="ohf-cinebar-prow-chip"><CubeIcon size={16} /></span>
              <span className="ohf-cinebar-prow-label">Canvas</span>
            </button>
            <button
              type="button"
              className="ohf-cinebar-prow"
              aria-current={panel === "chat" ? "page" : undefined}
              aria-label="채팅"
              onClick={() => setPanel("chat")}
            >
              <span className="ohf-cinebar-prow-chip"><PersonIcon size={16} /></span>
              <span className="ohf-cinebar-prow-label">채팅</span>
            </button>
            <button
              type="button"
              className="ohf-cinebar-prow"
              aria-current={panel === "director" ? "page" : undefined}
              aria-label="AI 디렉터"
              onClick={() => setPanel("director")}
            >
              <span className="ohf-cinebar-prow-chip"><ApertureIcon size={16} /></span>
              <span className="ohf-cinebar-prow-label">AI 디렉터</span>
            </button>

            {/* ── 폴더 접기 머리 + 실 세 줄 ── */}
            <div className="ohf-cinebar-pfold">
              <span className="ohf-cinebar-pfold-label">폴더</span>
              <span className="ohf-cinebar-pfold-tools">
                <button type="button" className="ohf-cinebar-tool" data-off aria-disabled="true" aria-label="폴더 검색" title="화면 미러 — 하위 폴더 검색 미구현">
                  <SearchIcon />
                </button>
                <button type="button" className="ohf-cinebar-tool" data-off aria-disabled="true" aria-label="폴더 정렬" title="화면 미러 — 하위 폴더 정렬 미구현">
                  <SortIcon />
                </button>
              </span>
            </div>
            <button
              type="button"
              className="ohf-cinebar-prow"
              aria-current={panel === "assets" ? "page" : undefined}
              aria-label="모든 에셋"
              onClick={() => setPanel("assets")}
            >
              <span className="ohf-cinebar-prow-chip"><AssetsIcon size={16} /></span>
              <span className="ohf-cinebar-prow-label">모든 에셋</span>
            </button>
            <button type="button" className="ohf-cinebar-prow" aria-label="폴더 추가" onClick={() => setDialogOpen(true)}>
              <span className="ohf-cinebar-prow-chip"><PlusIcon /></span>
              <span className="ohf-cinebar-prow-label">폴더 추가</span>
            </button>
          </nav>

          <div className="ohf-cinebar-pspacer" aria-hidden="true" />

          {/* ── 휴지통: HF는 hosted 휴지통으로 데려간다. 로컬에는 그 문이 없다. ── */}
          <button type="button" className="ohf-cinebar-prow" data-off aria-label="휴지통" title="화면 미러 — hosted 휴지통 미구현">
            <span className="ohf-cinebar-prow-chip"><TrashIcon size={16} /></span>
            <span className="ohf-cinebar-prow-label">휴지통</span>
            <span className="ohf-cinebar-prow-count">0</span>
          </button>

          {/* ── 발: 요금제 + 계정 ── */}
          <div className="ohf-cinebar-foot">
            <button type="button" className="ohf-cinebar-price" data-off title="화면 미러 — OH는 과금하지 않습니다">
              <TagIcon size={14} />
              <span className="ohf-cinebar-price-label">요금제</span>
            </button>
            <div className="ohf-cinebar-account">
              <button
                type="button"
                className="ohf-cinebar-account-btn"
                data-off
                aria-haspopup="menu"
                aria-disabled="true"
                title="화면 미러 — 계정 시스템 미구현"
              >
                <span className="ohf-cinebar-avatar">
                  <span className="ohf-cinebar-avatar-face">{LOCAL_USER.initial}</span>
                  <svg className="ohf-cinebar-ring" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <circle r="11" cx="12" cy="12" fill="transparent" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
                <span className="ohf-cinebar-account-name">{LOCAL_USER.handle}</span>
              </button>
              <button
                type="button"
                className="ohf-cinebar-bell"
                data-off
                aria-label="알림"
                aria-disabled="true"
                title="화면 미러 — 알림함 미구현"
              >
                <span className="ohf-cinebar-bell-chip">
                  <BellIcon />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 너비 손잡이: 스튜디오 레일과 같은 실 ── */}
        <div
          className="ohf-cinebar-handle"
          data-active={dragging || undefined}
          role="separator"
          aria-orientation="vertical"
          aria-label="사이드바 너비 조절"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <span className="ohf-cinebar-hairline" aria-hidden="true" />
        </div>

        {dialogOpen && (
          <ProjectDialog
            onClose={() => setDialogOpen(false)}
            onCreate={(name, isPrivate) => {
              addProject(name, isPrivate);
              setDialogOpen(false);
            }}
          />
        )}
      </aside>
    );
  }

  return (
    <aside
      className="ohf-cinebar"
      data-collapsed={collapsed ? "true" : "false"}
      aria-label="Cinema Studio 사이드바"
      style={{ width: collapsed ? 52 : width }}
    >
      <div className="ohf-cinebar-scroll" ref={scrollRef}>
        {/* ── 머리: 선택 트리거 + 접기 ── */}
        <div className="ohf-cinebar-head">
          <div className="ohf-cinebar-headrow">
            <button
              type="button"
              className="ohf-cinebar-trigger"
              aria-expanded={selectOpen}
              onClick={() => setSelectOpen((open) => !open)}
            >
              <span className="ohf-cinebar-trigger-icon">
                <BrandTile />
              </span>
              <span className="ohf-cinebar-trigger-label">Cinema Studio</span>
              <span className="ohf-cinebar-trigger-chev">
                <FoldChevron />
              </span>
            </button>
            <button
              type="button"
              className="ohf-cinebar-fold"
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <PanelOpenIcon /> : <PanelIcon />}
            </button>
          </div>
          {/* 하위 목록: 줄 템플릿이 0fr에서 1fr로 밀려난다(HG의 전환과 동일). */}
          <div className="ohf-cinebar-sub" data-open={selectOpen ? "true" : "false"}>
            <div className="ohf-cinebar-sub-clip">
              <button
                type="button"
                className="ohf-cinebar-subrow"
                onClick={() => setMode("general")}
              >
                <BrandHeart />
                <span className="ohf-cinebar-subrow-label">Higgsfield AI</span>
              </button>
            </div>
          </div>
          <div className="ohf-cinebar-fade" data-scrolled={scrolled ? "true" : "false"} aria-hidden="true" />
        </div>

        {/* ── 메뉴 다섯 줄 ── */}
        <nav className="ohf-cinebar-menu" aria-label="사이드바 메뉴">
          <button
            type="button"
            className="ohf-cinebar-action"
            aria-current={!cinemaView ? "page" : undefined}
            aria-label="홈"
            onClick={() => setCinemaView(null)}
          >
            <GlassChip kind="home" glyph={<CineHomeGlyph />} />
            <span className="ohf-cinebar-action-label">홈</span>
          </button>
          <button
            type="button"
            className="ohf-cinebar-action"
            aria-current={cinemaView === "generations" ? "page" : undefined}
            aria-label="내 생성"
            onClick={() => setCinemaView("generations")}
          >
            <GlassChip kind="generations" glyph={<CineSparkGlyph />} />
            <span className="ohf-cinebar-action-label">내 생성</span>
          </button>
          <button
            type="button"
            className="ohf-cinebar-action"
            aria-current={cinemaView === "elements" ? "page" : undefined}
            aria-label="내 요소"
            onClick={() => setCinemaView("elements")}
          >
            <GlassChip kind="elements" glyph={<CineRefreshGlyph />} />
            <span className="ohf-cinebar-action-label">내 요소</span>
          </button>
          <button
            type="button"
            className="ohf-cinebar-action"
            aria-current={cinemaView === "favorites" ? "page" : undefined}
            aria-label="내 즐겨찾기"
            onClick={() => setCinemaView("favorites")}
          >
            <GlassChip kind="favorites" glyph={<CineHeartGlyph />} />
            <span className="ohf-cinebar-action-label">내 즐겨찾기</span>
          </button>
          <button type="button" className="ohf-cinebar-action" data-off aria-label="커뮤니티" title="화면 미러 — 커뮤니티 미구현">
            <GlassChip kind="community" glyph={<CineGlobeGlyph />} />
            <span className="ohf-cinebar-action-label">커뮤니티</span>
          </button>
        </nav>

        {/* ── 프로젝트 ── */}
        <section className="ohf-cinebar-projects">
          <div className="ohf-cinebar-proj-inner">
            <div className="ohf-cinebar-proj-pt" data-tour="sidebar-projects">
              <div className="ohf-cinebar-proj-head">
                <span className="ohf-cinebar-proj-label">프로젝트</span>
                <div className="ohf-cinebar-proj-tools">
                  <span className="ohf-cinebar-sr">정렬</span>
                  <button
                    type="button"
                    className="ohf-cinebar-tool"
                    aria-label="프로젝트 검색"
                    aria-pressed={searchOpen}
                    onClick={() => {
                      if (searchOpen) {
                        setSearchOpen(false);
                        setQuery("");
                      } else {
                        setSearchOpen(true);
                      }
                    }}
                  >
                    <SearchIcon />
                  </button>
                  <button
                    type="button"
                    className="ohf-cinebar-tool"
                    aria-label="프로젝트 정렬"
                    aria-haspopup="menu"
                    aria-expanded={sortOpen}
                    onClick={() => setSortOpen((o) => !o)}
                  >
                    <SortIcon />
                  </button>
                </div>
                {searchOpen && (
                  <div className="ohf-cinebar-search">
                    <span className="ohf-cinebar-search-icon">
                      <SearchIcon size={14} />
                    </span>
                    <input
                      ref={searchInputRef}
                      className="ohf-cinebar-search-input"
                      value={query}
                      placeholder="프로젝트 검색"
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setSearchOpen(false);
                          setQuery("");
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="ohf-cinebar-search-close"
                      aria-label="검색 닫기"
                      onClick={() => {
                        setSearchOpen(false);
                        setQuery("");
                      }}
                    >
                      <XIcon />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="ohf-cinebar-new"
                aria-label="새 프로젝트"
                onClick={() => setDialogOpen(true)}
                data-tour="sidebar-new-project"
              >
                <span className="ohf-cinebar-new-chip">
                  <PlusIcon />
                </span>
                <span className="ohf-cinebar-new-label">새 프로젝트</span>
              </button>

              <div className="ohf-cinebar-folders">
                {visible.map((project) => {
                  const active = project.id === activeProjectId;
                  if (renamingId === project.id) {
                    return (
                      <div className="ohf-cinebar-row" key={project.id} data-active={active}>
                        <span className="ohf-cinebar-row-chip">
                          <FolderIcon />
                        </span>
                        <input
                          className="ohf-cinebar-rename-input"
                          value={renameDraft}
                          autoFocus
                          onChange={(event) => setRenameDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && renameDraft.trim()) {
                              renameProject(project.id, renameDraft.trim());
                              setRenamingId(null);
                            }
                            if (event.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={() => {
                            if (renameDraft.trim()) renameProject(project.id, renameDraft.trim());
                            setRenamingId(null);
                          }}
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="ohf-cinebar-row" key={project.id}>
                      <button
                        type="button"
                        className="ohf-cinebar-folder"
                        aria-label={project.name}
                        data-active={active}
                        onClick={() => {
                          setActive(project.id);
                          // HF의 프로젝트 레일 클릭이 스튜디오 전체를 그 프로젝트로
                          // 데려간다(레일·레이아웃·패널이 함께 갈아끼워진다).
                          openSurface(project.id);
                        }}
                      >
                        <span className="ohf-cinebar-row-chip">
                          <FolderIcon />
                        </span>
                        <span className="ohf-cinebar-row-label">{project.name}</span>
                      </button>
                      {/* 점 세 개는 folder 버튼의 자식으로 두지 않는다 — 버튼 안
                          버튼은 무효 HTML이라 하이드레이션 오류를 낳고, 브라우저가
                          태그를 다시 짜맞추면서 실 클릭 경로가 어긋난다(HF도 행 안의
                          형제 버튼으로 둔다). */}
                      <span className="ohf-cinebar-row-reveal">
                        <button
                          type="button"
                          className="ohf-cinebar-dots"
                          aria-label="폴더 옵션"
                          aria-haspopup="menu"
                          aria-expanded={folderMenuId === project.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setFolderMenuId(folderMenuId === project.id ? null : project.id);
                          }}
                        >
                          <DotsIcon />
                        </button>
                      </span>
                      {folderMenuId === project.id && (
                        <div className="ohf-cinebar-popup" data-ohf-cine-popup role="menu" aria-label={`${project.name} 폴더 옵션`}>
                          <button type="button" className="ohf-cinebar-menuitem" data-off title="화면 미러 — 고정 대상 미구현" role="menuitem">고정</button>
                          <button
                            type="button"
                            className="ohf-cinebar-menuitem"
                            role="menuitem"
                            onClick={() => {
                              setFolderMenuId(null);
                              setRenamingId(project.id);
                              setRenameDraft(project.name);
                            }}
                          >
                            편집
                          </button>
                          <button
                            type="button"
                            className="ohf-cinebar-menuitem"
                            role="menuitem"
                            onClick={() => {
                              setFolderMenuId(null);
                              setDialogOpen(true);
                            }}
                          >
                            폴더 추가
                          </button>
                          <button type="button" className="ohf-cinebar-menuitem" data-off title="화면 미러 — 링크 복사 대상 미구현" role="menuitem">링크 복사</button>
                          <button type="button" className="ohf-cinebar-menuitem" data-off title="화면 미러 — 숨김 상태 미구현" role="menuitem">숨기기</button>
                          <button
                            type="button"
                            className="ohf-cinebar-menuitem ohf-cinebar-menuitem--danger"
                            role="menuitem"
                            onClick={() => {
                              removeProject(project.id);
                              setFolderMenuId(null);
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {overflow && (
                <button type="button" className="ohf-cinebar-all" data-off title="화면 미러 — 모든 프로젝트 갈러리 미구현">
                  <span className="ohf-cinebar-all-label">모든 프로젝트</span>
                  <RightChevron size={14} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── 발: 요금제 + 계정 ── */}
        <div className="ohf-cinebar-foot">
          <button type="button" className="ohf-cinebar-price" data-off title="화면 미러 — OH는 과금하지 않습니다">
            <TagIcon size={14} />
            <span className="ohf-cinebar-price-label">요금제</span>
          </button>
          <div className="ohf-cinebar-account">
            <button
              type="button"
              className="ohf-cinebar-account-btn"
              data-off
              aria-haspopup="menu"
              aria-disabled="true"
              title="화면 미러 — 계정 시스템 미구현"
            >
              <span className="ohf-cinebar-avatar">
                <span className="ohf-cinebar-avatar-face">{LOCAL_USER.initial}</span>
                <svg className="ohf-cinebar-ring" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <circle r="11" cx="12" cy="12" fill="transparent" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              <span className="ohf-cinebar-account-name">{LOCAL_USER.handle}</span>
            </button>
            <button
              type="button"
              className="ohf-cinebar-bell"
              data-off
              aria-label="알림"
              aria-disabled="true"
              title="화면 미러 — 알림함 미구현"
            >
              <span className="ohf-cinebar-bell-chip">
                <BellIcon />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 너비 손잡이: hairline이 hover·drag에서만 드러난다(HG와 같게). ── */}
      <div
        className="ohf-cinebar-handle"
        data-active={dragging || undefined}
        role="separator"
        aria-orientation="vertical"
        aria-label="사이드바 너비 조절"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <span className="ohf-cinebar-hairline" aria-hidden="true" />
      </div>

      {dialogOpen && (
        <ProjectDialog
          onClose={() => setDialogOpen(false)}
          onCreate={(name, isPrivate) => {
            addProject(name, isPrivate);
            setDialogOpen(false);
          }}
        />
      )}

      {/* 정렬 팝업 — HG의 180px·8px·2px·12px 반석 그대로. */}
      {sortOpen && (
        <div className="ohf-cinebar-popup ohf-cinebar-popup--sort" data-ohf-cine-popup role="menu" aria-label="프로젝트 정렬">
          <div className="ohf-cinebar-popup-label">정렬</div>
          {SORT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              className="ohf-cinebar-menuitem"
              aria-checked={sortKey === key}
              data-active={sortKey === key}
              onClick={() => {
                setSortKey(key);
                setSortOpen(false);
              }}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
