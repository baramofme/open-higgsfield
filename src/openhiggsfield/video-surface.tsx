"use client";

/* =============================================================================
   video-surface.tsx — HF /ko/ai/video?model=minimax_h3 정적 화면 이식 (t_bb8f3edb)

   ground-truth: HF live CDP 1440×900 의 306개 가시 요소 실측
   (t_a1c5ed28 hf_video_ground_truth.json; rect + computed + attrs + own-text).
   트리의 태그·순서·깊이·own-text·attrs 를 실측 그대로 기계로 미러링했다(재해석 없음).
   각 요소는 data-ohf-video="<HF nid>" 앵커를 갖고, 비교는 nid 1:1 로 이루어진다.

   정직 marking 원칙:
   - aria-disabled + data-off="<사유>" → 정적으로 이식된 HF 요소(동작 착지 후속).
   - 실배선한 길: ① 프롬프트 에디터(타입 → useVideoPrompt), ② 영상 재생(교차
     관찰로 HF 와 같은 자동재생/일시정지), ③ 폼 제출 차단(의도된 정지),
     ④ 세그먼트 탭(레퍼런스↔프레임) 전환·화살표 로빙·indicator 실측 동속성
     (t_e0c64917 요소 1 — HF live 실측 ground-truth: anim_verify/segtab_report.json).

   생성물: landing_verify/gen_surface.py 가 ground-truth JSON 에서 이 파일의
   본문을, gen_css.py 가 computed 에서 video-surface.css 를 산출한다.
   ============================================================================= */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useVideoPrompt } from "@/generation/stores/prompt";
import "./video-surface.css";

/* ---- HF 실측에서 재생이 확인된 영상(115 플레이트 데모, 270/275 아카데미 단계) ----
   HF 는 교차 관찰로 play()/pause() 를 구동한다. 같은 메커니즘을 그대로 쓴다.
   muted 는 원문 attrs 에 없으므로 붙이지 않는다(비교는 attrs 원문 기준). */
const PLAYING = new Set(["115", "270", "275"]);

function useAutoPlayOnView() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("video[data-ohf-video]"))
      .filter((v) => PLAYING.has(v.dataset.ohfVideo || ""));
    if (!videos.length) return;
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const v = en.target as HTMLVideoElement;
        if (en.isIntersecting) {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause();
        }
      }
    }, { rootMargin: "120px 0px" });
    for (const v of videos) io.observe(v);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function VideoSurface() {
  const text = useVideoPrompt((s) => s.text);
  const setText = useVideoPrompt((s) => s.setText);
  const [placeholderShown, setPlaceholderShown] = useState(text.trim() === "");
  const editorRef = useRef<HTMLDivElement>(null);
  /* 에디터에서 마지막으로 동기화된 값(t_159e30db uncontrolled 전환). 이 값과
     store text 가 같으면 = 타이핑으로 변한 값 → 에디터 DOM 재서작성 생략. */
  const lastEditorTextRef = useRef<string | null>(null);
  const rootRef = useAutoPlayOnView();

  /* ---- 세그먼트 탭(레퍼런스↔프레임) 실배선 — t_e0c64917 요소 1 ----
     HF live 실측(anim_verify/segtab_report.json hf_behavior)으로 확정한 기계:
       · 클릭 = 선택 이동(수동 활성화). 이미 선택된 탭의 재클릭/Enter 는 no-op(s4 실측).
       · 화살표/Home/End = 포커스 로빙만(선택은 그대로 — s2/s3 실측).
       · Enter/Space = 포커스된 탭 활성화.
       · tabindex 는 포커스를跟随(roving), aria-selected·data-active·
         data-composite-item-active 는 선택을跟随(HF s1/s2 의 교차 실측).
       · data-activation-direction = 선택 이동 방향(left/right), 초기값 none
         (HF 원문 attrs. 리스트·루트·indicator 세 노드 모두 동일 값).
       · indicator CSS var 는 HF 산출식으로 재계산:
         left = offsetLeft - 1, right = 리스트폭 - (offsetLeft+탭폭) - 1,
         top/bottom = 3px, width = 탭폭. height = 32px 는 HF 탭 실측치
         (OHF 탭 24px 는 QA disclosed_geometry_residual 'content-driven' 기확정 잔차). */
  const SEG_TABS = ["128", "134"] as const;
  type SegTab = (typeof SEG_TABS)[number];
  const [segSel, setSegSel] = useState<SegTab>("134");    // HF 기본 선택=프레임(실측)
  const [segFocus, setSegFocus] = useState<SegTab>("134");
  const [segDir, setSegDir] = useState<"none" | "left" | "right">("none");
  const seg128 = useRef<HTMLButtonElement | null>(null);
  const seg134 = useRef<HTMLButtonElement | null>(null);
  const segList = useRef<HTMLDivElement | null>(null);
  const segInd = useRef<HTMLSpanElement | null>(null);
  const segActivate = (next: SegTab) => {
    if (next === segSel) return;
    setSegDir(SEG_TABS.indexOf(next) < SEG_TABS.indexOf(segSel) ? "left" : "right");
    setSegSel(next);
    setSegFocus(next);
  };
  useLayoutEffect(() => {
    const list = segList.current;
    const ind = segInd.current;
    const btn = segSel === "128" ? seg128.current : seg134.current;
    if (!list || !ind || !btn) return;
    const lr = list.getBoundingClientRect();
    const tr = btn.getBoundingClientRect();
    const left = Math.round(tr.left - lr.left) - 1;
    const right = Math.round(lr.right - tr.right) - 1;
    ind.style.setProperty("--active-tab-left", `${left}px`);
    ind.style.setProperty("--active-tab-right", `${right}px`);
    ind.style.setProperty("--active-tab-top", "3px");
    ind.style.setProperty("--active-tab-bottom", "3px");
    ind.style.setProperty("--active-tab-width", `${Math.round(tr.width)}px`);
    ind.style.setProperty("--active-tab-height", "32px");
  }, [segSel]);
  const segKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      segActivate(segFocus);
      return;
    }
    const i = SEG_TABS.indexOf(segFocus);
    let next: SegTab | null = null;
    if (e.key === "ArrowRight") next = SEG_TABS[(i + 1) % SEG_TABS.length];
    else if (e.key === "ArrowLeft") next = SEG_TABS[(i - 1 + SEG_TABS.length) % SEG_TABS.length];
    else if (e.key === "Home") next = SEG_TABS[0];
    else if (e.key === "End") next = SEG_TABS[SEG_TABS.length - 1];
    if (!next) return;
    e.preventDefault();
    setSegFocus(next);
    (next === "128" ? seg128 : seg134).current?.focus();
  };

  /* ---- 30.6 요소 4(t_594cd9af): 길이 다이얼 + 품질(해상도) 메뉴 — HF live 실측 기계(probe3/5/6) ----
     길이: 다이얼 5~15초. 실측 매핑: thumb left = 2.11 + (v-5)·23.14 px, fill = thumb left + 6 px,
     클릭 value = round(5 + (x - track.x - 3.11) / 23.14), 키보드 ±1·Home=min·End=max·valuetext "N초"(HF 실측).
     품질: 메뉴 실측 리스트 1항 ["2K"](probe6 라이브 펼침 실측 — 임의 리스트 금지 결정 준수;
     1080p/720p·disabled 3종 등은 게스트 세션 부재 → 인증 게이트 후속). header "품질"(12/16/500 white/.5),
     항목 144×36 radius8 pad 6/8/6/6 fs14 lh20 fw500, checked → bg white/.05 + 16px 체크 아이콘.
     열림/닫힘: 재클릭 토글·Escape·바깥 pointerdown — HF 실측 관찰(품질 reclick→closed, item click→closed).
     비율(ratio) 트리거: HF live 현재 부재(probe6 실측, 길이|품질 단일 행) → 이식하지 않음.
     (run389에서 확보했던 비율 GT는 이후 라이브에서 부재 확인 — 라이브 실측 우선 결정에 따라 미배선.) */
  const DUR_MIN = 5;
  const DUR_MAX = 15;
  const QUAL_OPTIONS = ["2K"] as const;
  const [durOpen, setDurOpen] = useState(false);
  const [durVal, setDurVal] = useState(5); // HF 실측 초기 5s
  const [qualOpen, setQualOpen] = useState(false);
  const [qualVal, setQualVal] = useState<(typeof QUAL_OPTIONS)[number]>("2K"); // HF 실측 초기 2K(checked)
  const durTrigger = useRef<HTMLButtonElement | null>(null);
  const durPanel = useRef<HTMLDivElement | null>(null);
  const durSlider = useRef<HTMLDivElement | null>(null);
  const durTrack = useRef<HTMLDivElement | null>(null);
  const qualTrigger = useRef<HTMLButtonElement | null>(null);
  const qualMenu = useRef<HTMLDivElement | null>(null);
  const [durPos, setDurPos] = useState({ l: 0, t: 0 });
  const [qualPos, setQualPos] = useState({ l: 0, t: 0 });

  /* popper 좌표 공식(HF live 실측 복원 — 게이트 2차 라이브 실측에서 재확정):
     dur wrap(fixed):  left = anchor.right + 8, top = anchor.bottom - 116 (= popperH 정렬 end)
       — HF translate(180,676) ↔ 트리거 bottom 792(dialogH 116) 실측.
     qual wrap(absolute): left = anchor.right + 8 + scrollX, top = anchor.bottom - 86 + scrollY
       — HF translate(335,706) ↔ 트리거 bottom 792(menuH 86) 실측.
     (구 probe5/6 의 +45/+16 오프셋은 쿠폰 팝업 이전 레이아웃에서 나온 것 — 현행 라이브가 end 정렬로 반증.) */
  const durThumbLeft = (v: number) => 2.11 + (v - DUR_MIN) * 23.14;
  const durFillWidth = (v: number) => durThumbLeft(v) + 6;
  /* HF live 게이트 실측으로 확정한 틱 소진 규칙: thumb가 틱 중심에 도달하면 그 틱을 소진.
     (HF: 10s 에서 thumb가 미드틱 116.82 도달 시 숨김 관찰; 15s 게이트 실측에서 ticks HF 0 —
     thumb가 두 틱을 모두 지나 두 틱 모두 소진. OHF 의 구 '범위 겹침' 규칙은 15s에서 미드틱을
     유지해 OHF 1 로 어긋났다 → 라이브 실측 우선 결정에 따라 '도달 시 소진'으로 정정.)
     엔드 틱(234.703)은 최대치(v>=DUR_MAX)에서 소진 — HF 라이브가 15s 엔드틱을 숨김(실측). */
  const durTickShown = (v: number, tickLeft: number, isEndTick: boolean) => {
    if (isEndTick && v >= DUR_MAX) return false;   // HF 실측: 최대(15s)에서 엔드 틱 소진
    return durThumbLeft(v) < tickLeft;             // thumb가 틱 중심 도달 시 소진
  };
  const durClamp = (v: number) => Math.min(DUR_MAX, Math.max(DUR_MIN, v));

  const durRecomputePos = () => {
    const t = durTrigger.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    setDurPos({ l: Math.round(r.right) + 8, t: Math.round(r.bottom) - 116 });
  };
  const qualRecomputePos = () => {
    const t = qualTrigger.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    setQualPos({ l: Math.round(r.right) + 8 + window.scrollX, t: Math.round(r.bottom) - 86 + window.scrollY });
  };

  useLayoutEffect(() => {
    if (durOpen) durRecomputePos();
    if (qualOpen) qualRecomputePos();
  }, [durOpen, qualOpen]);

  useEffect(() => {
    if (!durOpen && !qualOpen) return;
    const onResize = () => { durRecomputePos(); qualRecomputePos(); };
    const onScroll = () => { durRecomputePos(); qualRecomputePos(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setDurOpen(false); setQualOpen(false); }
    };
    const onDown = (e: PointerEvent) => {
      const tgt = e.target as Node;
      if (durOpen && !(durTrigger.current?.contains(tgt) || durPanel.current?.contains(tgt))) setDurOpen(false);
      if (qualOpen && !(qualTrigger.current?.contains(tgt) || qualMenu.current?.contains(tgt))) setQualOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [durOpen, qualOpen]);

  useEffect(() => {
    if (durOpen) durPanel.current?.focus({ preventScroll: true });
    if (qualOpen) qualMenu.current?.focus({ preventScroll: true });
  }, [durOpen, qualOpen]);

  const durSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = durTrack.current;
    if (!track) return;
    const tr = track.getBoundingClientRect();
    setDurVal(durClamp(Math.round(DUR_MIN + (e.clientX - tr.x - 3.11) / 23.14)));
  };
  const durSliderKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setDurVal(durClamp(durVal + 1)); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setDurVal(durClamp(durVal - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setDurVal(DUR_MIN); }
    else if (e.key === "End") { e.preventDefault(); setDurVal(DUR_MAX); }
  };

  /* 프롬프트 placeholder — 세그 탭 상태에 따라 HF 와 동일하게 전환됨 (t_bea84dee 요소 3):
     프레임: "시작 프레임과 끝 프레임은 Image 1, Image 2로…"
     레퍼런스: "입력 항목은 Image 1, Video 1, Audio 1로…" */
  const promptPlaceholder = segSel === "134"
    ? "영상을 설명해 주세요. 시작 프레임과 끝 프레임은 Image 1, Image 2로 지칭해 주세요."
    : "동영상을 설명해 주세요. 입력 항목은 Image 1, Video 1, Audio 1로 지칭해 주세요. @를 사용해 요소를 추가할 수 있어요";

  /* HF 포착 상태: 프롬프트 비어있음 → placeholder 가 보였다(실측 #184 가시). */
  useEffect(() => {
    setPlaceholderShown(text.trim() === "");
  }, [text]);

  /* 에디터는 일반 contenteditable(Lexical 원문은 미이식 — 정직 marking).
     t_159e30db uncontrolled 전환: 에디터 내부 DOM 은 브라우저가 소유한다
     (JSX children 제거 → React reconciler 가 contenteditable 자식을 diff 하지
     않아 브라우저 직접-변경과 removeChild 경주하지 않는다 → 크래시 원천 차단).
     입력 → useVideoPrompt(실배선; 이 화면에서 유일하게 실제로動く 타이핑 길). */
  const syncFromEditor = () => {
    const val = editorRef.current?.innerText ?? "";
    lastEditorTextRef.current = val; /* 이 값은 에디터에서 직접 나온 것 → 재서작성 생략 */
    setText(val);
  };

  /* 외부 setText(prompt-optimize·record 로드 등 비타이핑 경로)만 에디터 DOM 에
     명령형으로 반영. 타이핑으로 변한 값(lastEditorTextRef 와 동일)은 건너뛴다
     → React 가 브라우저 소유 contenteditable 을 건드리지 않아 removeChild 0. */
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (text !== lastEditorTextRef.current) {
      lastEditorTextRef.current = text;
      el.innerText = text;
    }
  }, [text]);

  return (
    <>
    <section className="ohf-vid-root" data-ohf-video="root" aria-label="비디오 만들기" lang="ko" ref={rootRef}>
<div className="ohf-vid-n102" data-ohf-video="102">
  <div className="ohf-vid-n103" data-ohf-video="103" data-prompt-card="true">
    <nav className="ohf-vid-n104" data-ohf-video="104">
      <div className="ohf-vid-n105" data-ohf-video="105">
        <div className="ohf-vid-n106" data-ohf-video="106" aria-disabled="true" data-off="서피스 탭 비디오 만들기(탭 전환 착지 후속)">
          비디오 만들기
        </div>
        <div className="ohf-vid-n107" data-ohf-video="107" aria-disabled="true" data-off="서피스 탭 비디오 편집(탭 전환 착지 후속)">
          비디오 편집
        </div>
        <div className="ohf-vid-n108" data-ohf-video="108" aria-disabled="true" data-off="서피스 탭 Motion Control(탭 전환 착지 후속)">
          Motion Control
        </div>
      </div>
    </nav>
    <div className="ohf-vid-n109" data-ohf-video="109">
      <div className="ohf-vid-n110" data-ohf-video="110">
        <form
              className="ohf-vid-n111"
              data-ohf-video="111"
              data-tour-anchor="tour-video-form"
              onSubmit={(e) => {
                /* 생성 실행 착지 전까지 제출만 차단(정직 marking). */
                e.preventDefault();
              }}
            >
          <div className="ohf-vid-n112" data-ohf-video="112" data-prompt-column="true" style={{ "--prompt-max-height": "168px" }}>
            <fieldset className="ohf-vid-n113" data-ohf-video="113">
              <figure className="ohf-vid-n114" data-ohf-video="114" tabIndex={-1} role="button" aria-disabled="true" data-off="피겨 카드(모델 데모 변경 착지 후속)">
                <video className="ohf-vid-n115" data-ohf-video="115" loop playsInline disablePictureInPicture preload="none" webkit-playsinline="" src="/ohf-video/minimax-h3-demo.mp4" muted>
                  사용 중인 브라우저가 영상을 지원하지 않아요.
                </video>
                <div className="ohf-vid-n116" data-ohf-video="116" />
                <div className="ohf-vid-n117" data-ohf-video="117" />
                <figcaption className="ohf-vid-n118" data-ohf-video="118">
                  <p className="ohf-vid-n119" data-ohf-video="119">
                    General
                  </p>
                  <p className="ohf-vid-n120" data-ohf-video="120">
                    MiniMax H3
                  </p>
                </figcaption>
                <div className="ohf-vid-n121" data-ohf-video="121">
                  <button className="ohf-vid-n122" data-ohf-video="122" type="button" aria-disabled="true" data-off="변경 배지(모델 변경 착지 후속)">
                    변경
                    <svg className="ohf-vid-n123" data-ohf-video="123" width="20" height="20" viewBox="0 0 20 20">
                      <path className="ohf-vid-n124" data-ohf-video="124" d="M13.5479 2.14282C14.1661 1.5247 15.1679 1.5247 15.7861 2.14282L18.3584 4.71411C18.9761 5.33243 18.9764 6.33519 18.3584 6.95337L7.31641 17.9954C7.01974 18.2919 6.61689 18.459 6.19727 18.4592H2.79199C2.37808 18.4592 2.04248 18.123 2.04199 17.7092V14.304C2.042 13.8842 2.20904 13.4817 2.50586 13.1848L11" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </figure>
            </fieldset>
            <div className="ohf-vid-n125" data-ohf-video="125">
              <div className="ohf-vid-n126" data-ohf-video="126" data-orientation="horizontal" data-activation-direction={segDir} style={{ "--q-tint": "var(--hf-color-brand-primary)", "--q-tint-fg": "var(--hf-color-text-inverse)" }}>
                <div className="ohf-vid-n127" data-ohf-video="127" data-orientation="horizontal" data-activation-direction={segDir} role="tablist" ref={segList} onKeyDown={segKey}>
                  <button className="ohf-vid-n128" data-ohf-video="128" type="button" data-orientation="horizontal" aria-disabled="false" ref={seg128} tabIndex={segFocus === "128" ? 0 : -1} role="tab" aria-selected={segSel === "128" ? "true" : "false"} onClick={() => segActivate("128")} onFocus={() => setSegFocus("128")} {...(segSel === "128" ? { "data-active": "", "data-composite-item-active": "" } : {})}>
                    <span className="ohf-vid-n129" data-ohf-video="129">
                      <span className="ohf-vid-n130" data-ohf-video="130">
                        <svg className="ohf-vid-n131" data-ohf-video="131" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path className="ohf-vid-n132" data-ohf-video="132" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 5.75v12.5m4-13.5v14.5m4 .017V4.734a1 1 0 0 1 1.207-.979l6.5 1.374a1 1 0 0 1 .793.979v11.784a1 1 0 0 1-.793.979l-6.5 1.374a1 1 0 0 1-1.207-.979" />
                        </svg>
                      </span>
                      <span className="ohf-vid-n133" data-ohf-video="133">
                        레퍼런스
                      </span>
                    </span>
                  </button>
                  <button className="ohf-vid-n134" data-ohf-video="134" type="button" data-orientation="horizontal" aria-disabled="false" ref={seg134} tabIndex={segFocus === "134" ? 0 : -1} role="tab" aria-selected={segSel === "134" ? "true" : "false"} onClick={() => segActivate("134")} onFocus={() => setSegFocus("134")} {...(segSel === "134" ? { "data-active": "", "data-composite-item-active": "" } : {})}>
                    <span className="ohf-vid-n135" data-ohf-video="135">
                      <span className="ohf-vid-n136" data-ohf-video="136">
                        <svg className="ohf-vid-n137" data-ohf-video="137" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path className="ohf-vid-n138" data-ohf-video="138" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.5 5.75h2.75a1 1 0 0 1 1 1v10.5a1 1 0 0 1-1 1H17.5m-11 0H3.75a1 1 0 0 1-1-1V6.75a1 1 0 0 1 1-1H6.5m10-2h-9a1 1 0 0 0-1 1v14.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V4.75a1 1 0 0 0-1-1" />
                        </svg>
                      </span>
                      <span className="ohf-vid-n139" data-ohf-video="139">
                        프레임
                      </span>
                    </span>
                  </button>
                  <span className="ohf-vid-n140" data-ohf-video="140" data-orientation="horizontal" data-activation-direction={segDir} role="presentation" ref={segInd} style={{ "--active-tab-left": "152px", "--active-tab-right": "3px", "--active-tab-top": "3px", "--active-tab-bottom": "3px", "--active-tab-width": "145px", "--active-tab-height": "32px" }} />
                </div>
              </div>
              <div className="ohf-vid-n141" data-ohf-video="141">
                {segSel === "134" ? (
                <div className="ohf-vid-n142" data-ohf-video="142">
                  <div className="ohf-vid-n143" data-ohf-video="143">
                    <div className="ohf-vid-n144" data-ohf-video="144">
                      <div className="ohf-vid-n145" data-ohf-video="145" data-state="empty">
                        <span className="ohf-vid-n146" data-ohf-video="146" style={{ "--q-tint": "var(--hf-color-text-primary, var(--hf-color-brand-primary))", "--q-tint-bg": "var(--hf-color-background-secondary-strong, var(--hf-color-brand-primary))", "--q-tint-fg": "var(--hf-color-text-primary)", "--q-tint-border": "var(--hf-color-border-strong, var(--hf-color-brand-primary))" }}>
                          <span className="ohf-vid-n147" data-ohf-video="147">
                            선택 사항
                          </span>
                        </span>
                        <label className="ohf-vid-n148" data-ohf-video="148" aria-disabled="true" data-off="시작 프레임 드롭존(첨부 착지 후속)">
                          <div className="ohf-vid-n149" data-ohf-video="149">
                            <input className="ohf-vid-n150" data-ohf-video="150" accept="image/jpeg,image/jpg,image/png,image/webp" type="file" />
                            <span className="ohf-vid-n151" data-ohf-video="151">
                              <span className="ohf-vid-n152" data-ohf-video="152">
                                <span className="ohf-vid-n153" data-ohf-video="153">
                                  <span className="ohf-vid-n154" data-ohf-video="154" aria-hidden="true" />
                                  <span className="ohf-vid-n155" data-ohf-video="155" aria-hidden="true" />
                                  <span className="ohf-vid-n156" data-ohf-video="156">
                                    <svg className="ohf-vid-n157" data-ohf-video="157" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                      <g className="ohf-vid-n158" data-ohf-video="158" fill="url(#gradient-badge-image)">
                                        <path className="ohf-vid-n159" data-ohf-video="159" fillRule="evenodd" clipRule="evenodd" d="M9.941 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22.781 18.34a8 8 0 0 0-.24-.82v-.03c-.82-2.5-1.67-4.46-2.54-5.81-.44-.67-.9-1.22-1.4-1.6-.51-.38-1.09-.62-1.72-.56-1.86.15-3.12 1.68-4.01 2.84-.12.16-.24.32-.35.46-.33.43-.61.81-.89 1.11-.39.42-.6.49-.69.49-.19 0-.41-.06-.72-.22-.27-.14-.55-.33-.88-.54-." />
                                      </g>
                                    </svg>
                                  </span>
                                </span>
                              </span>
                              <span className="ohf-vid-n160" data-ohf-video="160">
                                <span className="ohf-vid-n161" data-ohf-video="161">
                                  시작 프레임
                                </span>
                              </span>
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="ohf-vid-n162" data-ohf-video="162" data-disabled="true">
                      <div className="ohf-vid-n163" data-ohf-video="163" data-state="empty">
                        <span className="ohf-vid-n164" data-ohf-video="164" style={{ "--q-tint": "var(--hf-color-text-primary, var(--hf-color-brand-primary))", "--q-tint-bg": "var(--hf-color-background-secondary-strong, var(--hf-color-brand-primary))", "--q-tint-fg": "var(--hf-color-text-primary)", "--q-tint-border": "var(--hf-color-border-strong, var(--hf-color-brand-primary))" }}>
                          <span className="ohf-vid-n165" data-ohf-video="165">
                            선택 사항
                          </span>
                        </span>
                        <label className="ohf-vid-n166" data-ohf-video="166" aria-disabled="true" data-off="종료 프레임 드롭존(HF 데이터 비활성·첨부 착지 후속)">
                          <div className="ohf-vid-n167" data-ohf-video="167">
                            <input className="ohf-vid-n168" data-ohf-video="168" accept="image/jpeg,image/jpg,image/png,image/webp" type="file" />
                            <span className="ohf-vid-n169" data-ohf-video="169">
                              <span className="ohf-vid-n170" data-ohf-video="170">
                                <span className="ohf-vid-n171" data-ohf-video="171">
                                  <span className="ohf-vid-n172" data-ohf-video="172" aria-hidden="true" />
                                  <span className="ohf-vid-n173" data-ohf-video="173" aria-hidden="true" />
                                  <span className="ohf-vid-n174" data-ohf-video="174">
                                    <svg className="ohf-vid-n175" data-ohf-video="175" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                      <g className="ohf-vid-n176" data-ohf-video="176" fill="url(#gradient-badge-image)">
                                        <path className="ohf-vid-n177" data-ohf-video="177" fillRule="evenodd" clipRule="evenodd" d="M9.941 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22.781 18.34a8 8 0 0 0-.24-.82v-.03c-.82-2.5-1.67-4.46-2.54-5.81-.44-.67-.9-1.22-1.4-1.6-.51-.38-1.09-.62-1.72-.56-1.86.15-3.12 1.68-4.01 2.84-.12.16-.24.32-.35.46-.33.43-.61.81-.89 1.11-.39.42-.6.49-.69.49-.19 0-.41-.06-.72-.22-.27-.14-.55-.33-.88-.54-." />
                                      </g>
                                    </svg>
                                  </span>
                                </span>
                              </span>
                              <span className="ohf-vid-n178" data-ohf-video="178">
                                <span className="ohf-vid-n179" data-ohf-video="179">
                                  종료 프레임
                                </span>
                              </span>
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                ) : (
                <div className="ohf-vid-ref-uploader" aria-disabled="true" data-off="레퍼런스 업로더(실첨부 착지 후속)">
                  <div className="ohf-vid-ref-inner">
                    <span className="ohf-vid-ref-dashed" aria-hidden="true" />
                    <button className="ohf-vid-ref-btn" type="button" aria-label="레퍼런스 추가하기" tabIndex={-1} />
                    <span className="ohf-vid-ref-icons">
                      <span className="ohf-vid-ref-icon" />
                      <span className="ohf-vid-ref-icon ohf-vid-ref-icon-overlap" />
                      <span className="ohf-vid-ref-icon ohf-vid-ref-icon-overlap" />
                    </span>
                    <span className="ohf-vid-ref-text">
                      <span className="ohf-vid-ref-title">레퍼런스 추가하기</span>
                      <span className="ohf-vid-ref-sub">이미지와 요소 최대 9개, 동영상 3개, 오디오 파일 3개까지</span>
                    </span>
                  </div>
                </div>
                )}
                <div className="ohf-vid-n180" data-ohf-video="180" data-prompt-field="true">
                  <div className="ohf-vid-n181" data-ohf-video="181">
                    <p className="ohf-vid-n182" data-ohf-video="182">
                      프롬프트
                    </p>
                    <div
                      ref={editorRef}
                      className="ohf-vid-n183"
                      data-ohf-video="183"
                      aria-label="프롬프트"
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      spellCheck
                      aria-placeholder={promptPlaceholder}
                      data-lexical-editor="true"
                      style={{ userSelect: "text", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      onInput={syncFromEditor}
                    />
                    {placeholderShown ? (
                      <div className="ohf-vid-n184" data-ohf-video="184" data-prompt-placeholder="true">
                        {promptPlaceholder}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="ohf-vid-n185" data-ohf-video="185">
                <div className="ohf-vid-n186" data-ohf-video="186" data-tour-anchor="tour-video-model">
                  <button className="ohf-vid-n187" data-ohf-video="187" type="button" aria-label="모델" data-model-select-trigger="true" data-state="closed" aria-disabled="true" data-off="모델 트리거(모델 패널 착지 후속)">
                    <div className="ohf-vid-n188" data-ohf-video="188">
                      <span className="ohf-vid-n189" data-ohf-video="189">
                        모델
                      </span>
                      <div className="ohf-vid-n190" data-ohf-video="190">
                        <div className="ohf-vid-n191" data-ohf-video="191">
                          <p className="ohf-vid-n192" data-ohf-video="192">
                            MiniMax H3
                          </p>
                          <span className="ohf-vid-n193" data-ohf-video="193">
                            <svg className="ohf-vid-n194" data-ohf-video="194" width="20" height="20" viewBox="0 0 20 20">
                              <path className="ohf-vid-n195" data-ohf-video="195" fillRule="evenodd" clipRule="evenodd" d="M13.565 1.667c.963 0 1.744.772 1.744 1.725V13.81a.616.616 0 0 0 .62.59.616.616 0 0 0 .62-.59V7.582a1.716 1.716 0 0 1 1.725-1.708A1.717 1.717 0 0 1 20 7.584v5.467a.54.54 0 0 1-.75.498.542.542 0 0 1-.337-.498V7.584a.635.635 0 0 0-.639-.632.635.635 0 0 0-.638.632v6.226a1.698 1.698 0 0 1-1.707 1.689 1.6" fill="currentColor" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                    <svg className="ohf-vid-n196" data-ohf-video="196" width="20" height="20" viewBox="0 0 20 20">
                      <path className="ohf-vid-n197" data-ohf-video="197" fillRule="evenodd" clipRule="evenodd" d="M3.81344 7.97848C4.0087 7.78322 4.32528 7.78322 4.52055 7.97848L10.0003 13.4583L15.4801 7.97848C15.6754 7.78322 15.9919 7.78322 16.1872 7.97848C16.3825 8.17374 16.3825 8.49032 16.1872 8.68558L10.3539 14.5189L10.0003 14.8725L9.64677 14.5189L3.81344 8.68558C3.61818 8.49032 3.61818 8.17374 3.81344 7.97" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </div>
              <fieldset className="ohf-vid-n198" data-ohf-video="198">
                <button className="ohf-vid-n199" data-ohf-video="199" type="button" data-form-kit-setting-button="" translate="no" aria-label="길이" aria-haspopup="dialog" aria-expanded={durOpen} data-state={durOpen ? "open" : "closed"} ref={durTrigger} onClick={() => setDurOpen((v) => !v)}>
                  <span className="ohf-vid-n200" data-ohf-video="200">
                    <span className="ohf-vid-n201" data-ohf-video="201">
                      길이
                    </span>
                    <span className="ohf-vid-n202" data-ohf-video="202">
                      {durVal}s
                    </span>
                  </span>
                  <svg className="ohf-vid-n203" data-ohf-video="203" width="20" height="20" viewBox="0 0 20 20">
                    <path className="ohf-vid-n204" data-ohf-video="204" fillRule="evenodd" clipRule="evenodd" d="M3.81344 7.97848C4.0087 7.78322 4.32528 7.78322 4.52055 7.97848L10.0003 13.4583L15.4801 7.97848C15.6754 7.78322 15.9919 7.78322 16.1872 7.97848C16.3825 8.17374 16.3825 8.49032 16.1872 8.68558L10.3539 14.5189L10.0003 14.8725L9.64677 14.5189L3.81344 8.68558C3.61818 8.49032 3.61818 8.17374 3.81344 7.97" fill="currentColor" />
                  </svg>
                </button>
                {/* 품질(해상도) 트리거 — HF live 실측(probe6): 게스트 세션에서 메뉴 실재(147×54, aria-haspopup=menu,
                     tabindex 0, aria-expanded 토글, 데이터-state 없음). 항목 리스트 라이브 펼침 실측 1항 ["2K"].
                     1080p/720p·disabled 3종 전환은 게스트 부재(인증 게이트) → 후속 카드. run389 의 honest-inert 마커는
                     라이브 실측에서 반증되어 제거(실배선). 비율 트리거는 HF live 현행 부재(probe6) → 미이식. */}
                <button className="ohf-vid-n205" data-ohf-video="205" type="button" data-form-kit-setting-button="" aria-label="품질" tabIndex={0} aria-haspopup="menu" aria-expanded={qualOpen} ref={qualTrigger} onClick={() => setQualOpen((v) => !v)}>
                  <span className="ohf-vid-n206" data-ohf-video="206">
                    <span className="ohf-vid-n207" data-ohf-video="207">
                      품질
                    </span>
                    <span className="ohf-vid-n208" data-ohf-video="208">
                      {qualVal}
                    </span>
                  </span>
                  <svg className="ohf-vid-n209" data-ohf-video="209" width="20" height="20" viewBox="0 0 20 20">
                    <path className="ohf-vid-n210" data-ohf-video="210" fillRule="evenodd" clipRule="evenodd" d="M3.81344 7.97848C4.0087 7.78322 4.32528 7.78322 4.52055 7.97848L10.0003 13.4583L15.4801 7.97848C15.6754 7.78322 15.9919 7.78322 16.1872 7.97848C16.3825 8.17374 16.3825 8.49032 16.1872 8.68558L10.3539 14.5189L10.0003 14.8725L9.64677 14.5189L3.81344 8.68558C3.61818 8.49032 3.61818 8.17374 3.81344 7.97" fill="currentColor" />
                  </svg>
                </button>
              </fieldset>
            </div>
          </div>
          <div className="ohf-vid-n211" data-ohf-video="211">
            <div className="ohf-vid-n212" data-ohf-video="212">
              <div className="ohf-vid-n213" data-ohf-video="213" data-tour-anchor="tour-generate-button">
                <button className="ohf-vid-n214" data-ohf-video="214" type="submit" aria-busy="false">
                  생성하기
                  <div className="ohf-vid-n215" data-ohf-video="215">
                    <svg className="ohf-vid-n216" data-ohf-video="216" width="20" height="20" viewBox="0 0 20 20">
                      <path className="ohf-vid-n217" data-ohf-video="217" d="m11.852 4.217-.13-.978a.476.476 0 0 0-.943 0l-.13.978A6.41 6.41 0 0 1 5.14 9.724l-.978.13a.476.476 0 0 0 0 .943l.978.13a6.41 6.41 0 0 1 5.507 5.508l.13.978a.476.476 0 0 0 .944 0l.13-.978a6.41 6.41 0 0 1 5.508-5.507l.977-.13a.476.476 0 0 0 0-.944l-.977-.13a6.41 6.41 0 0 1-5.508-5.507Zm-7.2 10.54.169-" fill="currentColor" />
                    </svg>
                    <span className="ohf-vid-n218" data-ohf-video="218" translate="no">
                      20
                      <span className="ohf-vid-n219" data-ohf-video="219" />
                    </span>
                    <span className="ohf-vid-n220" data-ohf-video="220" translate="no">
                      10
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div className="ohf-vid-n221" data-ohf-video="221">
    <div className="ohf-vid-n222" data-ohf-video="222">
      <div className="ohf-vid-n223" data-ohf-video="223">
        <div className="ohf-vid-n224" data-ohf-video="224" aria-hidden="false">
          <header className="ohf-vid-n225" data-ohf-video="225" data-feed-filter-tooltip-header="true">
            <div className="ohf-vid-n226" data-ohf-video="226">
              <div className="ohf-vid-n227" data-ohf-video="227" data-orientation="horizontal" style={{ "--q-tint": "var(--hf-color-brand-primary)", "--q-tint-fg": "var(--hf-color-text-inverse)" }}>
                <div className="ohf-vid-n228" data-ohf-video="228" data-orientation="horizontal" role="tablist" aria-label="페이지 보기">
                  <button className="ohf-vid-n229" data-ohf-video="229" type="button" data-orientation="horizontal" aria-disabled="false" tabIndex={-1} role="tab" aria-selected="false" aria-disabled="true" data-off="피드 탭 기록(탭 전환 착지 후속)">
                    <span className="ohf-vid-n230" data-ohf-video="230">
                      <span className="ohf-vid-n231" data-ohf-video="231">
                        <svg className="ohf-vid-n232" data-ohf-video="232" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path className="ohf-vid-n233" data-ohf-video="233" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.75 4.75v13.5a1 1 0 0 0 1 1h16.5a1 1 0 0 0 1-1V7.75a1 1 0 0 0-1-1h-7.715a1 1 0 0 1-.832-.445l-1.406-2.11a1 1 0 0 0-.832-.445H3.75a1 1 0 0 0-1 1" />
                        </svg>
                      </span>
                      <span className="ohf-vid-n234" data-ohf-video="234">
                        기록
                      </span>
                    </span>
                  </button>
                  <button className="ohf-vid-n235" data-ohf-video="235" type="button" data-active="" data-orientation="horizontal" aria-disabled="false" tabIndex={0} role="tab" aria-selected="true" aria-disabled="true" data-off="피드 탭 이용 방법(HF 기본 선택·실전환은 FeedHeader 가 보유)">
                    <span className="ohf-vid-n236" data-ohf-video="236">
                      <span className="ohf-vid-n237" data-ohf-video="237">
                        <svg className="ohf-vid-n238" data-ohf-video="238" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path className="ohf-vid-n239" data-ohf-video="239" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 21.25a3.66 3.66 0 0 0-1.35-1.478 3.64 3.64 0 0 0-1.927-.522H2.75a1 1 0 0 1-1-1V5.75a1 1 0 0 1 1-1H9a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6.25a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-5.973a3.64 3.64 0 0 0-1.926.522A3.66 3.66 0 0 0 12 21.25m0-13.5v13.5" />
                        </svg>
                      </span>
                      <span className="ohf-vid-n240" data-ohf-video="240">
                        이용 방법
                      </span>
                    </span>
                  </button>
                  <span className="ohf-vid-n241" data-ohf-video="241" data-orientation="horizontal" role="presentation" style={{ "--active-tab-left": "62.0938567132116px", "--active-tab-right": "-0.4688567132116077px", "--active-tab-top": "0px", "--active-tab-bottom": "0px", "--active-tab-width": "83.375px", "--active-tab-height": "32px" }} />
                </div>
              </div>
              <div className="ohf-vid-n242" data-ohf-video="242" aria-hidden="true">
                <div className="ohf-vid-n243" data-ohf-video="243" data-feed-filter-tooltip-anchor="true">
                  <button className="ohf-vid-n244" data-ohf-video="244" type="button" aria-label="필터" data-ignore-marquee="true" tabIndex={0} aria-haspopup="menu" aria-expanded="false" aria-disabled="true" data-off="필터(피드 필터 착지 후속)">
                    <svg className="ohf-vid-n245" data-ohf-video="245" aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path className="ohf-vid-n246" data-ohf-video="246" fillRule="evenodd" clipRule="evenodd" d="M2 4.75C2 4.33579 2.33579 4 2.75 4H21.25C21.6642 4 22 4.33579 22 4.75C22 5.16421 21.6642 5.5 21.25 5.5H2.75C2.33579 5.5 2 5.16421 2 4.75ZM5 12C5 11.5858 5.33579 11.25 5.75 11.25H18.25C18.6642 11.25 19 11.5858 19 12C19 12.4142 18.6642 12.75 18.25 12.75H5.75C5.33579 12.75 5 12.4142 5 12ZM8 19.25C8 18." fill="currentColor" />
                    </svg>
                    <span className="ohf-vid-n247" data-ohf-video="247">
                      필터
                    </span>
                  </button>
                </div>
                <div className="ohf-vid-n248" data-ohf-video="248" data-feed-filter-tooltip-anchor="true">
                  <button className="ohf-vid-n249" data-ohf-video="249" type="button" aria-label="보기" data-ignore-marquee="true" tabIndex={0} aria-haspopup="menu" aria-expanded="false" aria-disabled="true" data-off="보기(피드 보기 착지 후속)">
                    <svg className="ohf-vid-n250" data-ohf-video="250" aria-hidden="true" width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path className="ohf-vid-n251" data-ohf-video="251" d="M3.75 5.35C3.75 4.78995 3.75 4.50992 3.85899 4.29601C3.95487 4.10785 4.10785 3.95487 4.29601 3.85899C4.50992 3.75 4.78995 3.75 5.35 3.75H10.25V10.25H3.75V5.35Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path className="ohf-vid-n252" data-ohf-video="252" d="M13.75 3.75H18.65C19.2101 3.75 19.4901 3.75 19.704 3.85899C19.8922 3.95487 20.0451 4.10785 20.141 4.29601C20.25 4.50992 20.25 4.78995 20.25 5.35V10.25H13.75V3.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path className="ohf-vid-n253" data-ohf-video="253" d="M3.75 13.75H10.25V20.25H5.35C4.78995 20.25 4.50992 20.25 4.29601 20.141C4.10785 20.0451 3.95487 19.8922 3.85899 19.704C3.75 19.4901 3.75 19.2101 3.75 18.65V13.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path className="ohf-vid-n254" data-ohf-video="254" d="M13.75 13.75H20.25V18.65C20.25 19.2101 20.25 19.4901 20.141 19.704C20.0451 19.8922 19.8922 20.0451 19.704 20.141C19.4901 20.25 19.2101 20.25 18.65 20.25H13.75V13.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="ohf-vid-n255" data-ohf-video="255">
                      보기
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </header>
        </div>
        <div className="ohf-vid-n256" data-ohf-video="256">
          <div className="ohf-vid-n257" data-ohf-video="257">
            <section className="ohf-vid-n258" data-ohf-video="258">
              <header className="ohf-vid-n259" data-ohf-video="259">
                <h1 className="ohf-vid-n260" data-ohf-video="260">
                  클릭 한 번으로 영상 만들기
                </h1>
                <p className="ohf-vid-n261" data-ohf-video="261">
                  카메라 제어, 프레이밍, 고품질 VFX를 위한 250개 이상의 프리셋, 또는 일반 프리셋으로 직접 조정할 수도 있어요.
                </p>
              </header>
              <div className="ohf-vid-n262" data-ohf-video="262">
                <article className="ohf-vid-n263" data-ohf-video="263">
                  <figure className="ohf-vid-n264" data-ohf-video="264">
                    <img className="ohf-vid-n265" data-ohf-video="265" alt="이미지 추가하기" loading="lazy" decoding="async" data-loaded-src="https://higgsfield.ai/cdn-cgi/image/fit=scale-down,format=webp,onerror=redirect,width=1920,quality=85/https://static.higgsfield.ai/ko/feed/step-1-v2.webp" src="/ohf-video/step-1-v2.webp" />
                  </figure>
                  <h2 className="ohf-vid-n266" data-ohf-video="266">
                    이미지 추가하기
                  </h2>
                  <p className="ohf-vid-n267" data-ohf-video="267">
                    이미지를 업로드하거나 생성해 애니메이션을 시작해 보세요
                  </p>
                </article>
                <article className="ohf-vid-n268" data-ohf-video="268">
                  <figure className="ohf-vid-n269" data-ohf-video="269">
                    <video className="ohf-vid-n270" data-ohf-video="270" loop playsInline disablePictureInPicture preload="none" aria-label="프리셋 선택하기" webkit-playsinline="" src="/ohf-video/step-2.mp4" muted>
                      사용 중인 브라우저가 영상을 지원하지 않아요.
                    </video>
                  </figure>
                  <h2 className="ohf-vid-n271" data-ohf-video="271">
                    프리셋 선택하기
                  </h2>
                  <p className="ohf-vid-n272" data-ohf-video="272">
                    프리셋을 선택해 이미지 움직임을 제어해 보세요
                  </p>
                </article>
                <article className="ohf-vid-n273" data-ohf-video="273">
                  <figure className="ohf-vid-n274" data-ohf-video="274">
                    <video className="ohf-vid-n275" data-ohf-video="275" loop playsInline disablePictureInPicture preload="none" aria-label="영상 받기" webkit-playsinline="" src="/ohf-video/step-3.mp4" muted>
                      사용 중인 브라우저가 영상을 지원하지 않아요.
                    </video>
                  </figure>
                  <h2 className="ohf-vid-n276" data-ohf-video="276">
                    영상 받기
                  </h2>
                  <p className="ohf-vid-n277" data-ohf-video="277">
                    생성 버튼을 눌러 최종 애니메이션 비디오를 완성해 보세요!
                  </p>
                </article>
              </div>
            </section>
          </div>
          <div className="ohf-vid-n278" data-ohf-video="278">
            <a className="ohf-vid-n279" data-ohf-video="279" href="/ko/academy" aria-disabled="true" data-off="아카데미 초대(라우팅 착지 후속)">
              <div className="ohf-vid-n280" data-ohf-video="280" aria-hidden="true">
                <div className="ohf-vid-n281" data-ohf-video="281">
                  <div className="ohf-vid-n282" data-ohf-video="282">
                    <img className="ohf-vid-n283" data-ohf-video="283" alt="" loading="lazy" decoding="async" data-loaded-src="https://higgsfield.ai/cdn-cgi/image/fit=scale-down,format=webp,onerror=redirect,width=1920,quality=85/https://static.higgsfield.ai/academy/catalog/learning-ugc-creature.webp" src="/ohf-video/academy/learning-ugc-creature.webp" />
                    <span className="ohf-vid-n284" data-ohf-video="284" />
                  </div>
                  <div className="ohf-vid-n285" data-ohf-video="285">
                    <img className="ohf-vid-n286" data-ohf-video="286" alt="" loading="lazy" decoding="async" data-loaded-src="https://higgsfield.ai/cdn-cgi/image/fit=scale-down,format=webp,onerror=redirect,width=1920,quality=85/https://static.higgsfield.ai/academy/catalog/learning-ugc-sneakers.webp" src="/ohf-video/academy/learning-ugc-sneakers.webp" />
                    <span className="ohf-vid-n287" data-ohf-video="287" />
                  </div>
                  <div className="ohf-vid-n288" data-ohf-video="288">
                    <img className="ohf-vid-n289" data-ohf-video="289" alt="" loading="lazy" decoding="async" data-loaded-src="https://higgsfield.ai/cdn-cgi/image/fit=scale-down,format=webp,onerror=redirect,width=1920,quality=85/https://static.higgsfield.ai/ko/academy/catalog/learning-ugc-product.webp" src="/ohf-video/academy/learning-ugc-product.webp" />
                    <span className="ohf-vid-n290" data-ohf-video="290" />
                  </div>
                </div>
              </div>
              <span className="ohf-vid-n291" data-ohf-video="291">
                <span className="ohf-vid-n292" data-ohf-video="292">
                  어디서 시작할지 모르겠나요?
                </span>
                <span className="ohf-vid-n293" data-ohf-video="293">
                  아카데미로 이동해 여정을 시작해 보세요
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
      <div className="ohf-vid-n294" data-ohf-video="294">
        <div className="ohf-vid-n295" data-ohf-video="295">
          <div className="ohf-vid-n296" data-ohf-video="296">
            <button className="ohf-vid-n297" data-ohf-video="297" type="button" data-help-launcher-trigger="true" aria-label="도움이 필요하세요?" aria-haspopup="dialog" aria-expanded="false" aria-disabled="true" data-off="도움말 런처(도움말 패널 착지 후속)">
              <span className="ohf-vid-n298" data-ohf-video="298" aria-hidden="true">
                <svg className="ohf-vid-n299" data-ohf-video="299" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path className="ohf-vid-n300" data-ohf-video="300" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15.75c0-4.25 4.25-3.317 4.25-6.976 0-4.987-7.385-5.446-8.388-.774" />
                  <path className="ohf-vid-n301" data-ohf-video="301" fill="currentColor" d="M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2" />
                </svg>
              </span>
            </button>
          </div>
          <span className="ohf-vid-n302" data-ohf-video="302" aria-hidden="true" />
        </div>
        <span className="ohf-vid-n303" data-ohf-video="303" aria-hidden="true">
          <span className="ohf-vid-n304" data-ohf-video="304">
            <span className="ohf-vid-n305" data-ohf-video="305" />
          </span>
        </span>
      </div>
    </div>
  </div>
</div>
    </section>
    {/* ---- 요소 4 포털(HF 구조 미러): radix popper 포털 ↔ OHF createPortal(body) + wrap z1002.
           HF 실측: dur wrap = fixed/left0/top0/translate(l,t)/min-width:max-content/z1002(probe5),
           qual wrap = absolute/left0/top0/translate(l,t)/z1002(probe6). 좌표는 매 open 시 트리거 rect 에서
           재계산(카드 결정: 상호작용 직전 좌표 재계산·원점 상대 정규화). ---- */}
    {durOpen ? createPortal(
      <div className="ohf-vid-dur-wrap ohf" style={{ transform: `translate(${durPos.l}px, ${durPos.t}px)` }}>
        <div className="ohf-vid-dur-dialog" role="dialog" tabIndex={-1} data-state="open" data-side="right" data-align="end" ref={durPanel}>
          <div className="ohf-vid-dur-inner">
            <div className="ohf-vid-dur-headwrap">
              <div className="ohf-vid-dur-head">
                <span className="ohf-vid-dur-label">총 길이</span>
                <span className="ohf-vid-dur-value">{durVal}s</span>
              </div>
            </div>
            <div className="ohf-vid-dur-slider" role="slider" tabIndex={0} aria-orientation="horizontal"
                 aria-valuemin={DUR_MIN} aria-valuemax={DUR_MAX} aria-valuenow={durVal} aria-valuetext={`${durVal}초`}
                 ref={durSlider} onClick={durSliderClick} onKeyDown={durSliderKey}>
              <div className="ohf-vid-dur-track" ref={durTrack}>
                <span className="ohf-vid-dur-fill" style={{ width: `${durFillWidth(durVal)}px` }} />
                {durTickShown(durVal, 116.82, false) ? <span className="ohf-vid-dur-tick o-vid-dur-tick-mid" /> : null}
                {durTickShown(durVal, 234.703, true) ? <span className="ohf-vid-dur-tick o-vid-dur-tick-end" /> : null}
                <span className="ohf-vid-dur-thumb" style={{ left: `${durThumbLeft(durVal)}px` }} />
              </div>
              <div className="ohf-vid-dur-scale"><span>5</span><span>10</span><span>15</span></div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    ) : null}
    {qualOpen ? createPortal(
      <div className="ohf-vid-qual-wrap ohf" style={{ transform: `translate(${qualPos.l}px, ${qualPos.t}px)` }}>
        <div className="ohf-vid-qual-menu" role="menu" tabIndex={-1} data-open="" data-side="right" data-align="end" aria-orientation="vertical" ref={qualMenu}>
          <div className="ohf-vid-qual-head">품질</div>
          {QUAL_OPTIONS.map((v) => (
            <div key={v} className="ohf-vid-qual-item" role="menuitemcheckbox" tabIndex={0}
                 aria-checked={v === qualVal ? "true" : "false"}
                 data-checked={v === qualVal ? "" : undefined}
                 onClick={() => { setQualVal(v); setQualOpen(false); }}>
              <span className="ohf-vid-qual-item-label">
                <span className="ohf-vid-qual-item-title-row">
                  <span className="ohf-vid-qual-item-title">{v}</span>
                </span>
              </span>
              <span className="ohf-vid-qual-item-trailing" aria-hidden="true">
                {v === qualVal ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13.875 9.2 18 19 7" />
                  </svg>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </div>,
      document.body
    ) : null}
    </>
  );
}
