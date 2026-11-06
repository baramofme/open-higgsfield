# CSS 재구성 계획 — 토큰 기반 구조로의 마이그레이션

**태스크**: t_388e3f0e · **작성일**: 2026-11-05 (KST)  
**근거**: `component-spec-t74f48234.md` §7 selector→family 매핑 계약 + t_814655b2 실측 수치 권고  
**원칙**: 도구 도입 없이 기존 `var()`/`data-*` 전파 체계를 공식화하고, 복제 블록을 제거한다.

---

## (a) 현재 상태: 문제 목록

### 1. 완전 복제 블록 — 3,724줄 무의미 중복

| 구분 | 줄 범위 | 내용 |
|---|---|---|
| 첫 사본 | 135–3858 | 토큰 이후 기본 셸 + 전 컴포넌트 스타일 |
| 시네마 사이드바 | 3859–5562 | `.ohf-cinebar*` (HG 미러) |
| **두 번째 사본** | **5563–9365** | 첫 사본과 diff 79줄 — 7개 셀렉터만 추가 |

- 첫 사본은 캐스케이드에서 **이중 정의당한다**(같은 셀렉터가 두 번 정의되어, 후행 사본이 항상 승자).
- 첫 사본의 `.ohf-controls*`·`.ohf-edge*`가 없으므로, 필요 시 두 번째 사본에 의존해야 한다.
- 결과: 약 18%의 파일(3,724줄)이 **삭제 가능**한 순도 100% 중복.

### 2. 사이드바 서브탭 스타일 분산 (split-brain)

- `.ohf-gct-subtab-strip`, `.ohf-gct-subtab`, `.ohf-gct-subtab-panels` 등 **60개 셀렉터**가 `general-create-tabs.tsx:2360`의 `<style>` 블록(인라인 styled-jsx)에 존재.
- 메인 CSS에는 `.ohf-gct` 계열 셀렉터가 단 **4개**만 존재(16411, 20116, 20162).
- **문제**: 서브탭 컴포넌트를 고치려면 TSX 인라인 스타일과 메인 CSS 양쪽을 건드려야 하며, 캐스케이드 우선순위가 불명확.

### 3. 도크 pult 스타일 이중 정의 및 조상 스코프 오버라이드

| 위치 | 스타일 |
|---|---|
| 10244–10313 | `.ohf-pult` (무스코프) |
| 17364–17389 | `.ohf-cinema-screen .ohf-pult` (스코프 오버라이드) |
| 10425 | `@media` 내 `.ohf-pult` 재정의 |
| 15984 | `.ohf-form-row:has(.ohf-pult)` 조건부 |

- 조상 스코프(`.ohf-cinema-screen`)로 조이는 패턴은 §0 에디트-격리 계약의 **예외**.
- 격리 계약에 따르면: 변형값은 `dock-config.ts`에서 props→`var()`/`data-*`로 전달되어야 하며, 조상 셀렉터 오버라이드는 최소로 줄인다.

### 4. `!important` 남발 — 132건

- `.ohf-edge[data-active]` 등 동적 가시성 제어에서 `!important`로 캐스케이드를 강제로 이김.
- `.ohf-cinema-screen` 스코프 오버라이드에서도 `!important` 사용 — 스코프 우선순위로 충분할 곳에 무의미하게 사용.
- 결과: 수정 시 "이 규칙을 바꿔도 저 규칙이 이긴다"는 예측 불가능성.

### 5. 시맨틱 셀렉터 경계 미확립

- 260개 `[data-*]` 셀렉터와 100개+ `[aria-*]` 셀렉터가 컴포넌트 간 경계 없이 산재.
- 예: `[data-on="true"]` 33건, `[data-collapsed="true"]` 31건이 파일 전역에 흩어져 어떤 컴포넌트 소유인지 불명.

### 6. 시네마/비시네마 분기 부재

- `.ohf-cinebar`(시네마 사이드바 HG 미러) 150 셀렉터 + `.ohf-cinema`(시네마 패널) 228 셀렉터가 메인 파일에 인라인.
- 이들은 **독립 스타일 시트**(reference-film.css 선례)로 분리할 수 있으나 현재 한 파일에 혼재.

---

## (b) 목표 구조

### 파일 레이아웃

```
src/openhiggsfield/
├── tokens.css          ← 디자인 토큰(색·간격·타이포·크기·그림자·이징)
├── base.css            ← reset + 글로벌 요소 기본값 (:where)
├── shell.css           ← .ohf-shell, .ohf-topbar, .ohf-bar (셸 레이어)
├── sidebar.css         ← sidebar-plate + subtab-strip + card-body
├── composer.css        ← composer + attach + controls-strip + edge
├── dock.css            ← dock-mode-container + pult + generate-button
├── gallery.css         ← tile-grid + hf-tile + overlay 프리미티브
├── cinema.css          ← .ohf-cinebar* (HG 미러 사이드바)
├── cinema-panel.css    ← .ohf-cinema* (시네마 패널)
├── viewer.css          ← viewer + rail-foot
├── overlays.css        ← tooltips, popovers, dialogs
├── settings.css        ← settings surface
├── misc.css            ← batch, skeleton, entrance, responsive, reduced-motion
└── openhiggsfield.css  ← import 에이그케이터(선언적 import만)
```

### 셀렉터 배정 원칙 (§7 매핑 + t_814655b2 캐스케이드 승자 고정)

| 컴포넌트 팩 | 셀렉터 | 이동 대상 파일 |
|---|---|---|
| sidebar-plate | `.ohf-create-col`, `.ohf-cinebar-head` | sidebar.css |
| subtab-strip | `.ohf-gct-subtab-strip`, `.ohf-gct-rail`, `.ohf-gct-subtab*` | sidebar.css (TSX 인라인 → CSS 추출) |
| card-body | `.ohf-gct-subtab-body`, `.ohf-gct-mode` | sidebar.css |
| segmented-tabs | `.ohf-strip` 내부 `.q-tabs` | sidebar.css |
| figure-card | `.ohf-fig-*` | sidebar.css |
| dock-mode-container | `.ohf-dock` | dock.css |
| pult | `.ohf-pult*` | dock.css |
| generate-button | `.ohf-generate*` | dock.css |
| hf-tile | `.ohf-tile*` | gallery.css |
| tile-grid | `.ohf-grid`, `.ohf-grid-window` | gallery.css |
| cinema sidebar | `.ohf-cinebar*` | cinema.css |
| cinema panel | `.ohf-cinema*` | cinema-panel.css |
| composer | `.ohf-composer*` | composer.css |
| controls-strip | `.ohf-controls*`, `.ohf-edge*` | composer.css |

### 캐스케이드 승자 고정 규칙

- `.ohf-tile` radius 0, aspect-ratio 1/1, media cover — **고정 레퍼**. 복제 블록(첫 사본)에서 이 값을 꺾는 잔여가 있으면 삭제 후 두 번째 사본의 승자만 유지.
- `.ohf-pult` height 72, width 64 — 기본(무스코프). 시네마 변형은 `data-seat` 발동으로 분기.
- 시네마 `!important` 오버라이드는 `data-mode="cinema"`로 대체 → 조상 스코프 불필요.

---

## (c) 토큰 정의

기존 `.ohf` 블록의 CSS 커스텀 프로퍼티를 `tokens.css`로 추출하여 공식화한다. 현행 1,798개 `var()` 참조가 이미 이 토큰들을 사용 중이므로, **추가 정의 없이 위치만 이동**한다.

```css
/* tokens.css */
:root, .ohf {
  /* ── 색상 ── */
  --bg: #131416;            /* HF --color-q-background-primary */
  --rail: #131416;          /* HF sidebar paint */
  --s1: #1c1e20;            /* HF --color-surface-primary */
  --s2: #23262a;            /* HF --color-surface-secondary */
  --s3: #2a2d32;            /* HF --color-surface-secondary-hover */
  --s4: #2b2e33;            /* HF --canvas-rgb-surface-highlight */
  --line: #ffffff0d;        /* HF --color-border-subtle (white/5) */
  --line-2: #ffffff1a;      /* HF --color-border-default (white/10) */
  --tx: #f7f7f8;            /* HF --color-text-primary */
  --tx2: #898a8b;           /* HF icon-secondary / font-secondary */
  --tx3: #828282;           /* HF q-text-secondary */
  --tx4: #626262;           /* HF tertiary gray */
  --tx-off: #484e56;        /* HF disabled gray */
  --accent: #d1fe17;
  --accent-strong: #d1fe17; /* brightness filter로 강조 */
  --accent-ink: #131517;
  --accent-08: #d1fe170d;
  --accent-14: #d1fe171a;
  --accent-32: #d1fe174d;
  --plate: #000000b3;
  --plate-ink: #ffffffe6;
  --danger: #fa0019;
  --danger-bg: #e7293033;
  --danger-line: #db3f3e24;

  /* ── 그림자 ── */
  --shadow-1: 0 0.25rem 0.25rem 0 #0000001a;
  --shadow-2: inset 0 0.125rem calc(0.125rem + 1px) 0 #ffffff0d, 0 0.25rem 1.5rem calc(-1 * 0.5rem) #00000026;
  --shadow-3: inset 0 0.125rem calc(0.125rem + 1px) 0 #ffffff0d, 0 0.25rem 0.25rem -0.5px #00000026;
  --glint: inset 0 0.125rem calc(0.125rem + 1px) 0 #ffffff0d;

  /* ── 이징 ── */
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --ease-slide: cubic-bezier(0.16, 1, 0.3, 1);

  /* ── 타이포 ── */
  --font-ui: var(--font-ohf-inter), ui-sans-serif, system-ui, sans-serif;
  --fs-base: 14px;
  --lh-base: 1.45;

  /* ── 간격 스케일 ── */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;

  /* ── 크기 스케일 ── */
  --size-tab: 36px;         /* subtab strip 탭 높이 */
  --size-seg-tab: 32px;     /* q-tabs 세그먼트 탭 높이 */
  --size-cta-sm: 48px;      /* CTA 만들기 */
  --size-cta-lg: 56px;      /* CTA Motion */
  --size-plate-w: 320px;    /* sidebar-plate 폭 */
  --size-pult-w: 72px;      /* pult 폭 */
  --size-tile-sq: 355px;    /* equal-square 타일 */
  --size-row-h: 265px;      /* justified 행 높이 */

  /* ── 시네마 전용 (cinema.css에서 재정의 가능한 지역 토큰) ── */
  --cine-bg: #131416;
  --cine-pop: #1c1e21;
  --cine-line: rgba(255, 255, 255, 0.05);
  --cine-fg: #ffffff;
  --cine-half: rgba(255, 255, 255, 0.5);
  --cine-sec: #828282;
  --cine-ter: #898a8b;
  --cine-dim: rgba(255, 255, 255, 0.35);
}
```

### 시네마 지역 토큰 정책

`.ohf-cinebar`의 `--cine-*` 토큰은 현재 해당 셀렉터 내부에 정의되어 있다(3864–3872). 이를 `cinema.css` 루트 블록의 지역 커스텀 프로퍼티로 승격하여, 시네마 패널 전체가 같은 스케일을 공유하되 앱 기본 스케일을 침범하지 않게 한다.

---

## (d) 마이그레이션 단계 (우선순위순)

### 우선순위 1: 복제 사본 제거 (영향 최대·위험 최소)

**작업**: 첫 사본(135–3858)을 삭제하고, 두 번째 사본(5563–9365)만 유지. 두 번째 사본이 캐스케이드에서 항상 승리하고 있으므로, 첫 사본은 코드 양만 늘리고 기능은 없다.

- 파일에서 줄 135–3858 영역을 통째로 제거.
- 두 번째 사본이 7개 추가 셀렉터(`.ohf-controls*`, `.ohf-edge*`)를 포함 — 이는 정상 유지.
- 삭제 후 `diff`로 첫 사본 유실 셀렉터가 참조되는지 grep으로 확인(324개 이중 셀렉터 — 전부 두 번째 사본에 잔존하므로 무손실).
- **예상 줄 감소**: ~3,700줄(18%)

### 우선순위 2: 서브탭 스타일 메인 CSS로 추출 (split-brain 해소)

**작업**: `general-create-tabs.tsx`의 `generalCreateTabsStyle` 문자열 상수(60개 셀렉터)를 `sidebar.css`로 이동.

- TSX의 `<style data-ohf-gct>` 태그와 `generalCreateTabsStyle` export를 제거.
- 추출 시 캐스케이드 순서 주의: 메인 CSS는 TSX 인라인보다 캐스케이드에서 먼저 오므로, 메인 CSS로 이동하면 우선순위 반전. 현재 인라인 스타일이 메인 CSS의 `.ohf-gct` 4개 셀렉터(스코프 오버라이드)를 이기는 구조를, 메인 CSS 한 곳에서 정리하여 인라인 의존성 제거.
- `component-spec-t74f48234.md` §7 매핑: `.ohf-gct-subtab-strip` → subtab-strip, `.ohf-gct-rail` → subtab-strip.

### 우선순위 3: 도크 pult 조상 스코프 오버라이드 제거

**작업**: `.ohf-cinema-screen .ohf-pult*` 오버라이드를 `data-mode="cinema"` 분기로 전환.

- `dock-config.ts`의 mode가 이미 시네마/일반을 분기. CSS에서 `data-*`로 발동.
- 기존: `.ohf-cinema-screen .ohf-pult { ... }` (조상 스코프, §0 격리 계약 예외)
- 목표: `.ohf-pult[data-mode="cinema"] { ... }` (자기 루트 + 자손만)
- `!important` 제거 — 스코프 우선순위나 `data-*`로 충분해짐.
- 시네마 전용값(116px, 52px, `--cine-surface`)은 시네마 지역 토큰으로 흡수.

### 우선순위 4: `!important` 체계적 제거

- 132건 중 복제 사본 제거로 약 40건 자동 소멸(첫 사본 내 `!important`).
- 조상 스코프 대체로 약 20건 소멸(우선순위 3).
- 동적 가시성(`.ohf-edge[data-active]`)은 `data-*` 발동 + 캐스케이드 순서로 30건 소멸.
- 나머지는 개별 분석 — 캐스케이드 우선순위로 해결 가능한지 확인 후 제거 또는 유지.

### 우선순위 5: 파일 분할 (component-per-file)

위 목표 구조의 파일로 분할. **import 순서**가 캐스케이드 순서를 결정:
```css
/* openhiggsfield.css (import aggregator) */
@import "tokens.css";
@import "base.css";
@import "shell.css";
@import "sidebar.css";
@import "composer.css";
@import "dock.css";
@import "gallery.css";
@import "cinema.css";
@import "cinema-panel.css";
@import "viewer.css";
@import "overlays.css";
@import "settings.css";
@import "misc.css";
```

- 시네마 파일이 gallery 이후에 오는 이유: 시네마 패널은 기본 갤러리 위에 오버레이되므로 캐스케이드 승자가 시네마여야 함.
- 파일 분할은 **기존 셀렉터 변경 없이** 위치만 이동이므로 무위험.

### 우선순위 6: 시네마 사이드바/패널 분리 확인

- `reference-film.css`(578줄)가 이미 독립 파일로 존재하는 선례.
- `cinema.css`(시네바 미러)와 `cinema-panel.css`(시네마 패널)를 독립 시트로 유지 — 앱의 `openhiggsfield.css`와 충돌하지 않도록 격리.

### 우선순위 7: 데이터 어트리뷰트 네임스페이스 정리

- `[data-on]`, `[data-off]` 등 260개 어트리뷰트가 컴포넌트 간 무경계.
- `data-ohf-<component>-<state>` 형식으로 리네임하여 셀렉터의 소유 컴포넌트를 명시.
- 예: `[data-on="true"]` → `[data-ohf-pult-on="true"]`
- **주의**: TSX의 어트리뷰트 설정 코드와 CSS 셀렉터 동시 수정 필요. 단계적 마이그레이션(신규 코드부터 적용).

---

## 요약 비교표

| 지표 | 현재 | 목표 |
|---|---|---|
| 총 줄 수 | 20,411 | ~17,500 (복제 제거 후) |
| 파일 수 | 1 (20K 줄) | 13 |
| `!important` | 132 | ~30 |
| `var()` 참조 | 1,798 | 1,798+ (새 간격/크기 토큰 +50) |
| 인라인 CSS (TSX) | 60 셀렉터 | 0 |
| 조상 스코프 오버라이드 | 83 (cinema-screen) | ~10 (예외적) |
| 복제 셀렉터 | 324 쌍 | 0 |

---

## 검증 계약

각 단계 완료 후 아래로 검증:
1. `npx tsc --noEmit` exit 0
2. OH 라이브 SSR 도배에서 해당 컴포넌트 rect 동값 유지 (CDP 실측 1440×900)
3. 에디트-격리 판정법: "이 컴포넌트를 고쳤을 때 다른 컴포넌트도 같이 변하는가?" → No

---

## 성립 조건 (성공 시)

- 사용자가 보고한 "하나 고치면 다른 데 깨진다" 현상이 복제 제거(1) + split-brain 해소(2)로 소멸.
- 모든 변형값이 props 한 곳 → `var()`/`data-*`로 전파되어(3) 컴포넌트 간 캐스케이드 간섭이 제거.
- 토큰 스케일(색·간격·크기)이 공식화되어 무작위 하드코딩이 줄어듦.
- 파일 분할로 컴포넌트 스타일의 물리적 경계가 명료.
