# 토큰(Tokens)

이 시스템의 토큰은 **도구(Sass/Style Dictionary 등) 없이**, `src/openhiggsfield/openhiggsfield.css`의
**CSS 커스텀 프로퍼티**로만 존재한다. 우리가 한 "3계층화"는 새 도구가 아니라,
**이미 파일에 들어 있는 커스텀 프로퍼티를 세 계층으로 공식 명명한 것**이다.

> 사용 제1원칙: 색·그림자·여백·정체성은 **항상 `var(--토큰)`로 참조**한다. 리터럴(hex/px/rgb) 직접 값은
> `.ohf` 밖(문서 캔버스 `base.css`)에서만 예외적으로 허용된다.

---

## 3계층 모델

### Tier 1 — 전역 시맨틱(Global semantic) · `.ohf` 블록
`.ohf` 루트에 한 번 선언되고, 트리 전체가 상속·참조하는 **공용 어휘**다. 색·표면·테두리·텍스트·
액센트·플레이트·그림자·모션·서체·위험색이 여기 속한다. 아래가 전체 목록이다.

### Tier 2 — 컨텍스트 네임스페이스(Context namespace) · 컴포넌트가 재선언하는 별칭
특정 컨텍스트(시네마 레일)가 **같은 값·다른 정서를 위해** 자체 접두(`--cine-`)로 별칭을 다시 선언한다.
HG의 순백/#828282/#898A8B 팔레트는 OH의 초록 기미와 다르므로, 레일 내부만 HG 원본을 쓰려고
`--cine-*`를 `.ohf-cinebar`에 재정의한다. **의미는 Tier 1과 겹치되 값의 정서가 다르다.**

### Tier 3 — 컴포넌트 로(Component-local) · 단일 컴포넌트의 구현 노브
하나의 컴포넌트만 쓰는 구현 세부旋钮. 접두 없이(또는 로컬 접두로) 해당 셀렉터에서 재선언된다.
예: `--ctl-r`(컨트롤 모서리 반지름 — **소유 셀렉터에 따라 10px와 8px 두 값을 갖는다**),
`--ohf-fade`(스크롤 페이드 폭), `--fill`(슬라이더 채움 %, 인라인 설정),
`--tab-indicator-loc`(탭 인디케이터 이동량), `--ohf-grain`(그레인 텍스처 URI, `.ohf` 루트에 인라인).
**이 토큰들은 "로컬"이므로 다른 컴포넌트가 참조하지 말 것.** 필요하면 Tier 1으로 승격한다.

> 계층 판별 규칙: `.ohf` 한 번 선언·전역 참조 → Tier 1. 특정 판 안에서만 재선언·해당 판만 참조 → Tier 2.
> 셀렉터 하나만 참조·이름이 구현 노브 → Tier 3.

---

## Tier 1 — 전체 레퍼런스

값은 파일 원문 실측이다. 주석은 **HF(Higgsfield) 원본 토큰**과의 정합 근거를 그대로 옮긴 것이다.

### 배경 · 표면(surfaces)
| 토큰 | 값 | 역할 | HF 원본 |
|------|----|------|---------|
| `--bg` | `#131416` | 본체 페인트(near-black) | `--color-q-background-primary` |
| `--rail` | `#131416` | 사이드바 페인트(본체와 동일) | (동일 토큰) |
| `--s1` | `#1c1e20` | 표면 1단(기본 카드) | `--color-surface-primary` |
| `--s2` | `#23262a` | 표면 2단(호버 직전) | `--color-surface-secondary` |
| `--s3` | `#2a2d32` | 표면 3단(호버) | `--color-surface-secondary-hover` |
| `--s4` | `#2b2e33` | 표면 하이라이트 | `--canvas-rgb-surface-highlight (43,46,51)` |

표면은 s1→s3로 **15단계씩** 밝아지는 램프다. 호버는 대개 s2→s3로 한 단 올린다.

### 테두리 · 텍스트 · 액센트
| 토큰 | 값 | 역할 | HF 원본 |
|------|----|------|---------|
| `--line` | `#ffffff0d` | 헤어라인(white/5) | `--color-border-subtle` |
| `--line-2` | `#ffffff1a` | 기본 테두리(white/10) | `--color-border-default` |
| `--tx` | `#f7f7f8` | 본문 텍스트(1차) | `--color-text-primary` |
| `--tx2` | `#898a8b` | 2차 텍스트/아이콘 | `--color-icon-secondary` |
| `--tx3` | `#828282` | 2차 텍스트(스튜디오) | `--color-q-text-secondary` |
| `--tx4` | `#626262` | 3차 텍스트 | (98,98,98) |
| `--tx-off` | `#484e56` | 비활성/오프 | (72,78,86) |
| `--accent` | `#d1fe17` | 라임 액센트(예약) | — |
| `--accent-strong` | `#d1fe17` | (HF엔 강한 초록이 없음; 호버 강조는 밝기 필터) | — |
| `--accent-ink` | `#131517` | 액센트 배경 위 글자 | `--color-btn-accent-text` |
| `--accent-08` | `#d1fe170d` | 액센트 5% 오버레이 | `--color-q-lime-alpha-05` |
| `--accent-14` | `#d1fe171a` | 액센트 10% | `--color-q-transparent-lime-10` |
| `--accent-32` | `#d1fe174d` | 액센트 30%(포커스 링) | `--color-primary-30` |

### 플레이트 · 그림자 · 시heen
| 토큰 | 값 | 역할 | HF 원본 |
|------|----|------|---------|
| `--plate` | `#000000b3` | 스모크드 플레이트(70% 검정) | (HF 표준 70% 배경) |
| `--plate-ink` | `#ffffffe6` | 플레이트 위 글자(reverted-90) | — |
| `--shadow-1` | `0 0.25rem 0.25rem 0 #0000001a` | 얕은 오프셋(raised-sm) | `--hf-shadow-raised-sm` |
| `--shadow-2` | `inset 0 0.125rem calc(0.125rem + 1px) 0 #ffffff0d, 0 0.25rem 1.5rem calc(-1*0.5rem) #00000026` | 떠있는 카드(raised) | `--hf-shadow-raised` |
| `--shadow-3` | `inset 0 0.125rem calc(0.125rem + 1px) 0 #ffffff0d, 0 0.25rem 0.25rem -0.5px #00000026` | 모달 | `--hf-shadow-modal` |
| `--glint` | `inset 0 0.125rem calc(0.125rem + 1px) 0 #ffffff0d` | 위쪽 시heen(윤) | `--hf-shadow-sheen` |

### 모션 · 서체 · 위험
| 토큰 | 값 | 역할 |
|------|----|------|
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | 기본 이징(들여올 때) |
| `--ease-slide` | `cubic-bezier(0.16, 1, 0.3, 1)` | 깊은 지수적 ease-out(스코프 인디케이터 이동) |
| `--font-ui` | `var(--font-ohf-inter), ui-sans-serif, system-ui, sans-serif` | 유일한 UI 서체(Inter) |
| `--danger` | `#fa0019` | 위험/에러 텍스트 | HF `--color-q-text-danger` |
| `--danger-bg` | `#e7293033` | 에러 표면 1단 | `--color-surface-error-alpha-1` |
| `--danger-line` | `#db3f3e24` | 에러 표면 14% | `--color-surface-error-alpha-14` |

---

## Tier 2 — 컨텍스트 네임스페이스(`--cine-*`)

시네마 레일(`.ohf-cinebar`)이 HG 원본 정서를 살리기 위해 재선언하는 별칭:

| 토큰 | 값 | 의미 |
|------|----|------|
| `--cine-bg` | `#131416` | 레일 바탕(본체와 동일) |
| `--cine-pop` | `#1c1e21` | 팝/카드 |
| `--cine-line` | `rgba(255,255,255,0.05)` | 5% 흰 테두리 |
| `--cine-fg` | `#ffffff` | 순백 전경(초록 기미 없음) |
| `--cine-half` | `rgba(255,255,255,0.5)` | 50% |
| `--cine-sec` | `#828282` | 2차(HG) |
| `--cine-ter` | `#898a8b` | 3차(HG) |
| `--cine-dim` | `rgba(255,255,255,0.35)` | 디밍 |

후반 시네마 카드가 쓰는 또 다른 그룹:
`--cine-surface`(`rgb(28,30,32)`) · `--cine-secondary`(`rgb(137,138,139)`) ·
`--cine-brand`(`rgb(209,254,23)`) · `--cine-ink`(`rgb(19,21,23)`).

**규칙**: 시네마 판 내부에서는 `--cine-*`를 쓰고, 일반 스튜디오 판에서는 Tier 1을 쓴다.
서로를 섞지 말 것(한 판 안에서 두 정서가 공존하면 HG/OH 경계가 무너진다).

---

## Tier 3 — 컴포넌트 로컬(예시)

| 토큰 | 값/출처 | 소유·의미 |
|------|---------|-----------|
| `--ctl-r` | `10px` (한 셀렉터) / `8px` (다른 셀렉터) | 컨트롤 모서리 반지름. **소유 셀렉터마다 값이 다르다** = 로컬 토큰의 대표 사례 |
| `--ohf-fade` | `56px` | 스크롤 페이드 마스크 폭 |
| `--fill` | 컴포넌트가 인라인 설정(예: `Slider`가 백분율) | 슬라이더 채움 비율 |
| `--tab-indicator-loc` | `translateX(0%)` 등 | 탭 인디케이터 판의 이동량 |
| `--ohf-grain` | data-URI(`.ohf` 루트에 인라인) | 그레인 텍스처 오버레이 |

---

## 8-숫자 hex 알파 관례(중요)

이 시스템의 색은 **8-숫자 hex**로 자기 알파를 함께 싣는다. 예: `#ffffff0d` = 흰색 5%,
`#d1fe171a` = 라임 10%. 즉 **알파 변형은 `color-mix()`가 아니라 미리 베이크된 별도 토큰**
(`--accent-08`, `--accent-14`, `--accent-32`)이다. 새 반투명 변형이 필요하면
**새 토큰을 추가**하고 임의 `rgba()`를 인라인으로 만들지 말 것.

---

## 토큰 추가·참조 규칙(자세한 절차는 `contributing.md`)

1. 새 시맨틱 색은 **Tier 1에** 추가하고, **`.ohf{}` 토큰 블록 두 곳 모두**에 같은 정의로 넣는다
   (이 stylesheet는 스코프 선언을 두 사본으로 지니고 있어, 두 블록은 바이트 단위로 동일하다).
2. 참조는 `var(--이름)`로만. 값 변경은 정의 한 곳에서만(양쪽 사본 동시) 한다.
3. 이름은 *역할*로 짓는다(`--danger`, `--accent-ink`) — hex값으로 지은 이름(`--lime`)은 금지.
