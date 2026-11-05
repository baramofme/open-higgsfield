# 변형(Variants) 사용 규칙

이 시스템에는 변형을 표현하는 **두 문법(grammar)**이 있고, **둘 중 어느 것을 쓸지**가 규칙이다.

> 요점: **고정된 설계 의도**(이것은 "위험" 버튼이다)→ **BEM 수정자**.
> **런타임 상태**(지금 선택되어 있다)→ **`data-*` 속성**. 둘을 섞어 같은 상태를 두 곳으로 나누지 말 것.

---

## 문법 1 — BEM 수정자 `.ohf-block--modifier`

클래스에 `--수정자`를 붙여 **변하지 않는 역할/정체성**을 고른다. 예:
`.ohf-tile--failed`, `.ohf-cinebar-menuitem--danger`, `.ohf-project-tool--canvas`.

- 의미: "이 요소는 원래 그런 종류다"(design-time). JSX 조립 시 정적으로 결정된다.
- 관찰된 예(일부): `--danger`, `--on`, `--quiet`, `--wide`, `--model`, `--more`, `--start`, `--end`,
  `--camera`, `--character`, `--fit`, `--masonry`, `--tool`, `--upload`, `--lg`, `--glyph`, `--flow`, `--3`.
- 규칙: 수정자 이름은 *용도*를 뜻한다. 새 수정자를 붙일 때 임의 문자열을 쓰지 말고,
  같은 패밀리(popover, tile 등)에서 **열거된 접미 집합**에 추가한다(열거값이지 자유 문자열이 아니다).

## 문법 2 — `data-*` 상태 속성

**지금 어떤 상태인지**를 CSS가 `[data-…]` 선택자로 읽어 모양을 바꾼다. 예:
`.ohf-tile[data-picked]`, `[data-state="running"]`. 값이나 부재(존재 여부)로 분기한다.

이 창고에서 관측된 `data-*` 상태 어휘(CSS에서 셀렉터로 사용되는 것들):

| 속성 | 대략적 의미 |
|------|-------------|
| `data-active` | 항목이 현재 활성 |
| `data-on` | 스위치/토글 켜짐 |
| `data-selected` | 선택됨 |
| `data-picked` | 픽킹(선택집합에 들었음) |
| `data-selecting` | 픽킹 집합 assembling 중(주변 동작이 물러남) |
| `data-open` | 패널/드롭 열림 |
| `data-collapsed` | 접힘 |
| `data-busy` / `data-spin` | 동작 중 / 스핀 |
| `data-ready` / `data-fresh` | 준비 / 방금 착지 |
| `data-saving` / `data-done` | 저장 중 / 완료 |
| `data-canceling` / `data-cancel-requested` | 백엔드 확인 후 라벨 전환 / 취소 요청 |
| `data-closing` | 닫힘 진행 중 |
| `data-hidden` / `data-visible` | 표시 여부 |
| `data-scrolled` | 스크롤 위치 상태 |
| `data-kind` | 콘텐츠 종류(image/video/audio 등) — 타입별 분기 |
| `data-state` | 일반 상태 문자열 |
| `data-tab` | 탭 식별 |
| `data-view` | 뷰/갤러리 종류 |
| `data-shaped` | 형태(shaped) |
| `data-beat` / `data-fly` | 도착 비트 / 날아옴(모션) |
| `data-quiet` | 조용한 변형 |
| `data-tip` / `data-today` | 툴팁 위치 / 오늘 |
| `data-ohf-switch` | 스위치 배선 마커 |
| `data-off` | **honest inert** — 아래 §액센트·정직성 참조 |

> 이 표는 관측된 어휘의 *의미 요약*이다. 각 속성의 정확한 의미와 이유는
> 해당 셀렉터의 **CSS 주석**에 적혀 있다(이 창고는 이유를 코멘트로 남기는 것을 원칙으로 한다).

---

## 어느 것을 쓸지 — 판별 절차

1. 값이 JSX 조립 시 **정적으로** 정해지고 이후 안 바뀌는가? → **BEM 수정자**.
2. 상태가 런타임(저장·선택·로딩 등)에 **변하는** 것인가? → **`data-*`**.
3. 둘 다 필요한가? 한 문법으로만 표현하라. 같은 상태를 클래스와 속성 양쪽에 두면 회귀다.
4. `style` 인라인으로 상태를 재도색하는 것은 **금지**. 상태 분기는 셀렉터가 읽는다.

---

## 액센트 예약(가장 중요한 규칙)

라임 `--accent`은 **선택·주 동작(primary action)·라이브니스(liveness)**에만 쓴다.
- 주 동작 버튼 `.ohf-btn-accent`는 한 판에 원칙적으로 하나.
- 선택 프레임(`data-picked`/`data-selected`), 스코프 인디케이터, 라이브(진행중) 신호가 초록을 쓴다.
- **무관한 장식·호버·구분선에 초록을 쓰면 시스템 위반.** 호버 강조는 밝기 필터(brightness)로 하고 초록을 새롭히지 않는다.
- 포커스 링은 `.ohf :focus-visible`가 `--accent-32`로 자동 걸므로 수동 코드가 필요 없다.

## 높이(elevation)와 구조(structure)

- **구조 = 헤어라인**만: `--line`(white/5)·`--line-2`(white/10)의 1px. 두꺼운 테두리·그리드선 금지.
- **높이 = 오프셋 그림자**: 카드가 떠보이게 하려면 `--shadow-1/2/3`과 `--glint`(시heen)로만.
  직접 `box-shadow: 0 0 8px #000` 같은 임의 값을 쓰지 말 것.
- 스모크드 플레이트는 `--plate`(70% 검정) + `--plate-ink`로. 배지·액션 레일·픽 박스가 같은 플레이트를 나눠 쓴다.

## 정직성(honest inert) — `data-off`

이 창고의 원칙: **실제로 동작하지 않는 장치(아직 배선 전)는 `data-off`(과 `aria-disabled`)로 정직하게 표시**한다.
정적 미러· placeholder·아직 라우팅 안 된 배지·버튼은 `data-off`를 달아 "모양은 있으나 동작은 없음"을 DOM이 스스로 말하게 한다(관측상 수십 곳). 새 요소가 아직 미배선이면 이 관례를 따를 것 — 사용자가 겉보기에 동작하는 것처럼 오해하지 않게.

## 타이포 변형

- **숫자가 측정을 싣는 자리**(카운트·시간·해상도 등)에는 tabular numerals(`font-variant-numeric`)를 켠다.
- **스튜디오 헤드라인**(h1/h2 등)은 **uppercase**로 세운다(실측: h1 40/700 uppercase·h2 20/700 uppercase).
- 기본 본문 타이포는 14px / 1.45. 앱 루트의 자체 타이포 체계는 이미 확립되어 있으므로, 새 요소는 이 체계에 맞춘다.
