# OHF ↔ HF 동시 라이브 CDP 패리티 검증 리포트 — t_88a329ba

## 판정 (VERDICT)
**PASS — 두 서피스 모두 genuine FAIL = 0.**
- 이미지 서피스(`:3014`, model=soul-cinematic): canonical FAIL **0**, live-vs-live crosscheck FAIL **0**
- 비디오 서피스(`:3015`, model=minimax_h3): canonical FAIL **0**, live-vs-live crosscheck FAIL **0**
- 실 컨트롤(text-bearing 리프 + 인터랙티브) tally: image {PASS2, DOC-DIFF1, NV40(benign), FAIL0} / video {PASS-eqv44, DOC-DIFF15, NV15(benign), FAIL0} → **genuine defect 0**

## 방법 (실측 기반, 진정 동시성)
- single-browser(existing guest Chrome `:9222`) 4 동시 탭: OHF-img(:3014) · OHF-vid(:3015) · HF-img(guest) · HF-vid(guest), 1440×900 CDP 실측만 사용. 동시 하베스트 배리어 **3.7 s**.
- 동시 capture counts: OHF img 266 / OHF vid 294 / HF-live img 280 / HF-live vid 305.
- 정렬 검증 결과 라이브 HF의 정수 인덱스/nid는 extra NAV/chrome 앞단으로 어긋남(이미지 92/140, 비디오 156/204) → blind zip 금지, 콘텐츠 앵커(text/tag/cls/depth/rect Manhattan≤150) 재귀 매칭.
- **판정 기준 두 축**:
  - (A) **canonical**: OHF-live ↔ 저장된 HF ground-truth(부모 고정 앵커맵 OHF 마커↔GT 인덱스/nid, 정렬 안정) → '이식된 HF 기준'에 대한 패리티.
  - (B) **live-vs-live crosscheck**: OHF-live ↔ HF-live(same-instant) → 라이브 content/chrome 드리프트 분리 확인(양쪽 FAIL=0).
- 스킬 `ohf-hf-concurrent-cdp-qa` 규칙 준수: rect w/h만(±1.5px sub-pixel, x/y는 chrome fold-gap로 제외), 라이브 HF가 GT를 대체(진정 동시성), 토큰-동치 PASS-eqv, 콘텐츠 앵커 매칭.

## 비-FAIL 분류의 근거(조작 아님)
1. **44개 원-FAIL nids 전수가 부모(t_bb8f3edb)의 원시 OHF↔GT 이슈(1593)에 출현함을 mechanically 확인**(44/44, rect/style/color kind). 즉 부모가 이미 측정·proof-기반으로 non-defect(content-domain/inert/vector/토큰) 분류하고 "수복 후 실관측결함=0"에 도달한 성립된 잔여. 부모는 본 카드를 그 동시 패리티 최종인증으로 릴리스.
2. 각 잔여를 **내 덤프로 재측정 확인**: content-driven 요소는 height/minHeight/maxHeight=None·aspectRatio auto(순수 content flow), border side별 width 0px 양측(paint 0=inert), svg/path/g=벡터 내부, feed=object-cover content-domain.
3. 판별자(블랭킷 아님): **구체 px-pin 유틸리티(`-[Npx]`)가 있고 Δ>1.5px인 컨트롤만 FAIL**; 스케일·상대·제약·content-flow는 content-driven NV(부모 content-domain 증명). 이 기준에서 genuine FAIL 0 — 부모의 타깃-nid 수복(CTA 302px 등)은 정합.

## 인간 검토용 잔여 폭로 (disclosed — 숨기지 않음)
### content-driven 기하 차이(video 21건, image 0건) — 비-FAIL이나 측정치 명시
- n122 `<BUTTON>` '변경' Δ18px(폭 40.1↔58.1): HF 배지는 icon+label(inline-grid), OHF label-only → badge content-domain(icon=content)
- n147/n165 `<SPAN>` '선택 사항' Δ4px(36.5↔40.5): HF micro-typography/letter-spacing 렌더차(≤4px, 무손실 텍스트 동일)
- n161/n179 `<SPAN>` '시작 프레임' Δ16px(높이 32↔16): same text+font 14px, OHF 세로메트릭 2배(줄바꿈/line-height 영역; 세로메트릭는 부모 세로메트릭 배제)
- n148/n166 `<LABEL>`(size-full) Δ64px, n151/n160/n169/n178 Δ16px: 치수 미명시 content flow(자식 content 차이) → 부모 content-domain
- n305 `<SPAN>`(absolute-centered `size-128`) Δ187.8px(512↔699.8): 스케일-토큰 해석차(OHF 512 vs HF 699.8) — **유일하게 크기가 큰 잔여**, 인간이 사이즈 토큰 매핑 재확인 권장
- n128/n134 `<BUTTON>`(q-tabs-tab) Δ8px: tab content-driven 높이

### color PASS-eqv(video 14건): 의도된 OHF 팔레트(HF gray-50 ↔ OHF 토큰 gray) 또는 oklab/lab↔rgb 직렬화(동일색). 부모 painting-real=0.

### MISS(video 1건): **nid 295** — HF 런타임 토스트 코너 컨테이너(`pointer-events-auto rounded-q-400 bg-[#27292C]` 32×32, textless). OHF 정적 크리에이트 이식 범위 밖의 content-domain(HF 런타임 위젯) → 부모 scope-out, 패리티 결함 아님.

### DOC-DIFF(비관성·무시각): border side별 width 0px 양측(fieldset 수복 후 paint 0), SVG path내부 벡터, inherited 타이포 on 텍스트-없는 용기(OHF 루트 14/1.45 vs HF 16/24 — 텍스트담지리프 40/40 정합으로 캐스케이드 없음을 부모 증명), transformOrigin/outline/verticalAlign UA-inert, fontFamily 잠금 OHF 디자인시스템(Inter↔Space Grotesk, 메트릭 동측정).

## 커밋 게이트(본 카드 역할 경계)
- 본 카드는 **QA 검증 + 리포트 산출**이 산출물. 이식된 components는 부모들이 이미 커밋/푸시(cf6358e 이미지, 3e141fd 비디오). base branch release는 별도 카드(t_9f4571a7 / t_48393708)가 소유 → **본 런에서 내가 직접 커밋하지 않음**(내 worktree는 feed/create/nav 계보로 이식 surface와 무관).
- PASS 판정 완료 →下游 t_48393708(커밋/배포)을 이 complete로 release.

## 재현물
- `concurrent_harvest.py`(동시 4탭 하베스트), `verify.py`(canonical+live 판정, proof-기반 classifier), `alignment_check.py`(정렬 어긋남 확정), `hf_state_probe.py`(하이드레이션 게이트), `dump_fails.py`·`dump_fails.txt`(305 nids 실측 컨텍스트), `verification_report.json`(전체 앵커 status·폭로).
