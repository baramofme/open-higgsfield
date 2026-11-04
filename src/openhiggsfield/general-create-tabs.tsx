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
function Dial({
  label,
  value,
  open,
  onOpen,
  children,
}: {
  label: string;
  value: React.ReactNode;
  open: boolean;
  onOpen: (next: string | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="ohf-gct-dial">
      <button
        type="button"
        className="ohf-gct-dial-btn"
        aria-expanded={open}
        data-active={open || undefined}
        onClick={() => onOpen(open ? null : label)}
      >
        <span className="ohf-gct-dial-name">{label}</span>
        <span className="ohf-gct-dial-value">{value}</span>
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
    <div className="ohf-gct-subtab-body ohf-gct-body--make">
      {/* 모드 탭 — HF의 [레퍼런스|영상 확장] 세그먼트(실측 cy243·role=tab). */}
      <div className="ohf-gct-mode" role="tablist" aria-label="생성 모드">
        <button
          type="button"
          role="tab"
          className="ohf-gct-mode-tab"
          aria-selected={!extendMode}
          data-on={!extendMode || undefined}
          onClick={() => pickMode("레퍼런스")}
        >
          레퍼런스
        </button>
        <button
          type="button"
          role="tab"
          className="ohf-gct-mode-tab"
          aria-selected={extendMode}
          data-on={extendMode || undefined}
          onClick={() => pickMode("영상 확장")}
        >
          영상 확장
        </button>
      </div>

      {extendMode ? (
        <>
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
        </>
      ) : (
        <AttachSlot
          role="reference"
          label="레퍼런스 추가하기"
          hint="이미지, 영상 또는 오디오"
          model={model}
          tray={tray}
          onOpen={onAttach}
        />
      )}

      <textarea
        className="ohf-gct-prompt-real"
        aria-label="프롬프트"
        placeholder="프롬프트를 입력하세요"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {/* 요소 켬 — HF's audio-in-video toggle, mapped to generateAudio. */}
      <div className="ohf-gct-element">
        <button
          type="button"
          className="ohf-gct-toggle"
          role="switch"
          aria-checked={audioOn}
          aria-label="요소"
          data-off={!generateAudio ? "" : undefined}
          aria-disabled={!generateAudio ? "true" : undefined}
          onClick={() => generateAudio && onSetting({ generateAudio: !audioOn })}
        >
          {generateAudio ? (audioOn ? "켬" : "끔") : "요소"}
        </button>
        <span className="ohf-gct-element-hint">
          {generateAudio ? "오디오 생성" : "이 모델은 오디오 설정이 없습니다"}
        </span>
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

      <Dial label="모델" value={model.label} open={openMenu === "모델"} onOpen={setOpenMenu}>
        <ModelPanel
          activeId={model.id}
          onPick={(id) => {
            onModel(id);
            setOpenMenu(null);
          }}
        />
      </Dial>

      <div className="ohf-gct-grid">
        <Dial
          label="길이"
          value={`${curDuration}s`}
          open={openMenu === "길이"}
          onOpen={setOpenMenu}
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

        <Dial label="종횡비" value={curAspect} open={openMenu === "종횡비"} onOpen={setOpenMenu}>
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
            <p className="ohf-gct-deferred">이 모델은 품질 선택을 받지 않습니다.</p>
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
            <p className="ohf-gct-deferred">이 모델은 비트레이트 선택을 받지 않습니다.</p>
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
        {/* 좌측 네비게이션 사이드바 — HF 원본의 수직 생성 레일. 서브탭이 레일의
            탭이고, 선택한 탭의 카드가 오른쪽 본문에 렌더된다. */}
        <div
          className="ohf-gct-rail ohf-gct-subtab-strip"
          role="tablist"
          aria-label={surface === "audio" ? "오디오 만들기 탭" : "비디오 만들기 탭"}
          aria-orientation="vertical"
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
          {/* Attached inputs first — the frames read before the words do. */}
          <MediaStrip model={model} />
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
/* t_ce2cf50b — the create shell returns to HF's LEFT navigation: a vertical
   subtab rail (the sidebar) pinned to the left edge with the card body to its
   right. It had become a bottom-docked horizontal strip; the user's ruling is
   that entering the video/audio tab in general mode must show the left nav the
   way HF's create screen does (실측: HF의 생성 rail은 좌측 x≈25..312의 수직 스택).
   The dedicated full region is the follow-up t_2f8b602f; here the sidebar
   itself is restored — visible and functional. */
.ohf-gct{
  position:absolute; inset:6.5rem auto 0 0;   /* below the header, full height, pinned to the left edge */
  display:flex; flex-direction:column; gap:.5rem;
  padding:.75rem 1rem; width:min(52rem,78%); box-sizing:border-box;
  color:var(--tx);
  font-size:14px; font-weight:500;
}
.ohf-gct-lay{ display:flex; flex-direction:row; align-items:flex-start; gap:.75rem; flex:1; min-width:0; }
/* the vertical left navigation rail — HF's create rail, tab-structured. */
.ohf-gct-subtab-strip,.ohf-gct-rail{
  flex-direction:column; align-items:stretch; gap:.25rem;
  width:min(11rem,40%); min-width:8.5rem; align-self:flex-start;
  background:var(--s3); border:1px solid var(--line);
  border-radius:14px; padding:.25rem;
}
.ohf-gct-subtab{
  appearance:none; cursor:pointer; border:0; background:transparent;
  color:var(--tx3); font:inherit; padding:.5rem .8rem; border-radius:10px;
  text-align:left; width:100%;
  transition:background .15s,color .15s;
}
.ohf-gct-subtab[data-active]{
  background:var(--accent-08); color:var(--accent);
}
.ohf-gct-subtab-panels{ flex:1; min-width:0; width:auto; display:flex; flex-direction:column; gap:.5rem; }
.ohf-gct-subtab-body{
  display:flex; flex-direction:column; gap:.6rem;
  background:var(--s2); border:1px solid var(--line);
  border-radius:16px; padding:.75rem;
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