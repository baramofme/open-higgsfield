# 컴포넌트 선택 가이드

"이걸 렌더해야 하는데 뭘 쓰지?"에 대한 답이다. 두 종류가 있다:
(A) **React 프리미티브** — `src/openhiggsfield/ui.tsx`에 실제로 존재하는 재사용 컴포넌트(아래 §1).
(B) **클래스 패밀리** — CSS가 소유하고 JSX가 클래스만 얹는 패턴(아래 §2).

전체 클래스(~1,200종)의 exhaustive 목록은 소스인 `src/openhiggsfield/openhiggsfield.css`가 정본이다.
아래는 *선택*에 필요한 핵심만 추린 것이다. 새 클래스를 찾을 땐 CSS를 검색한다(§4).

---

## 1. React 프리미티브(`ui.tsx`의 실재 export)

아래는 파일에서 검증한 실제 컴포넌트와 그 props 서명이다. **이들이 이 창고의 공식 프리미티브**다.

### `<Field label value? children>`
라벨(값이 있으면 라벨+행)과 그 아래 컨트롤을 묶는 폼 레이어. 설정·디렉터 설정 등에서
`<Field label="…">…컨트롤…</Field>`로 쓰인다. 컨트롤은 Field 자식으로 넣는다.
- `label: string` (필수)
- `value?: string` — 있으면 라벨+현재값을 한 행에 표시, 없으면 라벨만
- `children: ReactNode` — 실제 컨트롤(OptionList·Slider 등)

### `<OptionList options value onChange ratio?>`
enum 값 한 칸을 한 줄로 쭉 내리는 단일 컬럼 리스트(칩 행 대신 — 레이블과 체크가 한 레일을 공유).
현재값이 보이도록 열기 직후 스크롤해 운반한다.
- `options: readonly { value, label }[]`
- `value: string`, `onChange: (next: string) => void`
- `ratio?: boolean` — 비율 목록이면 각 줄이 글리프 박스를 예약(비율 미리보기 박스)

### `<Slider min max? value onChange label>`
채움 비율을 CSS 변수 `--fill`(인라인)로 드러내는 range 입력. Tier 3 `--fill`의 대표 사용자.
- `min`, `max`, `step?`, `value`, `onChange: (next: number) => void`, `label: string`(aria-label)

> 이 셋 외의 공용 React 프리미티브는 드물다. 대부분의 UI는 아래 **클래스 패밀리**로 조립된다.

---

## 2. 클래스 패밀리(요와 언제 쓸지)

JSX는 클래스를 얹고, 모양은 CSS가 결정한다. 아래가 반복 등장하는 핵심 패밀리다(값은 실측 사용 예로 검증).

### 버튼 3군 — 선택 규칙이 있다
| 클래스 | 용도 | 실측 예 |
|--------|------|---------|
| `.ohf-btn-accent` | **주 동작(primary action)·라이브니스** — 한 판에 원칙적으로 하나, 라임 | `<button className="ohf-btn-accent" onClick={apply}>적용하기</button>`; 비활성 시 `disabled`+`aria-disabled` 병기 |
| `.ohf-btn-solid` | 표면 위의 **2차 동작**(solid surface) | `<button className="ohf-btn-solid">…</button>` |
| `.ohf-btn-quiet` | **기각·부수적(ghost)** — 닫기/지우기 | `<button className="ohf-btn-quiet" onClick={onClose}>` |

**규칙**: 판 하나에서 초록(accent)은 주 동작 하나에 예약한다. 2차·3차는 solid·quiet로. 이 규칙이
`variants.md`의 "액센트 예약"과 직결된다.

### 칩 / 아바타 / 브랜드 / 셀
- `.ohf-chip` (+ `.ohf-chip--role`, `.ohf-chip-count`) — 에셋 역할 태그·카운트
- `.ohf-avatar` (+ `.ohf-avatar--lg`) — 이니셜 아바타
- `.ohf-brand` (+ `.ohf-brand--glyph`) — 브랜드 글리프, `role="img"` + `aria-label` 필수
- `.ohf-cell` (+ `--fit`, `--masonry`) — 갤러리 그리드 셀
- `.ohf-alert` / `-ic` / `-text` — 알림/에러 문구(위험색 계열 사용)

### popover(패널의 일族)
`.ohf-popover`에 용도 접미사를 얹는다: `--assets`, `--cinema`, `--elements`, `--lighting`,
`--list`, `--mention`, `--menu`, `--movement`, `--picker`, `--setting`, `--sheet`.
용도 접미사는 **열거된 값의 나열이지 임의 문자열이 아니다** — 새 판은 이 목록에 접미를 추가한다.

### shell / 레이아웃
`ohf-shell` → `ohf-main` → `ohf-create-feed-grid` → (`ohf-create-col` | `ohf-feed-col`)로
스튜디오의 2-컬럼(좌 생성판·우 피드) 골격을 이룬다. 새 레이아웃 판은 이 골격 안에 들어가야 한다.

### cinema / camera(시네마 평면)
`ohf-cinebar`(시네마 레일, `--cine-*` 사용)와 `ohf-cam*`(카메라)·`ohf-cine*`(시네마) —
시네마 판 내부에서는 Tier 2(`--cine-*`)를 쓰는 위 경계를 따른다.

---

## 3. 의사결정표(I want to render X → use Y)

| 하고 싶은 것 | 쓸 것 |
|--------------|-------|
| 라벨+ 컨트롤 묶음 | `<Field label="…">{컨트롤}</Field>` |
| enum 선택(한 컬럼 리스트) | `<OptionList … />` |
| 수치 조절(범위) | `<Slider … />` |
| 주 동작 버튼(라임, 한 판에 하나) | `.ohf-btn-accent` |
| 표면의 2차 버튼 | `.ohf-btn-solid` |
| 닫기/지우기(ghost) | `.ohf-btn-quiet` |
| 역할 태그/카운트 | `.ohf-chip` (+`--role`, `-count`) |
| 사용자 이니셜 | `.ohf-avatar` (+`--lg`) |
| 브랜드 글리프 | `.ohf-brand--glyph` (`role="img"`, `aria-label`) |
| 알림/에러 | `.ohf-alert` |
| 드롭 패널 | `.ohf-popover--<용도>` |
| 갤러리 셀 | `.ohf-cell` |

---

## 4. 클래스를 찾는 법 / 새 클래스 짓는 법

- **찾기**: `src/openhiggsfield/openhiggsfield.css`에서 `.ohf-` 접두로 grep. 두 사본 구조이므로
  동일 클래스가 두 번 나올 수 있다 — 모양은 마지막 선언(캐스케이드)이 이긴다.
- **짓기**: `.ohf-` + *역할*(예 `.ohf-mypanel`, `.ohf-mypanel-ic`). 장식이 아니라 *의미*로 명명한다.
  색/여백은 클래스 안에서 `var()`로만 토큰 참조(하드코딩 금지). 변형이 필요하면 §variants로.
- **한 판에 클래스 남발 금지**: 하나의 클래스가 하나의 역할을 지니게. 같은 판 안의 두 요소가
  같은 모양이라면 공통 부모 클래스로 묶어라(이 창고는 초기화를 `:where()`로 0-특이도에 두어
  컴포넌트 규칙이 자격 없이 이기게 한다).
