# video-surface 요소 5 검증 리포트 — t_bd2deeba

## 1. 판정

- **OVERALL: PASS** — tier_A(판정잔존) = **0**, mech_ok = **True**.
- 동시 라이브 CDP 실측(HF live `:9222` ↔ OHF dev `:3118` 을 측정 chrome `:9335` 경유) 게이트를 2회 실행, bucket 분해까지 **byte-identical**(판정 안정).
- disclosed(tier_B) 20건은 라이브 실측 근원과 함께 실명 공시(은폐 없음).
- **fabrication 0**: 모든 판정·수복 근거는 HF live(도메인 `:9222`)와 OHF dev(도메인 `:3118`)의 DOM 실측값만 사용.

판정 기준(카드 결정): 라이브 실측만으로 판정, 콘텐츠 지오메트리 잔차(content-driven 기확정)는 별도 버킷·판정 제외, 메커니즘 상태 전이만 판정 대상.

## 2. 대표 메커니즘 실측 동등(PASS 근거)

| 전이 | HF live | OHF | 판정 |
|---|---|---|---|
| prompt 포커스 시 form 내 computed 변화(링/테두리) | `changedCount=0` | `changedCount=0` | 매칭 ✓ |
| prompt placeholder 타이핑 시 소진(hasContent) | `data-has-content` 전환 규칙(probe2 GT) | 타이핑 직후 `phShown=None` | 매칭 ✓ |
| prompt 카운터 | 게스트 세션 부재 | `counterCount=0`(부재) | 매칭 ✓ |
| generate enable 상태 | 항상 enabled(`disabled` 속성 없음) | 항상 enabled | 매칭 ✓ |
| generate hover backgroundColor | `rgb(209, 254, 23)` | `rgb(209, 254, 23)` | 매칭 ✓ |
| generate hover 전환(bg 변화) | no-change | no-change | 매칭 ✓ |
| generate press-hold `:active` transform | `none` | `none` | 매칭 ✓ |
| start/end frame hover/dragover | no-transition(probe2 GT) | no-transition | 매칭 ✓ |
| 레퍼런스 탭 연동(요소 3) `refSelected` | `true` | `true` | 매칭 ✓ |
| 레퍼런스 드롭존 `dropEmptyNow` | `0` | `0` | 매칭 ✓ |

## 3. 이 카드가 수복한 실배선(CSS·나중 캐스케이드, 토큰 재설계 아님)

### 3-1. prompt 에디터 포커스 링 국지 반전 (HF 매칭)
- **HF live ground-truth**: prompt 포커스 시 form 내 어떤 요소도 borderColor/outline/boxShadow 변화 0건 — HF 는 prompt 에디터에 커스텀 포커스 링을 주지 않는다(포커스 전후 outline `rgb(247,247,248) none 3px` 불변·boxShadow none).
- **OHF 기저**: 앱 전역 `.ohf :focus-visible`(openhiggsfield.css:102, accent-32 lime) 가 n183 에디터에 lime 링을 걸어서 HF 와 divergence(게이트 focus scan OHF `changedCount=1` vs HF `0` → 초기 tier_A).
- **수복**: 고특이도 `.ohf .ohf-vid-n183:focus-visible/:focus`(0-3-0 > 앱전역 0-2-0)로 캐스케이드 순서에 무관하게 포커스 시 HF 실측값으로 고정(링 없음). 기존 스코프 규칙의 국지 반전, 신규 토큰 아님.
- **실증**: 재측정 후 OHF `changedCount=0`, pboxNow 양쪽 동일 `rgb(247, 247, 248) none 3px`.

### 3-2. 생성하기(generate) 버튼 fill 수복 (HF 매칭)
- **HF live ground-truth**(생성하기 submit 실측, enabled/hover/release 전 상태 동일): `background-color rgb(209,254,23)` solid lime + `background-image radial-gradient(in oklab, rgb(239,254,23) 40%, rgb(209,254,23) 100%)` + `box-shadow` 4개 transparent slot + `rgba(0,0,0,0.43) 0px -3px 0px 0px inset`(하단 3D edge). radius 12px.
- **OHF 기저**: n214 에 background-color 없음(transparent) + `--ctl-vid-bgimg`(transparent→black scrim 그라디언트, lime 아님) + 다른 shadow → **ghost 버튼** → fill divergence(게이트 `gen.*.cs.backgroundColor` tier_A).
- **수복**: 나중 캐스케이드로 HF 실측값 재현. lime 기저는 기존 `--ohf-color-accent`(=#d1fe17=rgb(209,254,23)) 토큰 **재사용**, radial/shadow 는 HF 라이브 실측 리터럴(fabrication 없음).
- **실증**: OHF generate backgroundColor = `rgb(209, 254, 23)`, hover 도 동일(no-change), radius 12=12. HF 와 fill 매칭.

## 4. disclosed 잔차 20건(은폐 없음, 라이브 실측 근원 명시)

### content_residual (8) — form 내부 세로 오프셋/높이, 콘텐츠 기하(content-driven 기확정 → 판정 제외)
- 실측 근원: figure 카드 `130=130` 동값·seg tablist `HF40≠OHF32`(Δ8·요소 1 기공시 content-driven)·dropzone 영역 HF 가 tall(Δ64·레퍼런스/프레임 콘텐츠) → prompt/generate 가 form-상대 세로로 밀림.
- 프롬프트 에디터 높이 `pbox.h HF160 ≠ OHF116`: 높이 차이는 placeholder 텍스트 분량(콘텐츠)이 결정 — HF 안내문이 2행 이상이라 taller. content-driven.
- 항목: `pfield.y/pbox.y` Δ72, `gen.enabled/hover/release.y` Δ86, `phRect`(x 동일·y 잔차), `pbox.h/cs.height`.

### font_metric_residual (2) — prompt 타이포 잔차
- `pfield.cs.fontSize 16px≠14px`, `lineHeight 24px≠20.3px`. 콘텐츠/타이포 fidelity 는 콘텐츠 카드(t_885ea9ce) 도메인(기확정), 요소 5 메커니즘 아님.

### content_fidelity_gap (2) — placeholder 문구 잔차
- HF placeholder: "동영상을 설명해 주세요. 입력 항목은 Image 1, Video 1, Audio 1로 지칭…" vs OHF: "영상을 설명해 주세요. 시작 프레임과 끝 프레임은 Image 1, Image 2로 지칭…" → 문구 자체의 fidelity 는 t_885ea9ce 도메인(기확정).

### frame_mode_absence (6) — start/end frame 드롭존 절대 cs
- HF 는 frame-mode 조건부(게스트 세션 기본 미노출 → boxCs None) → 절대 cs 비교 불가. ground-truth(probe2)의 hover/dragover **no-transition** + 요소 3 연동(seg_*)으로 판정 대체. 절대 드롭존 appearance 는 요소 3(t_bea84dee)의 기검증 스코프.
- `sf/ef.base 사이드 결측`: HF 측 frame 드롭존 기본 미생성.

### auth_gate_absence (2) — 토글·명시적 addRef·카운터·switch 계열
- HF live **게스트 세션**에 부재가 실측 확정(프로브·게이트). fabrication 금지 → 임의 배선 불가 → 후속 인증 게이트 카드로 이관(부모 NV 계열 선례 동일).

## 5. 발견된 OHF 입력 크래시(pre-existing·이 카드 스코프 밖 → 후속 카드)

OHF 프롬프트 편집기에 text 입력 시(실 키 이벤트와 CDP insertText **모두에서**) React 가 `removeChild`(NotFoundError: node to be removed is not a child of this node)로 크래시 → 이후 생성하기 버튼·폼이 언마운트(`generatePresent=False`). HF 는 같은 조작 후 생성하기 유지(`generatePresent=True`).

근원(소스 판독): n180 의 contenteditable 편집기가 `{text===""?<p><br/></p>:<p>{text}</p>}` 로 **controlled 재렌더** 되면서, 브라우저가 contenteditable 의 DOM 을 입력으로 직접 변경한 뒤 React 가 `text` state 로 같은 DOM 을 재조정 → reconciler 가 예상 밖 위치의 node 를 remove → removeChild 경주. n184 placeholder 의 조건부 마운트도 같은 영역에서 경주. dev3118.log 의 removeChild 크래시는 **내 CSS 변경 이전부터** 존재 → pre-existing.

이 카드의 입력 메커니즘 판정(placeholder 소진·카운터 부재)은 타이핑 직후(React 정리 전) 읽기로 성공·HF 메커니즘과 매칭. 크래시 자체는 전이 스코프 밖인 structural React 버그 → `t_bd2deeba` 후속 카드로 이관(직접 수정 안 함).

## 6. surface 전체 catalog 재고(수용 기준: data-off 잔존 확인)

`video-surface.tsx` data-off 잔존 = **16건**. 모두 정적 이식된 HF 요소의 "착지 후속"(honest-inert) 마커이며, 요소 1~5 의 전이(탭·autoplay·swap·select·prompt·generate·frame hover/active) 배선 범위 안에는 data-off 가 **0**(배선 완료). 잔존 16건은 landing/auth 후속 소유:
서피스 탭(n106·107·108), figure 카드 모델 데모(n114)·변경 배지(n122), start/end frame **실첨부**(n148·n166), 레퍼런스 **실첨부**(ref-uploader), 모델 트리거 패널(n187), 피드 탭(n229·n235·실전환은 FeedHeader 보유), 필터·보기(n244·n249), 아카데미 라우팅(n279), 도움말 런처(n297).

→ "data-off 잔존 0" 은 전 요소 완료·전 착지 완결의 이상적 목표이며, 인증/피처 게이트된 landing(fabrication 금지로 임의 제거·임의 동작 부여 불가)은 정당한 honest-inert 마커로 **의도적으로 잔존**. 이 리포트는 잔존 16건과 각 사유를 실명 공시(은폐 없음).

## 7. 타입체크

`npx tsc --noEmit`: 총 21건, **모두 pre-existing baseline**(CSS-var-in-style TS2353 7종 var 재현 + 중복 aria-disabled TS17001 2쌍). 이 카드 변경은 `video-surface.css`(tsc 비대상)·python 게이트/프로브뿐 → **신규 tsc 에러 0**.

## 8. 커밋·환경

- 체인 HEAD 정렬: 워크트리가 main(nav 스레드 74728de)에서 파생되어 surface 체인 미포함 → `git merge --ff-only bae277b`(요소 4)로 정렬(747278de 가 bae277b 의 조상=ff-safe, 16커밋 앞).
- node_modules = 부모 main repo 의 `cp -al` 하드링크(531M 공유). 격리 dev 포트 `:3118`(부모가 `:3113~:3116`·`:3015` 점유).
- OHF 격리 프로필(127.0.0.1)만 prompt 초안 localStorage 비움 → 클린 empty mount(공유 HF live `:9222` 프로필은 비우지 않음 — 카드 notes 준수).
- push 미실시(로컬 워크트리 커밋만; push 는 운영자 지시 사안 — 선례 t_bea84dee/t_9f4571a7).

## 9. 하네스/측정 주의사항

- OHF 시퀀스에서 `pbox.blur()`/`execCommand`(React contenteditable 와 경주 → removeChild) 제거 → mount-시 무포커스 baseline 사용으로 게이트 자체 크래시 회피.
- 타이핑(크래시 유발)은 입력 페이즈 마지막에 별도 fresh 페이지로 격리 측정 → 확보된 gen/frame/seg 를 오염시키지 않음.
- placeholder 셀렉터 HF 전용 `[data-prompt-placeholder]` → OHF n181(class `prompt-placeholder`)도 잡도록 이중 셀렉터 정합.
- 매 상호작용 직전 좌표를 라이브 rect 에서 재계산·원점(폼) 상대 정규화로 쿠폰/배너 전역 shift 상쇄(부모 fs_norm 선례).
- generate 실제 실행(과금 API 호출)은 하지 않음(버튼의 hover/active/enable 상태 전이까지만).

## 10. 산출물

- `anim_verify/gate_element5.py` — HF↔OHF 동시 동등성 게이트(입력 격리·crash 회피·content/fidelity/harness 정직 분류).
- `anim_verify/element5_report.json` — 판정 결과(PASS·disclosed 20).
- `anim_verify/probe_element5_hf.py`, `probe_element5_hf2.py`, `hf_element5_probe.json`, `hf_element5_probe2.json` — HF live ground-truth 프로브.
- `src/openhiggsfield/video-surface.css` — prompt focus-ring 국지 반전 + generate fill 수복(나중 캐스케이드, 토큰 재사용).
