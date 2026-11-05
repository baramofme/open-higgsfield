# ground-truth: /ko/me/settings/usage (1440×900)

- **출처**: 연자(운영자) 인증 크롬(pid 2104576, 비-headless Chrome/153)의 IPv6 CDP
  `http://[::1]:9222` → `ws://[::1]:9222/devtools/browser/3b95f43d-...` 로 **실측 캡처**.
  IPv4 `127.0.0.1:9222`는 레거시 헤드리스 guest(pid 1915191)가 점유 중이라 사용 금지.
- **게이트**: `gate.json`(t_144543dc) chrome_available=true·authenticated=true. 캡처 시점에도
  `/json/version` UA가 비-headless 정품임을 스크립트가 가드(HeadlessChrome UA이면 즉시 거부).
- **인증 판정(캡처 실측)**: sign-in 리다이렉트 없음, `__session`+`__session_FQWayshe` 가시
  (cookie_len 3462), title `사용량 • Higgsfield`, 한국어 usage 마커 3/3
  (`총 비용`, `사용한 크레딧`, `총 생성 수`), 실계정 데이터 `US$0.505 / 12.62 / 5 / 7` + 실제 거래 행.
- **산출물**:
  - `screenshot.png` — fullPage(captureBeyondViewport, clip=cssContentSize) 1425×1155.
    페이지 콘텐츠 크기 자체가 1425(세로 스크롤바 15px 거터 때문에 뷰포트 1440보다 narrow).
    전 페이지 비교 시 **폭 1425를 기준**으로 쓸 것.
  - `viewport.png` — 1440×900 온더폴드 참조.
  - `styles.json` — 430개 가시 요소의 flat walk. 스키마는 t_38d43cc9
    (`hf_image_surface_ground_truth.json`)과 동일: selector/tag/id/classes/rect/text/attrs/styles/depth
    + 상단 메타(url/final_href/title/auth_verdict/page_scroll/content_size/ua/cookie…).
    기본값(none/normal/auto/0px/rgba(0,0,0,0))은 선례대로 생략(pruning) —
    `color/fontSize/fontFamily`은 430/430, 그 외 실측 비기본값만 기록(backgroundColor 37, padding 134 등).
  - rect가 뷰포트 우측(1440)을 넘는 요소(max 우측변 2086)가 존재 — 조상 overflow-hidden으로
    화면 밖 렌더. fullPage 스크린샷(폭 1425)에는 안 보인다. geometry 비교 시 이 사실 유념.
- **교차 검증**: 측정 rect 총비용 span(x529 y217 68×18) 위치의 crop에 카드 bg (28,30,32) 위에
  라벨 색 (137,138,139) 계열 안티앨리어싱 픽셀 실재 → 기하와 렌더가 상호 정합.
  스크린샷 10,137 distinct colors → blank 아님. 스크린샷 크기 == content_size → fullPage 완전 캡처.
- **하네스**: `../captures/usage_ground_truth_harvest.py` (websockets 15.0.1, python3.14;
  websockets는 Origin 헤더를 안 보내므로 --remote-allow-origins 없는 크롬에도 악수 101).
