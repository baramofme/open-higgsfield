# t_2afe2cd0 실측 리포트 — HF public 프로필(@exploringdonut1792) → OHF 동화면 이식

작성일: 2026-11-06 (KST) · 런 356 · 워크트리 `open-higgsfield/t_2afe2cd0-hf-public-exploringdonut1792-ohf`

## 1. 판정

**수용 기준 PASS.** HF live와 OHF dev를 **동시 시점**에 CDP로 실측한 결과, 매핑된 125개 노드에서
**RECT FAIL 0 · STYLE FAIL 0(65 계산 속성 문자열 동등) · TEXT FAIL 0**. 비교 대상 HF 키는 전부 매핑됨(미매핑 0).

- OHF 노드 137개 전부 매칭(`miss: []`), 제목 동등 `'Higgsfield의 @exploringdonut1792'`, `document.fonts.check('16px Inter') = true`.
- 권위 원천: HF live 재수확(`precise_live.json`, 139 노드). 1시간 전 정지점(`precise_new_0038.json`)과
  **변동 노드 0** → 구조가 재수확 시점에도 동일하게 유지됨을 실측 확인. 권위를 라이브 스냅샷으로 갱신 후 비교.

## 2. 방법(고정 결정 준수)

- HF ground-truth: `127.0.0.1:9222`(guest headless)에서 1440×900, 스크롤 0, fresh tab, 렌더 게이트
  (`[class*="group/profile"]` 출현까지 폴) 통과 후 하베스트. 하베스트 JS는 런346 원문 재사용 → 키 체계 동일.
- OHF 실측: dev `:3110`(본 워크트리) + 측정용 Chrome `127.0.0.1:9340`, 동일 1440×900, 동일 74개 계산 속성.
- harness: `profile-t_2afe2cd0/compare.py`. 동 rect 판정 기준(아래 3), 동 스타일 = 계산값 문자열 완전 동등.
- fabrication 금지: 모든 값은 HF 계산치 실측 원문. 재창작·추정값 없음.

## 3. rect 판정 규정(표면 좌표계)

프로필 루트(`.ohf-pf-group`) 기준 **상대 y**로 비교하되, 예외가 두 가지 있다:

1. `position: fixed` 노드(커버)와 그 **containing block을 공유하는 파생 3개**(cover-img,
   cover-img-blurred, cover-fade)는 viewport 고정 좌표계이므로 **절대 y**로 비교.
   (OHF 앱 크롬 오프셋 42 ↔ HF 44의 2px 차이가 상대 y에 새기 때문. 실 rect 자체는 양측 `(0,0,1440,400)`로 동일.)
2. x·너비·높이·모든 스타일은 절대 동등(TOL 0.6px).

앱 크롬 오프셋 자체(2px)는 이 카드 소관 밖(t_9f4571a7 셸)이며, 규정에 따라 상쇄한다.

## 4. 이번 런의 교정 내역(전부 HF 실측 계산치가 권위)

| 대상 | HF 실측 | OHF 교정 |
|---|---|---|
| 비선택 탭 색 | `rgb(130,130,130)` | `.ohf-pf-tab` 기본색 + `[data-active]`(tab-0)만 `rgb(26,26,26)` |
| 커뮤니티/업적 앵커 색 | `rgba(255,255,255,.3)` / `.698` | `.ohf-pf-page a` 가드가 (0,1,1)로 컴포넌트 색을 삼켰다 → `a.ohf-pf-*`(0,2,1)로 재 선언 |
| 커뮤니티 버튼 레이아웃 | 아이콘 x20 → 라벨 x36, w 103.531 | `grid-auto-flow: column`(기존 1열 겹침·너비 87.53) |
| 평점 알약 중심 | cx 87.000 = 아바타 cx 86.000 **+1px** | `left: calc(50% + 1px)` |
| sr-only | clipPath `none` | `clip-path` 제거(1px 박스+overflow로 숨김) |
| 팔로우 버튼 테두리 | `rgba(0,0,0,0)` | `border: 0` shorthand가 앞선 `border-color`를 현재색으로 되돌렸다 → 뒤에 재 선언 |
| 커버 | live rect `(0,0,1440,400)` | `bottom: 500px`(v1 잔존 가정) 폐기 → `top: 0` |
| oklab 색 3종(알약 테두리·타일 접시·아바타 테두리) | `oklab(0.999994 …)` | 시트에 두면 Lightning CSS가 `lab()`으로 환산 → **인라인 스타일**로 선언(미니파이어 비경유, 값 동일) |
| 스탯 라벨 정렬 | 항목별 `left`/`start`(상속) | 라벨의 `text-align: left` 고정 제거 → 부모 상속에만 맡김 |
| 업적 화살표 | flex `0 1 auto`(shrink 1) | `flex-shrink: 0` 제거 |
| 페이지 배경·스무딩 | body `rgb(0,0,0)` + `antialiased scheme-only-dark` | `.ohf-pf-page`에 재현(OHF 셸 전역 배경 `rgb(19,20,22)`은 t_9f4571a7 소관이라 **이 표면만** 덮음) |

## 5. 시각 대조(1440×900, 스크롤 0, 동시 캡처)

- 전체 화면: 완전동일 84.0% · 12미만 88.6% · 유의미한차 11.4%
- **프로필 표면(44~844, 셸 제외): 완전동일 94.3% · 유의미한차 4.8%** ← 판정 근거
- 대역: 커버+커뮤니티줄 1.1% · 탭바+아바타/이름 3.6% · 스탯/팔로우/구분/업적/가입일 4.2%
- 잔존 hotspot(y 스윕): 업적 웨이브 y540~588(13~21%), empty 텍스트 y708~756(8~16%), 아바타/이름 y264·312(11%)
  → SVG 렌더·글자 안치얼리아싱·2px 크롬 오프셋(샘플 지점 어긋남) 수준의 차이. rect·스타일은 모두 PASS.
- 셸(이 카드 소관 밖): 상부 내비 y0~44 18.5%, 하부 y844~900 100%(OHF 라우트에 하부 독/푸터 유무 차이).
  → **후속 관찰 항목**: 프로필 라우트의 셸 상·하부 정합은 t_9f4571a7 계열 소관.

## 6. 자산 정합

- 커버: HF `https://static.higgsfield.ai/public/profile/cover-pattern.svg` → OHF `public/profile/cover-pattern.svg`(동일 파일 리포)
- 아바타: HF cloudfront `profile-avatars/v1/9adcfb84….webp` natural 500×500 → OHF 로컬 webp natural 500×500(동 치수 확인)

## 7. needs_input 표기(카드 body 지시대로 구조는 진행, 값만)

게스트 세션에서 관측된 **사용자별 값 4종**(팔로워·팔로잉·조회수·좋아요 모두 `0`, 평점 `5`, 가입일 `2026년 10월`)은
로그인/계정 상태에서 변동 가능하다. 정적 미러는 게스트 실측값(`0`×4, `5`)을 그대로 반영했고, 지오메트리·정렬은
실측과 동등하다. **로그인 상태 ground-truth가 필요한 항목은 위 4개 값의 리터럴뿐**이며, 구조·프레임·스타일은
실측으로 확정되어 있어 이 카드의 판정을 막지 않는다. 동적 동작(팔로워 수 수반 number-flow, 탭 전환,
`data-profile-tabs-pinned` 상태)은 후속 카드 t_e0c64917로 이관됨(본 카드는 정적 미러·honest-inert).

## 8. 제외 항목(구조 자체가 다른 것 — 문서화)

- number-flow-react 실마운트 내부(`nf-*`, `stat-numflow*`) — OHF는 정적 미러(동작 없는 honest-inert).
- HF에만 존재하는 중첩 래퍼(`stat-cell-*`, `stat-numcell-*`, `ach-lead`) — OHF는 동등 지오메트리를 버튼
  직접 자식으로 재현(해당 rect·스타일 PASS로 확인), 대응 노드 없어 비교 불가.
- `ach-svg`·`avatar-line`·`glow`·`stack` 등 "HF 수확에 없는 키" 11개는 **별칭**으로 이미 비교됨
  (`ach-chev`·`avatarline`·`glow-span`·`avatar-stack` 등).

## 9. 재현 절차

```
cd ~/.hermes/cache/scratch/profile-t_2afe2cd0
python3 verify_live2.py     # HF live 재수확(새 탭·렌더 게이트) + 동시 비교
python3 compare.py          # OHF(:3110) ↔ 권위 precise_new.json 비교 → exit 0 = FAIL 0
python3 shots_final.py      # 양측 1440×900 스크린샷 + 대역별 픽셀 대조
python3 apply_fixes.py / apply_fixes2.py / extend_map.py   # 이번 런의 교정·매핑 확장(출현횟수 검증, 원자적)
```
산출 파일: `compare_out6.txt`(최종 FAIL 0), `precise_live.json`(라이브 권위),
`hf_final_1440x900.png` / `ohf_final_1440x900.png`(동시 스크린샷).
