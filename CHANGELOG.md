# CHANGELOG

## 2026-11-07 — 디자인 시스템 페이지 스토리 등록 (t_2b604ef2 → t_16154220)

### 추가

**페이지 서브트리 (`Pages/`, DS 원자 컴포넌트와 분리된 최상위 폴더)**
- `ProjectScreen` 페이지 스토리 5종 (`project-screen.stories.tsx`):
  `Default` (모달 open/close + 채팅 전송 + 디렉터 MSW 왕복) · `Loading` (설정 판
  `모델 조회` 지연 → `조회 중…` → 목업 모델 3종 등장) · `ErrorState` (`조회 실패 (502)`
  alert + `/v1/models` 재-조회 실재 재호출) · `ChatSendPending` (디렉터 전송 `전송 중…`
  + 입력 잠금) · `DirectorSendError` (인라인 `호출 실패 (502)` role=alert). `layout: fullscreen`.

**페이지 스토리 인프라 (`story-mocks/`)**
- mock state provider (`mock-state.tsx`) — zustand singletons(`useProjects`·`useDirector`)를
  데코레이터에서 동기 시드 + 언마운트 스냅샷 복원(스토리 간 격리).
- MSW (`handlers.ts`·`browser.ts`) — `https://mock.director.local` 정확 오리진 매칭,
  canned/실패(502)/지연 핸들러. `preview.ts`에 `mswLoader` + `staticDirs:[../public]` 배선.

### 교정
- React 19 controlled input에 instrumented `userEvent.type` 미전파 → native value setter
  + `input` 이벤트 패턴으로 교체. click 전 `waitFor(enabled)`로 commit 대기.

## 2026-11-06 — 디자인 시스템 컴포넌트 등록 (t_1cd84599 → t_3cdc61ce)

### 추가

**원시 컨트롤 (5종)**
- `Field` (`ui.tsx`) — 레이블 + 값 행, 자식 컨트롤 슬롯
- `OptionList` (`ui.tsx`) — 열 스크롤 옵션 리스트, 종횡비 글리프
- `Slider` (`ui.tsx`) — 범위 입력, `--fill` 커스텀 프로퍼티
- `SettingPill` (`settings.tsx`) — 카탈로그 설정 토글/팝오버 트리거
- `SettingPopover` (`settings.tsx`) — enum·range 값 패널

**아이콘 (93종 통합 시트 1개)**
- `icons.tsx` 60종 + `cinema-icons.tsx` 16종 + `asset-icons.tsx` 16종 + `model-icon.tsx` ModelIcon 1종
  스토리북 단독 시트로 통합 렌더. 각 글리프 옵션 `size`·`SVGProps` 받음.

**기능 컨트롤 (18종)**
- `CameraWheel` · `CharacterPopover` · `CinemaTiles` (`cinema-popover.tsx`)
- `LightingPopover` (`lighting-popover.tsx`)
- `CameraMovementPanel` (`camera-movement-panel.tsx`)
- `DirectorSettings` (`director-settings.tsx`)
- `ReferenceFilmButton` · `ReferenceFilmDialog` (`reference-film-popover.tsx`)
- `ReferenceUseNextPopover` (`reference-use-next.tsx`)
- `PromptOptimizeButton` (`prompt-optimize-button.tsx`)
- `ModelPicker` (`model-picker.tsx`)
- `PromptTint` (`prompt-tint.tsx`)
- `MentionMenu` (`mention-menu.tsx`)
- `MoreMenu` (`context-menu.tsx`)
- `EditToolsCard` · `EditShowcase` (`edit-showcase.tsx`)
- `KeyModal` (`key-modal.tsx`)
- `FailureModal` (`failure-modal.tsx`)
- `ProjectDialog` (`project-dialog.tsx`)

**기능 서피스·오버레이 (14종)**
- `CameraDialog` (`camera-dialog.tsx`)
- `ReferenceFilmDialog` (`reference-film-popover.tsx`)
- `CropTool` (`crop-tool.tsx`)
- `ExpandCropEditor` (`expand-crop.tsx`)
- `InpaintPanel` (`inpaint-panel.tsx`)
- `PreviewLightbox` (`preview-lightbox.tsx`)
- `AssetPicker` (`asset-picker.tsx`)
- `AssetSidebar` (`asset-sidebar.tsx`)
- `ElementForm` (`element-form.tsx`)
- `ElementPopover` (`element-popover.tsx`)
- `MediaStrip` · `StripTile` (`media-tray.tsx`)
- `SelectionBar` (`selection-bar.tsx`)
- `CinemaTileView` (`cinema-tile-view.tsx`)

### 변경

- `.storybook/preview.ts`: `document.body.classList.add("ohf")` 미러 추가 (포탈 토큰 정합성)
- `.storybook/main.ts`: 스토리 경로 glob 패턴에 `component-*.stories.tsx` 추가

### 결정 사항

- `CinemaTileView` 분류: 인벤토리에서 `feature_reusable_32`와 `excluded_screen_composite` 양쪽에 동재. 등록 타깃(재사용 32종) 포함 결정 → 기능 스토리로 등록. 재사용 뷰 라우터로 서술.
- 포탈 컴포넌트 토큰 정합성: 토큰이 `.ohf` 전용이므로 `preview.ts`가 `document.body`에 `.ohf`를 미러. 모든 포탈 오버레이 문서화 시 이 전제 조건을 기술.
- 스토리 export명을 import 컴포넌트명과 동명이지 않게 분리 (TS2395/TS2440 회피).
- screen-composite 19종: ruling대로 단독 DS 스토리에서 제외. 문서화만 유지.

### 검증

- `tsc -p tsconfig.json` EXIT=0 (진단 0)
- `pnpm build-storybook` EXIT=0
- `storybook-static/index.json` 46 스토리 등재 확인

### 관련 커밋

`bb576ce` (`wt/t_1cd84599` 브랜치)

---

## 2026-11-06 — 디자인 시스템 서빙 구축 (t_5597c96b → t_a41b65c1)

Storybook 10 정적 빌드를 Dokploy + Traefik으로 서빙. `ds.mezeet.com` 공개 URL.

- `~/designsystem-ohf` 정적 빌드 산출
- 재부팅 안전 서빙: Dokploy nginx:alpine + Traefik 라우터
- 확인: localhost·tailscale·LAN·공개 Internet 모두 200

---

## 2026-11-06 — 디자인 시스템 초기 구축 (t_5597c96b)

Storybook 10으로 OHF 스코프 디자인 시스템 구축.
- 7 토큰/CSS 스와치 스토리: Palette, Surfaces, Elevation, Type, Easing, Controls, AccentRoles
- `.ohf` 데코레이터, `.storybook/preview.ts` 스코프 래퍼
