"use client";

/* =============================================================================
 * audio-surface.tsx — HF /ko/audio 정적 화면 이식 (t_dbb7f8b9)
 *
 * ground-truth: HF live CDP(:9222) 1440×900 (hf_tree_rich.json + probe4/5/6 +
 * svgs.json, 2026-11-05). 각 요소에 data-ohf-audio="<id>" 앵커를 박아 HF와
 * 1:1로 대응시킨다(실측 하네스의 매칭 키).
 *
 * 정직 marking 원칙:
 *  - data-off="<사유>"  → 이 화면에서 정적으로 이식된 HF 요소(동작 착지 후속).
 *  - 정적 화면에서 실배선한 것은 모델 선택·스크립트·생성하기뿐이다.
 * ============================================================================= */

import { useState } from "react";
import { MODELS } from "@/generation/catalog";
import type { ModelEntry } from "@/generation/catalog";
import { useAudioPrompt } from "@/generation/stores/prompt";
import "./audio-surface.css";

/* ---- HF 원문 SVG(전부 원문 그대로) ---- */

function IconWave({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" data-ohf-audio={hook} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 6.5v3M5.75 4.5v7M9 2.75v10.5M12.25 5v6M15 6.75v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMusic({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg className={className} data-ohf-audio={hook} aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.1835 3.83539C19.3432 3.78977 19.5022 3.90968 19.5022 4.07577V13.15C18.8575 12.7352 18.0658 12.5001 17.2522 12.5001C15.315 12.5001 13.5022 13.833 13.5022 15.7501C13.5022 17.6673 15.315 19.0001 17.2522 19.0001C19.1894 19.0001 21.0022 17.6673 21.0022 15.7501V4.07577C21.0022 2.91315 19.8894 2.07374 18.7715 2.39308L10.2693 4.82177C9.51801 5.03639 9 5.72309 9 6.50446V16.15C8.35535 15.7352 7.56365 15.5001 6.75 15.5001C4.81278 15.5001 3 16.833 3 18.7501C3 20.6673 4.81278 22.0001 6.75 22.0001C8.68722 22.0001 10.5 20.6673 10.5 18.7501V6.50446C10.5 6.39284 10.574 6.29474 10.6813 6.26408L19.1835 3.83539Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconImage({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg className={className} data-ohf-audio={hook} aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.25 6.75C13.0074 6.75 12 7.75736 12 9C12 10.2426 13.0074 11.25 14.25 11.25C15.4926 11.25 16.5 10.2426 16.5 9C16.5 7.75736 15.4926 6.75 14.25 6.75Z" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 4.75C3 3.7835 3.7835 3 4.75 3H19.25C20.2165 3 21 3.7835 21 4.75V19.25C21 20.2165 20.2165 21 19.25 21H4.75C3.7835 21 3 20.2165 3 19.25V4.75ZM19.5 18.4394L14.8839 13.8232C14.3957 13.3351 13.6043 13.3351 13.1161 13.8232L12.1768 14.7626C12.0791 14.8602 11.9209 14.8602 11.8232 14.7626L8.87333 11.8127C8.3956 11.3349 7.62472 11.3233 7.13274 11.7863L4.5 14.2642V4.75C4.5 4.61193 4.61193 4.5 4.75 4.5H19.25C19.3881 4.5 19.5 4.61193 19.5 4.75V18.4394Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconInfo({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" data-ohf-audio={hook} className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M10.75 11H12L12 16.25M21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.375C11.6548 7.375 11.375 7.65482 11.375 8C11.375 8.34518 11.6548 8.625 12 8.625C12.3452 8.625 12.625 8.34518 12.625 8C12.625 7.65482 12.3452 7.375 12 7.375Z" fill="currentColor" stroke="currentColor" strokeWidth="0.25" />
    </svg>
  );
}

function IconFolder({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg className={className} data-ohf-audio={hook} aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.75 4.75V18.25C2.75 18.8023 3.19772 19.25 3.75 19.25H20.25C20.8023 19.25 21.25 18.8023 21.25 18.25V7.75C21.25 7.19772 20.8023 6.75 20.25 6.75H12.5352C12.2008 6.75 11.8886 6.5829 11.7031 6.3047L10.2969 4.1953C10.1114 3.9171 9.79917 3.75 9.46482 3.75H3.75C3.19772 3.75 2.75 4.19772 2.75 4.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBook({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg className={className} data-ohf-audio={hook} aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 7.75C12 6.09315 13.3431 4.75 15 4.75H21.25C21.8023 4.75 22.25 5.19772 22.25 5.75V18.25C22.25 18.8023 21.8023 19.25 21.25 19.25H15.277C14.5966 19.25 13.9296 19.4142 13.3508 19.7719C12.772 20.1296 12.3043 20.6414 12 21.25M12 7.75C12 6.09315 10.6569 4.75 9 4.75H2.75C2.19772 4.75 1.75 5.19772 1.75 5.75V18.25C1.75 18.8023 2.19772 19.25 2.75 19.25H8.723C9.40341 19.25 10.0704 19.4142 10.6492 19.7719C11.228 20.1296 11.6957 20.6414 12 21.25M12 7.75V21.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFilterLines({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg className={className} data-ohf-audio={hook} aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.75 4.75H21.25M8.75 19.25H15.25M5.75 12H18.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBrand({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" data-ohf-audio={hook} className={className}>
      <path data-ohf-audio="brandpath" d="m3.154 12.154-2.62.655V1.2l2.62.655v10.3Zm12.668.679-2.626.656V.519l2.627.65v11.664Zm-8.509-.325-2.622.656v-6.84l2.622.655v5.53ZM9.025 5.31l2.627-.656v6.84l-2.627-.656V5.31Z" fill="currentColor" />
    </svg>
  );
}

function IconChevronDown({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg className={className} data-ohf-audio={hook} aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M3.46967 8.46967C3.76256 8.17678 4.23744 8.17678 4.53033 8.46967L12 15.9393L19.4697 8.46967C19.7626 8.17678 20.2374 8.17678 20.5303 8.46967C20.8232 8.76256 20.8232 9.23744 20.5303 9.53033L12.5303 17.5303C12.3897 17.671 12.1989 17.75 12 17.75C11.8011 17.75 11.6103 17.671 11.4697 17.5303L3.46967 9.53033C3.17678 9.23744 3.17678 8.76256 3.46967 8.46967Z" fill="currentColor" />
    </svg>
  );
}

function IconMinus({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg className={className} data-ohf-audio={hook} aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.75 12H17.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg className={className} data-ohf-audio={hook} aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 6.75V12M12 12V17.25M12 12H6.75M12 12H17.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSliders({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-ohf-audio={hook} className={className}>
      <path stroke="currentColor" strokeLinecap="square" strokeWidth="1.5" d="M11.5 7.25H3.75m1.75 9.5H3.75m16.5-9.5H18.5m1.75 9.5H12.5M9 20a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 1 0 9 20Zm6-9.5A3.25 3.25 0 1 0 15 4a3.25 3.25 0 1 0 0 6.5Z" />
    </svg>
  );
}

function IconHelp({ className, hook }: { className?: string; hook?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-ohf-audio={hook} className={className}>
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15.75c0-4.25 4.25-3.317 4.25-6.976 0-4.987-7.385-5.446-8.388-.774" />
      <path fill="currentColor" d="M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2" />
    </svg>
  );
}

/* ---- 원문 텍스트(전부 HF 원문 그대로) ---- */

const STR = {
  tabTTS: "텍스트 음성 변환",
  tabVoice: "보이스 체인지",
  tabTranslate: "번역",
  uploadLabel: "미디어 업로드",
  uploadHint: "음성/오디오 최대 3개 또는 이미지 1개",
  optional: "선택 사항",
  script: "스크립트",
  scriptPlaceholder:
    "음성이 소리 내어 읽을 내용을 그대로 적어 주세요.\n@를 입력하면 첨부 파일을 참조할 수 있어요",
  model: "모델",
  batch: "배치 크기",
  batchValue: "1/4",
  voice: "음성 상세 정보",
  voicePlaceholder:
    "예: 영국식 억양의 젊은 여성 목소리, 부드럽고 큰 소리. 신나서 킥킥거리는 느낌",
  counter: "0/500",
  advanced: "고급 설정",
  hfModel: "Seed Audio 1.0",
  generate: "생성하기",
  record: "기록",
  guide: "이용 방법",
  filter: "필터",
  heroTitle: "텍스트를 음성으로",
  heroSub: "어떤 스크립트든 생생한 음성으로, 프로젝트에 바로 사용할 수 있어요",
  card1Title: "음성을 선택하거나 복제해 보세요",
  card1Sub: "프리셋을 선택하거나, 내 목소리를 복제하거나, 모델을 골라 보세요",
  card2Title: "쓰고, 설명하고, 생성하기",
  card2Sub: "스크립트를 입력하고, 어떻게 들릴지 설명한 다음, 만들어 보세요",
  video1Label: "음성 프리셋 캐러셀",
  video2Label: "스크립트 프롬프트가 있는 텍스트 음성 변환 양식",
  videoFallback: "사용 중인 브라우저가 영상을 지원하지 않아요.",
  helpLabel: "도움이 필요하세요?",
  resizeLabel: "오디오 패널 크기 조절",
  resizeTitle:
    "드래그하거나 화살표 키로 크기를 조절할 수 있어요. 더블 클릭하거나 Enter 키를 누르면 초기화돼요.",
} as const;

export type AudioSurfaceProps = {
  model: ModelEntry;
  onModel: (id: string) => void;
  onGenerate?: () => void;
  error?: string | null;
};

export function AudioSurface({ model, onModel, onGenerate, error }: AudioSurfaceProps) {
  const prompt = useAudioPrompt((s) => s.text);
  const setPrompt = useAudioPrompt((s) => s.setText);
  const [modelOpen, setModelOpen] = useState(false);
  const [pickedModel, setPickedModel] = useState<string | null>(null);

  /* HF의 모델 값 자리 — OH는 OH의 오디오 모델을 올린다(아날로그 대응). */
  const audioModels = MODELS.filter((m) => m.surface === "audio");

  return (
    <>
      {/* HF의 상단 진행바(aria-hidden, 정적 화면에서 0%) */}
      <div className="ohf-audio-progress" data-ohf-audio="progress" aria-hidden="true">
        <div className="ohf-audio-progress-fill" data-ohf-audio="progressfill" />
      </div>

      <div className="ohf-audio-main" data-ohf-audio="ptwrap">
        <div className="ohf-audio-container" data-ohf-audio="container">
          <div className="ohf-audio-grid" data-ohf-audio="grid">
            {/* ---------------- 좌측 패널 ---------------- */}
            <aside className="ohf-audio-aside" data-ohf-audio="aside">
              <div className="ohf-audio-plate" data-ohf-audio="plate">
                <div className="ohf-audio-tabstrip" data-ohf-audio="strip">
                  <button
                    type="button"
                    className="ohf-audio-tab"
                    data-ohf-audio="tab0"
                    data-active=""
                    data-off="정적 화면(활성 모드가 곧 이 화면)"
                  >
                    {STR.tabTTS}
                  </button>
                  <button
                    type="button"
                    className="ohf-audio-tab"
                    data-ohf-audio="tab1"
                    aria-disabled="true"
                    data-off="HF원부재(OH에 보이스 체인지 없음)"
                  >
                    {STR.tabVoice}
                  </button>
                  <button
                    type="button"
                    className="ohf-audio-tab"
                    data-ohf-audio="tab2"
                    aria-disabled="true"
                    data-off="HF원부재(OH에 번역 없음)"
                  >
                    {STR.tabTranslate}
                  </button>
                </div>

                <form className="ohf-audio-form" data-ohf-audio="form" onSubmit={(e) => e.preventDefault()}>
                  <div className="ohf-audio-stack" data-ohf-audio="stack">
                    {/* HF의 업로드 카드는 래퍼(relative shrink-0) 안에 들어 있고,
                        선택 사항 배지는 래퍼의 형제로 렌더된다(실측 구조). */}
                    <div className="ohf-audio-upload-wrap" data-ohf-audio="uploadwrap">
                      <div
                        className="ohf-audio-upload"
                        data-ohf-audio="upload"
                        role="button"
                        tabIndex={0}
                        aria-disabled="true"
                        data-off="동착 후속(OH의첨부 배선으로 착지)"
                      >
                        <svg
                          className="ohf-audio-upload-dash"
                          data-ohf-audio="uploadsvg"
                          aria-hidden="true"
                          viewBox="0 0 368 160"
                          preserveAspectRatio="none"
                        >
                          <rect
                            x="0.75"
                            y="0.75"
                            rx="15.25"
                            ry="15.25"
                            width="366.5"
                            height="158.5"
                            fill="none"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="1.5"
                            strokeDasharray="3 3"
                          />
                        </svg>
                        <div className="ohf-audio-circles" data-ohf-audio="circles">
                          <span className="ohf-audio-circle" data-ohf-audio="circle0" aria-hidden="true">
                            <IconWave hook="circle0svg" className="ohf-audio-circle-ico a" />
                          </span>
                          <span className="ohf-audio-circle" data-ohf-audio="circle1" aria-hidden="true">
                            <IconMusic hook="circle1svg" className="ohf-audio-circle-ico" />
                          </span>
                          <span className="ohf-audio-circle" data-ohf-audio="circle2" aria-hidden="true">
                            <IconImage hook="circle2svg" className="ohf-audio-circle-ico c" />
                          </span>
                        </div>
                        <div className="ohf-audio-labelcol" data-ohf-audio="labelcol">
                          <span className="ohf-audio-upload-label" data-ohf-audio="uplabel">
                            {STR.uploadLabel}
                          </span>
                          <span className="ohf-audio-upload-hint" data-ohf-audio="uphint">
                            {STR.uploadHint}
                          </span>
                        </div>
                      </div>
                      <span className="ohf-audio-badge" data-ohf-audio="badge1">
                        {STR.optional}
                      </span>
                    </div>

                    {/* 스크립트 */}
                    <section className="ohf-audio-script" data-ohf-audio="scriptsec">
                      <div className="ohf-audio-script-head" data-ohf-audio="scripthead">
                        <span className="ohf-audio-script-label" data-ohf-audio="scriptlabel">
                          {STR.script}
                        </span>
                        <span className="ohf-audio-script-icon" data-ohf-audio="scripticon" data-state="closed">
                          <IconInfo hook="scripticonsvg" className="ohf-audio-script-icon-svg" />
                        </span>
                      </div>
                      <div className="ohf-audio-script-body" data-ohf-audio="scriptbody">
                        <div className="ohf-audio-script-rel" data-ohf-audio="scriptrel">
                          <div
                            className="ohf-audio-script-field"
                            data-ohf-audio="field"
                            role="textbox"
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => setPrompt((e.currentTarget as HTMLElement).textContent || "")}
                          >
                            {prompt}
                          </div>
                          {prompt.length === 0 && (
                            <div className="ohf-audio-script-overlay" data-ohf-audio="overlay" aria-hidden="true">
                              <div className="ohf-audio-script-overlay-inner" data-ohf-audio="overlayinner">
                                {STR.scriptPlaceholder}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* 모델 — 실배선(OH의 오디오 모델 선택으로 착지).
                        HF는 스택의 자식이 버튼이고 팝오버는 별개 레이어. OHF는 팝오버의
                        앵커를 위해 래퍼를 하나 더 둔다(HF 원부재 — 정직 각인). */}
                    <div
                      className="ohf-audio-model-wrap"
                      data-ohf-audio="modelwrap"
                      data-ohf-off-hf="OH 기계 래퍼(팝오버 앵커; HF 원부재)"
                    >
                      <button
                        type="button"
                        className="ohf-audio-modelbtn"
                        data-ohf-audio="modelbtn"
                        onClick={() => setModelOpen((v) => !v)}
                      >
                        <span className="ohf-audio-model-col" data-ohf-audio="modelcol">
                          <span className="ohf-audio-model-label" data-ohf-audio="modellabel">
                            {STR.model}
                          </span>
                          <span className="ohf-audio-model-val" data-ohf-audio="modelval">
                            <span className="ohf-audio-model-trunc" data-ohf-audio="modeltrunc">
                              {pickedModel ?? STR.hfModel}
                            </span>
                            <IconBrand hook="brand" className="ohf-audio-brand" />
                          </span>
                        </span>
                        <IconChevronDown hook="modelchev" className="ohf-audio-chev" />
                      </button>
                      {modelOpen && (
                        <div
                          className="ohf-audio-model-pop"
                          data-ohf-audio="modelpop"
                          data-ohf-off-hf="미실측(HF의 열림 상태 팝오버를 아직 ground-truth 하지 않음)"
                        >
                          <div className="ohf-audio-model-pop-head">오디오 모델</div>
                          <div className="ohf-audio-model-pop-list">
                            {audioModels.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                className="ohf-audio-model-pop-item"
                                data-selected={m.id === model.id || undefined}
                                onClick={() => {
                                  onModel(m.id);
                                  setPickedModel(m.label);
                                  setModelOpen(false);
                                }}
                              >
                                <span className="ohf-audio-model-pop-name">{m.label}</span>
                                <span className="ohf-audio-model-pop-meta" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 배치 크기 — 정직 inert(OH에 다중 배치 오디오 엔진 없음) */}
                    <div className="ohf-audio-batch" data-ohf-audio="batchrow">
                      <span className="ohf-audio-batch-label" data-ohf-audio="batchlabel">
                        {STR.batch}
                      </span>
                      <div className="ohf-audio-stepper" data-ohf-audio="stepper">
                        <button
                          type="button"
                          className="ohf-audio-step-btn"
                          data-ohf-audio="minbtn"
                          disabled
                          aria-label="배치 크기 줄이기"
                        >
                          <IconMinus hook="minsvg" className="ohf-audio-step-ico" />
                        </button>
                        <span className="ohf-audio-step-val" data-ohf-audio="stepval">
                          {STR.batchValue}
                        </span>
                        <button
                          type="button"
                          className="ohf-audio-step-btn"
                          data-ohf-audio="plusbtn"
                          aria-disabled="true"
                          data-off="HF원부재(OH에 다중 배치 오디오 엔진 없음)"
                          aria-label="배치 크기 늘리기"
                        >
                          <IconPlus hook="plussvg" className="ohf-audio-step-ico" />
                        </button>
                      </div>
                    </div>

                    {/* 음성 상세 정보 — 정직 inert(OH 오디오 모델이 이 파라미터를 받지 않음) */}
                    <section className="ohf-audio-voice" data-ohf-audio="voicesec">
                      <span className="ohf-audio-badge" data-ohf-audio="badge2">
                        {STR.optional}
                      </span>
                      <label className="ohf-audio-voice-label" data-ohf-audio="voicelabel">
                        {STR.voice}
                      </label>
                      <textarea
                        className="ohf-audio-voice-ta"
                        data-ohf-audio="voiceta"
                        readOnly
                        aria-disabled="true"
                        data-off="OH원부재(OH 오디오 모델이 음성 스타일 파라미터를 받지 않음)"
                        maxLength={500}
                        placeholder={STR.voicePlaceholder}
                      />
                      <span className="ohf-audio-counter" data-ohf-audio="counter">
                        {STR.counter}
                      </span>
                    </section>

                    {/* 고급 설정 — 정직 inert(동착 후속) */}
                    <button
                      type="button"
                      className="ohf-audio-adv"
                      data-ohf-audio="advbtn"
                      aria-expanded="false"
                      aria-disabled="true"
                      data-off="동착 후속"
                    >
                      <IconSliders hook="advicon" className="ohf-audio-adv-icon" />
                      <span className="ohf-audio-adv-label" data-ohf-audio="advlabel">
                        {STR.advanced}
                      </span>
                      <IconChevronDown hook="advchev" className="ohf-audio-chev" />
                    </button>
                  </div>

                  {/* 푸터 CTA — 실배선(생성) */}
                  <div className="ohf-audio-foot" data-ohf-audio="foot">
                    <div className="ohf-audio-foot-line" data-ohf-audio="footline" />
                    <button
                      type="button"
                      className="ohf-audio-cta"
                      data-ohf-audio="cta"
                      disabled={!prompt.trim() || !onGenerate}
                      onClick={onGenerate}
                    >
                      <span className="ohf-audio-cta-shadow" data-ohf-audio="ctashadow" aria-hidden="true" />
                      <span className="ohf-audio-cta-text" data-ohf-audio="ctatext">
                        {STR.generate}
                      </span>
                    </button>
                    {error ? (
                      <p className="ohf-audio-error" data-ohf-off-hf="OH원부재(HF의 이 화면에 에러 영역 없음)" role="alert">
                        {error}
                      </p>
                    ) : null}
                  </div>
                </form>
              </div>

              {/* 리사이즈 핸들 — HF 원리. 정직: 이 빌드에서 드래그/키는 동작하지 않는다. */}
              <div
                className="ohf-audio-resize"
                data-ohf-audio="resize"
                role="separator"
                tabIndex={0}
                aria-label={STR.resizeLabel}
                aria-orientation="vertical"
                aria-valuemin={342}
                aria-valuemax={640}
                aria-valuenow={394}
                data-off="동착 후속(정적 화면 이식; 드래그·키는 미구현)"
              >
                <div className="ohf-audio-resize-line" data-ohf-audio="resizeline" />
              </div>
            </aside>

            {/* ---------------- 우측 컬럼 ---------------- */}
            <div className="ohf-audio-feedcol" data-ohf-audio="feedcol">
              <div className="ohf-audio-feedhead" data-ohf-audio="feedhead">
                <div className="ohf-audio-feedrow" data-ohf-audio="feedrow">
                  <div className="ohf-audio-rc-left" data-ohf-audio="rcleft">
                    {/* HF의 단 래퍼(무클래스 div) — OHF도 동일하게 한 래퍼. */}
                    <div data-ohf-audio="rcw1" data-orientation="horizontal">
                      <div
                        className="ohf-audio-tabgroup"
                        data-ohf-audio="tabgroup"
                        role="tablist"
                        aria-orientation="horizontal"
                        tabIndex={0}
                        data-orientation="horizontal"
                        style={{ outline: "none" }}
                      >
                          <button
                            type="button"
                            role="tab"
                            aria-selected="true"
                            data-state="active"
                            className="ohf-audio-rtab"
                            data-ohf-audio="rtab1"
                            tabIndex={-1}
                            data-orientation="horizontal"
                            aria-label={STR.record}
                            aria-disabled="true"
                            data-off="동착 후속(기록 탭 = OH 오디오 히스토리 착지)"
                          >
                            <IconFolder hook="rtab1icon" className="ohf-audio-rtab-ico" />
                            <span className="ohf-audio-rtab-label" data-ohf-audio="rtab1label">
                              {STR.record}
                            </span>
                            <span className="ohf-audio-rtab-indicator" data-ohf-audio="indicator" />
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected="false"
                            data-state="inactive"
                            className="ohf-audio-rtab"
                            data-ohf-audio="rtab2"
                            tabIndex={-1}
                            data-orientation="horizontal"
                            aria-label={STR.guide}
                            aria-disabled="true"
                            data-off="동착 후속(이용 방법 착지)"
                          >
                            <IconBook hook="rtab2icon" className="ohf-audio-rtab-ico" />
                            <span className="ohf-audio-rtab-label" data-ohf-audio="rtab2label">
                              {STR.guide}
                            </span>
                          </button>
                        </div>
                    </div>
                  </div>
                  <div className="ohf-audio-rc-right" data-ohf-audio="rcright">
                    <div className="ohf-audio-rc-3" data-ohf-audio="rcw3">
                      <button
                        type="button"
                        className="ohf-audio-filter"
                        data-ohf-audio="filterbtn"
                        aria-label={STR.filter}
                        aria-expanded="false"
                        aria-disabled="true"
                        data-off="동착 후속(필터 착지)"
                      >
                        <IconFilterLines hook="filtericon" className="ohf-audio-filter-ico" />
                        <span className="ohf-audio-filter-label" data-ohf-audio="filterlabel">
                          {STR.filter}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ohf-audio-feedscrollwrap" data-ohf-audio="scrollwrap">
                <div className="ohf-audio-feedscroll" data-ohf-audio="feedscroll">
                  <div className="ohf-audio-hero" data-ohf-audio="herocard">
                    <div className="ohf-audio-hero-inner" data-ohf-audio="heroinner">
                      <div className="ohf-audio-hero-text" data-ohf-audio="herotext">
                        <h2 className="ohf-audio-hero-h2" data-ohf-audio="heroh2">
                          {STR.heroTitle}
                        </h2>
                        <p className="ohf-audio-hero-p" data-ohf-audio="herop">
                          {STR.heroSub}
                        </p>
                      </div>
                      <div className="ohf-audio-cards" data-ohf-audio="cardsrow">
                        <div className="ohf-audio-card" data-ohf-audio="card0">
                          <div className="ohf-audio-card-text" data-ohf-audio="card0text">
                            <h3 className="ohf-audio-card-h3" data-ohf-audio="card0h3">
                              {STR.card1Title}
                            </h3>
                            <p className="ohf-audio-card-p" data-ohf-audio="card0p" style={{ maxWidth: "266px" }}>
                              {STR.card1Sub}
                            </p>
                          </div>
                          <div className="ohf-audio-card-media" data-ohf-audio="card0media">
                            <div className="ohf-audio-card-media-inner" data-ohf-audio="card0inner">
                              <div className="ohf-audio-card-preload" data-ohf-audio="card0preload" />
                              <video
                                className="ohf-audio-card-video"
                                data-ohf-audio="card0video"
                                src="/audio/tts-left.mp4"
                                aria-label={STR.video1Label}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="metadata"
                              >
                                {STR.videoFallback}
                              </video>
                            </div>
                          </div>
                        </div>
                        <div className="ohf-audio-card" data-ohf-audio="card1">
                          <div className="ohf-audio-card-text" data-ohf-audio="card1text">
                            <h3 className="ohf-audio-card-h3" data-ohf-audio="card1h3">
                              {STR.card2Title}
                            </h3>
                            <p className="ohf-audio-card-p" data-ohf-audio="card1p" style={{ maxWidth: "328px" }}>
                              {STR.card2Sub}
                            </p>
                          </div>
                          <div className="ohf-audio-card-media" data-ohf-audio="card1media">
                            <div className="ohf-audio-card-media-inner" data-ohf-audio="card1inner">
                              <div className="ohf-audio-card-preload" data-ohf-audio="card1preload" />
                              <video
                                className="ohf-audio-card-video"
                                data-ohf-audio="card1video"
                                src="/audio/tts-right.mp4"
                                aria-label={STR.video2Label}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="metadata"
                              >
                                {STR.videoFallback}
                              </video>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 도움말 런처 — 정직 inert(동착 후속) */}
              <div className="ohf-audio-help" data-ohf-audio="help">
                <div className="ohf-audio-help-box" data-ohf-audio="helpbox" style={{ width: 32, height: 32 }}>
                  <div className="ohf-audio-help-btnwrap" data-ohf-audio="helpbtnwrap">
                    <button
                      type="button"
                      className="ohf-audio-help-btn"
                      data-ohf-audio="helpbtn"
                      aria-label={STR.helpLabel}
                      aria-haspopup="dialog"
                      aria-expanded="false"
                      aria-disabled="true"
                      data-off="동착 후속"
                    >
                      <span className="ohf-audio-help-glyph" data-ohf-audio="helpglyph" aria-hidden="true">
                        <IconHelp hook="helpsvg" className="ohf-audio-help-ico" />
                      </span>
                    </button>
                  </div>
                  <span className="ohf-audio-help-ring" data-ohf-audio="helpring" aria-hidden="true" />
                </div>
                <span
                  className="ohf-audio-help-glow"
                  data-ohf-audio="helpglow"
                  aria-hidden="true"
                  style={{ filter: "drop-shadow(rgb(209, 254, 23) 0px 0px 2px) drop-shadow(rgba(209, 254, 23, 0.7) 0px 0px 8px)", opacity: 0.032 }}
                >
                  <span className="ohf-audio-help-glow-inner" data-ohf-audio="helpglowinner">
                    <span className="ohf-audio-help-glow-spin" data-ohf-audio="helpglowspin" />
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
