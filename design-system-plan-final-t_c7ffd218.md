# 디자인 시스템화 최종 방안 — 통합 보고서 (근무자 t_c7ffd218)

**작성일:** 2026-11-05 (KST) · **대상:** @baram204
**근거:** 4개 선행 산출물(라이브 CDP 실측 감사 `hf-ui-audit`, 컴포넌트 경계 스펙 `component-spec`, CSS 재구성 계획 `css-reorg-plan`, 도구 후보 조사 `design-system-recommendation`)을 하나로 묶은 통합. HF 라이브 접속·탭 전환으로 HTML 요소를 실제로 가져와 비교한 결과는 이미 **t_1a4c24fb CDP 실측(1440×900 고정, 실마우스)** 으로 확보되어 있다 — 본 방안은 그 실측을 근거로 하며, 중복 실측을 다시 하지 않는다.
**본 방안의 수치는 HEAD `74728de`(이 근무자 작업 트리)에서 직접 재검증했다.** 부모 스냅샷 수치와 갭이 있는 항목은 §8에 정직하게 분리 표기한다.

---

## 0. 이 보고서가 답하는 것

본문(body)이 요구한 4가지에 순서대로 답한다:

1. **"뭘로 만들지"** → §1 결론 한 장 + §6 도구 판정.
2. **"분류를 잘 해봐"** → §3의 8개 컴포넌트 팩과 계층/변형 매트릭스.
3. **"고칠 때마다 다른 데 깨진다 → 컴포넌트 내부로 변경을 제한"** → §4 에디트-격리 계약(이것이 사용자 목표의 실제 메커니즘) + §2의 4가지 구조적 원인.
4. **"CSS도 정리"** → §5 13파일 목표 + 7단계 마이그레이션.

---

## 1. 결론 한 장 (TL;DR)

> **"도구를 도입하지 마라. 이미 있는 것을 공식화하라."** — 그리고 갈라진 축만 파라미터로 묶어 컴포넌트로抽出한다.

| 결정 | 내용 | 근거 |
|---|---|---|
| **도구** | 외부 도구 미도입. 기존 CSS 커스텀 프로퍼티(`var()`)를 공식화 + `src/openhiggsfield/ui.tsx`에 경량 프리미티브 레지스트리를 확장 | 1,798개 `var()`가 이미 단일-소스 전파를 달성. Tailwind는 같은 기능 중복(회귀), Storybook은 현 리터널-미러 단계엔 과잉 |
| **분류** | 8개 팩: `sidebar-layout`/`sidebar-plate`/`subtab-strip`/`card-body`/`segmented-tabs`/`figure-card`/`dock-mode-container`/`hf-tile` | 라이브 실측 rect·클래스가 감사에서 1:1로 박힘. 갈라진 축만 파라미터화 |
| **격리** | 에디트-격리 3원칙(외부영향금지·단일전파경로·시맨틱불변+정직표기)을 모든 팩에 동일 적용 | "고치면 다른 데 변하는가? Yes=위반"이 판정법 |
| **CSS** | 20,411줄 단일 파일 → 13개 파일로 분할 + 복제 3,724줄 제거 + 인라인 split-brain 해소 | 복제 1차사본은 2차의 진성 부분집합(§8 실증) → 삭제 무손실 |
| **실행 순서** | §7의 3페이즈(토큰 공식화 → 복제/split-brain 제거 → 프리미티브抽出) | 위험최소→효과최대 순으로 정렬 |

**핵심 통찰:** 사용자가 본 현상("3개 탭이 같은 사이드바 레이아웃에 제목만 바뀌는데 완전히 다르게 생겼고, 독은 모드·환경값으로 버전만 갈리면 되는데 뒤죽박죽, hf-tile은 모드마다 크기·호버 아이콘이 다 다른데 다 새로 만든 것 같다")은 **사실이 아니라 구조적 결함의 증상**이다. HF 원문 실측 결과 세 서브탭의 스트립(17,45,318,48)·높이 36·간격 12·활성/비활성 2분기 레시피는 **3 상태 모두에서 동 rect·동 클래스**이며 라벨과 파생 너비만 변한다. 즉 "완전히 다른" 것처럼 보인 것은 **동일 레시피가 상태마다 마크업이 통째로 복제된 결과**(실병목)이지, 본질적으로 다른 것이 아니었다. 같은 논리가 독(`dock-config.ts`가 이미 mode-half+seat-half를 한 객체로 접어 얼굴을 한 곳에서 결정)과 hf-tile에도 적용된다.

---

## 2. "고칠 때마다 다른 데 깨진다"의 4가지 구조적 원인 (모두 재검증)

이 현상은 운이 아니라 아래 4가지 구조가 캐스케이드를 unpredictable하게 만들기 때문이다. 각 수치는 HEAD에서 재실측했다.

| # | 원인 | 실측 | 왜 "고치면 다른 데 깨진다"를 일으키나 |
|---|---|---|---|
| ① | **완전 복제 3,724줄** | 첫 사본 135–3858(3,724줄)과 두째 사본 5563–9365(3,803줄)이 diff 79줄로 사실상 동일 | 같은 셀렉터가 두 번 정의되어 후행 사본이 항상 승리. 첫 사본을 고쳐도 캐스케이드에서 죽고, 두째 사본을 고쳐야 반영된다 — "어디를 고쳐야 이기는가"가 불명 |
| ② | **서브탭 스타일 split-brain** | 인라인 `generalCreateTabsStyle` 상수(TSX 2360줄 정의, 2250에서 `<style data-ohf-gct>` 주입, 유니크 셀렉터 143) vs 메인 CSS의 `.ohf-gct`는 단 **4개** | 서브탭을 고치려면 TSX 인라인과 메인 CSS 양쪽을 건드려야 하고, 캐스케이드 우선순위가 불명확 |
| ③ | **도크 pult 조상스코프 오버라이드** | `.ohf-cinema-screen`이 자식을 조이는 스코프 라인 **109건** | 형제를 건드리지 않고 격리한다는 원칙(§4)이 깨진다 — 시네마 판을 고치면 그 안에 앉은 pult/도크가连带로 변한다 |
| ④ | **`!important` 남발 132건 + `[data-*]` 무경계 260개** | 재실측 | 캐스케이드를 강제로 이겨 "이 규칙을 바꿔도 저 규칙이 이긴다"는 예측불가능성 + `[data-on]`/`[data-collapsed]` 등 260개가 어떤 컴포넌트 소유인지 불명 |

> **이 4개가 소멸하면 사용자 보고현상도 소멸한다.** §5의 우선순위 1·2·3이 ①②③를 직접 제거하고, ④는 우선순위 4·7로 줄인다.

---

## 3. 분류 — 8개 컴포넌트 팩과 계층/변형 매트릭스

### 3.1 팩 인벤토리 (고정 골격은 감사 실측 rect·클래스 그대로)

| 팩 | 역할 | 실측 골격(감사) | 갈라진 축 → 파라미터 |
|---|---|---|---|
| `sidebar-layout` | 좌 20rem + 우 1fr 2열 워크벤치 셸 | `div#video-create-layout grid-cols-[20rem_1fr] gap-2 px-4 pb-2` (0,44,1440,836) | `showSidebar`(md 브레이크), gap 8 고정 |
| `sidebar-plate` | 좌측 판(320폭) + 카드 slot | `div.hidden.md:flex.flex-col…` (16,44,320,828) — 만들기/편집 동 | `width`320 고정, **`maxHeightCap`**(Motion만 790 수축 — HF 원문 사실, 정직 예외) |
| `subtab-strip` | 판 최상단 수평 서브탭 318×48 | `nav.flex…` (17,45,318,48), 탭 div 81/68/99×36 @x33/126/206 gap12 — 3상 태 동 rect | **`tabs`(라벨)**만 파라미터, 너비 81/68/99은 라벨 길이 파생(고정 아님) |
| `card-body` | 활성 서브탭의 본문(레시피 분기) | form/section/스크롤러 3형제, rect 778/778/740 | **`recipe`(form\|section\|scroll)**로 F-1 수렴, **`ctaHeight`**(48\|56 F-2), `scroller`, `inputKinds` |
| `segmented-tabs` | q-tabs 세그먼트 탭(본문 내부) | 302×40 @25,239 / 278×40 @37,772, 탭 145/133×32 | `fillWidth`(302\|278, 컨테이너 파생), 탭너비 fill 파생(직접고정 안함) |
| `figure-card` | 카드 상단 피겨(302×130) | 동 rect 302×130인데 조립 상이: `h-32.5` vs `p-3+aspect` | **`fit`(fixed-h\|aspect-pad)**로 조립 보존(동결과 유지), `overlay`(편집 변형) |
| `dock-mode-container` | 하단 독(시네마↔일반 분기) | OH 4-state matrix + HF rail 72×116@400,399 | **mode(general\|cinema)×seat(image\|video\|cinematic)** 2축. `dock-config.ts`가 이미 단일소스 |
| `hf-tile` | 피드 타일(정사각형/메이슨리) | 정사각형 355×355 4열 contain / 메이슨리 justified 행265·aspect·cover | **`layoutMode`(justified\|equal-square)×`mediaFit`(cover\|contain)×`hoverIconSet`** |

### 3.2 계층 트리 (which composes which — 각 노드는 자기 자식만 안다)

```
app-shell
├ topbar
└ workbench
   ├ sidebar-layout (2열 grid: 20rem 1fr)
   │  ├ sidebar-plate (320폭 좌판)
   │  │  ├ subtab-strip (role=tablist, 수평)
   │  │  │   └ tab ×N (HF=div / OH=button role=tab)        ← 파라미터: 라벨(너비 파생)
   │  │  └ tab-content ← 좌측판의 "활성 서브tabpanel" slot
   │  │      └ card-body (recipe: form|section|scroll)       ← F-1 흡수
   │  │          ├ figure-card (302×130)                     ← F-4 수렴(fit)
   │  │          ├ segmented-tabs (q-tabs)                   ← clip 상태에서만 mount(U-2)
   │  │          ├ model-trigger (302×54)
   │  │          ├ input-group (checkbox|file|none) 또는 도구 리스트(편집)
   │  │          └ cta (302×48|56)                           ← F-2 ctaHeight
   │  └ main-panel (우측 본문 #create-page-content)
   │      └ tile-grid (layout: justified|equal-square)
   │          └ hf-tile                                      ← 3축
   │              └ tile overlay 프리미티브 4종 (tint/ring/checkbox/pill)
   │      (클릭 → showcase dialog: role=dialog, 버튼 U-3 미열거)
   └ dock-mode-container (mode×seat 2축)
      ├ pult (vertical tablist, 생성모드) → pult-tab ×2       ← F-7 OH 개선 유지
      ├ composer-box (800폭)
      │   ├ instruments-row → plate ×5 (video seat만 @486../y711) ← F-8/F-9
      │   ├ foot-row (버튼 3종 + 모델 트리거 + 설정 필)
      │   └ tiles-column (image/cinematic seat만)
      └ generate-button (+크레딧)                              ← F-10 aria 일치 강제
```

> **왜 `tab-content`를 하나로 합치지 않는가:** 좌측판 활성 서브tabpanel은 `card-body`를, 우측본문은 `tile-grid`를 담는다 — 담는 콘텐츠 종류가 근본적으로 다르다. 한 컴포넌트로 합치면 좌측의 card-body 분기와 우측의 tile 분기가 같은 props 스페이스에 섞여 격리 계약이 깨진다. 두 slot을 분리한 채 격리를 각각 적용한다.

### 3.3 변형 매트릭스 (감사 상태 × 발동 파라미터)

| 시트 상태 | sidebar-plate | subtab-strip | card-body | segmented-tabs | ctaHeight | 도크 | pult | instruments | tiles |
|---|---|---|---|---|---|---|---|---|---|
| video/make(만들기) | 320×828 | 3탭 318×48 | recipe=form | 302 fill, 탭145 | 48 | cinema: O | image/video | image seat=×0 | true |
| video/edit(편집) | 320×828 | 3탭 동 | recipe=section | 미마운트(U-2) | 없음(도구 리스트) | cinema: O | 동 | 0 | true |
| video/motion | 320×**790**(maxHeightCap) | 3탭 동 | recipe=scroll | 278 fill, 탭133 | **56** | cinema: O | 동 | 0 | false |
| general/image | 좌판 미사용 | — | — | — | — | 1440×137 | 없음(plate false) | 없음 | 0 |
| general/video | — | — | — | — | — | **미존재(셸 스왑)** U-5 | — | — | — |
| cinema/image | 402,763 876×121 | pult 2탭64×52 | — | — | — | 876×121 | pult image | 없음 | 0(비어) | true |
| cinema/video | 402,703 876×181 | pult 2탭64×52 | — | — | — | 876×181 | pult video | **5플레이트@486../y711** | false | false |

> 피겨 `fit`·tile `layout`·`mediaFit`는 위 시트와 **직교하는 축**이므로 표에 넣지 않고 각 팩의 파라미터로만 분기한다. 이것이 사용자가 본 "독의 모드와 환경값에 따라서 버전을 다르게 하기만 하면 되는"을 2축 파라미터로 압축한 것이다.

---

## 4. 에디트-격리 계약 — 사용자 목표의 실제 메커니즘

"수정할 때 해당 컴포넌트 내부로 변경이 제한되니까 다른 곳이 오류 날 확률이 적어진다"를 **구현으로 보장**하는 3원칙. 모든 팩에 동일하게 적용한다.

1. **외부영향금지(sibling-immunity).** 공유 컴포넌트의 클래스/스타일은 컴포넌트 내부 루트(`.ohf-*`)와 그 자손에만 걸린다. 부모·형제 셀렉터로 스타일을 받지 않는다(`.ohf-cinema-screen .ohf-pult`처럼 조상으로 조이는 패턴은 예외적으로만, 그 경우에도 조이는 값은 "고정 레퍼"로 명시). → 컴포넌트를 고치면 그 컴포넌트의 렌더만 변하고 같은 줄에 앉은 형제는 그대로.
2. **단일전파경로(single-source propagation).** 변형값은 props 한 곳에서 들어오며, CSS는 그 값을 `var()` 또는 `data-*`로 받아 분기한다. 현행 1,798개 `var()`가 이미 전파를 달성하므로 새 도구 없이, 이 계약에 맞춰 **프리미티브를 추출**한다. 라벨 한 줄 바뀌었다고 마크업이 통째로 복제되는 현행 병목(general-create-tabs 2,883줄)을 파라미터로 흡수한다.
3. **시맨틱불변 + 정직표기.** HF에 없고 OH가 개선한 시맨틱(role/aria)은 의도적 상이점으로 남기되 동속성 자동 검사에서 제외 표기(F-6/7/8). 반대로 HF 원문에 있고 OH가 실수로 어긋난 값(예: 라벨 `생성하기`인데 aria `Generate` — F-10)은 스펙이 일치를 강제한다.

> **판정법(구현자용):** "이 컴포넌트를 고쳤을 때 다른 컴포넌트도 같이 변하는가?" → **Yes 라면 격리 위반.** 격리는 props와 셀렉터 경계로만 성립한다.

**격리가 성립하는 실증 예:** `card-body`가 `ctaHeight`를 48→56으로 바꿔도 `segmented-tabs`와 `figure-card`의 렌더는 그대로고, `hf-tile`의 `ringRecipe`를 box-shadow로 바꿔도 `tile-grid`의 배치 기하(justified 행265 / equal-square 355)는 그대로다. 이것이 사용자가 원한 "변경의 내부 제한"이다.

---

## 5. CSS 정리 방안 — 13파일 목표 + 7단계

### 5.1 목표 파일 구조

```
src/openhiggsfield/
├── tokens.css          ← 디자인 토큰(색·간격·타이포·크기·그림자·이징)
├── base.css            ← reset + 글로벌 요소 기본값 (:where)
├── shell.css           ← .ohf-shell, .ohf-topbar, .ohf-bar
├── sidebar.css         ← sidebar-plate + subtab-strip + card-body + figure-card + segmented-tabs
├── composer.css        ← composer + attach + controls-strip + edge
├── dock.css            ← dock-mode-container + pult + generate-button
├── gallery.css         ← tile-grid + hf-tile + overlay 프리미티브
├── cinema.css          ← .ohf-cinebar* (HG 미러 사이드바, 현 150 셀렉터)
├── cinema-panel.css    ← .ohf-cinema* (시네마 패널, 현 225 셀렉터)
├── viewer.css          ← viewer + rail-foot
├── overlays.css        ← tooltips, popovers, dialogs
├── settings.css        ← settings surface
├── misc.css            ← batch, skeleton, entrance, responsive, reduced-motion
└── openhiggsfield.css  ← import 에이그케이터(선언적 @import만)
```

> 캐스케이드 승자 = 파일 import 순서. `@import` 순서를 위 배열과 동일하게 박으면 캐스케이드가 예측가능해진다(시네마가 gallery 이후 = 시네마 패널이 기본 갤러리 위에 오버레이되므로 승자가 시네마여야 함).

### 5.2 캐스케이드 승자 고정 규칙(감사 §3.3 OH 미러 실측)

`.ohf-tile` radius **0px**(미러블록 12348이 base 14px를 꺾음), grid aspect **1/1**(12167), media absolute+**cover**, ring=**box-shadow**(HF는 border-2 자식 div라 동속성 비교불가·동시각 근사), act 32×32 op0→hover reveal, **touch 매체 발동 시 36×36 상주**(3569/9076). 이 승자들을 **고정 레퍼**로 인정하고 복제 블록(첫 사본)의 잔여를 정리한다.

### 5.3 7단계 마이그레이션(우선순위순 — 위험최소→효과최대)

| 순위 | 단계 | 작업 | 예상 효과 |
|---|---|---|---|
| 1 | **복제 사본 제거** | 첫 사본(135–3858)을 통째로 삭제하고 두째 사본(5563–9365)만 유지. **§8 실증: 첫 사본은 두째의 진성 부분집합 → 무손실.** 324개 이중 셀렉터 전부 두째에 잔존 | 약 3,700줄(18%) 감소, 원인을 ① |
| 2 | **서브탭 스타일 메인 CSS로 추출(split-brain 해소)** | `generalCreateTabsStyle` 상수(인라인 143 셀렉터)를 `sidebar.css`로 이동, TSX의 `<style data-ohf-gct>`·export 제거. 메인 CSS로 옮기면 캐스케이드 우선순위 반전되므로 인라인 의존성(메인 CSS의 `.ohf-gct` 4개 스코프 오버라이드)을 한 곳에서 정리 | 원인 ② 소멸 |
| 3 | **도크 pult 조상스코프 → `data-mode` 분기** | `.ohf-cinema-screen .ohf-pult*`(스코프 오버라이드)를 `.ohf-pult[data-mode="cinema"]`(자기 루트+자손)로 전환. 시네마 전용값은 시네마 지역 토큰으로 흡수 | 원인 ③ 소멸(조상스코프 109→~10 예외적) |
| 4 | **`!important` 체계적 제거** | 132건 중 복제제거로 ~40 자동소멸, 조상스코프 대체로 ~20 소멸, 동적가시성(`data-active`)을 `data-*`+캐스케이드 순서로 ~30 소멸, 나머지는 우선순위로 해결가능한지 개별판정 | 132 → ~30 |
| 5 | **파일 분할(component-per-file)** | 위 13파일로 분할. **기존 셀렉터 변경 없이 위치만 이동 → 무위험.** @import 순서가 캐스케이드를 결정 | 물리적 경계 명료 |
| 6 | **시네마 사이드바/패널 분리 확인** | `cinema.css`/`cinema-panel.css`를 독립 시트로 유지(선례: `reference-film.css` 578줄이 이미 독립 파일로 존재) | 앱과 충돌격리 |
| 7 | **`data-*` 네임스페이스 리네임** | 260개 무경계를 `data-ohf-<component>-<state>`로 명시(예 `[data-on="true"]`→`[data-ohf-pult-on="true"]`). TSX 어트리뷰트 설정과 CSS 셀렉터 동시수정, 단계적(신규부터) | 원인 ④ 경계확립 |

### 5.4 목표 지표 (재검증된 현재값 기준)

| 지표 | 현재(실측) | 목표 |
|---|---|---|
| 총 줄 수 | 20,411 | ~17,500(복제 제거 후) |
| 파일 수 | 1(20K줄) | 13 |
| `!important` | 132 | ~30 |
| `var()` 참조 | 1,798 | 1,798+(새 간격/크기 토큰 +50) |
| 인라인 CSS(TSX) | 143 셀렉터(유니크) | 0 |
| 조상스코프 오버라이드 | 109 | ~10(예외적) |
| 복제 셀렉터 | 324 쌍 | 0 |

---

## 6. 디자인 시스템 "무엇으로" — 도구 판정과 C+D의 실제 형태

### 6.1 4후보 판정(실측 수치 기반)

| 후보 | 판정 | 한 줄 이유 |
|---|---|---|
| A. Storybook + 디자인 토큰 | **지금은 보류(문서화 용도)** | 이미 전파되는 토큰에 문서화 부가만. 리터널-미러 스프린트엔 셋업·유지 비용 disproportionate. UI 안정 후 도입 |
| B. Tailwind config | **회귀(미도입)** | 현행 `var()` 전파와 동일 기능 중복 + HF pixel-mirror(rect 동값)엔 arbitrary value 남발로 저해 |
| C. CSS 커스텀 프로퍼티 공식화 | **✓ 권장** | 이미 작동하는 시스템에 문서화 레이어만 추가. 1,798개 `var()`가 단일변경 전파를 달성 |
| D. 경량 프리미티브 레지스트리 | **✓ (C와 결합)** | 마크업 중복 병목(general-create-tabs 2,883줄) 해결. CSS 변경 없음 |

### 6.2 C+D의 구체 형태(정정 포함)

**Phase 1 — 토큰 공식화:** `src/openhiggsfield/tokens.ts`에 `.ohf`의 CSS 커스텀 프로퍼티를 TS 객체로 미러링(타입 안전성 `TokenName = keyof typeof TOKENS`, HF 원문 매핑 주석 유지). `tokens.css`로 위치만 이동(추가 정의 없음 — 1,798 `var()`가 이미 이 토큰 소비 중). 시네마 전용 `--cine-*`는 `.ohf-cinebar` 내부에서 `cinema.css` 루트의 지역 커스텀 프로퍼티로 승격(앱 기본 스케일 침범 없이 시네마 패널이 스케일 공유).

**Phase 2 — 프리미티브 레지스트리:** `src/openhiggsfield/ui.tsx`에 추출·확장.
> ⚠ **정정:** t_814655b2는 "ui.tsx가 비어 있어 registry로 활용"이라 했으나, **실측 결과 ui.tsx는 144줄로 이미 `Field`/`Option`/`OptionList`/`Slider` 4개 프리미티브를 보유**한다. 즉 레지스트리는 빈 파일에 새로 세우는 것이 아니라 **이미 존재하는 발판 위에 확장**한다(비용이 권고치보다 낮다 — 좋은 방향의 정정).

추가할 프리미티브(감사 §1/§2에서 실제로 갈라져 복제된 패턴):
- `Button`(ghost/labeled/accent → `.ohf-icon-btn--*`) — CTA `ctaHeight`(48|56)를 prop으로
- `Subtab`(strip의 탭 div, role/aria는 OH 개선 정직표기, 너비=라벨 파생)
- `CardBody`(recipe form|section|scroll 흡수, F-1)
- `SegmentedTabs`(q-tabs, fillWidth 파생)
- `FigureCard`(fit fixed-h|aspect-pad 보존, F-4)
- `Plate`(도크 instruments plate, `ariaLabel` 파라미터 — 팔레트만 무라벨, F-8)
- `Tile`(layoutMode×mediaFit, `hoverIconSet`=OH발명표기, F-11)
- general-create-tabs.tsx의 인라인 반복 마크업 → 위 프리미티브 호출 치환

**Phase 3(선택·UI 안정 후):** Storybook 문서화. 현행 CSS 변경 없음(스토리에서 import만).

> **"무엇으로 만들지"의 최종 답:** 별도 프레임워크 없이 **`tokens.ts`(토큰 공식화) + `ui.tsx`(프리미티브 레지스트리 확장)** 두 파일 체계. 현행 var()/BEM/data-* 전파 위에 격리 계약을 얹는 것이 디자인 시스템이다.

---

## 7. 통합 실행 로드맵 (CSS와 프리미티브를 하나의 순서로)

두 트랙이 같은 축을 다루므로, 한 시퀀스로 묶는다. 각 단계는 §9 검증 계약으로 게이트한다.

```
P0  토큰 공식화       tokens.ts + tokens.css 위치이동(추가정의무). 시네마 --cine-* 승격.
    → (위험최소·전파기반 확정)

P1  복제 제거        첫사본(135–3858)삭제(§8실증=무손실). 캐스케이드 승자고정(radius0·aspect1/1·cover).
    → 원인① 소멸. 여기가 최대효과·최소위험의 첫 착지.

P2  split-brain 해소 인라인 generalCreateTabsStyle(143) → sidebar.css. TSX <style> 제거.
    → 원인② 소멸. 서브탭이 컴포넌트로 고립.

P3  격리 분기        조상스코프(109) → data-mode 분기. pult/cinema를 §4격리안으로.
    → 원인③ 소멸.

P4  프리미티브抽出    ui.tsx에 Subtab/CardBody/FigureCard/Plate/Tile/SegmentedTabs/Button.
    → general-create-tabs 2,883줄 인라인복제 → 호출치환. 사용자 보고의 "모두 새로 만든" 병목해소.

P5  !important/파일분할/네임스페이스  132→~30. 13파일분할(위치는동·셀렉터변경무). data-* 리네임.
    → 원인④ + 물리적경계.
```

**설계 결정(근무자가 확정 — 작업자 간 중복결정 방지):**
- 캐스케이드 승자(radius0·aspect1/1·cover)를 **고정 레퍼**로 통일(t_814655b2 권고 재확인).
- 좌측 서브tabpanel과 우측 본문을 **한 slot으로 합치지 않음**(담는 콘텐츠가 근본적으로 다름 — 격리 유지).
- F-12/U-5의 `showDock` 게이트 진위는 **단정하지 않고 미검증으로 유지**(과-parameter화 방지).
- 시맨틱 개선(role/aria)은 **의도적 상이로 정직표기**, 어긋난 값(F-10)만 일치를 강제.

---

## 8. 정직 고지 — 재검증 vs 스냅샷 갭 + 미검증

### 8.1 재실측 HEAD(74728de) 확인과 갭

내가 직접 재실측해 **일치 확인**: 20,411줄 / 1,798 var() / 132 !important / 260 data-* / 2,883줄 general-create-tabs. 아래는 갭 항목(정직 표기):

| 항목 | 내 실측(HEAD) | 부모 스냅샷 | 해석 |
|---|---|---|---|
| `.ohf-cinema-screen` 조상스코프 | **109건** | 83건 | 시네마 미링/nav가 더 착지된 후 증가. 3단계의 목표는 동일(→~10). |
| 인라인 gct 셀렉터 정의 | **143개(유니크)** | 60개(서브탭 한정) | 카운트 기준 상이. split-brain 메커니즘은 실재(메인 CSS gct 4개뿐 / 인라인 주입 2250 확인). |
| ui.tsx 상태 | **144줄·4프리미티브 보유** | "비어 있음" | **정정** — 발판 이미 존재(§6.2). |

### 8.2 복제 무손실 실증 (P1의 안전성)

`diff(135–3858, 5563–9365)` 결과: **첫 사본에 있고 두째 사본에 없는 라인 0건**(`<`), 두째 사본에 있고 첫 사본에 없는 79줄(`>` = `.ohf-controls*`/`.ohf-edge*` 계열). 즉 첫 사본은 두째의 **진성 부분집합**이며 후행 캐스케이드에서 항상 두째가 승리한다 → **첫 사본 삭제는 기능 무손실**이로 P1은 위험최소로 확정.

### 8.3 구조 분기 플래그 처리(감사 12건 → 스펙 처리)

| # | 대상 | 처리 |
|---|---|---|
| F-1 | 본문 래퍼 3분기 | **수렴** — `card-body.recipe`(form\|section\|scroll) |
| F-2 | CTA 48 vs 56 | **파라미터화** — `card-body.ctaHeight` |
| F-3 | Motion 판 수축 790 | **정직 예외** — `sidebar-plate.maxHeightCap`(HF 원문 사실) |
| F-4 | 피겨 조립 상이 | **수렴+보존** — `figure-card.fit`, 동결과 유지 |
| F-5 | studio-mode 주석 오류(3탭 주장 vs 라이브 2탭) | 라이브 rail은 탭 2개. `cinematic`은 레거시 저장상태에서만. **주석 수정 후속(스펙 밖)** |
| F-6/F-7 | 서브탭·pult 시맨틱 | OH의 role/aria 추가는 의도적 개선 → 정직표기, 동속성 검사 제외 |
| F-8 | instruments plate aria | HF 전무 vs OH 4종 → `plate.ariaLabel` 파라미터, 팔레트만 무라벨(통일 판정은 후속) |
| F-9 | instruments +2px x오프셋 | gap-1/p-1 환산 잔차 → 고정 레퍼로 허용(중대하지 않음) |
| F-10 | 생성 라벨/aria 불일치 | **일치 강제** — aria를 표기 `생성하기`에 맞춤 |
| F-11 | 타일 rail | HF 원부재 표기 — `hoverIconSet`은 OH 발명, 동속성 검사 안 붙임 |
| F-12 | general video 독 | U-5 이월 — `showDock` 게이트 진위 미검증 |

### 8.4 미검증(U) 6건 — 파라미터로 삼키지 않고 미검증으로 둔다

U-1 카드크기 슬라이더(0/2/4 실수치 미확보), U-2 편집방식 탭(clip 상태 mount-gate), U-3 쇼케이스 전체 버튼(재열거 필요), U-4 조명 plate headless 아티팩트(값 `Silhouette` 재확인), U-5 HF general video 독(미실측), U-6 HF 비디오 표면 타일 변형(미확보). **특히 F-12/U-5의 showDock는 진위를 단정하지 않는다.**

---

## 9. 수락 기준 — 각 단계의 검증 계약

1. `npx tsc --noEmit` exit 0
2. OH 라이브 SSR 도배에서 해당 컴포넌트 rect가 감사 실측과 동값 유지(CDP 1440×900 재실측)
3. 에디트-격리 판정법: "이 컴포넌트를 고쳤을 때 다른 컴포넌트도 같이 변하는가?" → **No**

> P1(복제 제거) 착지 시 ①의 "고쳐도 캐스케이드에서 죽는" 현상이 소멸하고, P2·P3 착지 시 ②③이 소멸한다. 이것이 사용자 보고현상("고칠 때마다 기능이 안되고")의 실제 소멸 조건이다.

---

## 10. 실행 제의와 게이트

본 방안은 4개 선행 산출물의 실측·스펙·계획을 **하나의 결정된 시퀀스**로 수렴했다. 그러나 body가 "나한테 보고해"를 명시했으므로, **실행 착지는 사용자 승인 후**로 둔다 — 즉 §7의 P0~P5를 자동 디스패치하지 않고 본 보고서로 보고한다. 승인 시 P1(복제 제거, 무손실 실증됨)을 첫 카드로 띄우는 것을 권고(최대효과·최소위험). 승인·수정 지시가 있으면 후속 실행 카드를 생성한다.
