"use client";

/* =============================================================================
   image-surface.tsx — HF /ko/ai/image?model=soul-cinematic 정적 화면 이식 (t_f3de705e)

   ground-truth: HF live CDP(:9222) 1440×900 의 286개 가시 요소 실측
   (t_38d43cc9 의 hf_image_surface_ground_truth.json).
   각 요소에 data-ohf-image="<HF 인덱스>" 앵커를 박아 HF와 1:1로 대응시킨다
   (실측 하네스의 매칭 키). 텍스트·순서·태그·층·깊이는 실측 트리를 그대로 쓴다.

   정직 marking 원칙:
   - data-off="<사유>" → 이 화면에서 정적으로 이식된 HF 요소(동작 착지 후속).
   - 실배선한 것은 프롬프트 에디터(타입→useImagePrompt)뿐이다.
   ============================================================================= */

import { useEffect, useRef, useState } from "react";
import type { ModelEntry } from "@/generation/catalog";
import { useImagePrompt } from "@/generation/stores/prompt";
import "./image-surface.css";

/* ---- HF 원문 SVG(전부 원문 그대로; viewBox·stroke·d 는 실측 attrs) ---- */

function IconBook({ hook }: { hook?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-ohf-image={hook}>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12 21.25a3.66 3.66 0 0 0-1.35-1.478 3.64 3.64 0 0 0-1.927-.522H2.75a1 1 0 0 1-1-1V5.75a1 1 0 0 1 1-1H9a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6.25a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-5.973a3.64 3.64 0 0 0-1.926.522A3.66 3.66 0 0 0 12 21.25m0-13.5v13.5"
      />
    </svg>
  );
}

function IconClose({ hook }: { hook?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" data-ohf-image={hook}>
      <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" />
    </svg>
  );
}

function IconPlus24({ hook }: { hook?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-ohf-image={hook}>
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3.75V12m0 0v8.25M12 12H3.75M12 12h8.25" />
    </svg>
  );
}

function IconSoulGlyph({ hook }: { hook?: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" data-ohf-image={hook}>
      <path fill="currentColor" d="m33.03 17.717-.03-.312c-.271-2.997-2.228-8.634-7.654-8.634-4.027 0-7.069 3.962-9.753 7.455-2.143 2.797-3.999 5.197-6.04 5.197-.544-.057-1.243-.327-1.671-.937-.386-.554-.486-1.264-.286-2.116.314-1.35 2.113-2.599 4.012-3.934 1.043-.71 2.114-1.462 2.856-2.186 2.143-2.059 3.228-3.55 3.228-5.95 0-2.399-1.328-3.592-2.442-4.103-2.228-1.022-5.498-.426-7.583 1.363-.314.284-.628.554-.914.81C4.655 6.23 3.242 7.493 0 6.527v3.89c4.298 1.889 7.911-1.718 9.282-3.38 1.057-1.092 2.17-1.732 3-1.732h.042c.371.015.685.157.914.412.372.427.514.924.443 1.477-.157 1.165-1.371 2.528-3.599 4.018-2.613 1.747-6.983 4.672-7.326 8.35-.257 2.641 1.114 5.282 3.256 6.304 4.998 2.357 8.04-1.704 11.267-5.992 2.47-3.308 4.812-6.446 8.068-6.446 2.928 0 4.013 2.413 4.013 3.933v.298l-.286.057c-7.097 1.25-10.967 7.867-10.967 10.92 0 3.052 2.6 5.665 5.798 5.665 3.741 0 8.368-3.18 9.11-12.126l.029-.327H36v-4.132h-2.97Zm-3.87 4.586c-.571 5.353-3.328 7.852-4.998 7.852-.757 0-1.814-.624-1.814-1.789 0-1.306 1.957-5.267 6.355-6.446l.514-.128-.057.511Z" />
    </svg>
  );
}

function IconChevronDown20({ hook }: { hook?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" data-ohf-image={hook}>
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M3.81344 7.97848C4.0087 7.78322 4.32528 7.78322 4.52055 7.97848L10.0003 13.4583L15.4801 7.97848C15.6754 7.78322 15.9919 7.78322 16.1872 7.97848C16.3825 8.17374 16.3825 8.49032 16.1872 8.68558L10.3539 14.5189L10.0003 14.8725L9.64677 14.5189L3.81344 8.68558C3.61818 8.49032 3.61818 8.17374 3.81344 7.97848Z" />
    </svg>
  );
}

function IconChevronRight24({ hook }: { hook?: string }) {
  return (
    <svg aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-ohf-image={hook}>
      <path d="M9.5 18.25L15.75 12L9.5 5.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconColorTransfer({ hook }: { hook?: string }) {
  return (
    <svg aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-ohf-image={hook}>
      <path d="M21.5 12C21.5 19.3125 13.702 12.8207 12 16.2353C10.9444 18.3529 14.9843 21 12 21C6.75329 21 2.5 16.9706 2.5 12C2.5 7.02944 6.75329 3 12 3C17.2467 3 21.5 7.02944 21.5 12Z" stroke="currentColor" />
      <path d="M11.5 7.75C11.5 8.44036 10.9404 9 10.25 9C9.55964 9 9 8.44036 9 7.75C9 7.05964 9.55964 6.5 10.25 6.5C10.9404 6.5 11.5 7.05964 11.5 7.75Z" stroke="currentColor" />
      <path d="M8.5 12C8.5 12.6904 7.94036 13.25 7.25 13.25C6.55964 13.25 6 12.6904 6 12C6 11.3096 6.55964 10.75 7.25 10.75C7.94036 10.75 8.5 11.3096 8.5 12Z" stroke="currentColor" />
      <path d="M16.5 9.25C16.5 9.94036 15.9404 10.5 15.25 10.5C14.5596 10.5 14 9.94036 14 9.25C14 8.55964 14.5596 8 15.25 8C15.9404 8 16.5 8.55964 16.5 9.25Z" stroke="currentColor" />
    </svg>
  );
}

function IconRatio16({ hook }: { hook?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" data-ohf-image={hook}>
      <path fill="currentColor" d="M13.833 3.5C14.8454 3.5 15.6658 4.32064 15.666 5.33301V10.667C15.6658 11.6794 14.8454 12.5 13.833 12.5H3.16602C2.1539 12.4996 1.33318 11.6791 1.33301 10.667V5.33301C1.33318 4.32085 2.1539 3.50035 3.16602 3.5H13.833ZM3.16602 4.5C2.70619 4.50035 2.33318 4.87314 2.33301 5.33301V10.667C2.33318 11.1269 2.70619 11.4996 3.16602 11.5H13.833C14.2931 11.5 14.6658 11.1271 14.666 10.667V5.33301C14.6658 4.87292 14.2931 4.5 13.833 4.5H3.16602Z" />
    </svg>
  );
}

function IconQuality16({ hook }: { hook?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" data-ohf-image={hook}>
      <path fill="currentColor" d="M9.7832 0.499878C10.3232 0.499878 10.6767 0.496482 11.0146 0.578979C11.1617 0.61491 11.3057 0.662985 11.4443 0.722534C11.7645 0.860077 12.0366 1.07387 12.4492 1.39148C13.1566 1.93605 13.7165 2.36662 14.127 2.75183C14.5421 3.14152 14.8482 3.52421 15.0088 3.99109C15.1407 4.37448 15.1904 4.77934 15.1543 5.18152C15.11 5.67308 14.9012 6.11252 14.5889 6.57898C14.2806 7.0392 13.8372 7.57315 13.2793 8.24695L10.6172 11.4628C10.115 12.0692 9.7038 12.5675 9.32715 12.9071C8.93826 13.2577 8.52095 13.4998 7.99902 13.4999C7.47706 13.4998 7.05981 13.2577 6.6709 12.9071C6.29425 12.5675 5.88301 12.0692 5.38086 11.4628L2.71875 8.24695C2.16068 7.573 1.71649 7.03928 1.4082 6.57898C1.09583 6.11253 0.88806 5.67308 0.84375 5.18152C0.807575 4.77927 0.857447 4.37442 0.989258 3.99109C1.14984 3.52425 1.45592 3.14152 1.87109 2.75183C2.28153 2.36662 2.84142 1.93606 3.54883 1.39148C3.96144 1.07384 4.23354 0.860066 4.55371 0.722534C4.69233 0.663015 4.83627 0.614905 4.9834 0.578979C5.32129 0.496532 5.67406 0.499877 6.21387 0.499878H9.7832ZM6.21387 1.49988C5.62618 1.49988 5.41459 1.50338 5.2207 1.55066C5.12692 1.57356 5.03539 1.60407 4.94824 1.64148C4.77007 1.71805 4.60994 1.83744 4.15918 2.18445C3.43571 2.74139 2.92207 3.13743 2.55566 3.48132C2.19409 3.82071 2.01931 4.06993 1.93457 4.31628C1.84817 4.56755 1.81638 4.83083 1.83984 5.09167C1.86269 5.34527 1.97017 5.62051 2.23926 6.02234C2.51258 6.43044 2.91688 6.91921 3.48828 7.60925L6.15039 10.8251C6.67274 11.4559 7.03123 11.8858 7.34082 12.1649C7.63783 12.4326 7.8253 12.4998 7.99902 12.4999C8.17274 12.4998 8.36021 12.4326 8.65723 12.1649C8.96678 11.8858 9.32443 11.4558 9.84668 10.8251L12.5098 7.60925C13.0811 6.91925 13.4855 6.43042 13.7588 6.02234C14.0278 5.62058 14.1353 5.34525 14.1582 5.09167C14.1816 4.83081 14.1498 4.56744 14.0635 4.31628C13.9788 4.06995 13.8039 3.82068 13.4424 3.48132C13.076 3.13744 12.5623 2.74138 11.8389 2.18445C11.3881 1.83744 11.228 1.71805 11.0498 1.64148C10.9627 1.60406 10.8712 1.57359 10.7773 1.55066C10.5834 1.50333 10.3713 1.49988 9.7832 1.49988H6.21387ZM9.33203 4.16687C9.6081 4.16695 9.83203 4.39078 9.83203 4.66687C9.83188 4.94283 9.60801 5.16679 9.33203 5.16687H6.66504C6.38915 5.16669 6.16519 4.94277 6.16504 4.66687C6.16504 4.39084 6.38905 4.16705 6.66504 4.16687H9.33203Z" />
    </svg>
  );
}

function IconWand14({ hook }: { hook?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" data-ohf-image={hook}>
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M6.6497 0.375C6.92585 0.375 7.1497 0.598858 7.1497 0.875V1.45833C7.1497 1.48967 7.14682 1.52033 7.14131 1.55006C7.17104 1.54455 7.2017 1.54167 7.23304 1.54167H7.81637C8.09251 1.54167 8.31637 1.76552 8.31637 2.04167C8.31637 2.31781 8.09251 2.54167 7.81637 2.54167H7.23304C7.2017 2.54167 7.17104 2.53878 7.14131 2.53327C7.14682 2.56301 7.1497 2.59367 7.1497 2.625V3.20833C7.1497 3.48448 6.92585 3.70833 6.6497 3.70833C6.37356 3.70833 6.1497 3.48448 6.1497 3.20833V2.625C6.1497 2.59367 6.15259 2.56301 6.1581 2.53327C6.12836 2.53878 6.0977 2.54167 6.06637 2.54167H5.48304C5.20689 2.54167 4.98304 2.31781 4.98304 2.04167C4.98304 1.76552 5.20689 1.54167 5.48304 1.54167H6.06637C6.0977 1.54167 6.12836 1.54455 6.1581 1.55006C6.15259 1.52033 6.1497 1.48967 6.1497 1.45833V0.875C6.1497 0.598858 6.37356 0.375 6.6497 0.375ZM6.55797 1.94994C6.56349 1.97967 6.56637 2.01033 6.56637 2.04167C6.56637 2.073 6.56349 2.10366 6.55797 2.1334C6.58771 2.12788 6.61837 2.125 6.6497 2.125C6.68104 2.125 6.7117 2.12788 6.74143 2.1334C6.73592 2.10366 6.73304 2.073 6.73304 2.04167C6.73304 2.01033 6.73592 1.97967 6.74143 1.94994C6.7117 1.95545 6.68104 1.95833 6.6497 1.95833C6.61837 1.95833 6.58771 1.95545 6.55797 1.94994ZM2.625 1.54167C2.90114 1.54167 3.125 1.76552 3.125 2.04167V2.91667C3.125 3.19281 2.90114 3.41667 2.625 3.41667C2.34886 3.41667 2.125 3.19281 2.125 2.91667V2.04167C2.125 1.76552 2.34886 1.54167 2.625 1.54167ZM8.5294 3.09641C9.18027 2.44554 10.2355 2.44554 10.8864 3.09641C11.5373 3.74729 11.5373 4.80256 10.8864 5.45344L9.23651 7.10335L4.28676 12.0531C3.63588 12.704 2.58061 12.704 1.92974 12.0531C1.27886 11.4022 1.27886 10.347 1.92974 9.69608L6.87948 4.74633L8.5294 3.09641ZM10.1793 3.80352C9.91896 3.54317 9.49685 3.54317 9.23651 3.80352L7.94014 5.09988L8.88295 6.04269L10.1793 4.74633C10.4397 4.48598 10.4397 4.06387 10.1793 3.80352ZM8.17585 6.7498L7.23304 5.80699L2.63684 10.4032C2.37649 10.6635 2.37649 11.0856 2.63684 11.346C2.89719 11.6063 3.3193 11.6063 3.57965 11.346L8.17585 6.7498ZM0.375 3.79167C0.375 3.51552 0.598858 3.29167 0.875 3.29167H1.75C2.02614 3.29167 2.25 3.51552 2.25 3.79167C2.25 4.06781 2.02614 4.29167 1.75 4.29167H0.875C0.598858 4.29167 0.375 4.06781 0.375 3.79167ZM3 3.79167C3 3.51552 3.22386 3.29167 3.5 3.29167H4.375C4.65114 3.29167 4.875 3.51552 4.875 3.79167C4.875 4.06781 4.65114 4.29167 4.375 4.29167H3.5C3.22386 4.06781 3 4.06781 3 3.79167ZM2.625 4.16667C2.90114 4.16667 3.125 4.39052 3.125 4.66667V5.54167C3.125 5.81781 2.90114 6.04167 2.625 6.04167C2.34886 6.04167 2.125 5.81781 2.125 5.54167V4.66667C2.125 4.39052 2.34886 4.16667 2.625 4.16667ZM11.375 7.95833C11.6511 7.95833 11.875 8.18219 11.875 8.45833V9.04167C11.875 9.073 11.8721 9.10366 11.8666 9.1334C11.8963 9.12788 11.927 9.125 11.9583 9.125H12.5417C12.8178 9.125 13.0417 9.34886 13.0417 9.625C13.0417 9.90114 12.8178 10.125 12.5417 10.125H11.9583C11.927 10.125 11.8963 10.1221 11.8666 10.1166C11.8721 10.1463 11.875 10.177 11.875 10.2083V10.7917C11.875 11.0678 11.6511 11.2917 11.375 11.2917C11.0989 11.2917 10.875 11.0678 10.875 10.7917V10.2083C10.875 10.177 10.8779 10.1463 10.8834 10.1166C10.8537 10.1221 10.823 10.125 10.7917 10.125H10.2083C9.93219 10.125 9.70833 9.90114 9.70833 9.625C9.70833 9.34886 9.93219 9.125 10.2083 9.125H10.7917C10.823 9.125 10.8537 9.12788 10.8834 9.1334C10.8779 9.10366 10.875 9.073 10.875 9.04167V8.45833C10.875 8.18219 11.0989 7.95833 11.375 7.95833ZM11.2833 9.53327C11.2888 9.56301 11.2917 9.59367 11.2917 9.625C11.2917 9.65633 11.2888 9.68699 11.2833 9.71673C11.313 9.71122 11.3437 9.70833 11.375 9.70833C11.4063 9.70833 11.437 9.71122 11.4667 9.71673C11.4612 9.68699 11.4583 9.65633 11.4583 9.625C11.4583 9.59367 11.4612 9.56301 11.4667 9.53327C11.437 9.53878 11.4063 9.54167 11.375 9.54167C11.3437 9.54167 11.313 9.53878 11.2833 9.53327Z" />
    </svg>
  );
}

function IconMinus20({ hook }: { hook?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" data-ohf-image={hook}>
      <path fill="currentColor" d="M4.16602 9.16602H15.8327V10.8327H4.16602V9.16602Z" />
    </svg>
  );
}

function IconPlus20({ hook }: { hook?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" data-ohf-image={hook}>
      <path fill="currentColor" d="M9.16602 9.16602V4.16602H10.8327V9.16602H15.8327V10.8327H10.8327V15.8327H9.16602V10.8327H4.16602V9.16602H9.16602Z" />
    </svg>
  );
}

function IconPlus16({ hook }: { hook?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" data-ohf-image={hook}>
      <path fill="currentColor" d="M7.49951 13.334V8.5H2.6665C2.39036 8.5 2.1665 8.27614 2.1665 8C2.16668 7.72401 2.39047 7.5 2.6665 7.5H7.49951V2.66699C7.49951 2.39096 7.72352 2.16717 7.99951 2.16699C8.27565 2.16699 8.49951 2.39085 8.49951 2.66699V7.5H13.3335L13.4341 7.51074C13.6617 7.55742 13.8333 7.75859 13.8335 8C13.8335 8.24158 13.6619 8.44356 13.4341 8.49023L13.3335 8.5H8.49951V13.334C8.49934 13.61 8.27555 13.834 7.99951 13.834C7.72363 13.8338 7.49969 13.6099 7.49951 13.334Z" />
    </svg>
  );
}

function IconSparkle20({ hook }: { hook?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" data-ohf-image={hook}>
      <path fill="currentColor" d="m11.852 4.217-.13-.978a.476.476 0 0 0-.943 0l-.13.978A6.41 6.41 0 0 1 5.14 9.724l-.978.13a.476.476 0 0 0 0 .943l.978.13a6.41 6.41 0 0 1 5.507 5.508l.13.978a.476.476 0 0 0 .944 0l.13-.978a6.41 6.41 0 0 1 5.508-5.507l.977-.13a.476.476 0 0 0 0-.944l-.977-.13a6.41 6.41 0 0 1-5.508-5.507Zm-7.2 10.54.169-.549a.188.188 0 0 1 .36 0l.168.549a2.222 2.222 0 0 0 1.47 1.47l.549.169a.188.188 0 0 1 0 .36l-.549.168a2.222 2.222 0 0 0-1.47 1.47l-.169.549a.188.188 0 0 1-.36 0l-.168-.548a2.222 2.222 0 0 0-1.47-1.47l-.549-.17a.188.188 0 0 1 0-.36l.548-.168a2.222 2.222 0 0 0 1.47-1.47Z" />
    </svg>
  );
}

function IconQuestion24({ hook }: { hook?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-ohf-image={hook}>
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15.75c0-4.25 4.25-3.317 4.25-6.976 0-4.987-7.385-5.446-8.388-.774" />
      <path fill="currentColor" d="M12 18.75h.01" />
    </svg>
  );
}

/* ---- 카드 슬롯 한 쌍(흐릿/선명 공통; z·회전·모서리·테두리는 실측 그대로) ---- */

type SlotSpec = {
  anchor: string;
  zClass: "a" | "b" | "c" | "d";
  frame: "normal" | "flat" | "round";
  src: string;
  alt: string;
  imgAnchor: string;
  frameAnchor: string;
  rotAnchor: string;
  slotAnchor: string;
};

const BAND_SLOTS: SlotSpec[] = [
  {
    anchor: "slot",
    zClass: "a",
    frame: "normal",
    src: "/ohf-image/soul-cinematic-1.webp",
    alt: "",
    imgAnchor: "card1img",
    frameAnchor: "card1",
    rotAnchor: "card1rot",
    slotAnchor: "slot1",
  },
  {
    anchor: "slot",
    zClass: "b",
    frame: "flat",
    src: "/ohf-image/soul-cinematic-2.webp",
    alt: "",
    imgAnchor: "card2img",
    frameAnchor: "card2",
    rotAnchor: "card2rot",
    slotAnchor: "slot2",
  },
  {
    anchor: "slot",
    zClass: "c",
    frame: "round",
    src: "/ohf-image/soul-cinematic-3.webp",
    alt: "",
    imgAnchor: "card3img",
    frameAnchor: "card3",
    rotAnchor: "card3rot",
    slotAnchor: "slot3",
  },
  {
    anchor: "slot",
    zClass: "d",
    frame: "normal",
    src: "/ohf-image/soul-cinematic-4.webp",
    alt: "",
    imgAnchor: "card4img",
    frameAnchor: "card4",
    rotAnchor: "card4rot",
    slotAnchor: "slot4",
  },
];

function BandSlot({ spec, layer }: { spec: SlotSpec; layer: "ghost" | "solid" }) {
  return (
    <div className={`ohf-img-slot ohf-img-slot--${spec.zClass}`} data-ohf-image={`${layer}.${spec.slotAnchor}`}>
      <div className="ohf-img-rotator" data-ohf-image={`${layer}.${spec.rotAnchor}`}>
        <div
          className={[
            "ohf-img-card",
            spec.frame === "flat" ? "ohf-img-card--flat" : "",
            spec.frame === "round" ? "ohf-img-card--round" : "",
          ].filter(Boolean).join(" ")}
          data-ohf-image={`${layer}.${spec.frameAnchor}`}
        >
          {/* HF src 는 CDN 프록시 원문; OHF 는 실파일 사본을 서빙한다(동일 바이너리). */}
          <img
            className="ohf-img-card-img"
            src={spec.src}
            alt={spec.alt}
            loading="lazy"
            decoding="async"
            data-ohf-image={`${layer}.${spec.imgAnchor}`}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ImageSurface — HF 이미지 생성 화면
   ========================================================================== */

export function ImageSurface({ model }: { model: ModelEntry }) {
  const text = useImagePrompt((s) => s.text);
  const setText = useImagePrompt((s) => s.setText);
  const [placeholderShown, setPlaceholderShown] = useState(text.trim() === "");
  const editorRef = useRef<HTMLDivElement>(null);

  /* HF 포착 상태: 프롬프트 비어있음 → placeholder 가 보였다(실측 #177 가시). */
  useEffect(() => {
    setPlaceholderShown(text.trim() === "");
  }, [text]);

  /* 에디터는 일반 contenteditable(Lexical 원문은 미이식 — 정직 marking).
     입력 → useImagePrompt(실배선; 이 화면에서 유일하게 실제로動く 길). */
  const syncFromEditor = () => {
    const t = editorRef.current?.innerText ?? "";
    setText(t);
  };

  return (
    <section className="ohf-img-root" data-ohf-image="root" aria-label="이미지 만들기" lang="ko">
      {/* #100: 상단 안내 레일 — HF 실측이 빈 행 */}
      <div className="ohf-img-topline" data-ohf-image="topline">
        <div className="ohf-img-notice" data-ohf-image="notice" />
      </div>

      {/* #113: 스테이지 */}
      <div className="ohf-img-stage" data-ohf-image="stage">
        <div className="ohf-img-scroller" data-ohf-image="scroller">
          {/* #115: 히어로 존 */}
          <div className="ohf-img-hero" data-ohf-image="hero">
            {/* #116: 아카데미 배너 */}
            <aside className="ohf-img-noticebar" data-ohf-image="noticebar">
              <span className="ohf-img-notice-icon" data-ohf-image="noticeicon">
                <IconBook hook="noticebook" />
              </span>
              <span className="ohf-img-notice-text" data-ohf-image="noticetext">
                <span className="ohf-img-notice-line ohf-img-notice-line--strong" data-ohf-image="noticeline1">
                  어디서 시작할지 모르겠나요?
                </span>
                <span className="ohf-img-notice-line ohf-img-notice-line--muted" data-ohf-image="noticeline2">
                  아카데미로 이동해 여정을 시작해 보세요
                </span>
              </span>
              <span className="ohf-img-notice-actions" data-ohf-image="noticeactions">
                <a
                  className="ohf-img-notice-cta"
                  href="/academy"
                  data-ohf-image="noticecta"
                  aria-disabled="true"
                  data-off="오픈Higgsfield에 아카데미 라우트 부재(원문 href 는 /ko/academy)"
                >
                  지금 배우기
                </a>
                <button
                  type="button"
                  className="ohf-img-notice-close"
                  aria-label="Close"
                  data-ohf-image="noticeclose"
                  aria-disabled="true"
                  data-off="정적 이식(배너 제거 상태 착지 후속)"
                >
                  <IconClose hook="noticeX" />
                </button>
              </span>
            </aside>

            {/* #128: 카드 밴드(흐릿 절대겹침 + 선명 flow + 히어로 텍스트 2번째 자식) */}
            <div className="ohf-img-band" data-ohf-image="band">
              <div className="ohf-img-band--ghost" data-ohf-image="bandGhost">
                {BAND_SLOTS.map((spec) => <BandSlot key={`g${spec.imgAnchor}`} spec={spec} layer="ghost" />)}
              </div>
              <div className="ohf-img-band--solid" data-ohf-image="bandSolid">
                {BAND_SLOTS.map((spec) => <BandSlot key={`s${spec.imgAnchor}`} spec={spec} layer="solid" />)}
              </div>

              {/* #163: 히어로 텍스트(원문 3단) — 밴드 flow 두 번째 자식 */}
              <div className="ohf-img-herotext" data-ohf-image="herotext">
                <div className="ohf-img-herotext-head" data-ohf-image="herotextHead">
                  <div className="ohf-img-headline" data-ohf-image="headline">
                    <p className="ohf-img-headline-line" data-ohf-image="headline1">
                      지금 제작을 시작해 보세요
                    </p>
                    <p className="ohf-img-headline-line ohf-img-headline-line--lime" data-ohf-image="headline2">
                      Higgsfield Soul Cinema
                    </p>
                  </div>
                  <p className="ohf-img-hero-desc" data-ohf-image="herodesc">
                    장면, 캐릭터, 분위기, 스타일을 설명해 보세요. 눈앞에서 생생하게 살아나요
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* #169: 좌정 독(fixed) */}
      <div className="ohf-img-dock" data-ohf-image="dock">
        <form
          className="ohf-img-form"
          data-ohf-image="form"
          onSubmit={(e) => {
            /* 생성 실행 착지 전까지 제출만 차단(정직 marking). */
            e.preventDefault();
          }}
        >
          <fieldset className="ohf-img-fieldset" data-model="soul-cinematic" data-ohf-image="fieldset">
            {/* #172: 좌 컬럼 */}
            <div className="ohf-img-col" data-ohf-image="col">
              {/* #173: 프롬프트 행 */}
              <div className="ohf-img-prompt-row" data-ohf-image="promptrow">
                <div className="ohf-img-prompt" data-image-form-prompt="true" data-ohf-image="prompt">
                  <div
                    ref={editorRef}
                    className="ohf-img-editor"
                    contentEditable
                    role="textbox"
                    spellCheck
                    data-tour-anchor="tour-image-prompt"
                    aria-placeholder="상상하는 장면을 설명해 주세요"
                    data-lexical-editor="true"
                    data-ohf-image="editor"
                    onInput={syncFromEditor}
                    onKeyUp={syncFromEditor}
                  >
                    <p data-ohf-image="editorp">{text === "" ? <br /> : text}</p>
                  </div>
                  {placeholderShown ? (
                    <div className="ohf-img-placeholder" data-prompt-placeholder="true" data-ohf-image="placeholder">
                      상상하는 장면을 설명해 주세요
                    </div>
                  ) : null}
                </div>
              </div>

              {/* #178: 설정 컨트롤 행 */}
              <div className="ohf-img-controls" data-ohf-image="controls">
                {/* #179/#180: 어셋 픽커 */}
                <div className="ohf-img-assets" data-assets-picker-controls="true" data-ohf-image="assets">
                  <button
                    type="button"
                    className="ohf-img-assets-btn"
                    aria-label="레퍼런스"
                    data-state="closed"
                    data-ohf-image="assetsbtn"
                    aria-disabled="true"
                    data-off="정적 이식(레퍼런스 첨부 착지 후속)"
                  >
                    <IconPlus24 hook="assetsPlus" />
                  </button>
                </div>

                {/* #183-#194: 모델 트리거 */}
                <div className="ohf-img-modelwrap" data-panel-toggle="true" data-tour-anchor="tour-image-model" data-ohf-model={model.id} data-ohf-image="modelwrap">
                  <fieldset className="ohf-img-model-fieldset" data-ohf-image="modelfieldset">
                    <label className="ohf-img-model-label" data-ohf-image="modellabel">
                      <button type="button" className="ohf-img-model-btn" data-ohf-image="modelbtn" aria-disabled="true" data-off="정적 이식(모델 패널 착지 후속)">
                        <span className="ohf-img-model-inner" data-ohf-image="modelinner">
                          <span className="ohf-img-model-lead" data-ohf-image="modellead">
                            <span className="ohf-img-model-icon" data-ohf-image="modelicon">
                              <IconSoulGlyph hook="soulGlyph" />
                            </span>
                            <span className="ohf-img-model-name" data-ohf-image="modelname">
                              Soul Cinema
                            </span>
                          </span>
                        </span>
                        <span className="ohf-img-model-chev">
                          <IconChevronDown20 hook="modelChev" />
                        </span>
                      </button>
                    </label>
                  </fieldset>
                </div>

                {/* #195: 설정 스크롤 영역 */}
                <div className="ohf-img-setwrap" data-ohf-image="setwrap">
                  <span className="ohf-img-chevron-ghost" aria-hidden="true" data-ohf-image="chevronGhost">
                    <IconChevronRight24 hook="ghostChev" />
                  </span>
                  <div className="ohf-img-trackscroll" data-ohf-image="trackscroll">
                    <div className="ohf-img-track" data-ohf-image="track">
                      <div className="ohf-img-track-inner" data-ohf-image="trackInner">
                        {/* #201-#213: 카메라 버튼 + 배지 층 */}
                        <button
                          type="button"
                          className="ohf-img-chip ohf-img-chip--cam"
                          aria-haspopup="dialog"
                          aria-expanded="false"
                          aria-controls="radix-_r_24_"
                          data-state="closed"
                          data-ohf-image="camera"
                          aria-disabled="true"
                          data-off="정적 이식(카메라 다이얼로그 착지 후속)"
                        >
                          <span className="ohf-img-cam-icon" data-ohf-image="camicon">
                            <span className="ohf-img-cam-icon-inner" data-ohf-image="camiconinner">
                              <span className="ohf-img-cam-box" data-ohf-image="cambox">
                                <span className="ohf-img-cam-scale" data-ohf-image="camscale">
                                  <span className="ohf-img-cam-badge" data-ohf-image="cambadge">
                                    <span className="ohf-img-cam-inset" data-ohf-image="caminset" />
                                    <span className="ohf-img-cam-in2" data-ohf-image="camin2">
                                      <img
                                        className="ohf-img-cam-photo"
                                        alt=""
                                        draggable={false}
                                        src="/ohf-image/camera-settings.svg"
                                        data-ohf-image="camphoto"
                                      />
                                      <span className="ohf-img-cam-glow" data-ohf-image="camglow" />
                                      <span className="ohf-img-cam-sheen" data-ohf-image="camsheen" />
                                    </span>
                                    <span className="ohf-img-cam-ring" data-ohf-image="camring" />
                                  </span>
                                </span>
                              </span>
                            </span>
                          </span>
                          <span className="ohf-img-chip-label" data-ohf-image="camlabel">카메라</span>
                        </button>

                        {/* #214-#226: 컬러 트랜스퍼(order-last 로 시각상 마지막) */}
                        <div className="ohf-img-ct-group" data-ohf-image="ctgroup">
                          <div className="ohf-img-ct" data-panel-toggle="true" data-ohf-image="ct">
                            <div className="ohf-img-ct-inner" data-ohf-image="ctinner">
                              <button
                                type="button"
                                className="ohf-img-chip ohf-img-chip--ct"
                                data-ohf-image="ctbtn"
                                aria-disabled="true"
                                data-off="정적 이식(컬러 트랜스퍼 착지 후속)"
                              >
                                <span className="ohf-img-ct-icon" data-ohf-image="cticon">
                                  <span className="ohf-img-ct-icon-inner" data-ohf-image="cticoninner">
                                    <IconColorTransfer hook="ctSvg" />
                                  </span>
                                </span>
                                <span className="ohf-img-chip-label ohf-img-ct-label" data-ohf-image="ctlabel">컬러 트랜스퍼</span>
                                <span className="ohf-img-badge-new" data-ohf-image="ctnew">신규</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* #227-#231: 종횡비 */}
                        <button
                          type="button"
                          className="ohf-img-chip ohf-img-chip--ratio"
                          tabIndex={0}
                          aria-haspopup="menu"
                          aria-label="종횡비"
                          aria-expanded="false"
                          data-ohf-image="ratio"
                          aria-disabled="true"
                          data-off="정적 이식(종횡비 메뉴 착지 후속)"
                        >
                          <span className="ohf-img-ratio-icon" data-ohf-image="ratioicon">
                            <IconRatio16 hook="ratioSvg" />
                          </span>
                          <span className="ohf-img-chip-label--small" data-ohf-image="ratiolabel">16:9</span>
                        </button>

                        {/* #232-#236: 품질 */}
                        <button
                          type="button"
                          className="ohf-img-chip ohf-img-chip--ratio"
                          tabIndex={0}
                          aria-haspopup="menu"
                          aria-label="품질"
                          aria-expanded="false"
                          data-ohf-image="quality"
                          aria-disabled="true"
                          data-off="정적 이식(품질 메뉴 착지 후속)"
                        >
                          <span className="ohf-img-qual-icon" data-ohf-image="qualicon">
                            <IconQuality16 hook="qualSvg" />
                          </span>
                          <span className="ohf-img-chip-label--small" data-ohf-image="quallabel">2k</span>
                        </button>

                        {/* #237-#239: 요소 켬/껌 */}
                        <button
                          type="button"
                          className="ohf-img-chip ohf-img-chip--toggle"
                          data-state="closed"
                          data-ohf-image="elements"
                          aria-disabled="true"
                          data-off="정적 이식(요소 토글 착지 후속)"
                        >
                          <span className="ohf-img-wand">
                            <IconWand14 hook="wandSvg" />
                          </span>
                          켬
                        </button>

                        {/* #240-#249: 이미지 수 스테퍼(실측값 1/4, 감소 실비활성) */}
                        <button type="button" className="ohf-img-stepper" data-state="closed" data-ohf-image="stepperouter">
                          <span className="ohf-img-stepper-inner" data-ohf-image="stepper">
                            <button
                              type="button"
                              className="ohf-img-step-btn"
                              disabled
                              aria-label="감소"
                              data-ohf-image="stepminus"
                            >
                              <IconMinus20 hook="minusSvg" />
                            </button>
                            <span className="ohf-img-step-num" aria-live="polite" data-ohf-image="stepnum">
                              1<span className="ohf-img-step-total" data-ohf-image="steptotal">/4</span>
                            </span>
                            <button
                              type="button"
                              className="ohf-img-step-btn"
                              aria-label="증가"
                              data-ohf-image="stepplus"
                              aria-disabled="true"
                              data-off="정적 이식(카운트 증가 착지 후속)"
                            >
                              <IconPlus20 hook="plusSvg" />
                            </button>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* #250: 오른쪽 스크롤 개입 */}
                  <button
                    type="button"
                    className="ohf-img-chevron-right"
                    data-panel-toggle=""
                    aria-label="오른쪽으로 스크롤"
                    aria-hidden="false"
                    tabIndex={0}
                    data-ohf-image="chevronRight"
                    aria-disabled="true"
                    data-off="정적 이식(트랙 스크롤 개입 착지 후속)"
                  >
                    <IconChevronRight24 hook="rightChev" />
                  </button>
                </div>
              </div>
            </div>

            {/* #253: 우측 aside */}
            <aside className="ohf-img-aside" data-ohf-image="aside">
              {/* 캐릭터 토글 */}
              <div className="ohf-img-charwrap" data-character-panel-toggle="true" data-ohf-image="charwrap">
                <div className="ohf-img-charbox" data-ohf-image="charbox">
                  <figure className="ohf-img-charfig" tabIndex={-1} role="link" data-ohf-image="charfig" aria-disabled="true" data-off="정적 이식(캐릭터 패널 착지 후속)">
                    <span className="ohf-img-charwash" data-ohf-image="charwash" />
                    <span className="ohf-img-charlabel" data-ohf-image="charlabel">캐릭터</span>
                  </figure>
                  <div className="ohf-img-charbadge" data-ohf-image="charbadge">
                    <span className="ohf-img-charbadge-grid" data-ohf-image="charbadgegrid">
                      <span data-ohf-image="charbadgeinner">
                        <IconPlus16 hook="charPlus" />
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 생성하기(120×80 lime; 실측 text-shadow·그림자·발광 포함) */}
              <button
                type="submit"
                className="ohf-img-generate"
                data-tour-anchor="tour-image-generate"
                data-state="closed"
                data-ohf-image="generate"
              >
                <span className="ohf-img-gen-hairline" aria-hidden="true" data-ohf-image="genhairline" />
                <span className="ohf-img-gen-glow" aria-hidden="true" data-ohf-image="genglow" />
                <span className="ohf-img-gen-content" data-ohf-image="gencontent">
                  <span className="ohf-img-gen-label" data-ohf-image="genlabel">
                    <span className="ohf-img-gen-text" data-ohf-image="gentext">생성하기</span>
                  </span>
                  <span className="ohf-img-gen-cost" data-ohf-image="gencost">
                    <span className="ohf-img-gen-sparkle">
                      <IconSparkle20 hook="sparkleSvg" />
                    </span>
                    <span data-ohf-image="costnum">0.125</span>
                  </span>
                </span>
              </button>
            </aside>
          </fieldset>
        </form>
      </div>

      {/* #274: 도우미 런처(우하단 absolute) */}
      <div className="ohf-img-helpzone" data-ohf-image="helpzone">
        <div className="ohf-img-help" data-ohf-image="help">
          <div className="ohf-img-help-tab" data-ohf-image="helptab">
            <button
              type="button"
              className="ohf-img-help-trigger"
              data-help-launcher-trigger="true"
              aria-label="도움이 필요하세요?"
              aria-haspopup="dialog"
              aria-expanded="false"
              data-ohf-image="helptrigger"
              aria-disabled="true"
              data-off="정적 이식(도움말 다이얼로그 착지 후속)"
            >
              <span className="ohf-img-help-icon" data-ohf-image="helpicon">
                <IconQuestion24 hook="helpQ" />
              </span>
            </button>
          </div>
          <span className="ohf-img-help-ring" aria-hidden="true" data-ohf-image="helpring" />
          <span className="ohf-img-help-glowwrap" aria-hidden="true" data-ohf-image="helpglowwrap">
            <span className="ohf-img-help-glowpad" data-ohf-image="helpglowpad">
              <span className="ohf-img-help-glow" data-ohf-image="helpglow" />
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
