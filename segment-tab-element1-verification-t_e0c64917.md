# 세그먼트 탭(레퍼런스↔프레임) 전환 동속성 — t_e0c64917 요소 1 검증

## 판정: **PASS** (동시 라이브 실측, 이슈 0)

- 근거 파일: `anim_verify/segtab_report.json` (run4, OVERALL PASS), `anim_verify/run4.out`
- 방법: **동시 라이브 CDP** — ground-truth = HF live(`:9222`, https://higgsfield.ai/ko/ai/video?model=minimax_h3,
  1440×900 guest), 검증 = OHF dev(`:3113`) 을 측정 Chrome(`:9335`, headless=new)으로.
  양쪽을 같은 asyncio 루프에서 교대로 진행(동시 실측). fabrication 없음 — 모든 판정 근거는 라이브 DOM 실측.
- 하네스: `anim_verify/segtab_verify.py`

## 게이트와 결과(전 상태 PASS)

| 게이트 | 내용 | 결과 |
|---|---|---|
| 초기 상태 | role=tab 2, 선택=프레임, tabindex 로빙(선택탭 0/비선택 -1), glass indicator, aria-disabled false | HF=OHF 동등 PASS |
| 클릭(s1) | 선택 이동·포커스 이동·indicator 재배치·색 전환 | PASS |
| ArrowRight(s2) | 포커스 로빙만(선택 유지) | PASS |
| ArrowLeft(s3) | 포커스 로빙만(선택 유지) | PASS |
| Enter(s4) | 수동 활성화(이미 선택이면 no-op) | PASS |
| 재클릭 no-op | 이미 선택된 탭 클릭 시 상태 불변 | PASS(run3 에서 양쪽 no-op 실증) |
| indicator CSS var | `--active-tab-left/right/top/bottom/width/height` 산출식 | HF 문자열과 동등(152/3/3/3/145/32 ↔ 3/152/3/3/145/32) |
| indicator 지오메트리 | tablist 원점 상대 rect | 동등(정적 x4·w145·relx4, s1 이동 후 동일) |
| 탭 지오메트리 | 상대 x/w | 동등(x0·w145) |
| 색 | 선택 rgb(255,255,255) / 비선택 rgba(255,255,255,.5) | 동등 |
| 전환 동속성 | transitionProperty/Duration/TimingFunction + backgroundColor/boxShadow/borderRadius 값 | 동등(0.2s cubic-bezier(0,0,.2,1), radius 12px, shadow none) |
| 속성 거울 | `data-orientation`·`data-activation-direction`(리스트·루트·indicator 3노드) | 동등 |

## 구현 내용(비매핑 코드 배선 — 기수복 정적 화면 위에 얹음)

`video-surface.tsx`: 세그먼트 탭 state(선택·포커스·activation-direction) + 화살표/Home/End 로빙(tabList 패턴),
Enter/Space 활성화, 클릭 활성화, 포커스 추적 tabindex, 선택 추적을跟随하는 `aria-selected`/`data-active`/
`data-composite-item-active`, `data-activation-direction` 3노드 미러링, indicator var 를 HF 산출식으로 재계산
(`left = round(탭.x - 리스트.x) - 1`, `right = round(리스트.right - 탭.right) - 1`, `width = round(탭너비)`,
top/bottom 3px, height 32px — 모두 HF live 실측치).
`video-surface.css`: 탭 전환 동속성 블록(ground-truth transition 5속성·0.2s·cubic-bezier(0,0,.2,1),
선택 시 color 0s/배경 0.2s 의 다중 duration), 비선택 색 ap5 규칙 추가.

## disclosed 잔차(기확정·용인, 이번 판정 게이트에서 면제)

- 탭 높이 Δ8(32↔24): QA `disclosed_geometry_residual`(n128/n134)가 content-driven 로 기확정한 잔차.
  그 외 크기 차이만 실결함 계상(초과 0건).
- 콘텐츠(드롭존) 지오메트리 잔차(Δ64 등)와 레퍼런스 전환 시 콘텐츠 swap: 별도 버킷
  `content_residual` 에 분리 기록, OVERALL 판정 제외(탭 메커니즘·indicator·키보드만 판정 대상으로 명시).
- s0 초기 포커스는 페이지 환경 요인(HF = 게스트 프로모 배너, OHF = body) — 동작 산출물이 아니므로 비교 제외.

## 부수 관측(후속 근거 — fabrication 아님, 실측 원문)

HF 에서 레퍼런스 선택 시 콘텐츠 영역이 **레퍼런스 업로더**("레퍼런스 추가하기 / 이미지와 요소 최대 9개,
동영상 3개, 오디오 파일 3개까지")로 swap되고 프롬프트 placeholder 도 전환됨
(프레임: "시작 프레임과 끝 프레임은 Image 1, Image 2로…" ↔ 레퍼런스: "입력 항목은 Image 1, Video 1, Audio 1로…").
원문: `anim_verify/hf_content_swap_probe.json`, 하네스 `anim_verify/probe_content.py`.
OHF 는 정적 이식 상태(프레임 드롭존 2) 유지 → 콘텐츠 swap 은 드롭존·첨부 착지 후속 카드 소관.

## 운영 주의

검증 하네스는 양쪽 세션의 `localStorage.clear()` 후 재로드(순수 초기 상태 정렬)를 수행한다.
HF chrome(`:9222`) 은 공유 게스트 프로필이므로, 이 하네스 실행이 해당 프로필의 site storage 를
비울 수 있음(타 워크플로가 같은 프로필의 storage 에 의존한다면 재실행 시 유의).

## tsc

`npx tsc --noEmit` — video-surface.tsx 에러 9건은 t_9f4571a7 메타에 기록된 상속 타입-노이즈에서
2건 감소(중복 `aria-disabled` 속성 2쌍 제거로 11→9), 신규 에러 0건. dev(SWC) 는 타입체크 비의존.
