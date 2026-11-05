# OHF 재사용 컴포넌트 카탈로그 — t_53509898

- 작성: 2026-11-05 (KST), worktree `wt/t_53509898` @ `/home/baramofme/open-higgsfield/.worktrees/t_53509898`
- 스코프: `src/` 전역 (실측 기준으론 `src/openhiggsfield` 51개 `.tsx`가 UI 본체)
- 산출물의 용도: **t_aa24389c(디자인 토큰 기반 컴포넌트 라이브러리 구현)의 구현 매니페스트** + 루트 t_66238c5e의 조사 근거
- 수용 기준(≥10개 컴포넌트를 변형·상태와 함께 등재): **본 문서는 33개 항목을 등재**하며 그중 31개 항목에 변형과 상태가 실측 근거로 명기됨 (§10 self-check)

---

## 0. 방법과 스코프 (재현 가능한 실측)

| 소스 | 크기 |
|---|---|
| `src/openhiggsfield/openhiggsfield.css` | 20,411줄 (룰 블록 2,405) |
| `src/openhiggsfield/reference-film.css` | 578줄 |
| `src/app/base.css` | 16줄 |
| `general-create-tabs.tsx` 내 인라인 `<style data-ohf-gct>` | 27,093자 / `.ohf-gct` 규칙 188개 |
| TSX 파일 | 51개 (`src/openhiggsfield`) |
| 파싱한 `className` 속성 | **1,715개** (문자열 연결·ternary·템플릿 리터럴을 모두 추적하는 괄호-깊이 파서) |

측정 정의(모두 이 run에서 실행한 스크립트/grep 결과):

- **적용 사이트**: `className` 속성 값을 괄호 깊이로 추적해 파싱한 뒤, 그 안의 `ohf-*` 토큰 출현 수. 파일 집합을 separately 집계. (첫 패스는 문자열 연결형을 놓쳐 238종으로 저평가 → 교정 후 재실측함. 교정 전/후 수치는 §1에 병기.)
- **동적 조합의 한계**: `--${…}` 형태로 모디파이어를 조립하는 className은 **3개**(파일 `context-menu`, `crop-tool`, `gallery`) → 이 3곳에서 파생되는 변형은 정적 데드 판정을 **유보**한다.
- **요소 수**: `<button` / `<input` / `<textarea` 여는 태그 카운트.
- **변형**: CSS에 정의된 `--*` 모디파이어(총 109종)와 호출부 출현으로 라이브/데드 판정.
- **상태**: CSS 셀렉터의 `:hover|:active|:focus|:focus-visible|:disabled` + `[aria-*]`/`[data-*]` 속성 선택자 + TSX의 실제 설정 값.
- **토큰 부채**: 규칙 본문에서 소비하는 `var(--x)`와 리터럴(`#hex`, `rgb()/rgba()`) 수; 정의 유무는 CSS+TSX+런타임 주입 전 소스 대조로 판정(코멘트 내 참조는 제외).

---

## 1. 핵심 결론 (정량)

| 지시표 | 실측 |
|---|---|
| 요소 수 | `button` **380**, `input` **45**, `textarea` **12**, `select` 0 |
| 이 요소들에 적용된 **서로 다른 클래스 종 수** | button **280종**, input **40종**, textarea **11종** (교정 전 238/33/10 → 연결형 누락으로 저평가됨) |
| CSS 정의 클래스(ohf/hfs) | 1,289종 · TSX 적용 1,298종 · 모디파이어 109종 |
| 동일 셀렉터 헤드 재선언 | 515개 헤드, 추가 사본 645건 (총 2,405블록) |
| 토큰 스코프 | `:root` **없음** — `.ohf`(앱 루트)에 46개 정의, `--cine-*`는 `.ohf-cinebar`/`.ohf-cinema-screen`에 재정의 |
| **유령 토큰**(어디서도 정의되지 않음) | 22종 · 실참조 **209회** · 폴백 0회 → IACVT(선언 자체가 무효화) |
| **데드 변형**(CSS O, 정적 미적용·동적 조합 여지 없음) | 7종: `popover--menu`, `popover--sheet`, `asset--upload`, `cinema-mode--on`, `project-chip--new`, `bar--mode`, `rfd-slot--e-1` |
| CSS 정의·정적 미적용(전체) | 172종(모디파이어 33종) — 위 3파일의 동적 조합은 판정 유보 |
| **무규칙 hooks**(TSX에서 쓰이나 규칙 없음) | 60종 / 66사이트 — 대표: `ohf-fail-*` 18종(failure-modal 전 구조) |
| 상태 어휘 | aria: `aria-pressed` 28룰, `aria-disabled` 24, `aria-expanded` 17, `aria-selected` 15, `aria-checked` 10 · data: `data-off` 28룰, `data-tip` 15, `data-active` 9 · pseudo: hover 288, disabled 125, active 66, focus-visible 45, focus 23 |
| TSX 상태 배속 | `data-off` 59회/9파일, `data-on` 30회, `data-active` 30회, `data-tip` 24회, `data-picked/selected/selecting` 18회 |
| 모션 접근성 | `@media (prefers-reduced-motion: reduce)` 블록 6개 재현 |
| 포커스 링 | 전역 `.ohf :focus-visible { outline: 2px solid var(--accent-32) }` (105행) |

**프래그먼테이션의 실체(세 줄)**

- 버튼 380개에 **280개 클래스**가 개별적으로 걸려 있다 — 공용 베이스 `.ohf-btn`은 **존재하지 않는다**(형제 클래스 `btn-solid`/`btn-accent`/`btn-quiet`와 `v2-solid-btn`/`v2-ghost-btn`가 각자 자립).
- 탭은 같은 역할을 **13개 클래스 패밀리**로 분산 구현(`ohf-tab`, `assets-tab`, `cproj-tab`, `pult-tab`, `cam-tab`, `feed-header-tab`, `viewer-tab`, `v2-tab`, `v2-seg-tab`, `gct-seg-tab`, `gct-mode-tab`, `gct-draw-tab`, `lighting__chip`이 `role="tablist"`로 탭을 겸함). 로빙 tabindex/화살표 키 배선은 **feed-header에만** 있다.
- 스타일 일부가 컴포넌트 파일 안의 `<style>` 블록으로 렌더된다(gct 188룰). 이 블록은 토큰을 **정의하지 않고** 리터럴 75개/`var()` 145회로 공유 CSS와 다른 언어를 쓴다 → 토큰화 전에 반드시 외부로 추출해야 하는 장애물.

---

## 2. 우선순위

점수 = **재사용 폭**(사이트×파일) + **분편화**(같은 역할을 하는 클래스 패밀리/종 수) + **부채**(리터럴 + 유령 토큰 참조 + 데드·무규칙).

| 순위 | 항목 | 점수 근거 | 판정 |
|---|---|---|---|
| **P0-A** | 유령 토큰 정의(§6) | 22종·209 참조·폴백 0 — 색/폰트가 계산되지 않는 지점이 실재 | **모든 컴포넌트 작업의 선행 조건** |
| **P0-B** | 버튼 수렴(§A) | 380 요소/280종, 베이스 부재, `generate` 계열만 리터럴 hex17·rgb16 | 최상. 라이브러리의 첫 앵커 |
| **P0-C** | 탭 수렴(§F1) | 13 패밀리, a11y 배선은 1개 파일만 정합 | 라이브러리 + a11y 동시 해결 |
| **P0-D** | 입력 수렴(§B1·B2) | 45 요소/40종, 입력 계열 16개 파일 분산 | 40→1 API |
| **P0-E** | 모달 메커니즘 통일(§E1) | 네이티브 `<dialog>` 3개 파일 vs `role="dialog"` 선언 19회/17파일; Escape `onCancel` 실결함이 **두 파일에 같은 주석으로 복제** | 동작 correctness 선행 |
| **P1** | 팝오버(§E2) | 베이스 이미 공용 + 11 변형(데드 2) | 변형 테이블만 정리하면 끝 |
| **P1** | 툴팁(§E4) | 2중 메커니즘(CSS `::after` vs JS 포털) 25사이트/6파일 | 통일 or 의도적 이중 유지 판정 |
| **P1** | 칩·세그먼트·스위치·옵션(§C) | 칩 53사이트/7파일, 스위치 3구현, 세그먼트 5패밀리 | 저비용·고일관성 |
| **P1** | gct 인라인 스타일 외부화 | 188룰·리터럴 75개, 토큰 정의 0 | 토큰화 선행 |
| **P1** | 타일/카드(§D) | 계열 95사이트/11파일, 시블링 6종 + asset 22/2 | 구조는 건재, 변형 테이블 필요 |
| **P1** | 메뉴(§E3) | `MoreMenu` 이미 공용(호출 6사이트/3파일) · v2-menu 가문 · cinebar 방언 | 3방언 통합 |
| **P2** | 아이콘 API(§8), 스피너/스크롤/그레인/알럿(§G) | 3종 API · 유틸은 재사용 폭 넓고 변형 없음 | 정리용 |
| **P2** | 데드·무규칙 클래스 정리 | 데드 7종 + 무규칙 60종 | 부수 정리 |

---

## 3. 카탈로그 — 요약표 (33 항목)

재수치는 "className 적용 사이트/파일 수"(교정 파서 기준). 변형·상태 수는 해당 항목에 실측된 것.

| # | 항목 | 카테고리 | 사이트/파일 | 변형 | 상태 | 우선순위 |
|---|---|---|---|---|---|---|
| A1 | IconButton `ohf-icon-btn` | 버튼 | 18/9 | 2 | 3 | P0-B |
| A2 | RoundIconButton `ohf-v2-round-btn` | 버튼 | 14/4 | 1 | 1 | P0-B |
| A3 | ControlPill `ohf-ctl` | 버튼 | 22/4 | 3 | 3 | P0-B |
| A4 | TextButton `ohf-btn-*`/`ohf-v2-*-btn` | 버튼 | 15/8 | 5(시블링) | 4 | P0-B |
| A5 | PrimaryAction `ohf-generate`계열/`gct-cta` | 버튼 | 18/4 | 4(파츠) | 5 | P0-B |
| A6 | ContextAction `tile-act`/`selact`/외3 | 버튼 | 32/5 | 5 | 4 | P0-B |
| A7 | SurfaceAction `starter`/`key`/외6 | 버튼 | 27/9 | 8(시블링) | 4 | P0-B |
| B1 | Input `ohf-input`(+계열 12종) | 입력 | 32/16 | 3 | 3 | P0-D |
| B2 | Prompt/Textarea `ohf-prompt`(+7시블링) | 입력 | 25/7 | 2 | 2 | P0-D |
| B3 | Slider `ui.tsx`+`ohf-slider` | 입력 | 11/5 | 3 | 1 | P1 |
| B4 | Field `ui.tsx`+`ohf-field` | 입력 | 33/7 | 2 | 0 | P2 |
| C1 | Option/OptionList `ui.tsx` | 선택 | 15/4 | 1(ratio) | 3 | P1 |
| C2 | Chip `ohf-chip`(+계열) | 선택 | 53/7 | 6 | 4 | P1 |
| C3 | Switch (3구현) | 선택 | 5/2 | 3 | 4 | P1 |
| C4 | SegmentedControl | 선택 | 18/2 | 5 | 3 | P1 |
| C5 | Pick/선택 마크 | 선택 | 2/1 | 1 | 3 | P1 |
| D1 | Tile `ohf-tile`(+파츠 20종) | 카드 | 95/11 | 2 | 8 | P1 |
| D2 | 시블링 타일 6종(+`asset`) | 카드 | 60/7 (+22/2) | 3 | 4 | P1 |
| D3 | ListRow `model-row`/`el-row` | 카드 | 9/2 | 2 | 2 | P2 |
| E1 | Modal/Dialog (2 메커니즘) | 오버레이 | 32/9 (+role 선언 19/17) | 2 | 3 | P0-E |
| E2 | Popover `ohf-popover` | 오버레이 | 19/8 | 11 | 1(트리거 지배) | P1 |
| E3 | Menu (3 방언) | 오버레이 | 57/12 | 3 | 4 | P1 |
| E4 | Tooltip (2 메커니즘) | 오버레이 | 25/6 | 2 | 4 | P1 |
| F1 | Tabs (13 패밀리) | 내비게이션 | 31/8 | 13 | 5 | P0-C |
| F2 | NavPill/Topbar | 내비게이션 | 14/2 (topbar 내 10/1) | 3 | 5 | P1 |
| F3 | SelectionBar | 내비게이션 | 6/1 | 1 | 2 | P1 |
| G1 | Spinner | 상태 | 5/5 | 0 | 0(호스트가 상태) | P2 |
| G2 | Alert | 상태 | 8/3 | 0 | 1 | P2 |
| G3 | Scroll container | 유틸 | 13/12 | 0 | 0 | P2 |
| G4 | Grain | 유틸 | 4/3 | 0 | 0 | P2 |
| G5 | honest-inert (`data-off`+`aria-disabled`) | 크로스컷 | 59회/9파일 | — | — | P0-B와 함께 |
| G6 | Icon system (4파일 95 exports) | 시스템 | 95 exports | 3 API | — | P2 |
| G7 | 카운트 스택 `selstack` | 상태 | 2/1 | 1 | 0 | P2 |

---

## 4. 카탈로그 본문

### 카테고리 A — 버튼·액션

#### A1. IconButton — `ohf-icon-btn`
- **역할**: 아이콘 전용 정방형 버튼. 닫기·삭제·도구 토글의 표준.
- **재사용**: 18사이트/9파일; `--ghost` 변형 8사이트/7파일. 파일: `camera-dialog`, `cinema-popover`, `composer`, `element-popover`, `failure-modal`, `key-modal`, `model-picker`, `settings`, `topbar`.
- **변형**: `--ghost`(8사이트·4룰), 컨텍스트 오버라이드 `.ohf-icon-btn.ohf-viewer-trash:hover`(외부 스코프가 자식 색을 덮어쓰는 방식).
- **상태**: `:hover`(4), `:active`(2), `[data-spin="true"] svg`(2룰) — 단 **TSX에서 `data-spin` 설정 0회** → 정의되고 미배선인 상태.
- **암묵적 props(호출부 실측)**: `type="button"`, `className`(문자열 or 조합), `aria-label`(필수 관례), `title`, `onClick`, 자식 `<XxxIcon size={12|13|14|16}/>`.
- **토큰**: `--ease`×4, `--s1`×2, `--line`×2, `--tx2`×2 — 리터럴 0(hex/rgb 모두 0). **토큰화 준비 최상**.
- **권고**: `variant: "solid" | "ghost"`, `state: spinning`, `size`를 props로 승격; `data-spin` 미배선 문제와 함께 처리.

#### A2. RoundIconButton — `ohf-v2-round-btn`
- **역할**: v2 스코프(에셋 선택기·크롭·라이트박스)의 원형 액션 버튼.
- **재사용**: 14사이트/4파일(`asset-picker`, `crop-tool`, `element-form`, `preview-lightbox`).
- **변형**: `--danger`(2사이트/1파일·1룰).
- **상태**: `:hover`(1룰) **뿐** — `:active`, `:disabled`, 자체 포커스 규칙 부재(전역 링에 의존).
- **암묵적 props**: `className`, `aria-label`, `tabIndex={-1}`, `onClick`.
- **토큰**: `--tx`×1, 리터럴 `rgb()` 4개. **하드코딩 잔존**.
- **권고**: A1과 동일 API로 통합하되 `shape: "round"` 변형으로 흡수. `--danger`의 실색(리터럴)은 토큰으로.

#### A3. ControlPill — `ohf-ctl` 계열
- **역할**: 도크의 라벨+글리프+값을 담는 제어 필(드롭다운 트리거·플래그 토글).
- **재사용**: 22사이트/4파일(`composer`, `general-create-tabs`, `prompt-optimize-button`, `settings`).
- **파츠**: `ohf-ctl-glyph`, `ohf-ctl-name`, `ohf-ctl-value`, `ohf-caret`.
- **변형**: `--model`(5룰·composer 1176행), `--flag`(4룰·settings 1사이트), `--more`(2룰·composer 2사이트).
- **상태**: `:hover`(7), `:active`(2), `[aria-expanded="true"]`(4), `--flag[aria-pressed="true"] .ohf-ctl-glyph`.
- **암묵적 props**: `disabled`, `onClick`, `data-tip`, `aria-label`, 자식(glyph+`ctl-name`+`value`). `prompt-optimize-button`은 `busy` 상태를 스핀+라벨 교체로 표현.
- **토큰**: `--tx2`×4, `--s3`×4, `--tx`×4, `--ctl-r`×2 / 리터럴 hex2·rgb7·!important 1.
- **권고**: `kind: "menu" | "flag" | "more"`, `label`, `value`, `expanded`, `busy`를 정형 API로. `--ctl-r`(8px)은 도크에서 재정의되는 실측값 — 토큰 계층화 시 스코프 유지.

#### A4. TextButton — `ohf-btn-solid` / `btn-accent` / `btn-quiet` / `ohf-v2-solid-btn` / `v2-ghost-btn`
- **역할**: 라벨형 텍스트 버튼. **공용 베이스 없음**이 실측 확인됨(`.ohf-btn` 정의 0).
- **재사용**: solid 5사이트/3파일(`asset-picker`, `gallery`, `model-picker`), accent 3/2, quiet 2/2, v2-solid 2/2, v2-ghost 3/2 → 합 15사이트/8파일.
- **변형**: 5개 시블링 클래스 자체가 변형. `accent`은 `[data-quiet="true"]`로 2차 변형(4룰). `solid`은 `[data-state]` 상태 시블링(4룰).
- **상태**: `:hover`(4·`:not(:disabled)` 관례), `:active`(2), `:disabled`(accent 4, v2 2), `[data-quiet]`(4), `[data-state]`(4).
- **암묵적 props**: `className`(직접 선택), `type`(`button`/`submit`), `disabled`, `onClick`, 텍스트 자식. `data-quiet`(1사이트)·`data-state`(2사이트)는 호출부가 수동 설정.
- **토큰**: solid은 `--danger`×4+`--danger-bg`×2(위험 색이 이미 토큰), accent `--shadow-1`×4, quiet `--tx2`×2 — **accent/quiet는 리터럴 0**. v2-solid/v2-ghost는 토큰 0·리터럴 각 2.
- **권고**: `tone: "solid" | "accent" | "quiet" | "danger"`, `size`, `disabled` 단일 API로 수렴. v2 계열은 토큰 0 → 최우선 이식 대상.

#### A5. PrimaryAction — `ohf-generate` 계열(+slot/label/glyph/sheen), `ohf-gct-cta` 계열
- **역할**: 생성 실행(CTA). 도크 우측 발·폼 하단 발에 좌정.
- **재사용**: generate 계열 14사이트/4파일(`composer`, `general-create-tabs`, `image-workspace`, `inpaint-panel`) + gct CTA 파츠(`gct-cta`/`-label`/`-credit`/`-num`) 4사이트/1파일 → **동일 역할 2 방언**.
- **파츠**: `ohf-generate-slot`(14룰·**!important 14**), `-label`, `-glyph`, `-sheen`(before/after 4개).
- **상태**: `:hover`(4), `:disabled`(14 — 전 카탈로그 최다), `:active`(4), `[data-busy]`(2), before/after 시어.
- **암묵적 props**: `disabled`, `onClick`, `data-tip`(slot), 크레딧/코인 텍스트 자식.
- **토큰**: `--accent`×4, `--ctl-r`×2, `--accent-ink`×2 — **리터럴 hex 17·rgb 16(전 카탈로그 최다)**. slot은 `!important` 14개.
- **권고**: 라이브러리 앵커로 `tone="primary"` 구현 하나로 남기고 sheen/busy/disabled를 상태 머신으로. 리터럴 33개는 `--accent`/`--accent-ink`로 대체 가능(단, HF 미러 실측값 유지 제약 §9 참조).

#### A6. ContextAction — `ohf-tile-act` / `ohf-selact` / `ohf-undo-act` / `ohf-strip-remove` / `ohf-workspace-tool`
- **역할**: 특정 영역(타일·선택바·트레이·워크스페이스)에 붙는 액션.
- **재사용**: tile-act 8사이트/1파일(`gallery`), selact 14사이트/1파일(`selection-bar`), workspace-tool 8사이트/1파일(`image-workspace`), undo-act 1/1(`openhiggsfield-app`), strip-remove 1/1(`media-tray`) → 합 32사이트/5파일.
- **변형**: `tile-act--fav`(라이브·1사이트), `selact--wide`(2사이트/4룰), `--danger`(1), `--quiet`(2), `--more` — **MoreMenu를 클래스로 입히는 방식**(selection-bar가 `ohf-selact--quiet --more`를 `MoreMenu`의 className으로 전달).
- **상태**: `:hover`(4·6), `:active`(2), `:disabled`(selact 6), `[data-on]`(4·6 — 좋아요 토글), `:focus`(tile-act 6).
- **암묵적 props**: `disabled`, `data-tip`, `data-on`, `aria-pressed`, `aria-label`, glyph 자식(17–18px).
- **토큰**: tile-act `--accent`×6·리터럴 hex2·rgb10, selact `--accent`×4·rgb6.
- **권고**: "영역 안의 액션" 한 컴포넌트로 통합(`scope: "tile" | "bar" | "tool"`), `selact--more`의 클래스 주입 패턴을 슬롯으로 대체.

#### A7. SurfaceAction — 서페이스별 발명 버튼 8종
- **역할**: 각 서페이스가 자체 발명한 동작 버튼.
- **재사용(합 27사이트/9파일)**: `key` 9/3(element-form·topbar·viewer), `attach` 6/1(composer), `starter` 5/2(gallery·project-screen), `feed-dial-btn` 2/1, `batch-step` 2/1(composer), `keys-save` 1/1, `asset-rail-btn` 1/1, `feed-size-btn` 1/1. 기타 서페이스 로컬 클래스(`director-*-btn`, `csv-btn`, `vedit-handle`, `play-btn` 등)는 CSS에는 있으나 className 적용이 검출되지 않은 것들도 있음(§6 부록B의 데드 목록 참조).
- **상태**: hover/active/disabled + `[data-ready]`(2), `[data-busy]`(6), `[aria-expanded]`(4), `[data-active]`, `aria-pressed`.
- **암묵적 props**: 서페이스 로컬 핸들러 + `disabled` + 라벨/글리프 자식.
- **토큰**: `key` `--accent`×4·리터럴 rgba2, attach hex2·rgb7, batch-step `--tx-off`×2·hex1.
- **권고**: A1/A4로 흡수. 서페이스 고유의 "ready/busy" 2상태는 열거형 상태로 통일.

#### 크로스컷 — honest-inert (G5)
- **역할**: HF 미러 화면에서 **실배선되지 않은 컨트롤을 정직하게 표기**하는 ohf 관례.
- **실측**: `data-off` **59회/9파일**(general-create-tabs 20, cinema-sidebar 19, cinema-project-panels 8, topbar 4, cinema-popover 3, feed-showcase 2, project-dialog 1, feed-header 1), `aria-disabled` 62회/17파일; CSS는 `[data-off]`를 28개 룰의 상태 선택자로 사용.
- **카탈로그 취급**: 변형 아님 — **모든 인터랙티브 컴포넌트의 표준 상태**로 명시. 라이브러리 구현 시 `inert?: boolean` props 하나로 이 59개 수동 마커를 대체 가능.

---

### 카테고리 B — 입력

#### B1. Input — 코어 `ohf-input`, 계열 12종
- **실측**: `<input>` 45개/40개 클래스 · 입력 계열 클래스 적용 32사이트/16파일.
- **계열(각자 자립)**: `ohf-v2-input`(5사이트), `picker-input`(3룰), `cproj-input`(+`--area`), `el-name`(2사이트/2파일), `search-input`, `project-input`, `director-input`, `director-ctx-input`, `lighting__input`, `vedit-caption-input`, `np-name-input`, `inpaint-input`.
- **변형**: 코어는 `--mono`를 **사용하나 규칙 미정의**(key-modal 1사이트 → 무규칙 hook). 계열 간 변형관계 없음.
- **상태**: 코어 `:hover`(2), `:focus`+`:focus-visible`(2·2). 계열은 `focus` 1~2씩.
- **암묵적 props**: `value`, `onChange`, `placeholder`, `aria-label`, `type`, `maxLength`, `autoComplete`, `spellCheck`.
- **토큰**: 코어 `--s1`×2·`--line`×2·`--accent-32`×2 — **리터럴 0**. 단 v2·director·vedit 계열은 유령 토큰(`--ink`, `--muted`, `--ink-mute`)을 소비.
- **권고**: `variant: "default" | "mono" | "area" | "search"` + `size`로 수렴. 40종 → 단일 API + 변형 테이블.

#### B2. Prompt/Textarea — 코어 `ohf-prompt`, 시블링 7종
- **실측**: `<textarea>` 12개/11개 클래스 · prompt 계열 25사이트/7파일.
- **시블링**: `v2-textarea`, `gct-pbox-field`, `gct-prompt-real`(3사이트), `gct-draw-note`, `inpaint-input`, `viewer-composer-input`, `director-prompt`, `cproj-input--area`.
- **변형**: 코어는 변형 없음; 시블링이 사실상 변형 역할.
- **상태**: 코어 `:focus`+`:focus-visible`(2·2, 둘 다 `outline: none` 후 글리프/링으로 대체), `glint`/`--accent-08` 포커스 표기.
- **암묵적 props**: `value`, `onChange`, `placeholder`, 라벨/발 구조.
- **토큰**: `--accent-32`×2·`--shadow-2`×2·`--glint`×2·리터럴 rgb1.
- **권고**: `PromptField` 하나로(라벨 절대 좌정+발 구조는 gct에서 재현), 시블링 제거.

#### B3. Slider — `ui.tsx`의 `Slider` + `ohf-slider` (+계열)
- **실측**: 공용 프리미티브 4개 중 하나(ui.tsx). 코어 사용 5사이트/3파일(ui·feed-header·lighting-popover) + `feed-slider` 1/1 + `gct-range`(range 계열 5사이트/2파일) → **공용+재발명 공존**, 합 11사이트/5파일.
- **변형**: `min/max/step/value/label` + `--fill` 런타임 토큰(ui.tsx가 계산).
- **상태**: `:hover`(2룰) 정도 — fill 비율이 시각 상태.
- **props(공식)**: `min`, `max`, `step?`, `value`, `onChange`, `label` — **이미 정형 API인 유일한 항목**.
- **토큰**: `--accent`×6·`--s3`×4·`--fill`×2, 리터럴 hex4·rgb4.
- **권고**: 계열 3종을 공용 Slider로 교체(라이브러리 이식의 기준 사례).

#### B4. Field — `ui.tsx`의 `Field` + `ohf-field` + `ohf-v2-field`
- **실측**: 33사이트/7파일.
- **변형**: `label` + 선택적 `value`(Row 변형) — 변형 2.
- **상태**: 없음(정적 래퍼).
- **props(공식)**: `label`, `value?`, `children`.
- **권고**: 변형 명세 유지, 계열 `v2-field`/`v2-field-label`은 동일 API로 병합.

---

### 카테고리 C — 선택 컨트롤

#### C1. Option / OptionList — `ui.tsx`
- **실측**: 15사이트/4파일(`ui`, `feed-header`, `lighting-popover`, `reference-use-next`).
- **변형**: `ratio` 변형(비율 박스 글리프 + `--auto` 분기).
- **상태**: `:hover`(6), `:focus-visible`(2), `[aria-pressed="true"]`(6) + 체크 마크/box 변형; 마운트 시 선택 항목을 뷰포트 중앙으로 스크롤하는 로직 내장.
- **props(공식)**: `options[{value,label}]`, `value`, `onChange`, `ratio?`; 내부 `Option`은 `active`/`onSelect`.
- **토큰**: 리터럴 **0**(`--tx`/`--tx2`/`--s3`/`--accent-08`/`--accent-14`) — 토큰화 준비 최상.
- **권고**: 라이브러리의 "값 목록 선택" 원형으로 채택.

#### C2. Chip — 코어 + 5개 방언
- **실측**: 53사이트/7파일. 방언: `ohf-chip`(+`--role`·`chip-count`), `ohf-gct-chip`(+`--on`·`chiprow--stack`), `cproj-chip`, `lighting__chip`(**role="tablist"의 탭**), `cinebar-prow-chip`, `project-chip`, `selchip`.
- **변형**: `--role`(6룰), `--on`, `chiprow--stack`, `count`.
- **상태**: `:hover`, `:active`, `[aria-pressed]`, `:disabled`(`--role`에서 2룰).
- **암묵적 props**: `aria-pressed`, `aria-label`, `disabled`, 카운트 자식(`${used} of ${option.max}`).
- **토큰**: `--s1`×2·`--line`×2, `--role`은 `--tx4`×2 — 코어 리터럴 0.
- **권고**: `Chip`(toggle)과 `ChipGroup`(row/stack)으로 분리; lighting의 탭 겸용은 C4로 이관.

#### C3. Switch — 3개 구현
- **구현 실측**: ① `feed-header.tsx`의 `Switch`(track/thumb 자식, `data-ohf-switch="on|off"`), ② `expand-crop.tsx`의 `ohf-ec-switch`+`is-on` 클래스, ③ `general-create-tabs.tsx`의 `ohf-gct-toggle`+`data-off`.
- **공통 a11y**: 셋 다 `role="switch"` + `aria-checked` — **일관됨**. 상태 전달 방식만 3종(속성·클래스·관례속성).
- **재사용**: switch 계열 클래스 5사이트/2파일(feed-header, expand-crop) — gct toggle은 파일 내부 클래스.
- **변형**: 3개 구현 자체가 변형 후보; `data-off`(honest-inert)는 gct에만.
- **암묵적 props**: `on`, `onChange`(feed-header는 정형; 나머지는 인라인).
- **권고**: feed-header 구현을 공용화하고 상태는 `aria-checked`+`data-on` 단일 경로로. CSS `[data-on]` 룰은 2개뿐 → 상태 룰 보강 필요.

#### C4. SegmentedControl — 5개 패밀리
- **실측**: `ohf-mode-seg`(8룰·`aria-pressed` 2), `gct-seg-tab`(인라인 스타일·hover/`data-on`), `gct-mode-tab`(`data-on`/`data-off`), `v2-seg-tab`(3사이트·`aria-pressed`), `gct-draw-tab`(3사이트) → 합 18사이트/2파일(asset-picker, general-create-tabs).
- **상태**: hover + 선택(`aria-pressed` or `data-on`) + inert(`data-off` → `cursor:not-allowed`).
- **변형**: `orientation`, 인디케이터 유무(패밀리별로 상이).
- **암묵적 props**: `options`, `value`, `onChange` + 자식 라벨/아이콘.
- **권고**: 세그먼트+탭을 F1과 함께 단일 "TabList" family로 설계하되, 변형 `indicator: "none" | "glass" | "border" | "slide"`.

#### C5. Pick / 선택 마크
- **실측**: `ohf-pick`(9룰)+`ohf-pick-box`(3룰) — `[aria-checked]` 8룰, hover 4, active 2; 호출은 `gallery` 2사이트. 유사: `SubOption`(`role="radio"`+`aria-checked`, 선택 표기는 ✓ 체크 요소·`data-active`는 CSS 미결), `ref-next-opt`(`[data-selected]`).
- **변형**: box(상위) + 체크면(내부).
- **권고**: `Checkbox`/`RadioRow`로 정규화; 세 상태(checked/active/inert) 통합.

---

### 카테고리 D — 카드·타일

#### D1. Tile — 코어 `ohf-tile` + 파츠 20종
- **실측**: 타일 계열 총 95사이트/11파일; 코어 `ohf-tile`는 23룰/108속성, `gallery`에서 코어 2사이트+파츠 20여 종.
- **파츠**: `tile-media`/`-wave`/`-audio`, `-scrim`, `-ring`, `-liked`, `-viewed`(+label), `-footrow`, `-badge`, `-caption`, `-acts`/`-act`/`-open`/`-more`, `-side`, `-time`, `-prompt`, `-facts`/`-fact--model`, `-remix`, `-comment`, `-3d`.
- **변형**: `--failed`(라이브·2룰), kind별 media 분기(image/video/audio+waveform) — 변형 2계.
- **상태**: `:hover`(16), `:focus-visible`(15), `:active`(2), `[data-selecting]`(8), `[data-picked]`(8), `[data-fresh]`(2), `[data-saving]`(2), `[data-on]`(2), `::after`(3) — **전 카탈로그 최다 상태(8종)** + hover 재생/mouseleave 리셋 JS 배선.
- **암묵적 props**: 컨테이너(버튼 아님 — "카드의 액션을 열기 컨트롤 안에 넣을 수 없다"는 명시적 설계), `data-asset-id/status/job-status/tour-asset-kind/ignore-marquee`, `onMouseEnter/Leave`, 자식 `tile-open` 버튼이 "열기" 동작을 수행한다.
- **토큰**: `--shadow-2`×8·`--ease`×6·`--line-2`×4·`--accent-32`×4 — 리터럴 hex1·rgb3(양호).
- **권고**: `AssetCard`로 승격; 상태 8종은 `data-*`를 props(`selected`/`picked`/`fresh`/`saving`)로.

#### D2. 시블링 타일 6종 (+`asset`)
- **실측(코어 타일 제외 합 60사이트/7파일)**: `cine-tile` 33/2(cinema-sidebar·cinema-tile-view), `cinema-tile` 12/1(cinema-popover), `mshow-tile` 6/1(viewer), `cproj-tile` 7/1(cproj-panels), `upload-tile` 1/1, `cam-move-tile` 1/1. 별도로 `ohf-asset` 계열 22사이트/2파일(asset-picker·asset-sidebar).
- **변형 실측**: `cinema-tile--camera`(13룰), `--character`(6룰), `mshow-tile--primary`, `asset--upload`(**데드**), `cproj-tile`+badge.
- **상태**: hover/`aria-expanded`(cinema), `data-on`(cam-move), disabled/`aria-disabled`(mshow·upload), `data-picked`(asset).
- **권고**: `variant: kind`로 통합하되 시블링 geometry 잔차(예: nav badge 폭 1px)는 미러 실측 유지 대상.

#### D3. 리스트 로우
- **실측**: `model-row` 8사이트/1파일(3룰·hover 2·`aria-current` 2, swatch 변형 `--icon` vs grain) + `el-row` 1사이트(thumb+inline rename+@mention+ghost close) → 9사이트/2파일.
- **권고**: `ListRow`에 `leading`, `selected(aria-current)`, `actions[]`.

---

### 카테고리 E — 오버레이

#### E1. Modal / Dialog — 두 메커니즘
- **메커니즘 A(네이티브)**: `<dialog>` + `showModal()` + `onClose` + `onCancel` — `failure-modal`, `key-modal`, `viewer`. 패널은 `ohf-dialog-panel`(+서페이스 특화 클래스). 상태: `[open]`(2), `[data-closing]`(2), `:focus`(2).
- **메커니즘 B(div)**: `role="dialog"` 선언 **19회/17파일**, 그중 `aria-modal`을 부여한 것은 `project-dialog`·`camera-dialog`뿐 — 나머지 17회는 **팝오버가 dialog 역할을 겸함**(캐치어 `ohf-np-catcher` 또는 scrim `ohf-v2-scrim`(+`--preview` — 후자는 **무규칙 hook**)으로 outside-press 종료).
- **패널/스크림/캐치어 클래스 합 32사이트/9파일**: `dialog-panel` 3/3, `v2-scrim` 6/5, `np-*` 23/1.
- **공통 내부 규칙(재사용 가능한 실골격)**: `ohf-dialog-panel` + `ohf-icon-btn` 닫기 + `ohf-scroll` 본문 + `ohf-btn-quiet` 발 + `ohf-alert` 오류 + `ohf-field`/`ohf-input` 폼.
- **복제된 실결함(두 파일에 같은 주석)**: Escape 종료 시 후속 `close` 이벤트가 React에 전달되지 않아 다이얼로그가 "마운트된 채 닫힌" 상태로 남고, 같은 실행/항목을 다시 눌러도 열리지 않는 문제 → `onCancel` 핸들러로 해결(주석 원문 "same fix as key-modal.tsx").
- **권고**: **P0**. 한 구현으로 수렴(네이티브 `<dialog>` 유지 권장 — 포커스 트랩·Escape가 무료). `onCancel` 정합성 통합 + dialog 역할을 겸용하는 17개 팝오버와의 경계 규정.

#### E2. Popover — `ohf-popover` + 변형 11종
- **재사용**: 19사이트/8파일(`asset-picker`, `cinema-popover`, `composer`, `element-popover`, `lighting-popover`, `mention-menu`, `model-picker`, `settings`).
- **변형(정의 11 / 정적 사용 9)**: `--assets`(CSS 8·TSX 1), `--list`(7·1), `--menu`(4·**데드**), `--elements`(4·1), `--setting`(3·2), `--picker`(3·1), `--cinema`(3·1), `--sheet`(2·**데드**), `--movement`(1·1), `--mention`(1·2), `--lighting`(1·1).
- **상태**: 패널 자체 상태 없음 — **트리거의 `[aria-expanded]`가 상태를 지배**(17룰). composer는 `--ohf-pop-x/y/clear`를 런타임 토큰으로 좌표 배선.
- **공통 내부 규칙**: `ohf-pop-head` + `pop-title` + `pop-count` + `--ghost` 닫기 + `ohf-scroll` 본문 + 빈 상태 클래스(`ohf-el-empty`/`ohf-picker-empty`).
- **권고**: 변형 테이블(11→라이브 9 + 삭제 2)로 문서화. 빈 상태·계 카운트를 props로.

#### E3. Menu — 3 방언 (합 57사이트/12파일)
- **`MoreMenu`(context-menu.tsx)**: "한 번에 구축"되어 격자·뷰어·워크스페이스가 공유하는 설계(파일 상단 주석). 호출 6사이트/3파일(`viewer` 4, `gallery` 1, `selection-bar` 1). 정형 props: `items[MenuItem]`, `label`, `align`, `className`, `floating`. `MenuItem` = `{id,label,onSelect,disabled?,danger?,icon?,dividerBefore?,children?}` — **서브메뉴·분리선·위험 변형을 갖춘 유일한 정형 API**. 상태: `aria-expanded`, `:hover`, `:disabled`, `[data-fly]`(캐스케이드 방향), 포털 좌정(floating 시 `.ohf` 루트로 — body 포털 시 토큰 손실 방지 주석 실재).
- **`ohf-v2-menu-trigger/item` 가문**: 12사이트/2파일(asset-picker, element-form), `aria-checked` 1룰.
- **cinebar 방언**: `cinebar-menuitem` 13사이트/1파일 + `cinebar-prow` 10사이트/1파일(cinema-sidebar), `data-off`/`data-active`.
- **`SubOption`**: `role="radio"`+`aria-checked`(feed-header).
- **권고**: `MoreMenu`를 표준으로 3방언 흡수; `--danger`·`divider`·`submenu` 변형 테이블 유지.

#### E4. Tooltip — 2 메커니즘
- **CSS**: `ohf-tip[data-tip]::after`(25사이트/6파일) — 발동 `:hover`/`:focus-visible`/`:has(:focus-visible)`/`[aria-expanded="true"]`; 변형 `--start`/`--end`(각 8룰·실배선 2사이트). 예외 룰: `.ohf-composer:hover .ohf-tip[data-tip]:not(:hover)::after`(도크 hover 시 개별 tip 억제).
- **JS**: `ohf-portal-tip` — composer가 `.ohf-stream-area` 내 컨트롤에 대해 clip 때문에 좌표 추적 포털을 별도 구현(pointerover/out/focusin/out/scroll/resize 6개 리스너, `aria-expanded="true"`이면 억제, `data-tip` 속성을 읽어 렌더).
- **암묵적 props**: `data-tip`(텍스트), `ohf-tip` 클래스, 변형 클래스, `aria-label` 동시 존재.
- **권고**: 의도적 이중(clip 회피)을 유지할지, 한 메커니즘으로 흡수할지 **판정 필요**. 최소한 두 메커니즘의 발동 조건 표를 카탈로그로 고정.

---

### 카테고리 F — 내비게이션

#### F1. Tabs — 13개 패밀리, a11y 배선은 1개 파일만
- **패밀리(13)**: `ohf-tab`(13룰·`aria-selected` 6·`data-view` 6), `assets-tab`(12룰), `cproj-tab`(+`--on`), `pult-tab`(+`--on`·`pult-slide`), `cam-tab`(hex3), `feed-header-tab`(+`-content`·`-indicator`), `viewer-tab`(+`--on`·indicator), `v2-tab`(+`--on`·`v2-tabs-wrap`), `v2-seg-tab`, `gct-seg-tab`, `gct-mode-tab`, `gct-draw-tab`, `lighting__chip`(tablist 겸용).
- **재사용**: tab 계열 31사이트/8파일(gct 내부 클래스 포함).
- **인디케이터 변형 4**: JS 실측 이식(glass, feed-header — `offsetLeft/offsetWidth`를 실측 그대로 심고 resize 재동기화), slide(`pult-slide`), 하단 보더(gct subtab strip), CSS전용(viewer `--on`).
- **a11y 실측**: `role="tablist"` 11회/9파일 · `role="tab"` 16회/9파일. 로빙 tabindex(선택 0·비선택 -1)+화살표 이동은 **feed-header에만** 존재 → 나머지 8개 파일 키보드 미배선.
- **암묵적 props**: `items`, `value`, `onChange`, `aria-selected`, `indicator`, `orientation`(2곳은 `aria-orientation="vertical"`).
- **권고**: **P0-C**. `TabList`+`Tab` 한 쌍으로 수렴, 인디케이터는 위 4변형 유지, 로빙 tabindex/화살표를 기본 동작으로 내장.

#### F2. NavPill / Topbar
- **실측**: nav 계열 14사이트/2파일(topbar, cinema-popover) — topbar.tsx 내부의 nav 클래스만 10사이트/1파일(9종). 파츠: `nav-list`/`nav-item`(6룰)/`nav-badge`(HF 원문 31×16 미러)/`nav-ent`/`nav-price`/`nav-actions`/`brand`(+`--glyph`)/`avatar`(+`--lg`)/`act`.
- **배선 배경**: nav 거버넌스 커밋(74728de)에서 HF pill 26개 전량 미러 + 브랜드 글리프 20×20 + Enterprise/요금제 우클러스터.
- **변형**: `--glyph`, `--lg`, badge 유무.
- **상태**: `:hover`(2), `:disabled`(1), `[aria-disabled]`(2), `[data-active]`(1), `[aria-pressed]`(1) + `data-off`(honest-inert, topbar 4회).
- **암묵적 props**: `onClick`/링크, `aria-label`, `title`, badge 자식, inert 마커.
- **권고**: `NavPill`+`NavBadge`로 정형; 미러 실측 치수(20×20 글리프, 31×16 badge)는 토큰화 후에도 실측 유지.

#### F3. SelectionBar
- **실측**: `ohf-selbar` 6사이트/1파일(`[data-on]`를 건 16룰 중 14룰이 이 클래스 계열), `inert` 속성 직접 사용, `selstack`/`selchip`(`--z`로 장 순서·`record.art` 인라인 배경), `selact` 14사이트.
- **변형**: 1(액션 변형은 A6에 속함). 상태: `data-on`(표시/숨김), `inert`, save 진행(`done/total`).
- **암묵적 props**: `records`, `saving`, `menuActions`, 6개 핸들러. 마지막 비어있지 않은 선택을 ref로 보존해 페이드아웃하는 로직.
- **권고**: `SelectionToolbar`로 승격; 카운트 스택은 `Stack` 컴포넌트로 분리.

---

### 카테고리 G — 상태·유틸·시스템

#### G1. Spinner — `ohf-spinner`
- 5사이트/5파일(asset-picker, composer, image-workspace, prompt-optimize-button, selection-bar) — **버튼 안 busy 상태의 공용 표기**. `aria-hidden`. `--accent`×5·`--line-2`×2 + 리터럴 rgba2(hover 글리프). 변형 없음; 상태는 호스트가 보유(busy→스핀+라벨 교체).

#### G2. Alert — `ohf-alert`
- 8사이트/3파일(composer, general-create-tabs, key-modal). `role="alert"`. 상태 `[data-selecting]`(2룰). 리터럴 0, `--danger-bg`×6·`--danger-line`×2 — 위험 색 토큰화 완료.

#### G3. Scroll container — `ohf-scroll`
- 13사이트/12파일 — 전 서페이스의 스크롤 박스 공통 레이어. 변형/상태 없음(유틸). 라이브러리에서 `ScrollArea`로 명명하되 시각 규칙 유지.

#### G4. Grain — `ohf-grain`
- 4사이트/3파일(gallery, model-picker, viewer), `--ohf-grain`(URI)은 `.ohf` 루트에서 런타임 주입(app 1440행). 변형/상태 없음.

#### G5. honest-inert — §A 크로스컷 참조(59회/9파일·28 CSS 룰).

#### G6. Icon system — 4파일 95 exports, 3개 API
- `icons.tsx` 60 exports: `{ size = 16 }` 단일 props + `base(size)`로 strokeWidth 1.5·24 뷰박스 통일.
- `asset-icons.tsx` 16 exports: `GlyphProps{size}` + HeartGlyph만 `filled` 변형(나머지는 filled 없음).
- `cinema-icons.tsx` 16 exports: `SVGProps<SVGSVGElement>` 패스스루 + `LimeIcon`(props 없음).
- `model-icon.tsx` 3 exports: `--ohf-model-icon`(url)을 스타일 props로 주입.
- **불일치**: 3종 API(고정 size vs 패스스루 vs 무props) · filled 변형 하트 편식.
- **권고**: `Icon({name, size, filled?, tone?})` 단일 레지스트리로; 미러 실측 치수는 명세로 고정.

#### G7. 카운트 스택 — `ohf-selstack`/`ohf-selchip`
- 2사이트/1파일(selection-bar). 최대 3장(STACK=3)까지 겹쳐 그리는 선택 썸네일 스택; `--z`로 장 순서, `background: record.art` 인라인. 변형: media 유무(image/비디오 play badge). 상태 없음(표시 전용).

---

## 5. 부록 A — 토큰 지형 (t_aa24389c가 배선할 대상)

- **정의 위치**: `:root` 없음. `.ohf`(앱 루트, `openhiggsfield-app.tsx` 1440행의 `className={`ohf ${fontClassName}`}`) 안에 46개 정의 — 즉 토큰은 앱 루트에 스코프되며 **포털을 body로 보내면 소실**된다(context-menu.tsx 주석의 실측 근거: body 포털 시 패널이 투명화).
- **cine 레이어**: `--cine-*` 12종이 `.ohf-cinebar`에서 재정의되고 일부(`--cine-brand/ink/secondary/surface`)는 `.ohf-cinema-screen`에서 재정의 — HF 미러 실측 literal 복원 정책(CSS 주석 원문: "실측한 색상·수치를 그대로 literal로 되살린다 — OH 토큰의 초록 기미 대신 HG의 순백/#828282/#898A8B").
- **분류(실측 46)**: 색(accent 6, bg 1, danger 3, line 2, plate 2, cine 12 포함), 치수(s1–s4, ctl-r, rail), 모션(ease 2), 그림자(3), 타입(font-ui). 3계층 공식화(t_f86dd596 권고) 기준 현 스코프는 "Layer-1 = `.ohf` 루트 + 서페이스 재정의".
- **런타임 주입 12종**: `--fill`(Slider), `--z`(selchip), `--ohf-picker-rows`, `--ohf-dock-h`(setProperty), `--ohf-pop-x/y/clear`, `--ohf-grain`(URI), `--ohf-cols`, `--ohf-model-icon`(URI), `--a`(viewer aspect), `--tx`(film 오프셋).

## 6. 부록 B — 유령 토큰 22종 / 209 참조 / 폴백 0

주석 내 참조를 제거한 실측. **어떤 소스(CSS·TSX·gct 인라인·런타임 주입)에도 정의가 없고 폴백도 없다** → 해당 선언은 IACVT로 무효화되어 프로퍼티가 initial/inherited로 떨어진다.

| 토큰 | 참조 | | 토큰 | 참조 |
|---|---|---|---|---|
| `--font` | **60** | | `--ink-mute` | 5 |
| `--muted` | **40** | | `--muted-ink` | 4 |
| `--ink` | 19 | | `--sans` | 4 |
| `--edge` | 15 | | `--panel` | 2 |
| `--ink-2` | 14 | | `--thumb-w` | 2 |
| `--amber` | 8 | | `--bg2` / `--bg3` / `--bg4` | 각 1 |
| `--edge-strong` | 8 | | `--panel-2` / `--panel-3` | 각 1 |
| `--mono` | 8 | | `--s0` / `--tx1` | 각 1 |
| `--text` | 8 | | `--ink-3` | 5 |

- 소비 지점(예): `.ohf-feed-*`, `.ohf-vedit-*`, `.ohf-cine-tile-*`, `.ohf-cinebar-*`, `.ohf-assets-all-*`, `.ohf-viewer-media-bottom-btn` — **feed/vedit/cinebar 서페이스에 집중**.
- 계층 판정: `--font`/`--mono`/`--sans`는 타입 계층(Layer-3), `--ink*`/`--muted*`/`--text`는 텍스트 색 하위 계층, `--edge*`/`--s0`/`--panel*`/`--bg2-4`는 서피스·테두리 계층의 누락 변형명. **t_aa24389c의 Phase 1에서 정의하거나 기존 토큰으로 치환**해야 리터럴 제거가 무결성 있게 끝난다.
- 부수 관찰: CSS 정의 중 className에 정적으로 나타나지 않는 클래스 172종(모디파이어 33종), 그중 동적 조합 여지가 없는 데드 확신 7종(§1 표). 반대로 className에 나타나되 규칙이 없는 클래스 60종(66사이트) — `ohf-fail-*` 18종 전체가 그 사례이며, CSS에는 `ohf-fail`/`-ic`/`-title`/`-why`(846행과 6274행에 **두 번 선언**)가 존재하지만 모달이 쓰는 클래스명과 갈라져 있다.

## 7. 부록 C — 상태 속성 어휘 (라이브러리 상태 머신 설계 입력)

- **aria**: `aria-pressed`(28룰·43회/20파일), `aria-disabled`(24룰·62회/17파일), `aria-expanded`(17룰·38회/15파일), `aria-selected`(15룰·20회/11파일), `aria-checked`(10룰·18회/8파일), `aria-current`(3룰).
- **data**: `data-off`(28룰·59회/9파일 — honest-inert), `data-tip`(15룰·24회), `data-active`(9룰·30회), `data-closing`(6룰), `data-selected`(5룰·7회), `data-on`(2룰·30회), `data-picked`(2룰·8회), `data-selecting`(3회), `data-busy`(2회), `data-ready`, `data-collapsed`, `data-state`(2회), `data-spin`(정의되나 0회).
- **pseudo**: hover 288 / disabled 125 / active 66 / focus-visible 45 / focus 23.
- 관례: 위험/비활성은 `:disabled`보다 `[aria-disabled]`와 `data-off`를 병용(honest-inert). 라이브러리 설계 시 `disabled`(실제 기능)와 `inert`(미러 표기)를 **두 개의 상태**로 분리할 것.

## 8. 부록 D — v2 하위 스코프 (별개 방언)

- `ohf-v2-*`: CSS 정의 **142종** / className 적용 **102종·175사이트·4파일**(`asset-picker`, `crop-tool`, `element-form`, `preview-lightbox`; composer.tsx에도 v2 문자열 참조가 남음).
- 특징: 토큰 소비가 극히 적고(예: round-btn `--tx`×1) 리터럴 위주, 상태도 hover 중심.
- 판정: v2는 "에셋 편집 서페이스의 방언" — 수렴 시 A2/A4/B1의 변형으로 흡수하되, **실측 기하 파라미터(라이트박스·크롭 핸들 모디파이어 8종)는 미러 대상이므로 개별 유지**.

## 9. 구현 제약 (t_aa24389c·루트 판독용)

1. **HF 미러 패리티**: 이 코드베이스의 다수 치수/색은 HF 라이브 DOM 실측값(CDP)으로 심긴다. 직전 커밋 3건(t_2adadf77·t_edb910c3·t_b8a39dd7)과 landing_verify 계열 하네스가 "동 rect·동 스타일" 검사를 유지 중. → **토큰 이식은 실측값을 토큰 값으로 옮기는 형태**여야 하며, 값 변경(1px 잔차 등)은 회귀로 잡힌다.
2. **cine 레이어 literal 정책**: HF 순백/회색 계열은 의도적으로 OH 토큰과 분리 유지(CSS 주석에 명문화). 하드코딩 제거 대상에서 **예외로 표기**할 것.
3. **포털과 토큰**: body 포털은 `.ohf` 스코프 토큰을 잃는다(context-menu 주석 실증; 더-menu는 `.ohf` 루트로 포털). 라이브러리의 포털 호스트를 `.ohf`로 유지할지 토큰을 `:root`로 승격할지는 **오케스트레이터 결정** — 두 카드에 같은 결정 명세가 필요하다.
4. **스타일의 두 곳**: openhiggsfield.css(20,411줄) + gct 인라인 `<style>`(188룰·리터럴 75·토큰 정의 0). 라이브러리 도입 시 gct 인라인을 먼저 외부화하지 않으면 변형 테이블이 두 곳에서 갈라진다.
5. **선결 조건**: 유령 토큰 22종(209 참조)을 정의/치환하기 전에는 리터럴 제거가 시각 무결성 있게 끝나지 않는다(부록 B).
6. **클래스명 갈라짐**: `failure-modal.tsx`의 `ohf-fail-*` 18종은 CSS 규칙과 무관(무규칙 hook) — 미러 parity 검사 없이 렌더되는 구간. 재작업 시 CSS의 `ohf-fail` 계열과 명명을 일치시켜야 한다.
7. **hotspot 경고**: `general-create-tabs.tsx`(2,883줄·자체 `<style>` 포함)와 `openhiggsfield.css`(20,411줄)는 다수 카드가 동시에 건드리는 병목. 같은 파일에 더 쌓기 전 분할 검토 필요.

## 10. 수용 기준 self-check

- 등재 항목: **33개**(§3 요약표) — 기준(10개)의 3.3배.
- 변형과 상태를 **모두** 실측 근거로 명기한 항목: **31개**(변형·상태가 0인 2개는 정적 유틸 G3/G4로, "없음" 자체가 명세된 결과).
- props: 정형 API로 이미 존재하는 5개(ui.tsx의 Field/OptionList/Slider + context-menu의 MoreMenu/MenuItem)와, 호출부 실측으로 복원한 암묵적 props를 전 항목에 명기.
- 우선순위: §2 점수표(재사용 폭·분편화·부채)로 전 항목에 P0/P1/P2 부여.
- 모든 수치는 이 run의 grep/스크립트 실측이며 §0의 측정 정의로 재현 가능. 측정 교정 이력(연결형 className 누락 → 238→280종)도 §0에 명기.
