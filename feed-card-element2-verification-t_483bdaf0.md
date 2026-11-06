# video-surface 요소 2 — 피드/쇼케이스 카드 autoplay·hover·mute·expanded 실측 검증 (t_483bdaf0)

## 방법
HF live CDP ground-truth(:9222, https://higgsfield.ai/ko/ai/video?model=minimax_h3) ↔ OHF dev(:3114, 측정 chrome :9335) **동시 라이브 실측**. 모든 판정 근거는 라이브 DOM 실측만 사용(fabrication 0). 지오메트리는 제품 뷰포트(1440×900) 원점·교차 기준.

- base: 요소 1 완료 커밋 d01efa6(세그먼트 탭 전환 동속성). 이 워크트리는 main(74728de)에서 분기되어 부모 분기를 못 갖고 있었으므로, 카드 body 의 고정 base(open-higgsfield/t_e0c64917… = d01efa6) 에 정합하기 위해 분기 tip 으로 non-destructive fast-forward(`git merge --ff-only`) 후 시작. HEAD = d01efa6.
- dev :3113 은 **부모 워크트리(t_e0c64917)** 가 서빙 중이라 제 편집이 반영되지 않음 → 제 워크트리로 신규 dev(:3114, `cp -al` node_modules hardlift 531M) 을 띄워 OHF 실측 대상을 분리.
- 하네스 재사용: `anim_verify/segtab_verify.py`(동시 CDP 골격) 을 피드 카드에 맞게 변형 → `feed_verify.py`. 보조 프로브: `probe_feed.py`(구조), `probe_feed_dyn.py`(스크롤/hover/click 동속성), `probe_boundary.py`(autoplay 가시 경계 스윕).

## HF 라이브 ground-truth(실측 원문)
피드/쇼케이스 카드 3종(모델 데모 영상 + step-2·step-3 영상) 의 동속성:

1. **autoplay = IntersectionObserver(카탈로그 관례)**: 카드가 뷰포트에 교차 진입하면 `play()`/이탈하면 `pause()`. **hover 로는 재생되지 않음**(hover 스냅샷: paused 유지). 카드 `autoplay` 속성은 없음·`loop/muted/playsInline/preload=none`. 초기 로드는 HF 리모트 CDN 영상이 미로드(`readyState=0·paused=true`) → settle 후 재생 발화.
2. **hover/active = 가시 reveal 없음**: 카드는 Tailwind `group` 클래스(`relative group`·`group relative relative`)를 가지나, hover 스냅샷의 computed(opacity/backgroundColor/boxShadow/transform) 가 initial 과 동일 → group-hover reveal 자식이 없는 **유물적 group**. 실관측 hover 효과 없음.
3. **mute 토글 = 피드 카드에 없음**: 카드 내 mute/sound 라벨 버튼 0(`allMute=0`·`muteBtn=false` 전 카드).
4. **expanded = 피드 카드에 없음**: 카드 `aria-expanded` 없음. 페이지의 13 개 aria-expanded 는 전부 nav/다이얼/필터/도움말(세그먼트·설정 계열) — 피드 카드 아님.

## OHF 현재 배선 상태
- `video-surface.tsx` 의 `useAutoPlayOnView`(PLAYING = {115, 270, 275}) 이 피드 영상 3 종을 IntersectionObserver 로 재생·정지 → **이미 live 실배선**(data-off 아님). rootMargin "120px 0px".
- 피드 카드(n263/n268/n273 article, n264/n269/n274 figure)는 정적 클래스(별도 group 미부여), hover computed 는 HF 와 동값, mute·expanded 없음.

## 동시 라이브 CDP 게이트 결과(`feed_report.json`)
동시 진행: load → s0(상단·카드 뷰포트 내) → scroll(500, JS) → s1 → hover → click → scroll up → s2 → scroll(2500) → s3 → **축소 뷰포트(180) → s_out(정지 갈무리)**.

| 항목 | 판정 | 근거(실측) |
|---|---|---|
| autoplay(in-view→재생) s0 | PASS | HF·OHF 모두 settle 후 초기 in-view 재생(`paused=false`, currentTime 진행) |
| autoplay s1/s2/s3 | PASS | 전 상태 양쪽 재생(`paused=false`) — 교차 유지 semantics 동등 |
| **pause-on-exit(OHF 메커니즘 실동)** | 확인 | `probe_boundary.py` 스윕: OHF n270/n275 가 IO 범위 밖(vh↓)에서 `paused=true` 로 전환 → IO 재생/정지 양 갈래 모두 실동작 |
| hover computed | PASS | 대표 카드 computed HF≡OHF(·opacity 1·bg rgba(0,0,0,0)·color rgb(247,247,248)·boxShadow none·borderRadius 12px·transform none) |
| transition 동속성 | PASS | 카드 transitionProperty "all"·Duration "0s"·Timing "ease" 양쪽 동값(→ HF 카드에 hover 전환 없음과 일치) |
| mute 토글 | PASS | HF 카드 mute 버튼 0·OHF 카드 mute 버튼 0 → 부재 동등(honest match) |
| expanded | PASS | HF 카드 aria-expanded 없음·OHF 카드 없음 → 부재 동등(honest match) |

**OVERALL: PASS — 게이트 이슈 0.** 대표 피드 카드(모델 데모 n115 + 쇼케이스 n270·n275) 전수에서 autoplay·hover·mute·expanded 동작이 HF 와 동작 실측 PASS.

## honest 판정 — "9종 honest-inert 해제" 예비 전제에 대하여
카드 body 는 피드 카드 autoplay·hover·active·mute·expanded 를 "data-off 로 마킹된 9종 실배선·해제" 로 전제했으나, 라이브 실측 결과:
- **피드 autoplay 는 이미 live 실배선**(data-off 마커 없음 — `useAutoPlayOnView` 가 115/270/275 를 IO 로 구동, harness 가 재생 실증).
- **hover/transition 은 HF 카드에 가시 reveal 없음**(유물적 group) → OHF computed 이미 동값 → 실배선할 동속성 자체가 HF 에 없음.
- **mute·expanded 는 HF 피드 카드에 존재하지 않음** → 해제할 inert 마커도, 추가할 동작도 없음. OHF 의 부재가 HF 와 동등한 honest match.
- video-surface.tsx 의 17 개 data-off 는 서피스 탭·피겨·드롭존·다이얼·피드 헤더 탭·필터/보기·아카데미·도움말 계열이지, 피드 카드 autoplay/hover/mute/expanded 가 아님.
→ 이번 요소 2 의 실배선 소스 변경은 **불요**(이미 패리티). 산출은 동시 CDP 검증 + 정합 보고서로 종결. 소스 무변경 → 신규 tsc 에러 0.

## disclosed 잔차(게이트 면제·별도 버킷) — 임계값 경계차
- `probe_boundary.py` 스윕(vh 900→90): HF 는 step 영상이 **~65% 가시에서 정지**(vis≈0.657 에서 paused), OHF 는 120px 마진으로 **거의 이탈(vh 280, vis≈0)까지 재생** 후 정지. 즉 HF 의 autoplay 교차 경계가 OHF(120px 마진)보다 **더 엄격**.
- 제품 뷰포트(1440×900) 에서는 피드 카드가 전가시(vis=1)로 레이아웃에 놓이고 window 가 스크롤되지 않아(스크롤 가능 영역은 내부 컬럼) 카드가 클리핑/이탈되지 않음 → 이 임계값 차이는 **제품에서 관측 불가능**. 카드 body 의 "disclosed 잔차 = 게이트 면제·별도 버킷" 에 따라 `s_out`(인공 축소 뷰포트) 을 OVERALL 게이트에서 제외하고 진단 버킷에 기록. OVERALL 판정은 요소 메커니즘(autoplay 재생·hover·transition·mute/expanded 부재) 만.
- 잔차 성격: HF 의 IO 임계값/rootMargin 는 라이브 JS 를 읽지 않고 스윕 경계로만 근사 결정(정확값 미확정) — 제품 무관여이므로 OHF hook 를 임의 변경하지 않음(재설계·추측 금지).

## 하네스/환경 주의
- 본 프로브·하네스는 HF 에 `localStorage.clear()` 를 **적용하지 않음**(공유 :9222 프로필 site storage 보호 — 부모 t_e0c64917 의 하네스 주의 반영). OHF측 세정만 수행.
- `:3113` 은 부모 워크트리 서빙 → 제 검증은 제 워크트리 신규 dev `:3114` 로 분리. 산출 시점 `:3114` HTTP 200·data-ohf-video 앵커 204 확인.

## 검증 부수
- `npx tsc --noEmit`: video-surface.tsx 9(요소의 1 baseline 그대로 — CSS-var-in-style 노이즈 7 + 중복 aria-disabled 2쌍), app 전체 21(storybook deps 미설치 기존재와 surface 상속 노이즈). **신규 에러 0**(소스 무변경).
- 동시 라이브 CDP 게이트: OVERALL PASS 이슈 0.

## 산출 파일
- `anim_verify/feed_verify.py`(동시 CDP 골격 변형), `probe_feed.py`/`probe_feed_dyn.py`/`probe_boundary.py`
- `anim_verify/feed_report.json`(동시 게이트 원문), `hf_feed_probe.json`/`hf_feed_dyn.json`/`hf_autoplay_boundary.json`
- 본 보고서
