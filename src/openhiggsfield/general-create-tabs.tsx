"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { MODELS } from "@/generation/catalog";
import type { MediaRole, ModelEntry } from "@/generation/catalog";
import type { SettingField } from "@/generation/catalog/types";
import { useVideoMedia } from "@/generation/stores/media";
import { useAudioPrompt, useVideoPrompt } from "@/generation/stores/prompt";

import { ROLE_LABELS, describeModel, settingValueLabel } from "./data";
import { AssetPicker } from "./asset-picker";
import type { RunRecord } from "./history";
import { AudioIcon, CloseIcon, FormatIcon, PlayIcon } from "./icons";
import { MediaStrip, useMediaTray } from "./media-tray";
import type { MediaTray } from "./media-tray";

/* ============================================================================
   general-create-tabs.tsx  —  t_1fd6032c 셸 + t_d5b517ad 패널 이식
                               + t_47de09bd 실행·첨부·모델 panel 실배선
   + t_edb910c3 생성 폼 내부 HF 동값 이식(피겨 카드·세그먼트 탭·드롭존·
     프롬프트 박스+발·모델 트리거·설정 셀·CTA 좌정) — svg 원문은 CDP 실측
     hf_details.json의 무트런케이트 d를 그대로 쓴다(재구성 금지 규칙)

   HF ground truth (CDP :9222 실측, 2026-11-04 — scratch/gct_hf_detail.json,
   gct09_hf_probe3.json A_mc_tree1, gct09_hf_probe5b.json dtv_details,
   gct09_hf_draw_model.json; 재구성 금지 규칙에 따라 라벨·값·배치는 실측본
   그대로, 그리고 실측에 없는 것은 만들지 않는다):

   · 서브탭 스트립 = 비디오 만들기 / 비디오 편집 / Motion Control.
   · 만들기 카드: 모드 탭[레퍼런스|영상 확장] → "레퍼런스 추가하기"(이미지,
     영상 또는 오디오) → 프롬프트 → 요소(켬) → 모델 → 설정 grid → 생성하기.
   · 편집 카드: 편집 방식 탭[프롬프트|그리기] → "편집할 영상 추가"(최대 30초) →
     "요소 또는 레퍼런스 추가"(이미지 또는 오디오 최대 50개) → 요소 → 모델/품질/
     비트레이트 → 생성하기. '그리기'는 fullscreen Draw 모달을 연다.
   · Motion Control 카드: hero, "복사할 모션 추가"(영상 길이: 3–30초), "내 캐릭터
     추가"(얼굴과 몸이 보이는 이미지), 모델, 품질, 장면 컨트롤 모드+[비디오|이미지]
     +힌트, 고급 설정 아코디언→textarea, 생성하기.
   · 모델 panel: "추천 모델"(항목마다 상단/신규 배지와 해상도·초당초 메타) +
     "모든 모델" + 검색 input(placeholder "검색…") + 3 섹션 버튼(모션 컨트롤 모델/
     생성 모델/편집 모델). 빈 결과 문구 "모델을 찾을 수 없어요".
   · Draw 모달: 헤더 탭[Draw to Video|Draw to Edit] + 타이틀 "Draw To Edit" +
     닫기(aria "닫기"); 플레이어 열(동영상 재생·영상 음소거=클립 전까지 비활성,
     시간 형식, range aria "프레임 타임스탬프"); 모델 선택 버튼(aria "모델 선택"
     =현재 모델 라벨); 캔버스 툴 선택/펜/지우개/도형/마커/이미지 추가하기/텍스트/
     레퍼런스 이미지 추가/Canvas 지우기; textarea placeholder "편집 내용 설명하기";
     생성하기(콘텐츠 전까지 비활성, 크레딧 병기 64/65 — HF 실측 가격이며 이 앱의
     과금이 아니다).
   · 오디오: HF 중첩 create 도구는 실측 결과 원부재(정직 marking).

   배선 (t_47de09bd에서 실제 동작으로 바뀌었다):
   - 모델의 단일 소스는 prop으로 오는 useActive의 답이다. 카드 안에서 모델을
     고정하던 이전 로직은 제거했다. 서브탭으로 진입할 때 모델이 그 카드의 family에
     맞지 않으면 family 기본값으로 onModel 전환한다(Motion→kling-3-motion-std,
     편집→seedance-2.5-edit) — panel의 섹션 분할과 같은 규칙을 쓰므로 두 곳이
     서로 어긋날 수 없다.
   - 첨비: 이 셸이 useMediaTray를 소유한다. 슬롯을 누르면 AssetPicker가 그 role로
     열리고, 실첨부는 tray.apply, 실제 제거는 MediaStrip의 ×(media.remove)다.
     모델이 받지 않는 role의 슬롯은 정직하게 비활성으로 남는다.
   - 모션 생성과 편집 생성은 app의 runGenerate로 연결된다. 고급 설정의 텍스트는
     useVideoPrompt에 직결되어 실제 plane의 prompt.text가 되고, 장면 컨트롤의
     [비디오|이미지] 선택은 characterOrientation으로 저장되어 mapKlingMotion의
     character_orientation이 된다.
   - 그리기는 fullscreen 모달로 실렌더·실동작한다(캔버스에 실제 선·도형·글자,
     툴 선택, 탭 전환, 닫기와 Escape, 설명 textarea의 스토어 직결). 그리기 결과로
     생성하는 실행도 실배선됐다(t_550c1e0a): 캔버스 PNG를 같은 upload 경로로
     data URI로 바꿔 모델의 reference role에 얹고, 모달 설명은 이미 직결된
     useVideoPrompt 그대로 카드의 생성기와 같은 실행을 탄다. 활성화는 그림이
     착지하고 설명이 있을 때 — HF에서 생성하기가 stroke 실등록 전까지 비활성이
     었다는 것(그리고 그리기에 진입하면 실측 href가 ?image-inpaint=true로
     옮겨간다는 것)은 :9222에서 실측으로 확인했다. 모델이 reference를 받지
     않으면 실행에 얹을 자리가 없어 그 버튼만 정직하게 비활성으로 남는다.
   ========================================================================== */

/* HF 실측 그대로의 서브탭 이름과 순서. */
const VIDEO_SUBTABS = ["비디오 만들기", "비디오 편집", "Motion Control"] as const;

/* 비트레이트 값 → HF 표시 라벨/힌트 매핑(실측 문자열). */
const BITRATE_LABEL: Record<string, { label: string; hint: string }> = {
  high: { label: "높음", hint: "낮은 압축 · 더 큰 크기" },
  standard: { label: "표준", hint: "높은 압축 · 더 작은 크기" },
};

/* 길이 패널의 빠른 선택값 — HF "총 길이" popover 실측(5s 기본 + 4/10/15/20/30). */
const DURATION_PRESETS = [4, 10, 15, 20, 30] as const;

type MenuSet = readonly string[];

/* ---- model families: one rule, two consumers (panel sections + card defaults) */
type ModelFamily = "motion" | "edit" | "generation";

/** Which family a catalogue entry belongs to. Motion means "the run is driven by
    a reference video": a video role and no general reference or audio slots —
    Genjutsu and the Kling motion-control tiers answer to it. Edit means the id
    says edit. Everything else creates from prompt and frames. The same function
    decides the panel's three sections and the subtab's default model, so the
    two can never disagree. */
function familyOf(model: ModelEntry): ModelFamily {
  if (/motion/i.test(model.id)) return "motion";
  if (model.roles.video && !model.roles.reference && !model.roles.audio) return "motion";
  if (/edit/i.test(model.id)) return "edit";
  return "generation";
}

const FAMILY_DEFAULT: Record<ModelFamily, string> = {
  generation: "seedance-2.5",
  edit: "seedance-2.5-edit",
  motion: "kling-3-motion-std",
};

const TAB_FAMILY: Record<string, ModelFamily | undefined> = {
  "비디오 만들기": "generation",
  "비디오 편집": "edit",
  "Motion Control": "motion",
};

/* HF의 추천 모델 리스트(CDP :9222, gct09_hf_probe3.json A_mc_tree1). 배지는 HF가
   붙인 그대로의 실측 라벨이다. HF 리스트의 아홉 번째 항목 "Kling 4.0"은 카탈로그에
   없는 항목이라 렌더하지 않는다 — 돌릴 수 없는 모델을 지어내지 않는 것이 정직의
   다른 절반이다. */
const RECOMMENDED: readonly { id: string; badge?: string }[] = [
  { id: "seedance-2.5", badge: "상단" },
  { id: "genjutsu", badge: "신규" },
  { id: "seedance-2.5-edit", badge: "상단" },
  { id: "seedance-2" },
  { id: "seedance-2-fast" },
  { id: "seedance-2-mini" },
  { id: "kling-3-4k" },
  { id: "kling-3-motion-std" },
];

const MODEL_SECTIONS: readonly { id: ModelFamily; label: string }[] = [
  { id: "motion", label: "모션 컨트롤 모델" },
  { id: "generation", label: "생성 모델" },
  { id: "edit", label: "편집 모델" },
];

/* HF가 빈 결과에서 보여준 문구(실측). */
const NO_MODEL_MESSAGE = "모델을 찾을 수 없어요";

/* 항목 메타는 카탈로그의 실값에서 나온다: resolution enum의 천장 값, duration
   range의 최소–최대, 그리고 family/role에서 파생된 HF식 태그. */
function modelMeta(model: ModelEntry): { meta: string; tags: string[] } {
  const meta: string[] = [];
  const resolution = model.settings.resolution;
  if (resolution?.type === "enum" && resolution.values.length > 0) {
    meta.push(settingValueLabel("resolution", resolution.values[resolution.values.length - 1]!));
  }
  const duration = model.settings.duration;
  if (duration?.type === "range") meta.push(`${duration.min}s-${duration.max}s`);
  const tags: string[] = [];
  if (familyOf(model) === "edit") tags.push("비디오 편집");
  if (model.roles.audio) tags.push("오디오");
  return { meta: meta.join(" · "), tags };
}

type Props = {
  /* which surface the general view parked on — drives the video vs audio tree. */
  surface: "video" | "audio";
  /** The active model entry (app owns useActive; the shell reads its answer). */
  model: ModelEntry;
  /** Settings recorded for the active model (useSettings.byModel[id]). */
  values: Record<string, unknown>;
  onModel: (id: string) => void;
  onSetting: (patch: Record<string, unknown>) => void;
  /** 복선 slots — the dock's side losses reclaimed alongside the shell. */
  selection?: React.ReactNode;
  error?: string | null;
  onError?: (message: string | null) => void;
  notice?: React.ReactNode;
  /** Real generation entry (app's runGenerate) — press starts the same plane
      the composer would. Empty prompt is refused the way HF refuses it. */
  onGenerate?: () => void;
  /** The run log, so the asset library can offer finished runs as inputs. */
  history: RunRecord[];
};

function settingOf(model: ModelEntry, key: string): SettingField | undefined {
  return model.settings[key];
}

/* ---- one settings dial: the HF h-13.5 button + its dropdown panel ---- */
/* ============================================================================
   HF svg 원문 — CDP :9222 라이브 실측 2026-11-04, hf_details.json의 무트런케이트
   d 문자열 그대로. 재구성 금지 규칙에 따라 패스·viewBox·stroke·fill을 원본값으로
   쓴다. (세그먼트 탭의 실측 d는 카드 본문에 기록된 earlier 값과 현재 DOM에서
   달라져 있어 라이브 재발취본을 정본으로 삼는다 — 실측이 원문이다.)
   ========================================================================== */

function HfChevron() {
  /* 모델 트리거·설정 셀의 공통 chevron — vb 20-box를 16으로 렌더(실측 16x16). */
  return (
    <svg className="ohf-gct-hchev" width={16} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3.81344 7.97848C4.0087 7.78322 4.32528 7.78322 4.52055 7.97848L10.0003 13.4583L15.4801 7.97848C15.6754 7.78322 15.9919 7.78322 16.1872 7.97848C16.3825 8.17374 16.3825 8.49032 16.1872 8.68558L10.3539 14.5189L10.0003 14.8725L9.64677 14.5189L3.81344 8.68558C3.61818 8.49032 3.61818 8.17374 3.81344 7.97848Z" />
    </svg>
  );
}

function HfCoin() {
  /* 생성하기 크레딧의 스파클 코인 — vb 20, 20x20 렌더, fill currentColor. */
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="m11.852 4.217-.13-.978a.476.476 0 0 0-.943 0l-.13.978A6.41 6.41 0 0 1 5.14 9.724l-.978.13a.476.476 0 0 0 0 .943l.978.13a6.41 6.41 0 0 1 5.507 5.508l.13.978a.476.476 0 0 0 .944 0l.13-.978a6.41 6.41 0 0 1 5.508-5.507l.977-.13a.476.476 0 0 0 0-.944l-.977-.13a6.41 6.41 0 0 1-5.508-5.507Zm-7.2 10.54.169-.549a.188.188 0 0 1 .36 0l.168.549a2.222 2.222 0 0 0 1.47 1.47l.549.169a.188.188 0 0 1 0 .36l-.549.168a2.222 2.222 0 0 0-1.47 1.47l-.169.549a.188.188 0 0 1-.36 0l-.168-.548a2.222 2.222 0 0 0-1.47-1.47l-.549-.17a.188.188 0 0 1 0-.36l.548-.168a2.222 2.222 0 0 0 1.47-1.47Z" />
    </svg>
  );
}

function HfModelBars() {
  /* 모델 트리거 값 옆의 브랜드 아이콘(16-box, fill currentColor — CSS가 노랑). */
  return (
    <svg className="ohf-gct-hic" width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="m3.154 12.154-2.62.655V1.2l2.62.655v10.3Zm12.668.679-2.626.656V.519l2.627.65v11.664Zm-8.509-.325-2.622.656v-6.84l2.622.655v5.53ZM9.025 5.31l2.627-.656v6.84l-2.627-.656V5.31Z" />
    </svg>
  );
}

function HfBadgePen() {
  /* 피겨 배지 '변경'의 아이콘 — svg 14x16 렌더(실측 rect), vb 20-box. */
  return (
    <svg width={14} height={16} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13.5479 2.14282C14.1661 1.5247 15.1679 1.5247 15.7861 2.14282L18.3584 4.71411C18.9761 5.33243 18.9764 6.33519 18.3584 6.95337L7.31641 17.9954C7.01974 18.2919 6.61689 18.459 6.19727 18.4592H2.79199C2.37808 18.4592 2.04248 18.123 2.04199 17.7092V14.304C2.042 13.8842 2.20904 13.4817 2.50586 13.1848L11.0117 4.67798L13.5479 2.14282ZM3.56641 14.2454C3.55098 14.2609 3.542 14.2819 3.54199 14.304V16.9592H6.19727C6.2189 16.959 6.24037 16.9502 6.25586 16.9348L14.2314 8.95923L11.542 6.26978L3.56641 14.2454ZM14.7256 3.20337C14.6931 3.17104 14.6409 3.17104 14.6084 3.20337L12.6025 5.20825L15.292 7.89771L17.2979 5.89282C17.33 5.86043 17.3298 5.8072 17.2979 5.77466L14.7256 3.20337Z" />
    </svg>
  );
}

function HfTabRefIcon() {
  /* 세그먼트 탭 '레퍼런스' — vb 24, stroke 1.5, round/round, fill none. */
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.75 5.75v12.5m4-13.5v14.5m4 .017V4.734a1 1 0 0 1 1.207-.979l6.5 1.374a1 1 0 0 1 .793.979v11.784a1 1 0 0 1-.793.979l-6.5 1.374a1 1 0 0 1-1.207-.979" />
    </svg>
  );
}

function HfTabExtIcon() {
  /* 세그먼트 탭 '영상 확장' — vb 24, stroke 1.5, lc round, lj square(원문).
     React의 타입 union은 square를 모르고 SVG2 원문은 square이 정본이므로,
     재구성 금지 규칙을 지키기 위해 스프레드 캐스트로 원문 값을 보낸다. */
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      {...({ strokeLinejoin: "square" } as unknown as React.SVGProps<SVGSVGElement>)}
      aria-hidden="true"
    >
      <path d="M12.992 11.559V6.673a1 1 0 0 1 1.65-.76l6.221 5.327a1 1 0 0 1 0 1.52l-6.22 5.326a1 1 0 0 1-1.65-.76v-4.885m0-.882L6.4 5.913a1 1 0 0 0-1.65.76v10.654a1 1 0 0 0 1.65.76l6.592-5.646m0-.882v.882" />
    </svg>
  );
}

/* 드롭존 서클의 3 아이콘 — HF는 fill을 각 svg의 defs 그라데이션으로 입힌다
   (linearGradient x1=0 y1=0 x2=0 y2=1, #fff → #EDEDED @ opacity .3). 동일 id가
   HF에서 반복 사용되지만 여기서는 인스턴스 간 참조 충돌을 피하기 위해 타입별
   고유 id를 쓴다 — 실측 정지는 그라데이션 정의 원문이고, id만 OH 스코프다. */
function BadgeGradDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" />
        <stop offset="1" stopColor="#EDEDED" stopOpacity="0.3" />
      </linearGradient>
    </defs>
  );
}

function HfBadgeFace({ id }: { id: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <BadgeGradDefs id={id} />
      <g fill={`url(#${id})`}>
        <path fillRule="evenodd" clipRule="evenodd" d="M9.941 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22.781 18.34a8 8 0 0 0-.24-.82v-.03c-.82-2.5-1.67-4.46-2.54-5.81-.44-.67-.9-1.22-1.4-1.6-.51-.38-1.09-.62-1.72-.56-1.86.15-3.12 1.68-4.01 2.84-.12.16-.24.32-.35.46-.33.43-.61.81-.89 1.11-.39.42-.6.49-.69.49-.19 0-.41-.06-.72-.22-.27-.14-.55-.33-.88-.54-.04-.03-.09-.06-.13-.09-.72-.47-1.68-1.1-2.84-1.1-.61 0-1.14.27-1.57.62-.42.35-.78.82-1.09 1.31-.62.98-1.1 2.2-1.43 3.18v.03c-.1.27-.19.53-.24.75-.06.25-.08.52 0 .82.1.42.39.82.76 1.05.26.17.54.23.8.25.24.02.52.02.83.02h15.92c.33 0 .63 0 .88-.02.26-.02.55-.08.82-.25.37-.24.65-.62.76-1.04.08-.31.04-.59-.01-.85z" />
      </g>
    </svg>
  );
}

function HfBadgeImage({ id }: { id: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <BadgeGradDefs id={id} />
      <g fill={`url(#${id})`}>
        <path fillRule="evenodd" clipRule="evenodd" d="M15.75 4.5c.966 0 1.75.784 1.75 1.75v11.5a1.75 1.75 0 0 1-1.75 1.75h-12A1.75 1.75 0 0 1 2 17.75V6.25c0-.966.784-1.75 1.75-1.75zM20.443 7.215A1.5 1.5 0 0 1 22.5 8.607v6.786a1.5 1.5 0 0 1-2.057 1.392l-1.943-.777V7.992z" />
      </g>
    </svg>
  );
}

function HfBadgeAudio({ id }: { id: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <BadgeGradDefs id={id} />
      <g fill={`url(#${id})`}>
        <path fillRule="evenodd" clipRule="evenodd" d="M13 3.75a.75.75 0 0 0-1.154-.632L5.842 6.961A.25.25 0 0 1 5.707 7H2.75A1.75 1.75 0 0 0 1 8.75v6.5c0 .966.784 1.75 1.75 1.75h2.957a.25.25 0 0 1 .135.04l6.004 3.842A.75.75 0 0 0 13 20.25zM18.718 4.222a.75.75 0 0 1 1.06 0A10.97 10.97 0 0 1 23 12c0 3.037-1.232 5.788-3.222 7.778a.75.75 0 1 1-1.06-1.06A9.47 9.47 0 0 0 21.5 12a9.47 9.47 0 0 0-2.782-6.718.75.75 0 0 1 0-1.06M16.42 7.581a.75.75 0 0 0-1.061 1.06 4.73 4.73 0 0 1 1.391 3.36c0 1.311-.53 2.498-1.391 3.358a.75.75 0 1 0 1.06 1.06A6.23 6.23 0 0 0 18.25 12c0-1.725-.7-3.289-1.83-4.419" />
      </g>
    </svg>
  );
}

function HfElementIcon() {
  /* 프롬프트 발의 '요소' 버튼 아이콘 — vb 24, stroke 1.5, lc round. */
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
      <path d="M16.8684 19.8667C15.4543 20.7437 13.7863 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 13.9797 20.2662 16.0242 17.9715 15.8156C16.0837 15.644 14.7249 13.9258 14.993 12.0492L15.5226 8.40278M14.9375 12.4805C14.63 14.6681 12.8291 16.2235 10.9149 15.9544C9.00068 15.6854 7.69817 13.6939 8.00562 11.5063C8.31308 9.31862 10.1141 7.76327 12.0283 8.03229C13.9424 8.30131 15.245 10.2928 14.9375 12.4805Z" />
    </svg>
  );
}

function HfWaveIcon() {
  /* '켬' 발의 스피커+웨이브 아이콘 — vb 24, stroke 1.5, round/round. */
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19.2478 4.75195C21.1027 6.60684 22.25 9.16934 22.25 11.9998C22.25 14.8303 21.1027 17.3928 19.2478 19.2476M15.8891 8.11133C16.8844 9.10663 17.5 10.4816 17.5 12.0004C17.5 13.5192 16.8844 14.8942 15.8891 15.8895M2.75 7.75H5.7074C5.89846 7.75 6.08552 7.69526 6.24645 7.59227L12.25 3.75V20.25L6.24645 16.4077C6.08552 16.3047 5.89846 16.25 5.7074 16.25H2.75C2.19772 16.25 1.75 15.8023 1.75 15.25V8.75C1.75 8.19772 2.19772 7.75 2.75 7.75Z" />
    </svg>
  );
}

/* ---- HF의 피겨 카드(모델 데모 루프) — 카드 본문 원본 실측 2· 라이브 재실측 동값 ----
   FIGURE 302x130 radius12 overflow hidden; video 302x130(모델 데모 루프, HF
   실측 src https://static.higgsfield.ai/seedance-2.5/video-banner-general.mp4를
   같은 바이트로 로컬화한 /model-demos/video-banner-general.mp4를 쓴다 — 오프라인
   견고성 우선, HF의 속성 그대로 loop·playsinline·disablePictureInPicture·
   preload=none에 OH 루프 재생을 위한 autoPlay만 더한다); figcaption 하단
   pb-3 pl-3 pr-1.5(실측 pad 0 6px 12px 12px)에 브랜드 'General'(Space Grotesk
   20/700 uppercase -1% 노랑)과 현재 모델명(12/400 white/.8); 우상단 배지 컨테이너
   top-1.5 right-1.5 gap-4에 '변경'만 렌더한다 — HF는 이 모델 상태에서 '믹스'를
   display:none으로 렌더하지 않으므로(실측 disp:none) 미렌더가 실측 그대로다.
   figure의 role=button과 '변경' 버튼은 OH에 대응 실기능이 없어 honest inert로
   aria-disabled="true" + data-off=""를 달고 기하는 실측 동값으로 남는다. */
function ModelFigure({ model }: { model: ModelEntry }) {
  return (
    <fieldset className="ohf-gct-figure-wrap">
      <figure
        className="ohf-gct-figure"
        role="button"
        tabIndex={-1}
        aria-disabled="true"
        data-off=""
        aria-label={`모델 데모 ${model.label}`}
      >
        <video
          className="ohf-gct-figure-video"
          src="/model-demos/video-banner-general.mp4"
          autoPlay
          loop
          muted
          playsInline
          disablePictureInPicture
          preload="none"
        >
          사용 중인 브라우저가 영상을 지원하지 않아요.
        </video>
        <figcaption className="ohf-gct-figure-caption">
          <p className="ohf-gct-figure-brand">General</p>
          <p className="ohf-gct-figure-name">{model.label}</p>
        </figcaption>
        <div className="ohf-gct-figure-badges">
          <button type="button" className="ohf-gct-figure-badge" aria-disabled="true" data-off="">
            <HfBadgePen />
            <span className="ohf-gct-figure-badge-text">변경</span>
          </button>
        </div>
      </figure>
    </fieldset>
  );
}

/* ---- HF의 드롭존(레퍼런스 추가) — 실측 4의 첫 블록 동값 ----
   outer gap-3 pad-4 bg white/5 r12; inner h-37 pad16 gap-12 r8에 halo(절대
   position, pointer-events none) + full-face hit button(z-10, 실배선: 이 카드의
   onAttach가 그대로 열쇠다) + 36px 서클 3종(-8px 중첩, fill rgb(28,30,32) 위에
   ring border rgba(197,197,197,.3)+white/4, 각 16px 그라데이션 아이콘) +
   텍스트 스택(gap-1.5: 라벨 14/600, 힌트 12/400 rgb(130,130,130)). */
function DropZone({
  label,
  hint,
  disabled,
  onOpen,
}: {
  label: string;
  hint: string;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="ohf-gct-drop">
      <div className="ohf-gct-drop-inner">
        <span className="ohf-gct-drop-halo" aria-hidden="true" />
        <button
          type="button"
          className="ohf-gct-drop-hit"
          aria-label={label}
          aria-disabled={disabled ? "true" : undefined}
          data-off={disabled ? "" : undefined}
          onClick={() => {
            if (!disabled) onOpen();
          }}
        />
        <span className="ohf-gct-drop-circles" aria-hidden="true">
          <span className="ohf-gct-badge-circle">
            <span className="ohf-gct-badge-fill" />
            <span className="ohf-gct-badge-ring" />
            <span className="ohf-gct-badge-ic">
              <HfBadgeFace id="ohf-grad-badge-face" />
            </span>
          </span>
          <span className="ohf-gct-badge-circle">
            <span className="ohf-gct-badge-fill" />
            <span className="ohf-gct-badge-ring" />
            <span className="ohf-gct-badge-ic">
              <HfBadgeImage id="ohf-grad-badge-image" />
            </span>
          </span>
          <span className="ohf-gct-badge-circle">
            <span className="ohf-gct-badge-fill" />
            <span className="ohf-gct-badge-ring" />
            <span className="ohf-gct-badge-ic">
              <HfBadgeAudio id="ohf-grad-badge-audio" />
            </span>
          </span>
        </span>
        <span className="ohf-gct-drop-text">
          <span className="ohf-gct-drop-title">{label}</span>
          <span className="ohf-gct-drop-hint">{hint}</span>
        </span>
      </div>
    </div>
  );
}

function Dial({
  label,
  value,
  open,
  onOpen,
  children,
  hf = false,
}: {
  label: string;
  value: React.ReactNode;
  open: boolean;
  onOpen: (next: string | null) => void;
  children: React.ReactNode;
  hf?: boolean;
  /* hf=true: HF의 h-13.5 셀/트리거 기하와 2단 스택+chevron으로 렌더한다
     (실측 동값 — CSS의 .ohf-gct-hbtn이 착지 기준). 기본은 OH의 구버전 행. */
}) {
  return (
    <div className="ohf-gct-dial">
      <button
        type="button"
        className={hf ? "ohf-gct-hbtn" : "ohf-gct-dial-btn"}
        data-model-select-trigger={hf && label === "모델" ? "" : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-active={open || undefined}
        onClick={() => onOpen(open ? null : label)}
      >
        {hf ? (
          <>
            <span className="ohf-gct-hcol">
              <span className="ohf-gct-hname">{label}</span>
              <span className="ohf-gct-hval">
                <span className="ohf-gct-hval-text">{value}</span>
                {label === "모델" ? <HfModelBars /> : null}
              </span>
            </span>
            <HfChevron />
          </>
        ) : (
          <>
            <span className="ohf-gct-dial-name">{label}</span>
            <span className="ohf-gct-dial-value">{value}</span>
          </>
        )}
      </button>
      {open && (
        <div className="ohf-gct-dial-panel" role="region" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ---- one model row: HF's name + badge + catalogue meta ---- */
function ModelItem({
  model,
  current,
  badge,
  onPick,
}: {
  model: ModelEntry;
  current: boolean;
  badge?: string;
  onPick: (id: string) => void;
}) {
  const { meta, tags } = modelMeta(model);
  return (
    <button
      type="button"
      className="ohf-gct-model-item"
      data-on={current || undefined}
      aria-current={current ? "true" : undefined}
      onClick={() => onPick(model.id)}
    >
      <span className="ohf-gct-model-name">{model.label}</span>
      {badge && (
        <span className="ohf-gct-model-badge" aria-hidden>
          {badge}
        </span>
      )}
      {meta && <span className="ohf-gct-model-meta">{meta}</span>}
      {tags.length > 0 && (
        <span className="ohf-gct-model-tags">
          {tags.map((tag) => (
            <span key={tag} className="ohf-gct-model-tag">
              {tag}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

/* ---- the model panel every video body shares: 추천 + 검색 + 3 sections ---- */
function ModelPanel({
  activeId,
  onPick,
}: {
  /** the model the card runs now — HF marks that row as the chosen one. */
  activeId: string;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<ModelFamily | null>(null);
  const q = query.trim().toLowerCase();
  const videoModels = MODELS.filter((m) => m.surface === "video");
  /* The haystack carries the name, the id and the one-line description, plus the
     catalogue meta and the Korean words HF itself puts on the row — the section
     name and the role tags — so a visitor searching 편집 or 모션 finds the rows
     those words belong to, not only rows that spell it in English. */
  const matches = (model: ModelEntry) => {
    if (!q) return true;
    const { meta, tags } = modelMeta(model);
    const sectionLabel = MODEL_SECTIONS.find((s) => s.id === familyOf(model))?.label ?? "";
    return [model.label, model.id, describeModel(model), meta, sectionLabel, ...tags]
      .join(" ")
      .toLowerCase()
      .includes(q);
  };

  /* Only picks the catalogue actually carries survive. flatMap keeps the rows
     typed without assertions, and the badge rides along from the pick itself. */
  const recommended = RECOMMENDED.flatMap((pick) => {
    const found = videoModels.find((m) => m.id === pick.id);
    return found && matches(found) ? [{ model: found, badge: pick.badge }] : [];
  });

  const sectioned = section ? videoModels.filter((m) => familyOf(m) === section) : videoModels;
  const shown = sectioned.filter(matches);
  const empty = recommended.length === 0 && shown.length === 0;

  return (
    <div className="ohf-gct-model-panel">
      <div className="ohf-gct-model-head">추천 모델</div>
      {recommended.length > 0 && (
        <div className="ohf-gct-model-list">
          {recommended.map(({ model, badge }) => (
            <ModelItem
              key={model.id}
              model={model}
              badge={badge}
              current={model.id === activeId}
              onPick={onPick}
            />
          ))}
        </div>
      )}

      <div className="ohf-gct-model-head ohf-gct-model-head--all">모든 모델</div>
      <input
        className="ohf-gct-model-search"
        type="text"
        value={query}
        placeholder="검색…"
        aria-label="모델 검색"
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="ohf-gct-model-sections">
        {MODEL_SECTIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="ohf-gct-model-section"
            aria-pressed={section === entry.id}
            data-on={section === entry.id || undefined}
            onClick={() => setSection(section === entry.id ? null : entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {empty ? (
        <p className="ohf-gct-model-empty">{NO_MODEL_MESSAGE}</p>
      ) : (
        <div className="ohf-gct-model-list ohf-gct-model-list--all">
          {shown.map((model) => (
            <ModelItem
              key={model.id}
              model={model}
              current={model.id === activeId}
              onPick={onPick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- attach slot: the HF dashed plate, now a real control ---- */
function AttachSlot({
  role,
  label,
  hint,
  model,
  tray,
  onOpen,
}: {
  role: MediaRole;
  label: string;
  hint: string;
  model: ModelEntry;
  tray: MediaTray;
  onOpen: (role: MediaRole) => void;
}) {
  const max = model.roles[role] ?? 0;
  const count = tray.items.filter((item) => item.role === role).length;
  /* A role this model does not take cannot be offered as a working slot — the
     plate stays honestly inert and says why in the catalogue's own words. */
  if (max === 0) {
    return (
      <div className="ohf-gct-slot ohf-gct-slot--off" data-off="" aria-disabled="true">
        {label}
        <span className="ohf-gct-slot-hint">
          이 모델은 {ROLE_LABELS[role].toLowerCase()} 첨부를 받지 않습니다
        </span>
      </div>
    );
  }
  const full = count >= max;
  return (
    <button
      type="button"
      className="ohf-gct-slot"
      aria-label={label}
      aria-haspopup="dialog"
      disabled={full}
      onClick={() => onOpen(role)}
    >
      {label}
      <span className="ohf-gct-slot-hint">{full ? `가득 찼어요 (${count}/${max})` : hint}</span>
      {count > 0 && !full && (
        <span className="ohf-gct-slot-count">
          {count}/{max}
        </span>
      )}
    </button>
  );
}

/* ---- 비디오 만들기 body — the HF create card, store-bound ---- */
function MakeBody({
  model,
  values,
  onModel,
  onSetting,
  openMenu,
  setOpenMenu,
  onGenerate,
  tray,
  onAttach,
}: {
  model: ModelEntry;
  values: Record<string, unknown>;
  onModel: (id: string) => void;
  onSetting: (patch: Record<string, unknown>) => void;
  openMenu: string | null;
  setOpenMenu: (next: string | null) => void;
  onGenerate?: () => void;
  tray: MediaTray;
  onAttach: (role: MediaRole) => void;
}) {
  const prompt = useVideoPrompt((state) => state.text);
  const setPrompt = useVideoPrompt((state) => state.setText);
  const aspect = settingOf(model, "aspectRatio");
  const duration = settingOf(model, "duration");
  const resolution = settingOf(model, "resolution");
  const bitrate = settingOf(model, "bitrateMode");
  const generateAudio = settingOf(model, "generateAudio");

  const curDuration = Number(values.duration ?? (duration?.type === "range" ? duration.default : 5));
  const curAspect = String(values.aspectRatio ?? (aspect?.type === "enum" ? aspect.default : "16:9"));
  const curResolution = String(values.resolution ?? (resolution?.type === "enum" ? resolution.default : "1080p"));
  const curBitrate = String(values.bitrateMode ?? (bitrate?.type === "enum" ? bitrate.default : "high"));
  const audioOn = values.generateAudio !== false;

  /* [레퍼런스|영상 확장] 세그먼트의 실배선(CDP :9222 probe19 실측): 확장 탭을
     누르면 카드 헤더가 'Seedance 2.5 Extend'로 옮겨간다(실측 p 라벨). 실행
     모델은 카탈로그의 seedance-2.5-extend(라벨 동일)로 가고 toPlatform의
     video-extend 매핑이 실재하므로 실행 경로가 실재로 바뀐다. 첨비 슬롯은
     '확장할 영상 추가'(video 1·hint 최대 30초)와 '요소 또는 레퍼런스 추가'
     (reference·hint 이미지 또는 오디오 최대 50개)로 실측 그대로 교체된다.
     레퍼런스로 돌아가면 실측 dial(SEEDANCE 2.5)에 맞춰 이전 모델로 되돌린다. */
  const [direction, setDirection] = useState<"시퀄" | "프리퀄">("시퀄");
  const [directionOpen, setDirectionOpen] = useState(false);
  const [extendMode, setExtendMode] = useState(false);
  const baseModel = useRef<string | null>(null);

  const refMax = model.roles.reference ?? 0;
  const refCount = tray.items.filter((item) => item.role === "reference").length;
  const refFull = refMax > 0 && refCount >= refMax;

  const pickMode = (next: "레퍼런스" | "영상 확장") => {
    if (next === "영상 확장") {
      if (model.id !== "seedance-2.5-extend") baseModel.current = model.id;
      onModel("seedance-2.5-extend");
      setExtendMode(true);
      setOpenMenu(null);
    } else {
      if (model.id === "seedance-2.5-extend") {
        onModel(
          baseModel.current && baseModel.current !== "seedance-2.5-extend"
            ? baseModel.current
            : "seedance-2.5",
        );
      }
      setExtendMode(false);
      setDirection("시퀄");
      setDirectionOpen(false);
    }
  };

  return (
    <div className="ohf-gct-makeflow">
      {/* HF 생성 폼의 스크롤 콘텐츠 — 실측 위계 그대로(피겨 → 세그먼트 탭 → 패널).
          생성 CTA는 스크롤 밖의 발(fixed foot)에 좌정한다(HF: pad 0 8px 12px,
          rounded-b-2xl). */}
      <div className="ohf-gct-make-scroll">
        <ModelFigure model={model} />
        <div className="ohf-gct-segwrap">
          {/* 세그먼트 탭 — HF의 [레퍼런스|영상 확장] q-tabs-list(실측 302x40 r12
              pad3 gap4; 탭 145x32 12px/500; 선택=white, 비선택=white/.5;
              인디케이터는 투명+border, hover 시 bg). 실기능 전환은 OH의 기존
              pickMode에 배선돼 있다(레퍼런스/영상 확장 ↔ OH 레퍼런스 셀렉션/
              영상 확장). */}
          <div className="ohf-gct-seg" role="tablist" aria-label="생성 모드">
            <button
              type="button"
              role="tab"
              className="ohf-gct-seg-tab"
              aria-selected={!extendMode}
              data-on={!extendMode || undefined}
              onClick={() => pickMode("레퍼런스")}
            >
              <HfTabRefIcon />
              <span className="ohf-gct-seg-label">레퍼런스</span>
            </button>
            <button
              type="button"
              role="tab"
              className="ohf-gct-seg-tab"
              aria-selected={extendMode}
              data-on={extendMode || undefined}
              onClick={() => pickMode("영상 확장")}
            >
              <HfTabExtIcon />
              <span className="ohf-gct-seg-label">영상 확장</span>
            </button>
            <span className="ohf-gct-seg-ind" data-side={extendMode ? "right" : "left"} aria-hidden="true" />
          </div>

          <div className="ohf-gct-panel">
            {extendMode ? (
              /* 영상 확장 모드의 슬롯 — HF의 확장 상태 세부는 이번 런에서 라이브
                 재실측되지 않아(패널 전체가 재렌더되는 지점) 기존 OH AttachSlot
                 기하를 유지한다. 실기능(슬롯 첨부·삭제·파일)은 그대로 배선. */
              <div className="ohf-gct-slotgrid">
                <AttachSlot
                  role="video"
                  label="확장할 영상 추가"
                  hint="최대 30초"
                  model={model}
                  tray={tray}
                  onOpen={onAttach}
                />
                <AttachSlot
                  role="reference"
                  label="요소 또는 레퍼런스 추가"
                  hint="이미지 또는 오디오 최대 50개"
                  model={model}
                  tray={tray}
                  onOpen={onAttach}
                />
              </div>
            ) : (
              /* HF의 드롭존(레퍼런스 추가하기) — 실측 동값 착지. 실배선 유지:
                 누르면 OH의 첨부 선택기(onAttach)가 그대로 열린다. 모델이
                 레퍼런스 역할을 받지 않는 순간만 honest inert로 잠긴다. */
              <DropZone
                label="레퍼런스 추가하기"
                hint={
                  refFull
                    ? `가득 찼어요 (${refCount}/${refMax})`
                    : "이미지, 영상 또는 오디오"
                }
                disabled={refMax === 0}
                onOpen={() => onAttach("reference")}
              />
            )}
            <MediaStrip model={model} />

            {/* HF의 프롬프트 박스 — 실측: 레이블이 박 안에 절대 좌정(top3 left3),
                발(foot)에 요소/켬이 붙는다(실측 pad 8 12 12). */}
            <div className="ohf-gct-pblock">
              <div className="ohf-gct-pbox">
                <p className="ohf-gct-pbox-label">프롬프트</p>
                <textarea
                  className="ohf-gct-pbox-field"
                  aria-label="프롬프트"
                  placeholder="프롬프트를 입력하세요"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <div className="ohf-gct-pbox-foot">
                {generateAudio ? (
                  <span className="ohf-gct-pbox-group">
                    <button
                      type="button"
                      className="ohf-gct-el-btn"
                      aria-label="요소"
                      onClick={() => onSetting({ generateAudio: !audioOn })}
                    >
                      <HfElementIcon />
                      <span className="ohf-gct-el-label">요소</span>
                    </button>
                    <label className="ohf-gct-el-on" data-on={audioOn || undefined}>
                      <HfWaveIcon />
                      <span className="ohf-gct-el-state">{audioOn ? "켬" : "끔"}</span>
                      <input
                        type="checkbox"
                        className="ohf-gct-el-check"
                        aria-label={`오디오 ${audioOn ? "켬" : "끔"}`}
                        checked={audioOn}
                        onChange={() => onSetting({ generateAudio: !audioOn })}
                      />
                    </label>
                  </span>
                ) : (
                  /* honest inert — HF의 기하를 그대로 입되, 이 모델은 오디오
                     설정이 없어 두 발위젯 모두 잠긴다. */
                  <span className="ohf-gct-pbox-group">
                    <button
                      type="button"
                      className="ohf-gct-el-btn"
                      aria-label="요소"
                      aria-disabled="true"
                      data-off=""
                    >
                      <HfElementIcon />
                      <span className="ohf-gct-el-label">요소</span>
                    </button>
                    <span className="ohf-gct-el-on" aria-disabled="true" data-off="">
                      <HfWaveIcon />
                      <span className="ohf-gct-el-state">끔</span>
                    </span>
                  </span>
                )}
              </div>
            </div>

            {extendMode && (
              /* 방향 — 실측된 메뉴(CDP :9222 probe19: '방향 | 시퀄 | 끝난 뒤
                 이어가기 | 프리퀄 | 시작 앞부분 만들기'). 선택은 저장되어 버튼 값에
                 실표시된다. 실행 페이로드가 방향을 받는지는 미실측이므로 실행에는
                 얹지 않는다 — UI 실측분만 배선한다. */
              <div className="ohf-gct-direction">
                <button
                  type="button"
                  className="ohf-gct-direction-btn"
                  aria-label="방향"
                  aria-expanded={directionOpen}
                  data-state={directionOpen ? "open" : "closed"}
                  onClick={() => setDirectionOpen((v) => !v)}
                >
                  {direction}
                </button>
                {directionOpen && (
                  <div className="ohf-gct-direction-menu" role="menu" aria-label="방향">
                    {(["시퀄", "프리퀄"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        role="menuitemradio"
                        aria-checked={direction === opt}
                        className="ohf-gct-direction-item"
                        data-on={direction === opt || undefined}
                        onClick={() => {
                          setDirection(opt);
                          setDirectionOpen(false);
                        }}
                      >
                        <span className="ohf-gct-direction-label">{opt}</span>
                        <span className="ohf-gct-direction-hint">
                          {opt === "시퀄" ? "끝난 뒤 이어가기" : "시작 앞부분 만들기"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HF의 모델 트리거 — 실측 302x54, 라벨 12px white/.6 + 값 14px에
                브랜드 아이콘(노랑)이 값 뒤에 따라온다. */}
            <Dial label="모델" value={model.label} open={openMenu === "모델"} onOpen={setOpenMenu} hf>
              <ModelPanel
                activeId={model.id}
                onPick={(id) => {
                  onModel(id);
                  setOpenMenu(null);
                }}
              />
            </Dial>

            {/* HF의 설정 그리드 — grid-cols-2 gap-2, 셀 147x54(r12 white/5,
                라벨 위·값 아래 2단 + chevron 우). */}
            <div className="ohf-gct-grid">
              <Dial
                label="길이"
                value={`${curDuration}s`}
                open={openMenu === "길이"}
                onOpen={setOpenMenu}
                hf
              >
                <div className="ohf-gct-panel-title">총 길이</div>
                <div className="ohf-gct-chiprow">
                  <span className="ohf-gct-chip ohf-gct-chip--on">{curDuration}s</span>
                  {DURATION_PRESETS.filter((v) => v !== curDuration).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="ohf-gct-chip"
                      disabled={duration?.type !== "range" || v < duration.min || v > duration.max}
                      onClick={() => onSetting({ duration: v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {duration?.type === "range" && (
                  <input
                    type="range"
                    className="ohf-gct-range"
                    min={duration.min}
                    max={duration.max}
                    step={duration.step ?? 1}
                    value={curDuration}
                    onChange={(e) => onSetting({ duration: Number(e.target.value) })}
                  />
                )}
              </Dial>

              <Dial label="종횡비" value={curAspect} open={openMenu === "종횡비"} onOpen={setOpenMenu} hf>
                {aspect?.type === "enum" ? (
                  <div className="ohf-gct-chiprow">
                    {aspect.values.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="ohf-gct-chip"
                        data-on={v === curAspect || undefined}
                        onClick={() => onSetting({ aspectRatio: v })}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="ohf-gct-deferred">이 모델은 종횡비 설정을 받지 않습니다.</p>
                )}
              </Dial>

              <Dial label="품질" value={curResolution} open={openMenu === "품질"} onOpen={setOpenMenu} hf>
                {resolution?.type === "enum" ? (
                  <div className="ohf-gct-chiprow">
                    {resolution.values.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="ohf-gct-chip"
                        data-on={v === curResolution || undefined}
                        onClick={() => onSetting({ resolution: v })}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="ohf-gct-deferred">이 모델은 품질 선택을 받지 않습니다.</p>
                )}
              </Dial>

              <Dial
                label="비트레이트"
                value={BITRATE_LABEL[curBitrate]?.label ?? curBitrate}
                open={openMenu === "비트레이트"}
                onOpen={setOpenMenu}
                hf
              >
                {bitrate?.type === "enum" ? (
                  <div className="ohf-gct-chiprow ohf-gct-chiprow--stack">
                    {bitrate.values.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="ohf-gct-chip"
                        data-on={v === curBitrate || undefined}
                        onClick={() => onSetting({ bitrateMode: v })}
                      >
                        <span className="ohf-gct-chip-label">{BITRATE_LABEL[v]?.label ?? v}</span>
                        <span className="ohf-gct-chip-hint">{BITRATE_LABEL[v]?.hint ?? ""}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="ohf-gct-deferred">이 모델은 비트레이트 선택을 받지 않습니다.</p>
                )}
              </Dial>
            </div>
          </div>
        </div>
      </div>

      {/* HF의 발: 생성 CTA는 스크롤 밖 우하단 좌정 — 실측 302x48 r12 노랑
          rgb(209,254,23)에 글자 rgb(20,21,26) 16px/600, 크레딧 코인+숫자.
          크레딧 80은 HF Seedance 2.5에서 실측한 정적 수치다(이 앱의 과금이
          아님을 title로 밝힌다). 다른 모델은 HF 원본에서 코인이 렌더되지
          않아 함께 렌더하지 않는다. disabled 근사: HF의 disabled 관례는
          opacity-50이므로 같은 값으로 착지(정적 미러의 실측 근사). */}
      <div className="ohf-gct-foot">
        <button
          type="button"
          className="ohf-gct-cta"
          disabled={!prompt.trim() || !onGenerate}
          onClick={onGenerate}
        >
          <span className="ohf-gct-cta-label">생성하기</span>
          {model.id === "seedance-2.5" ? (
            <span className="ohf-gct-cta-credit" title="Higgsfield에서 실측한 크레딧 수 — 이 앱의 과금이 아닙니다">
              <HfCoin />
              <span className="ohf-gct-cta-num">80</span>
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

/* ---- 비디오 편집 body ---- */
function EditBody({
  model,
  values,
  onModel,
  onSetting,
  openMenu,
  setOpenMenu,
  onGenerate,
  tray,
  onAttach,
  onDraw,
  drawOpen,
}: {
  model: ModelEntry;
  values: Record<string, unknown>;
  onModel: (id: string) => void;
  onSetting: (patch: Record<string, unknown>) => void;
  openMenu: string | null;
  setOpenMenu: (next: string | null) => void;
  onGenerate?: () => void;
  tray: MediaTray;
  onAttach: (role: MediaRole) => void;
  onDraw: () => void;
  drawOpen: boolean;
}) {
  const prompt = useVideoPrompt((s) => s.text);
  const setPrompt = useVideoPrompt((s) => s.setText);
  const [mode, setMode] = useState<"프롬프트" | "그리기">("프롬프트");
  const resolution = model.settings.resolution;
  const bitrate = model.settings.bitrateMode;
  const curResolution = String(values.resolution ?? (resolution?.type === "enum" ? resolution.default : "1080p"));
  const curBitrate = String(values.bitrateMode ?? (bitrate?.type === "enum" ? bitrate.default : "high"));

  /* 모달이 닫히면 카드는 프롬프트 방식으로 돌아온다 — HF가 닫기(Escape 포함) 후에
     보여준 상태가 그것이다. */
  useEffect(() => {
    if (!drawOpen) setMode("프롬프트");
  }, [drawOpen]);

  return (
    <div className="ohf-gct-subtab-body ohf-gct-body--edit">
      <div className="ohf-gct-mode">
        {(["프롬프트", "그리기"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className="ohf-gct-mode-tab"
            data-on={m === mode || undefined}
            onClick={() => {
              setMode(m);
              if (m === "그리기") onDraw();
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "그리기" && drawOpen ? (
        <p className="ohf-gct-deferred">그리기 모달이 열려 있어요 — 모달을 닫으면 이 카드로 돌아옵니다.</p>
      ) : (
        <textarea
          className="ohf-gct-prompt-real"
          aria-label="프롬프트"
          placeholder="변경할 부분을 프롬프트로 설명하세요"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      )}

      {/* 첨비 슬롯 — 실첨부·실제 제거가 배선되었다. 라벨·힌트는 HF 실측. */}
      <AttachSlot
        role="video"
        label="편집할 영상 추가"
        hint="최대 30초"
        model={model}
        tray={tray}
        onOpen={onAttach}
      />
      <AttachSlot
        role="reference"
        label="요소 또는 레퍼런스 추가"
        hint="이미지 또는 오디오 최대 50개"
        model={model}
        tray={tray}
        onOpen={onAttach}
      />

      <div className="ohf-gct-grid ohf-gct-grid--2">
        <Dial label="모델" value={model.label} open={openMenu === "모델"} onOpen={setOpenMenu}>
          <ModelPanel
            activeId={model.id}
            onPick={(id) => {
              onModel(id);
              setOpenMenu(null);
            }}
          />
        </Dial>
        <Dial label="품질" value={curResolution} open={openMenu === "품질"} onOpen={setOpenMenu}>
          {resolution?.type === "enum" ? (
            <div className="ohf-gct-chiprow">
              {resolution.values.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="ohf-gct-chip"
                  data-on={v === curResolution || undefined}
                  onClick={() => onSetting({ resolution: v })}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : (
            <p className="ohf-gct-deferred">품질 선택 없음.</p>
          )}
        </Dial>
        <Dial
          label="비트레이트"
          value={BITRATE_LABEL[curBitrate]?.label ?? curBitrate}
          open={openMenu === "비트레이트"}
          onOpen={setOpenMenu}
        >
          {bitrate?.type === "enum" ? (
            <div className="ohf-gct-chiprow ohf-gct-chiprow--stack">
              {bitrate.values.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="ohf-gct-chip"
                  data-on={v === curBitrate || undefined}
                  onClick={() => onSetting({ bitrateMode: v })}
                >
                  <span className="ohf-gct-chip-label">{BITRATE_LABEL[v]?.label ?? v}</span>
                  <span className="ohf-gct-chip-hint">{BITRATE_LABEL[v]?.hint ?? ""}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="ohf-gct-deferred">비트레이트 선택 없음.</p>
          )}
        </Dial>
      </div>

      <button
        type="button"
        className="ohf-gct-generate"
        disabled={!prompt.trim() || !onGenerate}
        onClick={onGenerate}
      >
        생성하기
      </button>
    </div>
  );
}

/* ---- Motion Control body — HF의 모션 컨트롤 카드 ---- */
function MotionBody({
  model,
  values,
  onModel,
  onSetting,
  openMenu,
  setOpenMenu,
  onGenerate,
  tray,
  onAttach,
}: {
  model: ModelEntry;
  values: Record<string, unknown>;
  onModel: (id: string) => void;
  onSetting: (patch: Record<string, unknown>) => void;
  openMenu: string | null;
  setOpenMenu: (next: string | null) => void;
  onGenerate?: () => void;
  tray: MediaTray;
  onAttach: (role: MediaRole) => void;
}) {
  const prompt = useVideoPrompt((s) => s.text);
  const setPrompt = useVideoPrompt((s) => s.setText);
  const orientationField = model.settings.characterOrientation;
  const curOrientation = String(
    values.characterOrientation ?? orientationField?.default ?? "video",
  );
  /* The switch is HF's gate for choosing a background source. Its state mirrors
     the stored answer: "이미지 배경"(image) 켬, "모션 비디오 배경"(video) 끔. */
  const [sceneControl, setSceneControl] = useState(() => curOrientation === "image");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const resolution = model.settings.resolution;
  const curResolution = String(values.resolution ?? (resolution?.type === "enum" ? resolution.default : "720p"));

  const qualityHints: Record<string, string> = {
    "720p": "균형 잡힌 품질 • 초당 1.5 크레딧",
    "1080p": "더 높은 품질 • 초당 2.5 크레딧",
  };

  const toggleScene = (next: boolean) => {
    setSceneControl(next);
    /* 끄면 배경은 모션 비디오에서 온다 — 카탈로그의 기본값이 그 답변이다. */
    if (orientationField) onSetting({ characterOrientation: next ? curOrientation : "video" });
  };

  const pickSource = (source: "비디오" | "이미지") => {
    if (orientationField) onSetting({ characterOrientation: source === "비디오" ? "video" : "image" });
  };

  /* HF가 이 카드의 생성하기 옆에 붙였던 크레딧 수(실측 7). 모델이 그 실측의
     대상(Kling 3.0 Motion Control)일 때만 numbers가 보인다 — 다른 모델의 가격을
     지어내지 않는다. */
  const credit = model.id === "kling-3-motion-std" ? 7 : null;

  return (
    <div className="ohf-gct-subtab-body ohf-gct-body--motion">
      <figure className="ohf-gct-motion-hero">
        <span className="ohf-gct-motion-kicker">모션 컨트롤</span>
        <span className="ohf-gct-motion-desc">비디오 레퍼런스로 모션 제어하기</span>
      </figure>

      <AttachSlot
        role="video"
        label="복사할 모션 추가"
        hint="영상 길이: 3–30초"
        model={model}
        tray={tray}
        onOpen={onAttach}
      />
      <AttachSlot
        role="start"
        label="내 캐릭터 추가"
        hint="얼굴과 몸이 보이는 이미지"
        model={model}
        tray={tray}
        onOpen={onAttach}
      />

      <Dial label="모델" value={model.label} open={openMenu === "모델"} onOpen={setOpenMenu}>
        <ModelPanel
          activeId={model.id}
          onPick={(id) => {
            onModel(id);
            setOpenMenu(null);
          }}
        />
      </Dial>

      <Dial label="품질" value={curResolution} open={openMenu === "품질"} onOpen={setOpenMenu}>
        {resolution?.type === "enum" ? (
          <div className="ohf-gct-chiprow ohf-gct-chiprow--stack">
            {resolution.values.map((v) => (
              <button
                key={v}
                type="button"
                className="ohf-gct-chip"
                data-on={v === curResolution || undefined}
                onClick={() => onSetting({ resolution: v })}
              >
                <span className="ohf-gct-chip-label">{v}</span>
                <span className="ohf-gct-chip-hint">{qualityHints[v] ?? ""}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="ohf-gct-deferred">
            {model.id === "kling-3-motion-std" || model.id === "kling-3-motion-pro"
              ? "모션 컨트롤 모델은 품질 선택을 받지 않습니다(HF가 보여준 품질 값은 이 카탈로그에 없습니다)."
              : "품질 선택 없음."}
          </p>
        )}
      </Dial>

      {/* 장면 컨트롤 모드 — characterOrientation에 실배선된다. */}
      <div className="ohf-gct-scene">
        <div className="ohf-gct-scene-head">
          <span className="ohf-gct-scene-title">장면 컨트롤 모드</span>
          <button
            type="button"
            role="switch"
            aria-checked={sceneControl}
            aria-label="장면 컨트롤 모드"
            className="ohf-gct-toggle"
            data-off={!orientationField ? "" : undefined}
            aria-disabled={!orientationField ? "true" : undefined}
            title={!orientationField ? "이 모델은 배경 소스 선택을 받지 않습니다" : undefined}
            onClick={() => orientationField && toggleScene(!sceneControl)}
          >
            {orientationField ? (sceneControl ? " 켬" : " 끔") : "끔"}
          </button>
        </div>
        {sceneControl && orientationField && (
          <div className="ohf-gct-scene-body">
            <div className="ohf-gct-mode">
              {(["비디오", "이미지"] as const).map((m) => {
                const value = m === "비디오" ? "video" : "image";
                return (
                  <button
                    key={m}
                    type="button"
                    className="ohf-gct-mode-tab"
                    data-on={curOrientation === value || undefined}
                    onClick={() => pickSource(m)}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
            <p className="ohf-gct-scene-hint">
              배경을 캐릭터 이미지에서 가져올지, 모션 비디오에서 가져올지 선택해 주세요
            </p>
          </div>
        )}
      </div>

      <div className="ohf-gct-accordion">
        <button
          type="button"
          className="ohf-gct-accordion-head"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          고급 설정
        </button>
        {advancedOpen && (
          <div role="region" aria-label="고급 설정">
            <textarea
              className="ohf-gct-prompt-real"
              aria-label="고급 설정"
              placeholder={'배경과 장면 디테일을 설명해 주세요. 예: "코기가 달려 들어와요" 또는 "눈 내린 공원 배경". 모션은 레퍼런스 비디오로 제어돼요'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="ohf-gct-deferred">
              이 텍스트는 프롬프트로 저장되어 실제 생성 페이로드에 들어갑니다.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        className="ohf-gct-generate"
        disabled={!prompt.trim() || !onGenerate}
        onClick={onGenerate}
      >
        생성하기
        {credit !== null && (
          <span
            className="ohf-gct-generate-credit"
            title="Higgsfield에서 실측한 크레딧 수 — 이 앱의 과금이 아닙니다"
          >
            {credit}
          </span>
        )}
      </button>
    </div>
  );
}

/* ---- 오디오 body — HF 원부재, OH 실제 모델의 설정만 ---- */
function AudioBody({
  model,
  values,
  onModel,
  onSetting,
  openMenu,
  setOpenMenu,
  onGenerate,
}: {
  model: ModelEntry;
  values: Record<string, unknown>;
  onModel: (id: string) => void;
  onSetting: (patch: Record<string, unknown>) => void;
  openMenu: string | null;
  setOpenMenu: (next: string | null) => void;
  onGenerate?: () => void;
}) {
  const prompt = useAudioPrompt((s) => s.text);
  const setPrompt = useAudioPrompt((s) => s.setText);
  const duration = settingOf(model, "duration");
  const cfg = settingOf(model, "cfg");
  const curDuration = Number(values.duration ?? (duration?.type === "range" ? duration.default : 10));

  return (
    <div className="ohf-gct-subtab-body ohf-gct-body--make">
      <p className="ohf-gct-deferred">
        HF의 중첩 오디오 create 도구는 실측 결과 존재하지 않습니다(정직 marking). 아래는 OH의 실제
        오디오 모델 설정입니다.
      </p>
      <textarea
        className="ohf-gct-prompt-real"
        aria-label="프롬프트"
        placeholder="오디오 설명을 입력하세요"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <Dial label="모델" value={model.label} open={openMenu === "모델"} onOpen={setOpenMenu}>
        <div className="ohf-gct-model-head">오디오 모델</div>
        <div className="ohf-gct-model-list">
          {MODELS.filter((m) => m.surface === "audio").map((m) => (
            <button
              key={m.id}
              type="button"
              className="ohf-gct-model-item"
              data-on={m.id === model.id || undefined}
              onClick={() => {
                onModel(m.id);
                setOpenMenu(null);
              }}
            >
              <span className="ohf-gct-model-name">{m.label}</span>
              <span className="ohf-gct-model-meta" />
            </button>
          ))}
        </div>
      </Dial>
      <div className="ohf-gct-grid ohf-gct-grid--2">
        <Dial label="길이" value={`${curDuration}s`} open={openMenu === "길이"} onOpen={setOpenMenu}>
          <div className="ohf-gct-panel-title">총 길이</div>
          {duration?.type === "range" && (
            <input
              type="range"
              className="ohf-gct-range"
              min={duration.min}
              max={duration.max}
              step={duration.step ?? 1}
              value={curDuration}
              onChange={(e) => onSetting({ duration: Number(e.target.value) })}
            />
          )}
        </Dial>
        <Dial label="CFG" value={String(values.cfg ?? (cfg?.type === "range" ? cfg.default : 1.7))} open={openMenu === "CFG"} onOpen={setOpenMenu}>
          {cfg?.type === "range" && (
            <input
              type="range"
              className="ohf-gct-range"
              min={cfg.min}
              max={cfg.max}
              step={cfg.step ?? 0.1}
              value={Number(values.cfg ?? cfg.default)}
              onChange={(e) => onSetting({ cfg: Number(e.target.value) })}
            />
          )}
        </Dial>
      </div>
      <button
        type="button"
        className="ohf-gct-generate"
        disabled={!prompt.trim() || !onGenerate}
        onClick={onGenerate}
      >
        생성하기
      </button>
    </div>
  );
}

/* ---- the fullscreen Draw modal, HF's dialog mirrored ---- */
type DrawTab = "Draw to Video" | "Draw to Edit";
type DrawTool = "선택" | "펜" | "지우개" | "도형" | "마커" | "텍스트";

/* HF의 생성하기 크레딧 병기(실측: Draw to Video 64, Draw to Edit 65). Higgsfield의
   가격이지 이 앱의 과금이 아니다 — 병기하는 자리가 실측 본뜬 자리이므로 실측 값을
   싣고, 그 출처를 title로 말한다. */
const DRAW_CREDITS: Record<DrawTab, number> = {
  "Draw to Video": 64,
  "Draw to Edit": 65,
};

const DRAW_TOOLS: readonly { id: DrawTool; glyph: string }[] = [
  { id: "선택", glyph: "⬚" },
  { id: "펜", glyph: "✎" },
  { id: "지우개", glyph: "⌦" },
  { id: "도형", glyph: "▢" },
  { id: "마커", glyph: "◆" },
];

/* HF의 시간 형식 실측(CDP :9222 probe16/17/18): 표준 = 초를 반올림한 mm:ss
   (1.55초에 "00:02", 4.049초에 "00:04"), 타임코드 = HH:MM:SS:FFF(1.55초에
   "00:00:01:550", 4.049초에 "00:00:04:049"). 형식 선택은 탭을 넘어 유지된다
   (HF는 이 브라우저에서 재진입 후에도 타임코드를 기억했다). */
type DrawClockFormat = "표준" | "타임코드";

const CLOCK_FORMAT_KEY = "ohf-gct-draw-clock-format";

function readClockFormat(): DrawClockFormat {
  try {
    return window.localStorage.getItem(CLOCK_FORMAT_KEY) === "타임코드" ? "타임코드" : "표준";
  } catch {
    return "표준";
  }
}

function drawClock(seconds: number, format: DrawClockFormat): string {
  const t = Math.max(0, seconds || 0);
  if (format === "표준") {
    const r = Math.round(t);
    const m = Math.floor(r / 60);
    const s = r % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(t / 3600);
  const m = Math.floor(t / 60) % 60;
  const s = Math.floor(t) % 60;
  const f = Math.round((t - Math.floor(t)) * 1000);
  return (
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")}:${String(f).padStart(3, "0")}`
  );
}

function DrawModal({
  model,
  onModel,
  onClose,
  onAttach,
  clipUrl,
  tray,
  onGenerate,
  onPickCanvasImage,
  canvasImage,
  onImageApplied,
}: {
  model: ModelEntry;
  onModel: (id: string) => void;
  onClose: () => void;
  onAttach: (role: MediaRole) => void;
  clipUrl: string | null;
  tray: MediaTray;
  onGenerate?: () => void;
  onPickCanvasImage?: () => void;
  canvasImage?: string | null;
  onImageApplied?: () => void;
}) {
  const prompt = useVideoPrompt((s) => s.text);
  const setPrompt = useVideoPrompt((s) => s.setText);
  const [tab, setTab] = useState<DrawTab>("Draw to Edit");
  const [tool, setTool] = useState<DrawTool>("펜");
  const [modelOpen, setModelOpen] = useState(false);
  /* 그리기가 한 번이라도 착지했는지 — 생성하기의 활성화 조건이 이것이다(HF에서
     생성하기는 stroke가 실등록되기 전까지 비활성이었다는 것까지 실측으로 확인됐다). */
  const [painted, setPainted] = useState(false);
  const [sending, setSending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [clock, setClock] = useState({ now: 0, total: 0 });
  const [clockFormat, setClockFormat] = useState<DrawClockFormat>(readClockFormat);
  const [formatOpen, setFormatOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  /* 메뉴 선택은 형식을 바꾸고 이 브라우저에 기억된 뒤 메뉴를 닫는다(HF의
     menuitemcheckbox 선택 후 메뉴가 사라지는 것을 실측으로 확인했다). */
  function applyClockFormat(next: DrawClockFormat) {
    setClockFormat(next);
    setFormatOpen(false);
    try {
      window.localStorage.setItem(CLOCK_FORMAT_KEY, next);
    } catch {
      /* 기억할 수 없는 브라우저라도 형식 전환 자체는 동작한다. */
    }
  }
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /* 도형은 드래그 전체에서 하나의 사각형이어야 한다: 포인터가 움직일 때마다 그리기
     전의 이미지를 복원하고 그 위에 현재의 사각형만 다시 그린다. */
  const snapshot = useRef<ImageData | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* The canvas is the stage: it keeps the stage's pixel size so a stroke lands
     where the pointer is, whether or not a clip is playing under it. */
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const fit = () => {
      canvas.width = Math.max(1, Math.round(stage.clientWidth));
      canvas.height = Math.max(1, Math.round(stage.clientHeight));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  /* A new clip resets the player's own clock. */
  useEffect(() => {
    setPlaying(false);
    setClock({ now: 0, total: 0 });
  }, [clipUrl]);

  /* 이미지 추가하기 실측(CDP :9222 probe18): 선택기에서 썸네일을 누르면
     이미지가 캔버스 비트맵에 착지한다(첫 캔버스 painted 0 → 155,052px —
     세로 사진이 캔버스 높이 전체를 채우고 좌우가 남는 29.8% 담기(contain)
     중앙 착지와 실측이 일치한다). 골라진 URL은 캔버스 안에 담기 중앙으로
     얹히고, 얹힌 것은 stroke와 같은 실像素이 되어 생성하기의 요건을 채운다. */
  useEffect(() => {
    if (!canvasImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      onImageApplied?.();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      ctx.drawImage(
        img,
        Math.round((canvas.width - w) / 2),
        Math.round((canvas.height - h) / 2),
        w,
        h,
      );
      setPainted(true);
      onImageApplied?.();
    };
    img.onerror = () => onImageApplied?.();
    img.src = canvasImage;
  }, [canvasImage, onImageApplied]);

  function pointOf(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = pointOf(event);
    if (!canvas || !ctx || !point) return;
    if (tool === "선택") return;
    canvas.setPointerCapture(event.pointerId);
    if (tool === "텍스트") {
      const text = prompt.trim();
      if (!text) return;
      ctx.save();
      ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillStyle = "#f1f1f1";
      ctx.fillText(text.slice(0, 160), point.x, point.y);
      ctx.restore();
      if (!painted) setPainted(true);
      return;
    }
    dragging.current = true;
    origin.current = point;
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "지우개") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 24;
    } else if (tool === "마커") {
      ctx.lineWidth = 18;
      ctx.strokeStyle = "rgba(240,240,240,0.35)";
    } else if (tool === "도형") {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#f1f1f1";
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#f1f1f1";
    }
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!dragging.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = pointOf(event);
    if (!canvas || !ctx || !point || !origin.current) return;
    if (tool === "도형") {
      if (snapshot.current) ctx.putImageData(snapshot.current, 0, 0);
      ctx.strokeRect(
        origin.current.x,
        origin.current.y,
        point.x - origin.current.x,
        point.y - origin.current.y,
      );
      return;
    }
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const wasDragging = dragging.current;
    if (ctx) ctx.restore();
    dragging.current = false;
    origin.current = null;
    snapshot.current = null;
    if (wasDragging && tool !== "선택" && tool !== "지우개" && !painted) setPainted(true);
    if (canvas && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPainted(false);
  };

  /* 그리기 결과가 plane에 얹힐 자리. HF의 draw 실행은 클립 위에 그린 것을 실행의
     media로 보낸다(그리기에 진입하면 실측 href가 ?image-inpaint=true로 옮겨간다).
     이 앱에서 그 자리는 모델의 reference role이다 — 편집 모델은 레퍼런스를 30장
     받는다. 모델이 reference를 받지 않으면 실행에 얹을 자리가 없으므로 생성하기는
     정직하게 비활성으로 남는다(그리는 것까지는 막지 않는다). */
  const drawRole: MediaRole | null = model.roles.reference ? "reference" : null;
  const roleMax = drawRole ? (model.roles[drawRole] ?? 0) : 0;
  const roleCount = drawRole ? tray.items.filter((item) => item.role === drawRole).length : 0;
  const roleFull = Boolean(drawRole) && roleCount >= roleMax;

  const canGenerate =
    Boolean(painted && prompt.trim() && drawRole && !roleFull && onGenerate) && !sending;

  const blockReason = sending
    ? "그림을 plane에 올리는 중…"
    : !painted
      ? "캔버스에 먼저 그립니다 — 그려진 것이 실행의 그림이 됩니다."
      : !prompt.trim()
        ? "설명을 적어요 — 이 설명이 실행의 프롬프트가 됩니다."
        : roleFull
          ? `레퍼런스가 가득 찼어요 (${roleCount}/${roleMax})`
          : drawRole
            ? undefined
            : "이 모델은 레퍼런스를 받지 않아 그리기를 실행에 얹을 자리가 없어요";

  /* 실행의 순서: 캔버스 PNG → 같은 upload 경로로 data URI → reference role로
     plane에 얹힘 → 모달 설명은 이미 useVideoPrompt에 들어 있으므로 카드와 같은
     생성하기가 그대로 실행을 태운다. */
  async function submitDraw() {
    const canvas = canvasRef.current;
    if (!canvas || !drawRole || sending || !onGenerate) return;
    setSending(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;
      const url = await tray.put(drawRole, blob, "draw.png");
      if (!url) return;
      onGenerate();
      onClose();
    } finally {
      setSending(false);
    }
  }

  const togglePlay = () => {
    const element = videoRef.current;
    if (!element || !clipUrl) return;
    if (element.paused) {
      element
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      element.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const element = videoRef.current;
    if (!element || !clipUrl) return;
    const next = !element.muted;
    element.muted = next;
    setMuted(next);
  };

  const seekTo = (seconds: number) => {
    const element = videoRef.current;
    if (!element || !clipUrl) return;
    element.currentTime = seconds;
  };

  const rangeMax = clock.total > 0 ? clock.total : 0.1;

  return (
    <div
      className="ohf-gct-draw"
      role="dialog"
      aria-label="Draw To Edit"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ohf-gct-draw-box">
        <header className="ohf-gct-draw-head">
          <h2 className="ohf-gct-draw-title">Draw To Edit</h2>
          <div className="ohf-gct-draw-tabs" role="tablist" aria-label="그리기 방식">
            {(["Draw to Video", "Draw to Edit"] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                className="ohf-gct-draw-tab"
                aria-selected={tab === name}
                data-active={tab === name || undefined}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <button type="button" className="ohf-gct-draw-close" aria-label="닫기" onClick={onClose}>
            <CloseIcon size={14} />
          </button>
        </header>

        <div className="ohf-gct-draw-stage" ref={stageRef}>
          {clipUrl ? (
            <video
              ref={videoRef}
              className="ohf-gct-draw-video"
              src={clipUrl}
              muted={muted}
              playsInline
              onTimeUpdate={(event) =>
                setClock({
                  now: event.currentTarget.currentTime,
                  total: event.currentTarget.duration || 0,
                })
              }
              onLoadedMetadata={(event) => {
                /* Read the value while the event still holds its target: React
                   clears currentTarget once dispatch ends, and a lazy updater
                   would run after that and find null. */
                const total = event.currentTarget.duration || 0;
                setClock((current) => ({ ...current, total }));
              }}
              onEnded={() => setPlaying(false)}
            />
          ) : (
            <p className="ohf-gct-draw-noclip">
              편집할 영상이 없어요 — 카드로 돌아가 &quot;편집할 영상 추가&quot;로 붙이면 여기에 재생돼요
            </p>
          )}
          <canvas
            ref={canvasRef}
            className="ohf-gct-draw-canvas"
            aria-label="캔버스"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>

        <div className="ohf-gct-draw-player">
          <button
            type="button"
            className="ohf-gct-draw-ctl"
            aria-label="동영상 재생"
            disabled={!clipUrl}
            data-off={!clipUrl ? "" : undefined}
            aria-pressed={playing}
            onClick={togglePlay}
          >
            {playing ? "❙❙" : <PlayIcon size={16} />}
          </button>
          <button
            type="button"
            className="ohf-gct-draw-ctl"
            aria-label="영상 음소거"
            disabled={!clipUrl}
            data-off={!clipUrl ? "" : undefined}
            aria-pressed={!muted}
            onClick={toggleMute}
          >
            <AudioIcon size={16} />
          </button>
          <span className="ohf-gct-draw-fmwrap">
            <button
              type="button"
              className="ohf-gct-draw-ctl"
              aria-label="시간 형식"
              aria-expanded={formatOpen}
              onClick={() => setFormatOpen((v) => !v)}
            >
              <FormatIcon size={16} />
            </button>
            {formatOpen && (
              /* 실측 메뉴(CDP :9222 probe16/17): 두 menuitemcheckbox —
                 '표준 | 1:23'(선택 시 체크)과 '타임코드 | 00:01:23:456'.
                 라벨·예시 문자열은 HF 실측 그대로다. */
              <div className="ohf-gct-draw-formatmenu" role="menu" aria-label="시간 형식">
                {(["표준", "타임코드"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={clockFormat === opt}
                    className="ohf-gct-draw-formatitem"
                    data-on={clockFormat === opt || undefined}
                    onClick={() => applyClockFormat(opt)}
                  >
                    <span className="ohf-gct-draw-format-label">{opt}</span>
                    <span className="ohf-gct-draw-format-sample">
                      {opt === "표준" ? "1:23" : "00:01:23:456"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </span>
          <span className="ohf-gct-draw-clock">
            {drawClock(clock.now, clockFormat)}
            <span className="ohf-gct-draw-clock-sep" aria-hidden>
              /
            </span>
            {drawClock(clock.total, clockFormat)}
          </span>
          <input
            type="range"
            className="ohf-gct-draw-range"
            aria-label="프레임 타임스탬프"
            min={0}
            max={rangeMax}
            step={0.1}
            value={Math.min(clock.now, rangeMax)}
            disabled={!clipUrl}
            onChange={(event) => seekTo(Number(event.target.value))}
          />
        </div>

        <div className="ohf-gct-draw-tools" role="toolbar" aria-label="캔버스 도구">
          {DRAW_TOOLS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="ohf-gct-draw-tool"
              aria-label={entry.id}
              aria-pressed={tool === entry.id}
              data-on={tool === entry.id || undefined}
              onClick={() => setTool(entry.id)}
            >
              <span aria-hidden>{entry.glyph}</span>
            </button>
          ))}
          <button
            type="button"
            className="ohf-gct-draw-tool"
            aria-label="이미지 추가하기"
            title="캔버스에 얹을 이미지를 고릅니다"
            onClick={onPickCanvasImage}
          >
            <span aria-hidden>▣</span>
          </button>
          <button
            type="button"
            className="ohf-gct-draw-tool"
            aria-label="텍스트"
            aria-pressed={tool === "텍스트"}
            data-on={tool === "텍스트" || undefined}
            onClick={() => setTool("텍스트")}
          >
            <span aria-hidden>T</span>
          </button>
          <button
            type="button"
            className="ohf-gct-draw-tool"
            aria-label="레퍼런스 이미지 추가"
            onClick={() => onAttach("reference")}
          >
            <span aria-hidden>＋</span>
          </button>
          <button
            type="button"
            className="ohf-gct-draw-tool"
            aria-label="Canvas 지우기"
            onClick={clearCanvas}
          >
            <span aria-hidden>⌫</span>
          </button>
        </div>

        <div className="ohf-gct-draw-foot">
          <div className="ohf-gct-draw-model">
            <button
              type="button"
              className="ohf-gct-dial-btn"
              aria-label="모델 선택"
              aria-expanded={modelOpen}
              data-active={modelOpen || undefined}
              onClick={() => setModelOpen(!modelOpen)}
            >
              <span className="ohf-gct-dial-value">{model.label}</span>
            </button>
            {modelOpen && (
              <div className="ohf-gct-draw-model-pop" role="region" aria-label="모델 선택 리스트">
                <ModelPanel
                  activeId={model.id}
                  onPick={(id) => {
                    onModel(id);
                    setModelOpen(false);
                  }}
                />
              </div>
            )}
          </div>
          <textarea
            className="ohf-gct-draw-note"
            aria-label="편집 내용 설명하기"
            placeholder="편집 내용 설명하기"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <button
            type="button"
            className="ohf-gct-generate"
            disabled={!canGenerate}
            data-off={!canGenerate ? "" : undefined}
            aria-disabled={!canGenerate ? "true" : undefined}
            title={blockReason}
            onClick={() => void submitDraw()}
          >
            생성하기
            <span
              className="ohf-gct-generate-credit"
              title="Higgsfield에서 실측한 크레딧 수 — 이 앱의 과금이 아닙니다"
            >
              {DRAW_CREDITS[tab]}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function GeneralCreateTabs({
  surface,
  model,
  values,
  onModel,
  onSetting,
  selection,
  error,
  onError,
  notice,
  onGenerate,
  history,
}: Props) {
  const subtabs: MenuSet = surface === "audio" ? ["오디오 만들기"] : VIDEO_SUBTABS;
  const [active, setActive] = useState<string>(subtabs[0]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [pickerRole, setPickerRole] = useState<MediaRole | null>(null);
  const [pickForCanvas, setPickForCanvas] = useState(false);
  const [canvasImage, setCanvasImage] = useState<string | null>(null);
  const [drawOpen, setDrawOpen] = useState(false);

  /* The tray is the shell's, not the composer's: on the video and audio surfaces
     this card replaced the dock, so the attach machinery has to live here too. */
  const reportError = useCallback(
    (message: string | null) => {
      onError?.(message);
    },
    [onError],
  );
  const tray = useMediaTray(model, reportError);

  /* The draw modal plays the clip this card holds — the same video role the plane
     would carry, read from the store the tray writes into. */
  const clipUrl = useVideoMedia((state) =>
    model.roles.video ? (state.items.find((item) => item.role === "video")?.url ?? null) : null,
  );

  /* 서브탭을 옮기면 열려 있던 패널은 닫힌다 — HF도 다른 카드로 넘어가면 이전
     dropdown을 유지하지 않는다. 그리고 모델이 그 카드의 family에 맞지 않으면
     family의 기본값으로 옮겨한다(HF는 카드마다 그 카드의 모델을 보여준다). */
  const switchTab = (next: string) => {
    setActive(next);
    setOpenMenu(null);
    const want = TAB_FAMILY[next];
    if (want && familyOf(model) !== want) onModel(FAMILY_DEFAULT[want]);
  };

  const openPicker = useCallback((role: MediaRole) => {
    setPickerRole(role);
    setOpenMenu(null);
  }, []);

  const closePicker = useCallback(() => {
    setPickerRole(null);
    setPickForCanvas(false);
  }, []);

  /* 캔버스에 얹을 이미지를 고르는 자리. HF의 이미지 추가하기는 캔버스 위에
     이미지를 얹는 선택기를 연다(:9222 실측) — 이 앱의 선택기(AssetPicker)를
     이미지货架(reference)로 열고, 골라진 URL을 캔버스 착지 경로로 넘긴다. */
  const openCanvasImage = useCallback(() => {
    setPickerRole("reference");
    setPickForCanvas(true);
    setOpenMenu(null);
  }, []);

  const body =
    surface === "audio" ? (
      <AudioBody
        model={model}
        values={values}
        onModel={onModel}
        onSetting={onSetting}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        onGenerate={onGenerate}
      />
    ) : active === "비디오 편집" ? (
      <EditBody
        model={model}
        values={values}
        onModel={onModel}
        onSetting={onSetting}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        onGenerate={onGenerate}
        tray={tray}
        onAttach={openPicker}
        onDraw={() => setDrawOpen(true)}
        drawOpen={drawOpen}
      />
    ) : active === "Motion Control" ? (
      <MotionBody
        model={model}
        values={values}
        onModel={onModel}
        onSetting={onSetting}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        onGenerate={onGenerate}
        tray={tray}
        onAttach={openPicker}
      />
    ) : (
      <MakeBody
        model={model}
        values={values}
        onModel={onModel}
        onSetting={onSetting}
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        onGenerate={onGenerate}
        tray={tray}
        onAttach={openPicker}
      />
    );

  return (
    <div className="ohf-gct" data-surface={surface}>
      <style data-ohf-gct>{generalCreateTabsStyle}</style>

      {/* The file input the tray opens once a slot decides which role the next
          file takes. Hidden until a press asks for it. */}
      {tray.input}

      {notice}

      {error && (
        <div className="ohf-gct-alert" role="alert">
          <span className="ohf-gct-alert-text">{error}</span>
          <button
            type="button"
            className="ohf-gct-alert-close"
            aria-label="Dismiss error"
            onClick={() => onError?.(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="ohf-gct-lay">
        {/* HF의 서브탭 스트립 — 카드 최상단, 수평 탭 + 하단 border indicator.
            HF measured: flex row at the top of the left column, h=48,
            each tab a border-b-2 underline. */}
        <div
          className="ohf-gct-rail ohf-gct-subtab-strip"
          role="tablist"
          aria-label={surface === "audio" ? "오디오 만들기 탭" : "비디오 만들기 탭"}
          aria-orientation="horizontal"
        >
          {subtabs.map((t) => {
            const on = active === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                className="ohf-gct-subtab"
                aria-selected={on}
                data-active={on || undefined}
                onClick={() => switchTab(t)}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="ohf-gct-subtab-panels">
          {/* Attached inputs first — the frames read before the words do.
              단, 만들기 흐름은 예외: HF의 실측 위계에서 첨부는 레퍼런스
              영역(드롭존 바로 아래)에 붙으므로 MediaStrip이 MakeBody 패널
              안에 자체 렌더된다(중복을 막기 위해 여기서 생략). 편집·
              Motion·오디오 흐름은 HF의 첨부 위치가 이 런에서 미실측이라
              기존 배치를 유지한다. */}
          {surface === "audio" || active !== "비디오 만들기" ? <MediaStrip model={model} /> : null}
          {body}
        </div>
      </div>

      {/* 복선: 선택 툴바는 피드에서 무엇을 골랐는지 말한다 — 도커가 사라져도
          그 신호는 살아있어야 한다(HF처럼 선택 중에는 아래를 덮는다). */}
      {selection}

      {pickerRole && (
        <AssetPicker
          model={model}
          items={tray.items}
          uploads={tray.uploads}
          history={history}
          staged={tray.staged}
          uploading={tray.uploading}
          initialRole={pickerRole}
          onUpload={tray.begin}
          onApply={(role, urls) => {
            if (pickForCanvas) {
              const url = urls.length ? urls[urls.length - 1] : "";
              setPickForCanvas(false);
              setPickerRole(null);
              setCanvasImage(url || null);
              return;
            }
            tray.apply(role, urls);
          }}
          onForget={tray.forget}
          onClose={closePicker}
        />
      )}

      {drawOpen && (
        <DrawModal
          model={model}
          onModel={onModel}
          onClose={() => setDrawOpen(false)}
          onAttach={openPicker}
          clipUrl={clipUrl}
          tray={tray}
          onGenerate={onGenerate}
          onPickCanvasImage={openCanvasImage}
          canvasImage={canvasImage}
          onImageApplied={() => setCanvasImage(null)}
        />
      )}
    </div>
  );
}

/* ---- co-located, cascade-isolated styles ---- */
export const generalCreateTabsStyle = `
/* t_ce2cf50b / t_b8a39dd7 — HF's column layout: the create shell fills the
   left column in-flow (not an absolute overlay). Subtabs sit at the top as
   horizontal tabs with bottom-border indicators (HF measured: flex row,
   border-b-2, h=48). The body flows below in a single vertical stack. */
.ohf-gct{
  position:static;
  display:flex; flex-direction:column; gap:.5rem;
  width:100%; box-sizing:border-box;
  color:var(--tx);
  font-size:14px; font-weight:500;
}
.ohf-gct-lay{ display:flex; flex-direction:column; align-items:stretch; gap:0; flex:1; min-width:0; }
/* t_edb910c3 실측: HF의 스트립→콘텐츠 간격은 0(y93에서 콘텐츠가 바로 시작,
   콘텐츠 좌측은 판의 p-2로 x25). 단 편집·Motion·오디오 흐름의 첨부와 바디
   자리는 HF에서 미실측이라 기존 시각적 등가(스트립 아래 12px)를 margin으로
   유지한다 — lay의 gap을 0으로 낮추는 대신 여기서 되돌린다. */
.ohf-gct-subtab-panels > .ohf-strip{ margin-top:.75rem; }
/* the subtab strip — HF's horizontal tabs with bottom-border indicator.
   HF live 재실측(:9222, 2026-11-04): strip pad 12px 16px 0, gap 12px,
   overflow-x auto, border 없음; 탭 pad 0, h36(=14px/500 라인), 활성
   언더라인 2px WHITE, 비활성 color rgba(255,255,255,.6)·언더라인 투명. */
.ohf-gct-subtab-strip,.ohf-gct-rail{
  display:flex;
  flex-direction:row; align-items:flex-start; gap:12px;
  width:100%; align-self:stretch;
  background:transparent; border:0; border-bottom:0;
  border-radius:0; padding:12px 16px 0;
  overflow-x:auto; scrollbar-width:none;
}
.ohf-gct-subtab{
  appearance:none; cursor:pointer; border:0; background:transparent;
  color:rgba(255, 255, 255, .6); font:inherit; padding:0; border-radius:0;
  border-bottom:2px solid transparent;
  text-align:left; width:auto; height:36px; white-space:nowrap;
  transition:border-color .15s,color .15s;
}
.ohf-gct-subtab[data-active]{
  background:transparent; color:rgb(255, 255, 255);
  border-bottom-color:rgb(255, 255, 255);
}
.ohf-gct-subtab-panels{ flex:1; min-width:0; width:auto; display:flex; flex-direction:column; gap:.5rem; }
.ohf-gct-subtab-body{
  display:flex; flex-direction:column; gap:.6rem;
  background:var(--s3); border:1px solid var(--line);
  border-radius:14px; padding:.75rem;
}
.ohf-gct-mode{
  display:inline-flex; gap:.2rem; align-items:center; align-self:flex-start;
  background:var(--s3); border:1px solid var(--line); border-radius:12px; padding:.2rem;
}
.ohf-gct-mode-tab{
  appearance:none; cursor:pointer; border:0; background:transparent; font:inherit;
  color:var(--tx3); padding:.3rem .8rem; border-radius:9px;
}
.ohf-gct-mode-tab[data-on]{ background:var(--accent-08); color:var(--accent); }
.ohf-gct-mode-tab[data-off]{ cursor:not-allowed; }
.ohf-gct-mode[data-off] .ohf-gct-mode-tab{ cursor:not-allowed; }
.ohf-gct-direction{ position:relative; }
.ohf-gct-direction-btn{
  appearance:none; cursor:pointer; font:inherit; border-radius:8px; min-width:64px;
  background:var(--s3); border:1px solid var(--line-2); color:var(--tx2);
  padding:.25rem .7rem;
}
.ohf-gct-direction-menu{
  position:absolute; z-index:6; top:calc(100% + 4px); left:0; min-width:190px;
  background:var(--s2); border:1px solid var(--line); border-radius:12px;
  padding:.3rem; display:flex; flex-direction:column; gap:.2rem;
  box-shadow:0 12px 32px rgba(0,0,0,.35);
}
.ohf-gct-direction-item{
  appearance:none; cursor:pointer; font:inherit; text-align:left;
  background:transparent; border:0; border-radius:8px; padding:.4rem .5rem;
  color:var(--tx2); display:flex; flex-direction:column; gap:.1rem;
}
.ohf-gct-direction-item:hover{ background:var(--s3); color:var(--tx); }
.ohf-gct-direction-item[data-on]{ background:var(--accent-08); color:var(--accent); }
.ohf-gct-direction-label{ font-weight:600; color:var(--tx); }
.ohf-gct-direction-hint{ color:var(--tx3); font-size:11px; }
.ohf-gct-prompt-real{
  width:100%; min-height:64px; resize:vertical; box-sizing:border-box;
  background:var(--s1); border:1px solid var(--line); border-radius:12px;
  color:var(--tx); font:inherit; padding:.5rem .65rem;
}
.ohf-gct-prompt-real::placeholder{ color:var(--tx3); }
.ohf-gct-element{ display:flex; align-items:center; gap:.5rem; }
.ohf-gct-toggle{
  appearance:none; cursor:pointer; font:inherit; border-radius:8px;
  background:var(--s3); border:1px solid var(--line-2); color:var(--tx2);
  padding:.25rem .7rem; min-width:52px;
}
.ohf-gct-toggle[aria-checked="true"]{ background:var(--accent-08); color:var(--accent); border-color:var(--accent); }
.ohf-gct-toggle[data-off]{ cursor:not-allowed; }
.ohf-gct-element-hint{ color:var(--tx3); font-size:12px; }
.ohf-gct-slot{
  appearance:none; font:inherit; cursor:pointer; text-align:center;
  display:flex; flex-direction:column; align-items:center; gap:.2rem;
  background:transparent;
  border:1px dashed var(--line-2); border-radius:14px; padding:.8rem;
  color:var(--tx2);
}
.ohf-gct-slot:hover{ border-color:var(--accent); color:var(--tx); }
.ohf-gct-slot[disabled]{ opacity:.45; cursor:not-allowed; }
.ohf-gct-slot--off{ opacity:.55; cursor:not-allowed; }
.ohf-gct-slot-hint{ color:var(--tx3); font-size:12px; }
.ohf-gct-slot-count{
  color:var(--accent); font-size:11px; font-variant-numeric:tabular-nums;
}
.ohf-gct-dial{ display:flex; flex-direction:column; gap:.35rem; }
.ohf-gct-dial-btn{
  appearance:none; cursor:pointer; font:inherit; width:100%;
  display:flex; align-items:center; justify-content:space-between; gap:.5rem;
  background:var(--s3); border:1px solid var(--line-2); color:var(--tx2);
  padding:.45rem .7rem; border-radius:11px; min-height:54px;
}
.ohf-gct-dial-btn[data-active]{ border-color:var(--accent); color:var(--tx); }
.ohf-gct-dial-name{ color:var(--tx3); font-size:12px; }
.ohf-gct-dial-value{ color:var(--tx); font-weight:600; }
.ohf-gct-dial-panel{
  display:flex; flex-direction:column; gap:.4rem;
  background:var(--s1); border:1px solid var(--line); border-radius:12px; padding:.6rem;
}
.ohf-gct-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.5rem; }
.ohf-gct-grid--2{ grid-template-columns:1fr 1fr; }
.ohf-gct-panel-title{ font-weight:700; color:var(--tx); }
.ohf-gct-chiprow{ display:flex; gap:.4rem; flex-wrap:wrap; }
.ohf-gct-chiprow--stack{ flex-direction:column; }
.ohf-gct-chip{
  appearance:none; cursor:pointer; font:inherit; text-align:left;
  display:inline-flex; flex-direction:column; align-items:flex-start; gap:.1rem;
  padding:.3rem .6rem; border-radius:8px;
  background:var(--s3); border:1px solid var(--line); color:var(--tx2);
}
.ohf-gct-chip[data-on]{ background:var(--accent-08); color:var(--accent); border-color:var(--accent); }
.ohf-gct-chip[disabled]{ opacity:.4; cursor:not-allowed; }
.ohf-gct-chip-label{ font-weight:600; }
.ohf-gct-chip-hint{ font-size:11px; color:var(--tx3); }
.ohf-gct-range{ width:100%; accent-color:var(--accent); }
.ohf-gct-model-head{ font-weight:700; color:var(--tx); }
.ohf-gct-model-head--all{ margin-top:.25rem; }
.ohf-gct-model-panel{ display:flex; flex-direction:column; gap:.35rem; }
.ohf-gct-model-search{
  width:100%; box-sizing:border-box; font:inherit;
  background:var(--s2); border:1px solid var(--line); border-radius:10px;
  color:var(--tx); padding:.4rem .6rem;
}
.ohf-gct-model-search::placeholder{ color:var(--tx3); }
.ohf-gct-model-sections{ display:flex; gap:.3rem; flex-wrap:wrap; }
.ohf-gct-model-section{
  appearance:none; cursor:pointer; font:inherit;
  background:var(--s3); border:1px solid var(--line); color:var(--tx2);
  padding:.3rem .6rem; border-radius:9px; font-size:12px;
}
.ohf-gct-model-section[data-on]{ background:var(--accent-08); color:var(--accent); border-color:var(--accent); }
.ohf-gct-model-list{ display:flex; flex-direction:column; gap:.3rem; max-height:15rem; overflow:auto; }
.ohf-gct-model-item{
  appearance:none; cursor:pointer; font:inherit; text-align:left; width:100%;
  display:flex; flex-direction:column; gap:.1rem;
  background:var(--s3); border:1px solid var(--line); color:var(--tx);
  padding:.4rem .6rem; border-radius:9px;
}
.ohf-gct-model-item[data-on]{ border-color:var(--accent); background:var(--accent-08); }
.ohf-gct-model-name{ font-weight:600; }
.ohf-gct-model-badge{
  align-self:flex-start; font-size:10px; font-weight:700; letter-spacing:.02em;
  color:var(--accent); background:var(--accent-08); border-radius:6px; padding:.1rem .35rem;
}
.ohf-gct-model-meta{ font-size:11px; color:var(--tx3); }
.ohf-gct-model-tags{ display:flex; gap:.25rem; }
.ohf-gct-model-tag{
  font-size:10px; color:var(--tx3); background:var(--s2);
  border:1px solid var(--line); border-radius:6px; padding:.05rem .3rem;
}
.ohf-gct-model-empty{ color:var(--tx3); font-size:12px; margin:.2rem 0; text-align:center; }
.ohf-gct-motion-hero{
  margin:0; display:flex; flex-direction:column; gap:.2rem; align-items:center;
  border:1px solid var(--line); border-radius:14px; padding:.7rem; background:var(--s1);
}
.ohf-gct-motion-kicker{ font-weight:700; color:var(--tx); }
.ohf-gct-motion-desc{ font-size:12px; color:var(--tx3); }
.ohf-gct-scene{
  border:1px solid var(--line); border-radius:12px; background:var(--s1);
  display:flex; flex-direction:column;
}
.ohf-gct-scene-head{ display:flex; align-items:center; justify-content:space-between; padding:.5rem .6rem; }
.ohf-gct-scene-title{ font-weight:600; }
.ohf-gct-scene-body{ display:flex; flex-direction:column; gap:.4rem; padding:.5rem .6rem; border-top:1px solid var(--line); }
.ohf-gct-scene-hint{ font-size:11px; color:var(--tx3); margin:0; }
.ohf-gct-accordion{ border:1px solid var(--line); border-radius:12px; background:var(--s1); }
.ohf-gct-accordion-head{
  appearance:none; cursor:pointer; font:inherit; width:100%; text-align:left;
  padding:.5rem .6rem; background:transparent; border:0; color:var(--tx); font-weight:700;
}
.ohf-gct-accordion [role="region"]{ padding:.5rem .6rem; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:.4rem; }
.ohf-gct-deferred{ color:var(--tx3); font-size:12px; margin:0; }
.ohf-gct-generate{
  align-self:flex-end; cursor:pointer; font:inherit;
  display:inline-flex; align-items:center; gap:.4rem;
  background:var(--accent-08); border:1px solid var(--accent); color:var(--accent);
  padding:.45rem .9rem; border-radius:10px;
}
.ohf-gct-generate[disabled],.ohf-gct-generate[data-off]{
  cursor:not-allowed; background:var(--s3); border-color:var(--line-2); color:var(--tx3);
}
.ohf-gct-generate-credit{
  font-size:11px; font-weight:700; font-variant-numeric:tabular-nums;
  color:var(--tx3); border:1px solid var(--line); border-radius:6px; padding:.05rem .3rem;
}
.ohf-gct-alert{
  display:flex; align-items:center; gap:.5rem; align-self:stretch;
  background:var(--danger-08, rgba(220,80,60,.12)); border:1px solid var(--danger, #c0392b);
  color:var(--tx); border-radius:10px; padding:.4rem .6rem;
}
.ohf-gct-alert-text{ flex:1; font-size:13px; }
.ohf-gct-alert-close{
  appearance:none; cursor:pointer; border:0; background:transparent;
  color:var(--tx2); font-size:16px; line-height:1; padding:.1rem .3rem;
}
/* ============================================================================
   t_edb910c3 — HF 좌측 생성 판 내부 전량 이식(operator 지시 "4 전부다 HF 이식
   — 똑같이 베껴"). 정본: CDP :9222 라이브 실측 2026-11-04(1440x900,
   hf_tree.json·hf_details.json·hf_outline.txt)로 OH↔HF 동값 착지.
   기하·색·radius·서체·간격은 실측 그대로. HF에서 display:none이던 요소는
   미렌더로 동값이며(hf_details의 mix disp:none), 실측 없는 상태(확장 슬롯의
   세부 등)는 해당 마크업 주석이 밝힌다.
   ========================================================================== */
.ohf-gct-makeflow{ display:flex; flex-direction:column; flex:1; min-height:0; gap:0; }
.ohf-gct-make-scroll{
  flex:1; min-height:0; display:flex; flex-direction:column; gap:8px;
  padding:8px 8px 0; overflow-y:auto; scrollbar-width:none;
}
.ohf-gct-make-scroll::-webkit-scrollbar{ display:none; }
/* ---- 피겨 카드 — 실측 FIELDSET>FIGURE 302x130 @25,101 r12 ovY hidden ----
   video 302x130 object-fit cover(HF의 video radius 6, 실측 rect 동값);
   figcaption 하단 pad 0 6px 12px 12px(pb-3 pl-3 pr-1.5 실측 환산),
   brand 'General' Space Grotesk 20/700 uppercase -0.01em lh28
   rgb(209,254,23) + truncate, name 12/400 rgba(255,255,255,.8) lh18;
   배지 컨테이너 top6 right6 gap4(실측 배지행 x263 y107). */
.ohf-gct-figure-wrap{ margin:0; padding:0; border:0; min-width:0; }
.ohf-gct-figure{
  position:relative; margin:0; width:100%; height:130px;
  border-radius:12px; overflow:hidden; user-select:none;
}
.ohf-gct-figure-video{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; border-radius:6px; }
.ohf-gct-figure-caption{
  position:absolute; left:0; right:0; bottom:0; z-index:10; width:100%;
  padding:0 6px 12px 12px; box-sizing:border-box;
}
.ohf-gct-figure-brand{
  margin:0; font-family:"Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  font-size:20px; font-weight:700; letter-spacing:-1%; text-transform:uppercase;
  line-height:28px; color:rgb(209, 254, 23);
  overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
}
.ohf-gct-figure-name{
  margin:0; font-size:12px; font-weight:400; line-height:18px;
  color:rgba(255, 255, 255, .8);
  overflow:hidden; white-space:nowrap; text-overflow:ellipsis;
}
.ohf-gct-figure-badges{ position:absolute; top:6px; right:6px; z-index:2; display:flex; gap:4px; }
.ohf-gct-figure-badge{
  appearance:none; cursor:default; font:inherit; display:inline-grid;
  grid-auto-flow:column; align-items:center; justify-content:center; gap:4px;
  padding:0 8px; height:24px; max-width:100%; overflow:hidden;
  background:rgba(27, 27, 27, .3); border:1px solid rgba(255, 255, 255, .06);
  border-radius:8px; color:rgb(255, 255, 255); font-size:12px; font-weight:500;
}
.ohf-gct-figure-badge-text{ overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
/* ---- 세그먼트 탭 — 실측 302x40 @25,239 bg white/.5 border white/.1 r12
   pad3 gap4; 탭 145x32 @29,243 r8 pad 4px 8px gap4, 12px/500;
   선택=white, 비선택=rgba(255,255,255,.5); 인디케이터 투명+border white/.05
   (HF의 tone-glass — 실측 bg 투명·border 실재), hover 시 bg. ---- */
.ohf-gct-segwrap{ position:relative; display:flex; flex-direction:column; }
.ohf-gct-seg{
  position:relative; display:flex; width:100%; gap:4px; padding:3px;
  background:rgba(255, 255, 255, .05); border:1px solid rgba(255, 255, 255, .1);
  border-radius:12px; box-sizing:border-box;
}
.ohf-gct-seg-tab{
  appearance:none; cursor:pointer; font:inherit; flex:1;
  display:inline-flex; align-items:center; justify-content:center; gap:4px;
  height:32px; padding:4px 8px; border:0; border-radius:8px;
  background:transparent; color:rgba(255, 255, 255, .5);
  font-size:12px; font-weight:500; transition:background-color .15s,color .15s;
}
.ohf-gct-seg-tab:hover{ background:rgba(255, 255, 255, .05); color:rgb(255, 255, 255); }
.ohf-gct-seg-tab[data-on]{ background:transparent; color:rgb(255, 255, 255); }
.ohf-gct-seg-tab svg{ flex:none; }
.ohf-gct-seg-ind{
  position:absolute; top:3px; bottom:3px; left:3px; pointer-events:none;
  width:calc((100% - 10px) / 2);
  border:1px solid rgba(255, 255, 255, .05); border-radius:8px;
  background:transparent;
}
.ohf-gct-seg-ind[data-side="right"]{ left:auto; right:3px; }
.ohf-gct-panel{ display:flex; flex-direction:column; gap:8px; margin-top:8px; }
/* ---- 드롭존(HF의 attach 블록) — 실측 outer 302x168 gap12 pad4 bg white/.5
   r12; inner 294x148 pad16 gap12 r8에 halo(절대 좌표·pointer-events none)와
   full-face hit button(z-10); 서클 36px 3종 -8px 중첩: fill rgb(28,30,32)
   반마디+ring border rgba(197,197,197,.3)·bg white/.4(실측 rect x130,158,186);
   아이콘은 16px에 HF의 세로 그라데이션(#fff→#EDEDED .3); 텍스트 gap6 —
   라벨 14/600 rgb(247,247,248), 힌트 12/400 rgb(130,130,130)(실측 y376/398). ---- */
.ohf-gct-drop{
  position:relative; display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:12px; width:100%; padding:4px;
  background:rgba(255, 255, 255, .05); border-radius:12px; box-sizing:border-box;
}
.ohf-gct-drop-inner{
  position:relative; display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:12px; width:100%; height:160px; padding:16px;
  border-radius:8px; box-sizing:border-box;
}
.ohf-gct-drop-halo{ position:absolute; inset:0; border-radius:8px; pointer-events:none; }
.ohf-gct-drop-hit{
  position:absolute; inset:0; z-index:10; border:0; border-radius:inherit;
  background:transparent; cursor:pointer; padding:0; appearance:none; font:inherit;
}
.ohf-gct-drop-hit[data-off]{ cursor:not-allowed; }
.ohf-gct-drop-circles{ isolation:isolate; display:flex; align-items:center; }
.ohf-gct-badge-circle{
  position:relative; display:flex; width:36px; height:36px; flex:none;
  align-items:center; justify-content:center;
}
.ohf-gct-badge-circle + .ohf-gct-badge-circle{ margin-left:-8px; }
.ohf-gct-badge-fill{ position:absolute; inset:0; border-radius:9999px; background:rgb(28, 30, 32); }
.ohf-gct-badge-ring{
  position:absolute; inset:0; border-radius:9999px;
  border:1px solid rgba(197, 197, 197, .3); background:rgba(255, 255, 255, .04);
}
.ohf-gct-badge-ic{ position:relative; display:flex; width:16px; height:16px; }
.ohf-gct-drop-text{ display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; }
.ohf-gct-drop-title{ font-size:14px; font-weight:600; line-height:16px; color:rgb(255, 255, 255); }
.ohf-gct-drop-hint{ font-size:12px; font-weight:400; line-height:16px; color:rgb(130, 130, 130); }
/* ---- 프롬프트 박스 — 실측 block 302x160(min-h-40 max-h-64), pbox 116 +
   발 44(pad 8 12 12 = p-3 pt-2 실측, r 0 0 12 12, bg white/.5); 레이블은
   박 안에 절대 top12 left12, 14px/500 rgb(247,247,248)(실측 y475=463+12);
   필드 pad 36px 12px 12px에 14px/400 lh20(실측 텍스트 y499=463+36); 발의
   위젯 24px r8 pad 4px 6px gap6 12px/500 white(실측 54x24/43x24). ---- */
.ohf-gct-pblock{
  display:flex; flex-direction:column; width:100%;
  min-height:160px; max-height:256px; box-sizing:border-box;
}
.ohf-gct-pbox{
  position:relative; flex:none; height:116px; overflow-y:auto;
  background:rgba(255, 255, 255, .05); border-radius:12px; scrollbar-width:none;
}
.ohf-gct-pbox::-webkit-scrollbar{ display:none; }
.ohf-gct-pbox-label{
  position:absolute; top:12px; left:12px; margin:0; pointer-events:none;
  font-size:14px; font-weight:500; line-height:16px; color:rgb(255, 255, 255);
}
.ohf-gct-pbox-field{
  appearance:none; width:100%; min-height:116px; box-sizing:border-box;
  border:0; background:transparent; color:rgb(247, 247, 248); font:inherit;
  font-size:14px; font-weight:400; line-height:20px;
  padding:36px 12px 12px; resize:none; outline:none; overflow-y:auto;
}
.ohf-gct-pbox-field::placeholder{ color:rgb(130, 130, 130); }
.ohf-gct-pbox-foot{
  background:rgba(255, 255, 255, .05); border-radius:0 0 12px 12px;
  padding:8px 12px 12px; display:flex; flex-wrap:wrap; gap:4px;
}
.ohf-gct-pbox-group{ display:flex; align-items:center; gap:6px; }
.ohf-gct-el-btn{
  appearance:none; cursor:pointer; font:inherit;
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:4px 6px; height:24px; border:0; border-radius:8px;
  background:rgba(255, 255, 255, .05); color:rgb(255, 255, 255);
  font-size:12px; font-weight:500;
}
.ohf-gct-el-btn[data-off]{ cursor:not-allowed; }
.ohf-gct-el-on{
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:4px 6px; height:24px; border-radius:8px; cursor:pointer;
  background:rgba(255, 255, 255, .05); color:rgb(255, 255, 255);
  font-size:12px; font-weight:500;
}
.ohf-gct-el-on[data-off]{ cursor:not-allowed; }
.ohf-gct-el-check{ position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
/* ---- HF의 트리거·설정 셀(h-13.5 = 54px) — 실측 트리거 302x54 @25,631 /
   셀 147x54 @25,693·x180: bg white/.5 r12 pad 8px 12px; 2단 스택 gap4 —
   라벨 12px/500 rgba(255,255,255,.6) lh16 + 값 14px/500 rgb(247,247,248)
   lh20(모델 값에 노랑 브랜드 아이콘); chevron 우 white/.6. hover는 실측
   hoverCls의 white/.08 계열로 착지. ---- */
.ohf-gct-hbtn{
  appearance:none; cursor:pointer; font:inherit; width:100%; box-sizing:border-box;
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  height:54px; min-height:54px; padding:8px 12px; border:0; border-radius:12px;
  background:rgba(255, 255, 255, .05); color:inherit; text-align:left;
  font-size:16px;
  transition:background-color .15s;
}
/* HF의 모델 트리거만 grid 1fr auto(computed display:grid·justify normal 실측,
   셀은 flex space-between 실측 — 두 기하를 HF의 속성 후크 [data-model-select-
   trigger]로 갈라 동값을 지킨다). */
.ohf-gct-hbtn[data-model-select-trigger]{
  display:grid; grid-template-columns:1fr auto; align-items:center;
}
.ohf-gct-hbtn:hover{ background:rgba(255, 255, 255, .08); }
.ohf-gct-hbtn[data-active]{ background:rgba(255, 255, 255, .08); }
.ohf-gct-hcol{ display:flex; flex-direction:column; align-items:flex-start; gap:4px; min-width:0; }
.ohf-gct-hname{ font-size:12px; font-weight:500; line-height:16px; color:rgba(255, 255, 255, .6); }
.ohf-gct-hval{
  display:flex; align-items:center; gap:4px; min-width:0;
  font-size:14px; font-weight:500; line-height:20px; color:rgb(247, 247, 248);
}
.ohf-gct-hval-text{ overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.ohf-gct-hic{ width:16px; height:16px; flex:none; color:rgb(209, 254, 23); }
.ohf-gct-hchev{ width:16px; height:16px; flex:none; color:rgba(255, 255, 255, .6); }
/* ---- HF의 발(CTA 좌정) — 실측 pad 0 8px 12px + rounded-b-2xl(16px);
   CTA 302x48 @25,811 r12 bg rgb(209,254,23) 글자 rgb(20,21,26) 16px/600
   pad 0 16px 2px gap8; 크레딧은 코인 20px + 숫자 16/600 tabular.
   active 시 HF의 active:scale-97(실측 클래스 원문)을 .97로 착지. disabled 근사:
   HF의 공통 관례 disabled:opacity-50를 same-value로 착지(정적 미러의 실측 근사).
   HF의 그리드 끝(809)과 발(811) 사이 2px는 발 자체의 padding이 아니라 실측
   간격이므로 margin-top:2px로 착지(발 pad 원문은 top 0가 정본). ---- */
.ohf-gct-foot{
  position:relative; flex:none; width:100%; box-sizing:border-box;
  margin-top:2px; padding:0 8px 12px; border-radius:0 0 16px 16px;
}
.ohf-gct-cta{
  appearance:none; cursor:pointer; font:inherit; width:100%; box-sizing:border-box;
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  height:48px; padding:0 16px 2px; border:0; border-radius:12px;
  background:rgb(209, 254, 23); color:rgb(20, 21, 26);
  font-size:16px; font-weight:600; line-height:24px;
  transition:transform .2s;
}
.ohf-gct-cta:active{ transform:scale(.97); }
.ohf-gct-cta[disabled]{ cursor:not-allowed; opacity:.5; }
.ohf-gct-cta-credit{ display:inline-flex; align-items:center; gap:2px; }
.ohf-gct-cta-credit svg{ width:20px; height:20px; color:rgb(20, 21, 26); }
.ohf-gct-cta-num{ font-size:16px; font-weight:600; color:rgb(20, 21, 26); font-variant-numeric:tabular-nums; }
/* ---- the fullscreen Draw modal ---- */
.ohf-gct-draw{
  position:fixed; inset:0; z-index:1200;
  display:grid; place-items:center; padding:1rem;
  background:rgba(6,7,9,.72);
}
.ohf-gct-draw-box{
  width:min(50rem,94vw); max-height:88vh; box-sizing:border-box;
  display:grid; grid-template-rows:auto minmax(0,1fr) auto auto auto;
  gap:.5rem;
  background:var(--s2); border:1px solid var(--line-2); border-radius:16px;
  padding:.75rem; box-shadow:0 24px 60px rgba(0,0,0,.5);
}
.ohf-gct-draw-head{ display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:.5rem; }
.ohf-gct-draw-title{ font-size:13px; font-weight:700; color:var(--tx); margin:0; }
.ohf-gct-draw-tabs{ display:inline-flex; gap:.2rem; justify-self:center;
  background:var(--s3); border:1px solid var(--line); border-radius:12px; padding:.2rem;
}
.ohf-gct-draw-tab{
  appearance:none; cursor:pointer; border:0; background:transparent; font:inherit;
  color:var(--tx3); padding:.3rem .7rem; border-radius:9px; font-size:13px;
}
.ohf-gct-draw-tab[data-active]{ background:var(--accent-08); color:var(--accent); }
.ohf-gct-draw-close{
  appearance:none; cursor:pointer; border:0; background:transparent; color:var(--tx2);
  padding:.25rem; border-radius:8px;
}
.ohf-gct-draw-close:hover{ color:var(--tx); background:var(--s3); }
.ohf-gct-draw-stage{
  position:relative; min-height:12rem; background:var(--s1);
  border:1px solid var(--line); border-radius:12px; overflow:hidden;
}
.ohf-gct-draw-video{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
.ohf-gct-draw-canvas{ position:absolute; inset:0; width:100%; height:100%; touch-action:none; cursor:crosshair; }
.ohf-gct-draw-noclip{
  position:absolute; inset:0; display:grid; place-items:center; margin:0;
  color:var(--tx3); font-size:12px; text-align:center; padding:1rem;
}
.ohf-gct-draw-player{ display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
.ohf-gct-draw-ctl{
  appearance:none; cursor:pointer; font:inherit; line-height:1;
  background:var(--s3); border:1px solid var(--line-2); color:var(--tx2);
  width:32px; height:32px; border-radius:9px; display:grid; place-items:center;
}
.ohf-gct-draw-ctl[aria-pressed="true"]{ background:var(--accent-08); color:var(--accent); border-color:var(--accent); }
.ohf-gct-draw-fmwrap{ position:relative; display:inline-flex; }
.ohf-gct-draw-formatmenu{
  position:absolute; z-index:7; bottom:calc(100% + 6px); left:0; min-width:180px;
  background:var(--s2); border:1px solid var(--line); border-radius:12px;
  padding:.3rem; display:flex; flex-direction:column; gap:.2rem;
  box-shadow:0 12px 32px rgba(0,0,0,.35);
}
.ohf-gct-draw-formatitem{
  appearance:none; cursor:pointer; font:inherit; text-align:left;
  background:transparent; border:0; border-radius:8px; padding:.4rem .5rem;
  color:var(--tx2); display:flex; flex-direction:column; gap:.1rem;
}
.ohf-gct-draw-formatitem:hover{ background:var(--s3); color:var(--tx); }
.ohf-gct-draw-formatitem[data-on]{ background:var(--accent-08); color:var(--accent); }
.ohf-gct-draw-format-label{ font-weight:600; color:var(--tx); }
.ohf-gct-draw-format-sample{
  color:var(--tx3); font-size:11px; font-variant-numeric:tabular-nums;
}
.ohf-gct-draw-ctl[disabled],.ohf-gct-draw-ctl[data-off]{ opacity:.45; cursor:not-allowed; }
.ohf-gct-draw-clock{ font-size:12px; color:var(--tx2); font-variant-numeric:tabular-nums; }
.ohf-gct-draw-clock-sep{ margin:0 .3rem; color:var(--tx3); }
.ohf-gct-draw-range{ flex:1; min-width:8rem; accent-color:var(--accent); }
.ohf-gct-draw-range[disabled]{ opacity:.4; }
.ohf-gct-draw-tools{ display:flex; gap:.3rem; flex-wrap:wrap; }
.ohf-gct-draw-tool{
  appearance:none; cursor:pointer; font:inherit;
  background:var(--s3); border:1px solid var(--line-2); color:var(--tx2);
  min-width:32px; height:32px; padding:0 .45rem; border-radius:9px;
  display:inline-flex; align-items:center; justify-content:center;
}
.ohf-gct-draw-tool[data-on]{ background:var(--accent-08); color:var(--accent); border-color:var(--accent); }
.ohf-gct-draw-tool[data-off]{ opacity:.45; cursor:not-allowed; }
.ohf-gct-draw-foot{ display:grid; grid-template-columns:minmax(10rem,12.5rem) minmax(0,1fr) auto;
  align-items:end; gap:.5rem; }
.ohf-gct-draw-model{ position:relative; }
.ohf-gct-draw-model-pop{
  position:absolute; left:0; bottom:calc(100% + 8px); z-index:5;
  width:min(22rem,90vw); max-height:min(50vh,420px); overflow:auto;
  background:var(--s1); border:1px solid var(--line); border-radius:12px; padding:.6rem;
}
.ohf-gct-draw-note{
  width:100%; min-height:56px; resize:vertical; box-sizing:border-box; font:inherit;
  background:var(--s1); border:1px solid var(--line); border-radius:12px;
  color:var(--tx); padding:.5rem .65rem;
}
.ohf-gct-draw-note::placeholder{ color:var(--tx3); }
`;