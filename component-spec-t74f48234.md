# 컴포넌트 스펙 — 공통 컴포넌트 경계 및 파라미터화

**태스크**: t_74f48234 · **작성일**: 2026-11-05 (KST)
**근거**: `hf-ui-audit-t1a4c24fb.md`(라이브 CDP 실측, 1440×900 고정) + OH 소스 실독(`dock-config.ts` 85줄, `studio-mode.ts` 52줄, `general-create-tabs.tsx` 2,883줄의 gct-레일/pult, `gallery.tsx`의 `.ohf-tile`).
**원칙**: 아래 모든 "불변"값은 감사 문서의 실측 rect·클래스를 그대로 옮긴 것이다. 파라미터는 **감사에서 실제로 갈라진 축만** 흡수한다.

---

## 0. 에디트-격리(Edit-isolation) 계약 — 전 컴포넌트의 공통 규칙

이 문서의 존재 이유. 컴포넌트를抽出하는 핵심 동기는 "하나 고치면 다른 데 깨진다"는 보고된 현상을 막는 것이다. 격리를 실제로 보장하려면 아래 세 가지를 **모든 컴포넌트에 동일하게** 적용한다.

1. **외부 영향 금지(sibling-immunity).** 공유 컴포넌트의 클래스/스타일은 컴포넌트 내부 루트(`.ohf-*`)와 그 자손에만 걸린다. 부모·형제 셀렉터에 의존해 스타일을 받지 않는다(예: `.ohf-cinema-screen .ohf-pult`처럼 조상으로 조이는 패턴은 예외적으로만 허용하고, 그 경우에도 조이는 값은 §각 스펙의 "고정 레퍼"로 명시). 즉 컴포넌트를 고치면 그 컴포넌트의 렌더만 변하고 같은 줄에 앉은 형제는 그대로다.
2. **단일 전파 경로(single-source propagation).** 변형값은 props 한 곳에서 들어오며, CSS는 그 값을 `var()` 또는 `data-*`로 받아 분기한다. t_814655b2 권고대로 현행 시스템은 이미 1,798개 `var()`로 전파를 달성했으므로, 새 도구를 도입하지 않고 이 계약에 맞춰 **프리미티브를 추출**한다. 라벨 한 줄 바뀌었다고 마크업이 통째로 복제되는 현행 병목(2,883줄의 general-create-tabs 복제)을 파라미터로 흡수한다.
3. **시맨틱 불변 + 정직 표기.** HF에 없고 OH가 개선한 시맨틱(role/aria)은 **의도적 상이점**으로 남기되, 동속성 자동 검사에서 제외 표기한다(감사 F-6/F-7/F-8/F-10). 반대로 HF 원문에 있고 OH가 실수로 어긋난 값(예: 라벨은 `생성하기`인데 aria가 `Generate` — F-10)은 스펙이 **일치를 강제**한다.

> 구현자 판정법: "이 컴포넌트를 고쳤을 때 다른 컴포넌트도 같이 변하는가?" → Yes 라면 위 계약 위반. 격리는 props와 셀렉터 경계로만 성립한다.

---

## 1. 컴포넌트 팩 인벤토리 (감사 §6의 5개 팩)

| 팩 | 역할 | 실측 근거 | 감사 플래그 |
|---|---|---|---|
| `sidebar-layout` | 좌 20rem + 우 1fr 2열 워크벤치 셸 | `main#main.area-main` → `div#video-create-layout grid-cols-[20rem_1fr] gap-2 px-4 pb-2` (0,44,1440,836) | — |
| `sidebar-plate` | 좌측 사이드바 판(320폭) + 카드 slot | `div.hidden.md:flex.flex-col.max-h-full.min-h-0.self-start…` (16,44,320,828) | F-1, F-3 |
| `subtab-strip` | 판 최상단 수평 서브탭 스트립(318×48) | `nav.flex.min-w-0.shrink-0.bg-transparent` (17,45,318,48), 탭 div 81/68/99×36 @x33/126/206 gap12 | F-6 |
| `card-body` | 활성 서브탭의 카드 본문(레시피 분기) | form/section/스크롤러 3형제, rect 778/778/740 | F-1, F-2, F-3 |
| `segmented-tabs` | q-tabs 세그먼트 탭(본문 내부) | 302×40 @25,239 / 278×40 @37,772; 탭 145/133×32 | (F-5과 무관, 원문 시맨틱 보유) |
| `figure-card` | 카드 상단 피겨(302×130) | h-32.5 고정 vs p-3+aspect-… — 동 rect 동결과, 다른 조립 | F-4 |
| `dock-mode-container` | 하단 독(시네마↔일반 분기) | OH 4-state matrix + HF rail 72×116@400,399 | F-7, F-9, F-10, F-12 |
| `hf-tile` | 피드 타일(정사각형/메이슨리) | 정사각형 355×355 4열 contain / 메이슨리 justified 행265·aspect·cover | F-11 |

`tab-content`는 slot 이름이다 — 좌측판의 활성 서브tabpanel도, 우측본문(#create-page-content)의 피드도 같은 "slot이 콘텐츠를 담는다" 개념으로 수렴할 수 있으나, **두 곳의 콘텐츠 종류가 다르므로 한 컴포넌트로 합치지 않는다**(§3 계층 참조). 우측본문을 `main-panel`로 두는 이유를 §3에 적는다.

---

## 2. 팩별 스펙 (각각: 고정 골격 / 파라미터 / slot)

표기: 파라미터 표의 **축**은 "이 값이 감사에서 실제로 변한 축"을 가리킨다. **고정** 열은 어떤 DOM 부분이 모든 변형에서 동일한가(컴포넌트가 하드와이어로 박는 골격)를, **설정** 열은 props로 들어오는 변형값을 가리킨다.

### 2.1 `sidebar-layout` (2열 워크벤치 셸)

**고정 골격**: grid, `grid-template-columns: 20rem 1fr`, `gap-2`, 좌우 padding(px-4 pb-2). 루트 rect (0,44,1440,836).
**이 팩의 파라미터(축)**:

| prop | 타입 | 기본값 | 감사 근거 | 고정/설정 |
|---|---|---|---|---|
| `showSidebar` | bool | true | `hidden.md:flex` — md 미만에서 좌판 숨음 | 설정(브레이크포인트) |
| `columns` | `[string,string]` | `["20rem","1fr"]` | HF 원문 클래스 | 고정(원문 그대로) |
| `gap` | px | 8 (`gap-2`) | 실측 gap | 고정 |

**slot**: 좌 `sidebar-plate` + 우 `main-panel`. 두 열을 직접 렌더하지, `tab-content`라는 단일 slot로 합치지는 않는다(좌는 카드 body, 우는 피드 grid가 들어오므로 §3).

### 2.2 `sidebar-plate` (좌측 판 + 카드 slot)

**고정 골격**: `flex flex-col`, 좌 폭 320(=20rem), `min-h-0`, `self-start`, `bg-page-primary`, `overflow-hidden`. 외곽 rect (16,44,320,828) — 만들기/편집에서 동일.
**이 팩의 파라미터(축)**:

| prop | 타입 | 기본값 | 감사 근거 | 고정/설정 |
|---|---|---|---|---|
| `width` | px | 320 | 실측 320 (20rem) | 고정 |
| `maxHeightCap` | px | none | **Motion만 320×790로 수축** — HF 원문이 그렇다(F-3). `md:max-h-[calc(100vh-…)]`을 Motion 시트에서만 적용 | 설정(Motion 예외 정직) |

> F-3 결정: Motion에서 판이 짧게 렌더되는 것은 HF 원문 사실이다. 수렴(강제 등고)하지 말고, `maxHeightCap` 파라미터로 Motion만 예외로 두는 것이 정직하다.

**slot**: `subtab-strip`(최상단) + `tab-content`(본문, 활성 서브탭에 따라 `card-body`를 담는다).

### 2.3 `subtab-strip` (수평 서브탭 스트립)

**고정 골격**: `display:flex; flex-direction:row; align-items:flex-start; gap:12px`, 높이 48(탭 h36), `overflow-x:auto`, 스트립 래퍼/nav (17,45,318,48) — 3 상태 모두 동 rect·동 클래스. OH는 여기에 `role="tablist"` + `aria-label` + `aria-orientation="horizontal"`을 **의도적으로 추가**(`general-create-tabs.tsx:2277-2281`).
**이 팩의 파라미터(축)**:

| prop | 타입 | 기본값 | 감사 근거 | 고정/설정 |
|---|---|---|---|---|
| `tabs` | `string[]` | `["비디오 만들기","비디오 편집","Motion Control"]` | 라벨만 매개변수. 너비 81/68/99은 라벨 길이 파생값(고정 아님) | 설정 |
| `gap` | px | 12 (`gap-3`) | 3 상태 동 gap | 고정 |
| `tabHeight` | px | 36 | 높이 36 고정 | 고정 |
| `activeClass` / `inactiveClass` | 2분기 클래스 | `text-primary-inverted border-b-primary-inverted` ↔ `text-text-secondary border-b-transparent` | 모든 탭이 활성/비활성 2분기를 공유 | 고정(레시피 불변) |
| `role`/`aria` | 시맨틱 | HF: 전무 / OH: tablist·tab·aria-selected | F-6 — OH 접근성 추가는 HF 원부재, 정직 표기 | 설정(OH 개선) |

**slot**: 각 탭은 라벨 텍스트(파라미터)를 담고, 탭 내 아이콘 없음. 너비=라벨 길이 파생이므로 **탭 너비를 props로 고정하지 않는다**.

### 2.4 `card-body` (본문 레시피 분기 — 감사의 F-1 수렴 결정)

감사 F-1: 본문 래퍼 클래스가 상태별로 `min-h-0 flex flex-col` / `min-h-0 flex flex-col flex-1` / `min-h-0`(flex-col 결여), 높이 778/778/740. **판정: 공유 셸로 수렴 가능, 파라미터로 흡수.**

**고정 골격**: 좌 318폭 slot에 좌정, 내부 좌 25 정렬(판의 p-2 → 콘텐츠 x25). 자식 구성(피겨/q-tabs/모델 트리거/CTA)은 §각 프리미티브.
**이 팩의 파라미터(축)**:

| prop | 타입 | 기본값 | 감사 근거 | 고정/설정 |
|---|---|---|---|---|
| `recipe` | `"form"\|"section"\|"scroll"` | `form` | 루트 태그 3분기: 만들기=`form.generate-form--asset`, 편집=`section.flex min-h-0 flex-1 flex-col px-2 gap-3 pt-2`, Motion=`form max-h-calc` | 설정(F-1 흡수) |
| `bodyRect` | px | 318×778 | 778/778/740 — 3분기 | 설정(레시피 파생) |
| `scroller` | `{cls,w,h}` | 만들기 `p-2 min-h-0 overflow-y-auto hide-scrollbar` 318×718 | 편집은 section이 자체 overflow / Motion은 `relative flex-1 md:flex-auto min-h-0 overflow` 302×656 | 설정 |
| `ctaHeight` | px | 48 | 만들기 302×**48** vs Motion 302×**56** — 동일 레시피 클래스, 높이만 갈림(F-2) | 설정(F-2 흡수) |
| `inputKinds` | `"checkbox"\|"file"\|"none"` | `checkbox` | 만들기=checkbox, 편집=없음(도구 리스트), Motion=file+checkbox | 설정 |

> F-1 수렴: 세 레시피는 루트 태그·래퍼 클래스·높이만 다른 **같은 슬롯의 변형**이다. `recipe` 하나를 들어오게 하면 세 갈래 분기가 한 컴포넌트로 흡수된다. 단, Motion의 `max-h-calc`(§2.2의 판 수축)은 레시피에 연동되므로 `recipe="scroll"`일 때 판 cap이 발동한다(F-3 정직 유지).

**slot**: `figure-card`(상단) → `segmented-tabs` → `model-trigger` → `input-group` → `cta`. 편집 상태는 `input-group` 대신 도구 리스트(`ul`+`li`+`button` 9행 302×58)를 담는다.

### 2.5 `segmented-tabs` (q-tabs)

**고정 골격**: `q-tabs q-tabs-segmented q-tabs-shape-rounded q-tabs-surface-flat q-tabs-tone-gla…`, role=tablist/tab + aria-selected(**오리지널 시맨틱**), 탭 내부=icon 16×16 + label. 폭 fill 배분이 컨테이너에 연동.
**이 팩의 파라미터(축)**:

| prop | 타입 | 기본값 | 감사 근거 | 고정/설정 |
|---|---|---|---|---|
| `fillWidth` | px | 302 | 만들기 302 vs Motion 278(본문 래퍼 너비 연동) | 설정(컨테이너 파생) |
| `tabs` | `{icon,label}[]` | 2종 | 탭 2개 145/133×32 — 탭 너비 fillWidth에 연동 | 설정 |
| `tabWidth` | px | fillWidth/n | 145(302) vs 133(278) — fill 배분 연동, **직접 고정하지 않음** | 파생 |
| `tabHeight` | px | 32 | 탭 h 32 | 고정 |
| `iconSize` | px | 16 | icon 16×16 | 고정 |
| `role/aria` | 시맨틱 | tablist+tab+aria-selected | 원문이 시맨틱 보유 — OH도 유지(동속성 검사 통과) | 고정(원문) |

> 편집 상태에서 q-tabs는 **미마운트**(U-2: 에러/도구 메뉴 상태에서만 마운트). 즉 `segmented-tabs`는 `card-body`가 "clip 탑재 후" 상태를 렌더할 때만 slot에 발동한다. 스펙은 mount-gate를 `cardBody.recipe`의 상태에 두되 발동 조건은 상태 의존으로 둔다.

### 2.6 `figure-card` (피겨 프리미티브 — F-4 결정)

감사 F-4: 동 rect 302×130인데 조립 레시피 상이 — 만들기 `h-32.5` 고정, Motion `p-3 + aspect-…`. 동결과가 동일하므로 **한 컴포넌트로 수렴 여지**. 원문 그대로면 2형제 유지.

**결정**: 동결과(302×130)가 동일하므로 한 프리미티브로 수렴하되, `fit` 파라미터로 조립 레시피를 보존한다. 결과치를 강제로 같게 하지 말고, 결과치는 같되 두 조립법을 props로 선택한다(원문 정직).

| prop | 타입 | 기본값 | 감사 근거 | 고정/설정 |
|---|---|---|---|---|
| `rect` | px | 302×130 | 동 rect | 고정(동결과) |
| `fit` | `"fixed-h"\|"aspect-pad"` | `fixed-h` | h-32.5 vs p-3+aspect | 설정(조립 2종) |
| `overlay` | `{img?, figcaption?}` | 없음 | 편집 피겨는 `<img.object-cover.-z-1>` + `figcaption`(h2 `편집 도구` 284×28 uppercase brand-font)를 추가 | 설정(편집 변형) |

### 2.7 `dock-mode-container` (하단 독 — mode×seat 2축)

OH는 이미 `dock-config.ts`(85줄)가 mode-half + seat-half를 한 객체로 접어 **한 곳에서 독의 얼굴을 결정**한다. 스펙은 그 계약을 명문화한다. 시트↔mode를 2축 파라미터로 두고, 분기값을 props 한 곳에서 들어오게 한다.

**고정 골격**: 독 rect·pult 탭 64×52 지오메트리·스택 간격·컴포저 박스 800폭·우측 코너 생성 버튼 좌정·발줄 구조 — 식별(동일) 요소들(OH 감사 §2.2).
**이 팩의 파라미터(축) — mode-keyed**:

| prop(=`DOCK_BY_MODE`) | 타입 | general | cinema | 감사 근거 |
|---|---|---|---|---|
| `plate` | bool | false | true | 시트 전환 후 rail·생성모드 plate 양 시트 동 rect. general은 plate 미렌더 |
| `cinemaPill` | bool | false | true | 설정 pill이 HF own marks로 응답 |
| `mark` | `"lime"\|"model"` | model(swatch) | lime svg | 모델 마크 swatch↔lime 분기 |
| `caret` | `"chevron"\|"caret"` | caret | chevron | |
| `label` | string | `Generate` | `생성하기` | **dock-config의 `label`이 단일 소스**(F-10의 aria 일치는 §에디트-격리 3으로 강제) |

**이 팩의 파라미터(축) — seat-keyed (clapper 아래)**:

| prop(=`CINEMA_SEAT`) | image | video | cinematic | 감사 근거 |
|---|---|---|---|---|
| `videoTop` | false | true | false | video seat 전용 instruments row(5플레이트 @486../y711) |
| `movement` | false | true | false | camera-movement key(그 seat가 rail에 캐리) |
| `tiles` | true | false | true | character/camera preset 우측 열, 생성 버튼 코너 free 시트만 |
| `anchor` | `tour-image-model/-generate` | `tour-video-model/-generate-button` | `tour-cinema-form` | 감사 state matrix의 per-state anchor 세트 |

**pult(plate) 내부 시맨틱(F-7 결정)**: OH pult는 `role=tablist + aria-orientation=vertical + aria-label=생성모드`를 tablist 스스로에 둔다(개선). HF rail은 role=tab 2개만 있고 tablist role·orientation 전무, `data-orientation=horizontal`(배치는 세로), aria-label은 조상 div에. 스펙: **HF의 Radix 구조를 미러하되 OH의 현명 개선(vertical+라벨을 tablist에)을 유지**하고 비교표에서 "OH 개선"으로 라벨한다.

> F-12 결정보류: OH general+video에서 독이 통째로 부재(셸이 GeneralCreateTabs로 스왑). HF의 general video 독 유무는 미실측(U-5)이므로, 스펙은 general+video의 독 마운트 여부를 **미검증으로 두고** U-5로 이월한다. 즉 dock-mode-container는 general·video 조합에서 렌더되지 않는 게이트를 `showDock`로 두되, 그 게이트의 진위는 U-5로 남겨둔다.

**slot**: pult(→pult-tab) + composer-box(→instruments-row→plate / foot-row / tiles-column) + generate-button(+크레딧).

### 2.8 `hf-tile` (피드 타일 — size×fit×mode 3축)

**고정 골격(anatomy)**: root `@container group relative overflow-hidden bg-neutral-surface-subtle transition-[border-radius]`, radius 0px(실측 OH 미러가 base 14px를 꺾음, CSS 12348). 정지 overlay 4종이 **존재하되 opacity 0**(tint / ring / checkbox / pill). 호버 게이트는 opacity로 reveal.
**이 팩의 파라미터(축)**:

| prop | 타입 | 기본값 | 감사 근거 | 고정/설정 |
|---|---|---|---|---|
| `layoutMode` | `"justified"\|"equal-square"` | justified | 메이슨리=block+JS 배치(행 높이 265·너비=265×자연 aspect), 정사각형=등각 4열 355×355 | 설정 |
| `mediaFit` | `"cover"\|"contain"` | cover | 메이슨리 `object-cover!`(크롭) vs 정사각형 `object-contain!`(레터박스) | 설정(layoutMode 연동) |
| `gap` | px | 2 | 양 모드 gap 2 | 고정 |
| `rowHeight` | px | 265 | justified 행 높이 | 고정(justified) |
| `cellSize` | px | 355 | equal-square 355×355 @x0/357/713 | 고정(equal-square) |
| `hoverIconSet` | enum 세트 | OH rail: fav/download/⋯/remix/3d | **OH on-tile rail(fav/⋯/remix/3d)는 HF 표면에 대응물 없다** — HF 기능은 클릭 후 쇼케이스 내부(§F-11). rail은 OH 자체 발명 | 설정(OH 발명; HF 원부재 표기) |
| `ringRecipe` | `"border-2"\|"box-shadow"` | box-shadow | HF `border-2 border-white` 자식 div vs OH `inset 0 0 0 2px rgba(255,255,255,.92)` box-shadow + `::after` scrim — 동속성 비교 불가, 동시각 근사 | 설정(기법 상이, 정직 표기) |
| `statPill` | bool | true | HF 정지 우상단 stat pill 44×24(브랜드 svg+카운트)+상단 중앙 114×22 pill — OH 동명 대응 없고 `.ohf-tile-viewed`/`footrow`가 자리만 대응 | 설정(자리 대응) |

**OH 캐스케이드 고정 사실(미러 블록 승자)**: radius 0px(12348), grid aspect 1/1(12167), media absolute+cover, ring=box-shadow, act 32×32 op0→hover reveal, **touch 매체 발동 시 36×36 상주**(3569/9076 — headless는 hover:none을 보고 이 블록이 act를 opacity 1/36×36로 전환). 구현자는 이 캐스케이드 승자를 고정 레퍼로 인정해야 한다(복제 블록이 존재하나 승자는 미러 블록).

> F-11 표기: 미러 감사 시 on-tile rail은 "HF 원부재"로 라벨. 동속성 검사를 붙이지 않는다.

**slot**: media → overlay 4종 → stat pill → bottom cluster(정지 시 0×0, 데이터 종속) → hover cluster. **타일 실제 기능은 클릭 후 dialog**에서 열거(`fixed z-101 inset-0 role=dialog` "에셋 쇼케이스"), captured 3종(댓글 추가·확장·닫기)만 확인(U-3: 레일 foot·탭은 async 마운트라 재열거 필요).

---

## 3. 컴포넌트 계층 (which composes which)

```
app-shell
├ topbar
└ workbench
   ├ sidebar-layout (2열 grid: 20rem 1fr)
   │  ├ sidebar-plate (320폭 좌판)
   │  │  ├ subtab-strip (role=tablist, 수평)
   │  │  │   └ tab ×N (HF=div / OH=button role=tab)          ← 파라미터: 라벨(너비 파생)
   │  │  └ tab-content ← 좌측판의 "활성 서브tabpanel" slot
   │  │      └ card-body (recipe: form|section|scroll)        ← F-1 흡수
   │  │          ├ figure-card (302×130)                       ← F-4 수렴(fit 파라미터)
   │  │          ├ segmented-tabs (q-tabs)                     ← clip 상태에서만 mount(U-2)
   │  │          ├ model-trigger (302×54)
   │  │          ├ input-group (checkbox|file|none) 또는 도구 리스트(편집)
   │  │          └ cta (302×48|56)                             ← F-2 ctaHeight
   │  └ main-panel (우측 본문 #create-page-content)
   │      └ tile-grid (layout: justified|equal-square)
   │          └ hf-tile                                         ← §2.8 3축
   │              └ tile overlay 프리미티브 4종
   │      (클릭 → showcase dialog: role=dialog, 버튼은 U-3 미열거)
   └ dock-mode-container (mode×seat 2축)
      ├ pult (vertical tablist, 생성모드) → pult-tab ×2        ← F-7 OH 개선 유지
      ├ composer-box (800폭)
      │   ├ instruments-row → plate ×5 (video seat만, @486../y711) ← F-8/F-9
      │   ├ foot-row (버튼 3종 + 모델 트리거 + 설정 필)
      │   └ tiles-column (image/cinematic seat만)
      └ generate-button (+크레딧)                                ← F-10 aria 일치 강제
```

**왜 `tab-content`를 하나로 합치지 않는가**: 좌측판의 활성 서브tabpanel은 `card-body`를 담고, 우측본문은 `tile-grid`를 담는다 — 담는 콘텐츠 종류가 근본적으로 다르다(감사 §1.1의 `#video-create-layout`의 두 자식 `#video-create-layout>div(hidden.md:flex)` vs `#create-page-content`). "slot이 콘텐츠를 담는다"라는 개념적 유사성은 있으나, 한 컴포넌트로 합치면 좌측의 card-body 분기와 우측의 tile 분기가 같은 props 스페이스에 섞여 격리 계약이 깨진다. 두 slot을 분리한 채 §0의 에디트-격리를 각각 적용한다.

**격리 관점**: 위 트리에서 각 노드는 자기 자식만 안다. `card-body`가 ctaHeight를 바꿔도 `segmented-tabs`와 `figure-card`의 렌더는 그대로고, `hf-tile`의 ringRecipe를 box-shadow로 바꿔도 `tile-grid`의 배치 기하(justified 행265/equal-square 355)는 그대로다. 이것이 사용자가 원한 "수정할 때 해당 컴포넌트 내부로 변경이 제한"이다.

---

## 4. 변형 매트릭스 (감사 상태 × 발동 파라미터)

| 시트 상태 | sidebar-plate | subtab-strip | card-body | segmented-tabs | ctaHeight | 도크 | pult | instruments | tiles |
|---|---|---|---|---|---|---|---|---|---|
| video/make(만들기) | 320×828 | 3탭 318×48 | recipe=form | 302 fill, 탭145×32 | 48 | cinema: O | image/video | image seat=×0 | true |
| video/edit(편집) | 320×828 | 3탭 동 | recipe=section | 미마운트(U-2) | 없음(도구 리스트) | cinema: O | 동 | 0 | true |
| video/motion | 320×**790**(maxHeightCap) | 3탭 동 | recipe=scroll | 278 fill, 탭133×32 | **56** | cinema: O | 동 | 0 | false |
| general/image | — (좌판 미사용) | — | — | — | — | 1440×137 | 없음(plate false) | 없음 | 0 |
| general/video | — | — | — | — | — | **미존재(셸 스왑)** U-5 | — | — | — |
| cinema/image | 402,763 876×121 | pult 2탭64×52 | — | — | — | 876×121 | pult image | 없음 | 0(비어) | true |
| cinema/video | 402,703 876×181 | pult 2탭64×52 | — | — | — | 876×181 | pult video | **5플레이트@486../y711** | false | false |

(피겨 fit·tile layout·mediaFit는 위 시트와 직교하는 축이므로 표에 넣지 않고 §2.6/§2.8의 파라미터로만 분기한다.)

---

## 5. 감사 플래그(U 포함) → 이 스펙의 처리

| # | 대상 | 스펙 처리 |
|---|---|---|
| F-1 | 본문 래퍼 3분기 | **수렴** — `card-body.recipe`(form|section|scroll)로 흡수 |
| F-2 | CTA 48 vs 56 | **파라미터화** — `card-body.ctaHeight`(48|56) |
| F-3 | Motion 판 수축 790 | **정직 예외** — `sidebar-plate.maxHeightCap`(Motion만 calc) |
| F-4 | 피겨 조립 상이 | **수렴+보존** — `figure-card.fit`(fixed-h|aspect-pad), 동결과 유지 |
| F-5 | studio-mode 주석 오류(3탭 주장 vs 라이브 2탭) | 시네마 rail은 탭 2개(이미지·비디오). `cinematic`은 레거시 저장상태에서만 라이브 rail은 never sets(`app:1404`) → 도크 seat에는 `cinematic`이 있으나 pult-tab은 2개만 렌더. 주석은 소스 수정 필요(이 스펙 밖 후속). |
| F-6 | 서브탭 시맨틱 | OH의 role/aria 추가는 의도적 개선, 동속성 검사 제외 표기 |
| F-7 | pult 시맨틱 | OH 개선(vertical+라벨 tablist) 유지, 비교표 "OH 개선" 라벨 |
| F-8 | instruments plate aria | HF 전무 vs OH 4종 — 동속성 검사 실패 지점, **의도 확인 후 통일 필요**(판정 후속). 스펙은 `plate.ariaLabel` 파라미터를 두고 팔레트만 무라벨로 남김. |
| F-9 | instruments +2px x오프셋 | gap-1/p-1 환산 잔차 — 정합화 여지(중대하지 않음), 고정 레퍼로 허용 |
| F-10 | 생성 라벨/aria 불일치 | **일치 강제** — §0-3에 따라 표기 `생성하기`와 aria `Generate`를 동일하게(aria를 표기에 맞춤) |
| F-11 | 타일 rail | HF 원부재 표기 — `hoverIconSet`은 OH 발명, 동속성 검사 안 붙임 |
| F-12 | general video 독 | U-5 이월 — `showDock` 게이트 진위 미검증 |
| U-1 | 카드크기 슬라이더 | 0/2/4 실수치 미확보 — `hf-tile.cellSize/rowHeight`의 슬라이더 매핑은 미검증, 재실측 필요 |
| U-2 | 편집방식 탭 | `segmented-tabs`의 clip 상태 mount-gate로 표기(발동 조건 상태 의존) |
| U-3 | 쇼케이스 전체 버튼 | 스펙은 dialog 버튼 전량 미열거로 두되, 구현 시 재오픈 열거 필요 |
| U-4 | 조명 plate headless 아티팩트 | 값만 `Silhouette` 재확인 필요(실브라우저 정상) |
| U-5 | HF general video 독 | §2.7 결정보류 |
| U-6 | HF 비디오 표면 타일 변형 | 비디오·오디오 표면 tile 변형 미확보 — `hf-tile` 변형 인벤토리 미완 |

---

## 6. 구현자 판정 체크리스트 (수락 기준 대응)

각 스펙이 "모호함 없이 구현 가능"한지 검증하는 관점:

- 고정 골격의 rect·클래스가 감사의 실측값과 1:1로 박혔는가 → §2 각 표의 고정 열.
- 갈라진 축만 파라미터로 두는가(과-parameter화 금지) → §4 매트릭스와 대조.
- 라벨 길이 파생값(서브탭 너비·q-tabs 탭 너비)을 props로 고정하지 않았는가 → §2.3/§2.5의 파생 주석.
- 시맨틱 개선과 정직 상이가 §0-3에 라벨됐는가 → §5의 F-6/7/8/10/11.
- 에디트-격리(§0)가 계층 트리(§3)의 각 노드에서 성립하는가 → 자식만 아는 원칙.
- 미검증(U)이 파라미터로 삼켜지지 않고 미검증으로 표기됐는가 → §5. (특히 F-12/U-5의 `showDock`는 진위를 단정하지 않았다.)

---

## 7. 하위 카드(t_388e3f0e CSS 매핑)에 넘기는 계약

CSS 재구성은 이 스펙의 "고정 골격"을 컴포넌트 경계로 묶는다. selector→family 매핑 시:
- `.ohf-gct-subtab-strip` / `.ohf-gct-rail` → subtab-strip
- `.ohf-pult*` → dock-mode-container의 pult
- `.ohf-tile*` → hf-tile
- 카드 본문의 form/section 래퍼 → card-body
- sidebar의 `max-h-calc` 계열 → sidebar-plate.maxHeightCap
- 캐스케이드 승자(radius 0·aspect 1/1·cover)를 **고정 레퍼로 인정하고 복제 블록을 정리**하라는 t_814655b2 권고(t_388e3f0e가 처리).
