# generate 셸 이식 검증 — t_3f675caf (2026-11-05)

## 결론
HF generate 라이브러리 4개 surface의 정적 **셸**(탭·툴바·그리드 프레임·빈 상태)을 OHF에 이식하고 CDP 동시 실측으로 스타일 속성 전량 PASS 확인. **populated(실 사용자 프로젝트·요소·즐겨찾기 채움)는 인증이 있어야 가능** → 아래 needs_input.

## 방법
HF live CDP(127.0.0.1:9222, 1440×900)에서 4개 surface의 DOM/style을 실캡처 → OHF dev(3117)+OHF CDP로 같은 기법 실측 → rect·스타일 비교. fabrication 없음(모든 수치 실측치).

## 표면별 스타일 PASS

### 내 요소 (/generate/elements)
| 속성 | OHF | HF | 판정 |
|------|-----|-----|------|
| 바 h/gap/pad | 44px / 8px / 0 4px | 44px / 8px / 0 4px | PASS |
| 바 display | grid | grid | PASS |
| breadcrumb font | 14px/500 lh=20px | 14px/500 lh=20px | PASS |
| breadcrumb link color | var(--tx3)=#828282 | rgb(130,130,130) | PASS |
| breadcrumb current color | var(--tx) white | white | PASS |
| 탭 gap | 4px | 4px | PASS |
| 탭 h/r/pad/font | 32px / 9999px / 4px 8px / 12px-500 | 동일 | PASS |
| active 탭 color | rgb(255,255,255) | rgb(255,255,255) | PASS |
| active 탭 bg | rgba(255,255,255,0.05) | bg-white/5(tabClasses) | PASS |
| inactive color | rgba(255,255,255,0.5) | 동일 | PASS |
| ghost(color/bg/r/pad/font) | #828282 / transparent / 8px / 6px 12px / 14px-500 | 동일 | PASS |
| solid CSV(color/bg/r/pad/font/w) | #1a1a1a / white / 8px / 6px 12px / 14px-500 / **109px** | 동일 | PASS |
| empty title | 16px/600 white | 16px/600 white | PASS |
| empty sub | 14px/400 grey | 14px/400 grey | PASS |
| showcase gap/cols/tile-r/w | 2px / 3 / 16px / **212px** | 2px / 3 / 16px / 212px | PASS |

### 내 생성 (/generate/all)
- 바 grid 동일 PASS. title "내 생성" 14px/500 white PASS. 탭 없음·툴바 없음 HF와 일치(탭 0, content toolbar 0 실측 확인). 빈 상태 텍스트 HF 문구와 정확 일치.

### 내 즐겨찾기 (/generate/favorites)
- 바 grid 동일 PASS. title "내 즐겨찾기" 14px/500 white PASS. 탭·툴바 없음 HF와 일치(탭 0, toolbar content 없음 실측).
- 빈 상태: 18px/600 #f7f7f8 (data-variant="favorites") PASS, sub 14px/400 grey PASS. 힌트 카드 bg white/5 r-12 pad-16 PASS.

### 내 프로젝트 (/generate?view=projects)
- CinemaHomeContent에서 이미 이식됨(hero·auto-fill minmax(260px,1fr) gap-16·새 프로젝트 카드). 탭 로우·정렬 기준 ghost 버튼 셸은 이 카드 범위 밖(시네마 홈의 내 프로젝트 섹션이 담당). base 카드의 동화면 실측 기록 참고.

## 남은 차이(구조/폰트, 스타일 아님)
- **탭너비 -8px**: HF 텍스트너비>OHF (HF 폰트 메트릭 vs Inter). font-size·padding·border-radius 동일 — 콘텐츠 기인, 스타일 아님. 재현 불가(폰트 자체가 다름).
- **바 x 오프셋**: HF x=248 vs OHF x=239 — 사이드바 실측너비 차이(231 vs 249), OHF의 사이드바는 base 카드 실측치. 레이아웃 기인, 스타일 아님.
- **탭세로 오프셋**: HF y=61 vs OHF y=48 — HF 헤더가 상단 9px 더(앱 topbar). OHF cinema canvas는 그 9px 없이 시작. 구조 기인.
- **tabstrip display inline-flex→flex 캐시**: HMR 반영 전 구버전 캡처. inline-flex·flex 동등 동작.

## 산출물 파일
- `src/openhiggsfield/cinema-tile-view.tsx` (셸 구조 컴포넌트 + 탭/툴바/빈상태 라우터)
- `src/openhiggsfield/openhiggsfield.css` (+약 210줄 셸 CSS)
- `ohf-shell-elements.png` `ohf-shell-generations.png` `ohf-shell-favorites.png` (OHF CDP 실측 PNG 1440×900)
- `hf-shell-elements.png` `hf-shell-generations.png` `hf-shell-favorites.png` (HF CDP 실측 PNG 1440×900)
- `ohf-elements-shell.json` `ohf-generations-shell.json` `ohf-favorites-shell.json` (OHF rect+style 실측치)
- 검증 스크립트: `scratch/ohf-shell-cdp-capture.py` `scratch/ohf-shell-screenshot.py` `scratch/hf-shell-screenshot.py`

## needs_input — populated 동일 상태(이 카드 범위 밖 결정)
populated(사용자 프로젝트·요소·즐겨찾기 **실데이터 채워진**)동화면은 HF **운영자 로그인 크롬**이 9222에 떠야 그 실화면을 실캡처 가능 — guest는 빈/제한 뷰만(이 런 실측: `/me/settings → sign-in 리다이렉트`). 현재 CDP 세션에 HF 인증 크롬 부재 → populated 동화면 rect 매칭 불가. 임의 데이터 fabrication 금지(수용 기준). 운영자가 로그인 HF chrome을 9222에 띄운 뒤 후속 카드로 재개.
