# OpenHiggsfield 디자인 시스템 — 사용 가이드

이 문서는 OpenHiggsfield(OH) 스튜디오에 적용된 **스코프(scoped) 디자인 시스템**을
신규 개발자가 문서만으로 올바르게 적용할 수 있도록 쓴 진입점입니다.
여기서 말하는 "구현"은 별개 패키지가 아니라,
`src/openhiggsfield/openhiggsfield.css`에 `.ohf` 스코프로 들어있는 **CSS 커스텀 프로퍼티 토큰 + 클래스 택소노미**입니다.

> 한 줄 요약: 모든 색·그림자·여백·모서리·정체성은 **`.ohf` 아래 토큰을 `var()`로 참조**하여 만들고,
> **리터럴 hex/px 하드코딩은 금지**한다. 변형은 **BEM 수정자(`--modifier`) 또는 `data-*` 상태**로만 표현한다.

## 문서 지도

| 파일 | 내용 |
|------|------|
| `README.md` (이 파일) | 스코프·정체성·시작 방법·네비게이션 |
| [`tokens.md`](./tokens.md) | 3계층 토큰 모델 + 전체 토큰 레퍼런스 |
| [`components.md`](./components.md) | 컴포넌트 선택 가이드(원시 프리미티브·패밀리·의사결정표) |
| [`variants.md`](./variants.md) | 변형 사용 규칙(BEM vs `data-*`, 액센트 예약, 높이/구조) |
| [`contributing.md`](./contributing.md) | 기여 워크플로우(토큰/컴포넌트 추가, 검증 관례, 복제 규칙, 스토리북) |

시각 레퍼런스는 **Storybook**에서 본다 → 아래 "스토리북 실행" 참조.

---

## 1. 이 시스템의 정체성(먼저 읽을 것)

`openhiggsfield.css` 머릿주석이 시스템의 성격을 선언한다. 이 5가지는 모든 결정의 기준선이다:

1. **근-검정(near-black) 스튜디오.** 본체 페인트는 `--bg`(`#131416`). 표면에 밝은 회백색을 직접 쓰지 않는다.
2. **라임 액센트 하나, 예약된 용도.** `--accent`(`#d1fe17`)은 **선택·주 동작(primary action)·라이브니스(liveness)**에만 쓴다. 그 외 위치에서 초록을 쓰면 시스템 위반이다(자세히는 `variants.md`).
3. **구조 = 헤어라인 테두리.** 구분선은 `--line`(white/5)·`--line-2`(white/10)의 1px 헤어로만. 두꺼운 테두리·그리드선을 쓰지 않는다.
4. **높이(elevation) = 오프셋 그림자.** `--shadow-1/2/3`과 `--glint`(시heen). 카드가 떠있어 보이는 효과는 이 토큰으로만 만든다.
5. **한 가지 서체: Inter.** 측정값(숫자·카운트·시간)을 싣는 타이포에는 **tabular numerals**를 켠다. 스튜디오 헤드라인은 대문자(uppercase)로 세운다.

이 5원칙은 시각적 회귀 테스트의 근거이자, 코멘트에 남는 "왜 이렇게 했는지"의 이유다.

---

## 2. 스코프: 어떻게 "설계된 영역"에 들어가는가

시스템은 전역이 아니라 **`.ohf` 클래스로 감싼 하위 트리에만** 적용된다. 스코프 루트는 앱 최상단에서 한 번 설정된다:

```tsx
// src/openhiggsfield/openhiggsfield-app.tsx (요약)
<div className={`ohf ${fontClassName}`} style={{ "--ohf-grain": GRAIN_URI }}>
  <div className="ohf-shell"> … </div>
</div>
```

- `.ohf` 안에서만 토큰(`--bg`, `--accent` …), 초기화(reset), 스타일 규칙이 산다.
- `.ohf` 밖(예: 문서 캔버스 html/body)은 `src/app/base.css`가 전담한다. base.css는 의도적으로 **리터럴**로 쓰여 있다(`--bg`가 `.ohf` 안이기 때문) — 여기가 유일하게 하드코딩이 허용되는 곳이다.
- **새 UI를 넣을 때 첫 규칙: `.ohf` 자손으로 렌더링되는지 확인하라.** `.ohf` 밖에서 렌더되면 토큰이 미적용되어 색이 깨진다.

### 불러오는 지점(참고)
- `src/app/layout.tsx` → `import "./base.css"` (문서 캔버스)
- `src/app/page.tsx` → `import "@/openhiggsfield/openhiggsfield.css"` + `import "@/openhiggsfield/reference-film.css"` (스튜디오 시스템)

---

## 3. 새 컴포넌트를 올바르게 적용하는 6단계

1. **`.ohf` 안**에 마운트한다(위 §2).
2. 클래스를 `.ohf-` 접두로 짓는다(예: `.ohf-mywidget`). 이름은 *역할*을 나타낸다(장식·상태가 아니라).
3. **색·그림자·여백은 `var()`로**만. 절대 `#131416`·`8px`를 직접 쓰지 않는다(토큰 레퍼런스는 `tokens.md`).
4. 변형이 필요하면 **BEM 수정자**(고정 의도) 또는 **`data-*` 상태**(런타임)로만. 인라인 하드코딩으로 상태를 분기하지 않는다(`variants.md`).
5. 접근성: 포커스는 `:focus-visible`가 액센트 링을 자동으로 걸므로 추가 코드가 필요 없다. 인터랙티브 요소에 적절한 `role`/`aria-*`를 싣고, **동작하지 않는 장치는 `data-off`로 정직하게** 표시한다(이 창고의 "honest inert" 관례).
6. **스토리 추가**: `*.stories.tsx`를 써서 Storybook에 컴포넌트와 변형을 시각화한다(`contributing.md` §스토리북).

---

## 4. 스토리북 실행(시각 레퍼런스)

컴포넌트와 토큰을 **눈으로** 확인하는 도구가 Storybook(10)이다. 이 창고에 설정되어 있다.

```bash
pnpm install        # 최초 1회 (의존성 확보)
pnpm storybook      # http://localhost:6006 에서 실행
pnpm build-storybook  # 静的 정적 빌드 → storybook-static/
```

- 설정 위치: `.storybook/main.ts`, `.storybook/preview.ts`
- 스토리 위치: 원시 프리미티브 → `src/openhiggsfield/*.stories.tsx`,
  토큰·타이포 갤러리 → `src/openhiggsfield/design-system.stories.tsx`
- `preview.ts`가 `openhiggsfield.css`를 전역에 import하므로, **모든 스토리는 실제 스코프 스타일로 렌더**된다(즉 Storybook에서 보이는 색·그림자가 라이브와 같다).

---

## 5. 한눈에 보는 금지/허용 체크리스트

| ✔ 허용 | ✖ 금지 |
|--------|--------|
| `var(--accent)` | `color:#d1fe17` 리터럴 |
| `.ohf-btn-accent` 같은 클래스 레퍼런스 | 컴포넌트에 인라인 hex/px |
| `.ohf-tile--failed` (BEM) / `data-state` | `style`로 상태별 재도색 |
| `--line` 1px 헤어라인 | 2px+ 실선 테두리·그리드 |
| 선택·주 동작·라이브니스의 초록 | 무관한 장식에 초록 |
| `.ohf` 자손 렌더 | `.ohf` 밖에서 토큰 기대 |

이 체크리스트만 지켜도 "신규 개발자가 문서만으로 올바르게 적용"의 기준을 충족한다.
세부 규칙은 각 파일(tokens/components/variants/contributing)에 있다.
