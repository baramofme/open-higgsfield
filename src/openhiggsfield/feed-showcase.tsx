"use client";

import { useEffect, useRef } from "react";

import { FeedMoreInfoIcon } from "./icons";

/* HF의 피드 우측 컬럼 쇼케이스 판 정적 미러(t_2adadf77, 2026-11-04 :9222 라이브
   재실측 1440×900). HF는 이 판을 정적 데모로 뿌린다 — 백엔드 없이 동작하므로
   OH도 정적 자산(step-1.jpg, step-2.mp4, step-3.mp4)으로 견고하게 착지한다.

   실측 원본:
   - SECTION px-8 py-24 self-start w-full: pad 96px 32px, x361 y101 1046×620,
     bg transparent, radius 0, overflow visible.
   - HEADER mb-8 x393 y197 982×76 — H1 40/700 uppercase lh48 color(247,247,248)
     mb-8→mb2? (실측 mb 8px), P 14/20 color(137,138,139) 한 줄 h20.
   - GRID grid-cols-3 gap-10(40px) x393 y305 982×320 — 3×ARTICLE 301×320:
     FIGURE(group relative w-full mb-4 rounded-2xl overflow-hidden, radius16,
     aspect-ratio 1.31646/1 → 301×228) + media object-cover size-full
     + H2 20/700 uppercase lh28 mb8 + P 14/20.
   - 영상 속성: loop/muted/playsInline, controls 없음, preload none,
     aria-label이 단계 제목과 동일. IMG의 alt도 단계 제목. */

const STEPS: {
  kind: "img" | "video";
  src: string;
  title: string;
  text: string;
}[] = [
  {
    kind: "img",
    src: "/feed/step-1.jpg",
    title: "이미지 추가하기",
    text: "이미지를 업로드하거나 생성해 애니메이션을 시작해 보세요",
  },
  {
    kind: "video",
    src: "/feed/step-2.mp4",
    title: "프리셋 선택하기",
    text: "프리셋을 선택해 이미지 움직임을 제어해 보세요",
  },
  {
    kind: "video",
    src: "/feed/step-3.mp4",
    title: "영상 받기",
    text: "생성 버튼을 눌러 최종 애니메이션 비디오를 완성해 보세요!",
  },
];

function ShowcaseCell({ step }: { step: (typeof STEPS)[number] }) {
  const video = useRef<HTMLVideoElement>(null);

  /* HF의 데모 영상은 autoplay 속성이 없는 상태에서 뷰포트에 들어올 때만
     재생된다(실측: autoplay false·paused false·preload none — 교차관측으로
     켜고 끌 때 멈춘다). 같은 속성과 같은 동작을 미러한다. */
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.play().catch(() => {
              /* 자동재생이 차단되는 환경에서는 첫 프레임만 걸린 채 정지 —
                 HF도 로드 실패 시 같은 자리에서 멈춘다. */
            });
          } else {
            el.pause();
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <article className="ohf-feed-showcase-cell">
      <figure className="ohf-feed-showcase-figure">
        {step.kind === "img" ? (
          <img className="ohf-feed-showcase-media" src={step.src} alt={step.title} loading="lazy" />
        ) : (
          <video
            ref={video}
            className="ohf-feed-showcase-media"
            src={step.src}
            aria-label={step.title}
            muted
            loop
            playsInline
            preload="none"
          >
            사용 중인 브라우저가 영상을 지원하지 않아요.
          </video>
        )}
      </figure>
      <h2 className="ohf-feed-showcase-step-title">{step.title}</h2>
      <p className="ohf-feed-showcase-step-text">{step.text}</p>
    </article>
  );
}

/* 기본 상태의 쇼케이스 판. HF의 기본 상태(기록 탭 선택 + 쇼케이스)에서 이 판은
   스크롤 래퍼 없이 컬럼에 직접 놓인다(self-start) — 그대로 미러. */
export function FeedShowcase() {
  return (
    <section className="ohf-feed-showcase" aria-label="이용 방법 쇼케이스">
      <header className="ohf-feed-showcase-head">
        <h1 className="ohf-feed-showcase-title">클릭 한 번으로 영상 만들기</h1>
        <p className="ohf-feed-showcase-sub">
          카메라 제어, 프레이밍, 고품질 VFX를 위한 250개 이상의 프리셋, 또는 일반 프리셋으로 직접
          조정할 수도 있어요.
        </p>
      </header>
      <div className="ohf-feed-showcase-grid">
        {STEPS.map((step) => (
          <ShowcaseCell key={step.title} step={step} />
        ))}
      </div>
    </section>
  );
}

/* 이용 방법 탭의 가이드 판. HF 실측(라이브 재실측 2): 쇼케이스 판을
   hide-scrollbar 스크래퍼(flex-1)에 넣고, 하우에 justify-end pt-8 푸터를 둔다
   (푸터 x361 y815 1046×40, 버튼 32×32 x1375 y823, color rgb(130,130,130)).
   HF의 푸터 버튼은 "Seedance 더 알아보기" — OH에는 그 문서 페이지가 없으므로
   관례대로 honest inert로 착지(aria-disabled + data-off). */
export function FeedGuide() {
  return (
    <div className="ohf-feed-guide">
      <div className="ohf-feed-guide-scroll">
        <FeedShowcase />
      </div>
      <div className="ohf-feed-guide-foot">
        <button
          type="button"
          className="ohf-feed-guide-more"
          aria-label="Seedance 더 알아보기"
          aria-disabled="true"
          data-off=""
        >
          <FeedMoreInfoIcon size={16} />
        </button>
      </div>
    </div>
  );
}
