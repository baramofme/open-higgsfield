#!/usr/bin/env python3
"""surface_body.tsx + 생성 CSS → 최종 컴포넌트/스타일 조립 (t_bb8f3edb)."""
import pathlib, re
ROOT = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_bb8f3edb")
body = (ROOT / "landing_verify/surface_body.tsx").read_text(encoding="utf-8")
css = (ROOT / "landing_verify/video_surface.css.gen").read_text(encoding="utf-8")

# ---- 에디터(#183) 실배선: 생성기 산출물을 store 연결로 치환 ---------------------
EDITOR_OLD = re.search(r'^\s*<div className="ohf-vid-n183".*?/>$', body, re.M).group(0)
EDITOR_NEW = """                    <div
                      ref={editorRef}
                      className="ohf-vid-n183"
                      data-ohf-video="183"
                      aria-label="프롬프트"
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      spellCheck
                      aria-placeholder="영상을 설명해 주세요. 시작 프레임과 끝 프레임은 Image 1, Image 2로 지칭해 주세요."
                      data-lexical-editor="true"
                      style={{ userSelect: "text", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      onInput={syncFromEditor}
                    >
                      {text === "" ? <p><br /></p> : <p>{text}</p>}
                    </div>"""
body = body.replace(EDITOR_OLD, EDITOR_NEW, 1)

# placeholder(#184) 는 프롬프트가 비었을 때만 HF 실측과 동일하게 보인다.
PH_RE = re.compile(r'^\s*<div className="ohf-vid-n184".*?</div>', re.M | re.S)
ph_line = PH_RE.search(body).group(0)
ph_inner = re.search(r'>(.*)</div>', ph_line, re.S).group(1).strip()
body = PH_RE.sub(
    '                    {placeholderShown ? (\n'
    '                      <div className="ohf-vid-n184" data-ohf-video="184" data-prompt-placeholder="true">\n'
    f'                        {ph_inner}\n'
    '                      </div>\n'
    '                    ) : null}',
    body, 1)

# 폼 제출은 생성 착지 전까지 차단(정직 marking; 형제 t_f3de705e 와 같은 결정).
FORM_RE = re.compile(r'<form className="ohf-vid-n111"[^>]*>')
body = FORM_RE.sub(
    '<form\n              className="ohf-vid-n111"\n              data-ohf-video="111"\n'
    '              data-tour-anchor="tour-video-form"\n              onSubmit={(e) => {\n'
    '                /* 생성 실행 착지 전까지 제출만 차단(정직 marking). */\n'
    '                e.preventDefault();\n'
    '              }}\n            >',
    body, 1)

HEADER = '''"use client";

/* =============================================================================
   video-surface.tsx — HF /ko/ai/video?model=minimax_h3 정적 화면 이식 (t_bb8f3edb)

   ground-truth: HF live CDP 1440×900 의 306개 가시 요소 실측
   (t_a1c5ed28 hf_video_ground_truth.json; rect + computed + attrs + own-text).
   트리의 태그·순서·깊이·own-text·attrs 를 실측 그대로 기계로 미러링했다(재해석 없음).
   각 요소는 data-ohf-video="<HF nid>" 앵커를 갖고, 비교는 nid 1:1 로 이루어진다.

   정직 marking 원칙:
   - aria-disabled + data-off="<사유>" → 정적으로 이식된 HF 요소(동작 착지 후속).
   - 실배선한 길: ① 프롬프트 에디터(타입 → useVideoPrompt), ② 영상 재생(교차
     관찰로 HF 와 같은 자동재생/일시정지), ③ 폼 제출 차단(의도된 정지).

   생성물: landing_verify/gen_surface.py 가 ground-truth JSON 에서 이 파일의
   본문을, gen_css.py 가 computed 에서 video-surface.css 를 산출한다.
   ============================================================================= */

import { useEffect, useRef, useState } from "react";
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
  const rootRef = useAutoPlayOnView();

  /* HF 포착 상태: 프롬프트 비어있음 → placeholder 가 보였다(실측 #184 가시). */
  useEffect(() => {
    setPlaceholderShown(text.trim() === "");
  }, [text]);

  /* 에디터는 일반 contenteditable(Lexical 원문은 미이식 — 정직 marking).
     입력 → useVideoPrompt(실배선; 이 화면에서 유일하게 실제로動く 타이핑 길). */
  const syncFromEditor = () => {
    setText(editorRef.current?.innerText ?? "");
  };

  return (
    <section className="ohf-vid-root" data-ohf-video="root" aria-label="비디오 만들기" lang="ko" ref={rootRef}>
'''

FOOTER = '''    </section>
  );
}
'''

out = HEADER + body + "\n" + FOOTER
(ROOT / "src/openhiggsfield/video-surface.tsx").write_text(out, encoding="utf-8")
(ROOT / "src/openhiggsfield/video-surface.css").write_text(css, encoding="utf-8")
print("tsx lines:", out.count(chr(10)), "css bytes:", len(css))
print("unresolved markers:", [m for m in ("\\u", "presentaci") if m in out][:2])
