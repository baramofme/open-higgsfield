# OpenHiggsfield Design System — 컴포넌트 카탈로그

> **Storybook**: [ds.mezeet.com](https://ds.mezeet.com)
> **소스**: `src/openhiggsfield/` · CSS: `src/openhiggsfield/openhiggsfield.css`

---

## 토큰 스코프·포탈 규약

디자인 시스템의 모든 커스텀 프로퍼티는 `.ohf` 스코프 클래스에서 정의된다 (`:root` 아님). 스토리는 `.storybook/preview.ts`의 글로벌 데코레이터가 `.ohf`로 감싼다.

**포탈 컴포넌트**(Modal·Dialog·Lightbox·MoreMenu `floating`)는 DOM 트리를 탈출해 `document.body`로 이동한다. 데코레이터 밖에서는 토큰이 풀리지 않으므로, `preview.ts`가 `document.body.classList.add("ohf")`로 미러한다. 포탈 컴포넌트를 문서화할 때 이 정합성 전제 조건을 반드시 기술한다.

---

## 원시 컨트롤 (5종)

원시 컨트롤은 프레젠테이셔널이며 카탈로그와 스토어에 종속되지 않는다. 스토리 파일: `component-primitives.stories.tsx`.

### Field — `ui.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `label` | `string` | 필드 레이블 (항상 필수) |
| `value` | `string?` | 레이블 오른쪽에 값 행을 렌더. 생략 시 레이블만 |
| `children` | `ReactNode` | 컨트롤 본문 |

토큰: `--tx` (레이블·값), `--tx2`, `--tx3` (보조 레이블), `--line`.
CSS 클래스: `.ohf-field`, `.ohf-field-label`, `.ohf-field-row`, `.ohf-field-value`.

---

### OptionList — `ui.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `options` | `readonly { value; label }[]` | 카탈로그 enum의 값 목록 |
| `value` | `string` | 현재 선택된 값 |
| `onChange` | `(next: string) => void` | 선택 변경 핸들러 |
| `ratio` | `boolean?` | `true`면 각 행에 종횡비 글리프 상자를 예약 |

열 스크롤 시 현재값이 화면에 들어오도록 `useLayoutEffect`로 자동 스크롤한다.
토큰: `--tx`, `--tx2`, `--accent` (선택 링), `--s1`, `--line`.
CSS 클래스: `.ohf-opts`, `.ohf-scroll`, `.ohf-opt`, `.ohf-opt-label`.

---

### Slider — `ui.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `min` | `number` | 최소값 |
| `max` | `number` | 최대값 |
| `step` | `number?` (기본 1) | 단계 |
| `value` | `number` | 현재값 |
| `onChange` | `(next: number) => void` | 변경 핸들러 |
| `label` | `string` | `aria-label`로 바인딩 |

`--fill` 커스텀 프로퍼티로 채움 비율을 CSS에 전달한다.
토큰: `--accent` (채움), `--s1` (트랙).
CSS 클래스: `.ohf-slider`.

---

### SettingPill — `settings.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `model` | `ModelEntry` | 카탈로그 모델 항목 |
| `settingKey` | `string` | `model.settings`의 키 |
| `values` | `Record<string, unknown>` | 현재 설정값 맵 |
| `open` | `boolean` | 팝오버 열림 여부 (`aria-expanded`로 바인딩) |
| `onOpen` | `(trigger: HTMLElement) => void` | 팝오버 트리거 핸들러 |
| `cinema` | `boolean?` (기본 `false`) | 시네마 모드 글리프 전환 |

카탈로그에 없는 키면 `null`을 반환한다. 불리언 설정은 아리아-프레스드 토글 버튼으로, 나머지는 팝오버 트리거 버튼으로 렌더한다.
토큰: `--tx`, `--tx2`, `--accent` (활성 플래그), `--s1`, `--line`.
CSS 클래스: `.ohf-ctl`, `.ohf-ctl--flag`, `.ohf-ctl-glyph`, `.ohf-ctl-value`, `.ohf-tip`.
**의존**: `useSettings` 스토어, 카탈로그 `ModelEntry.settings`.

---

### SettingPopover — `settings.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `model` | `ModelEntry` | 카탈로그 모델 항목 |
| `settingKey` | `string` | 팝오버가 표시할 설정 키 |
| `values` | `Record<string, unknown>` | 현재 설정값 맵 |

enum 설정은 OptionList, range 설정은 Slider로 렌더한다.
토큰: `--tx`, `--tx2`, `--accent`, `--line`.
**의존**: `useSettings` 스토어, 카탈로그 설정 타입.

---

## 아이콘 (93종 통합 시트)

스토리 파일: `component-icons.stories.tsx` — 시트 1개.

모든 아이콘은 옵션 `size` 또는 `SVGProps` 백을 받는다. 시트는 인자 없이 `React.createElement`로 렌더하고 export명으로 라벨한다.

| 모듈 | 파일 | 갯수 |
|---|---|---|
| App icons | `icons.tsx` | 60 |
| Cinema icons | `cinema-icons.tsx` | 16 |
| Asset glyphs | `asset-icons.tsx` | 16 |
| Model icon | `model-icon.tsx` (ModelIcon) | 1 |

### ModelIcon — `model-icon.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `modelId` | `string` | 카탈로그 모델 ID → 브랜드 파일 resolve |
| `size` | `number?` (기본 16) | 렌더 크기 |
| `className` | `string?` (기본 `"ohf-model-icon"`) | CSS 클래스 |

---

## 기능 컨트롤 (18종)

스토리 파일: `component-features-controls.stories.tsx`.

---

### CameraWheel — `cinema-popover.tsx`

무한 드럼 휠. 카메·렌즈·조리개 3개 드럼이 같은 지오메트리를 공유한다.

| prop | 타입 | 설명 |
|---|---|---|
| `items` | `readonly T[]` | 드럼 항목 목록 (제너릭 `T extends string`) |
| `value` | `T` | 현재 선택된 값 |
| `onChange` | `(next: T) => void` | 선택 변경 핸들러 |
| `label` | `string` | `aria-label` |
| `art` | `Partial<Record<string, string>>?` | 선택별 커버 이미지 맵 |

마우스휠·드래그·호버 화살표로 회전한다. 120px 스텝, 사이클릭 오프셋.
토큰: `--tx`, `--accent` (선택 링), `--s1`, `--line`.

---

### CharacterPopover — `cinema-popover.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `onClose` | `() => void` | 닫기 핸들러 |

캐릭터 학습 흐름은 화면 미러만 존재 — 행은 `data-off`로 비활성.
토큰: `--tx`, `--tx2`, `--tx3`, `--s1`, `--line`, `--tx-off`.
CSS 클래스: `.ohf-popover--cinema`, `.ohf-cinema-pop-head`, `.ohf-cinema-pop-row`.
**의존**: `useElements`·`useProjects` 스토어(빈 스토어에서 빈 상태).

---

### LightingPopover — `lighting-popover.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `onClose` | `() => void` | 닫기 핸들러 |

조명 그리드. 기본 정렬/이름 정렬 전환, 검색, 저장 프리셋, 궤도 편집기.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--line`.
**의존**: `usePromptTokens` 스토어, `LIGHT_COMPOSITIONS` 데이터.

---

### CameraMovementPanel — `camera-movement-panel.tsx`

**props 없음** — 순수 스토어 리더(`useCamera`).

| prop | 타입 | 설명 |
|---|---|---|
| — | — | 없음 |

토큰: `--tx`, `--tx2`, `--s1`, `--line`.
**의존**: `useCamera` 스토어, `MOVEMENT_PRESETS` 데이터.

---

### DirectorSettings — `director-settings.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `onExit` | `() => void` | 설정판을 빠져나가는 핸들러 |

전화면 설정 서피스. 로컬 LLM 엔드포인트·모델·ctx 설정.
토큰: `--tx`, `--tx2`, `--tx3`, `--s1`, `--s2`, `--line`, `--danger`, `--accent`.
CSS 클래스: `.ohf-ds-*`.
**의존**: `useDirector` 스토어.

---

### ReferenceFilmButton — `reference-film-popover.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `open` | `boolean` | 다이얼로그 열림 여부 |
| `onOpen` | `() => void` | 열기 핸들러 |

컴포저의 필름 버튼.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--line`.

---

### ReferenceUseNextPopover — `reference-use-next.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `currentRole` | `MediaRole \| undefined` | 현재 역할(링 표시) |
| `onPick` | `(role: MediaRole) => void` | 역할 변경 핸들러 |
| `onClose` | `() => void` | 닫기 핸들러 |

역할 재설정("초기화" 버튼).
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--line`.
CSS 클래스: `.ohf-ref-next-pop`.
**의존**: `MediaRole` 타입 (카탈로그).

---

### CinemaTiles — `cinema-popover.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `characterOpen` | `boolean` | 캐릭터 팝오버 열림 |
| `cameraOpen` | `boolean` | 카메라 팝오버 열림 |
| `onCharacter` | `() => void` | 캐릭터 열기 핸들러 |
| `onCamera` | `() => void` | 카메라 열기 핸들러 |

시네마 화면의 두 버튼.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--line`.

---

### PromptOptimizeButton — `prompt-optimize-button.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `surface` | `Surface` (`"image" \| "video"`) | 프롬프트 스토어 선택 |
| `onError` | `(message: string \| null) => void` | 실패 메시지 핸들러 |
| `disabled` | `boolean` | 비활성 여부 |

빈 프롬프트에서 자동 비활성.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--line`.
**의존**: `useImagePrompt`·`useVideoPrompt` 스토어, `optimizePromptDraft` 서버 액션.

---

### ModelPicker — `model-picker.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `selectedId` | `string` | 현재 선택된 모델 ID |
| `surface` | `Surface` | surface 필터 (`MODELS.filter`) |
| `onPick` | `(model: ModelEntry) => void` | 모델 선택 핸들러 |
| `onClose` | `() => void` | 닫기 핸들러 |

검색 입력 자동 포커스. 모델명·ID·description 검색.
토큰: `--tx`, `--tx2`, `--accent` (선택 체크), `--s1`, `--s2`, `--line`, `--tx-off`.
CSS 클래스: `.ohf-mp-*`.
**의존**: `MODELS` 카탈로그, `ModelIcon`, `swatchFor`.

---

### PromptTint — `prompt-tint.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `text` | `string` | 프롬프트 텍스트 |
| `namedNames` | `string[]` | 치핑 대상 명명된 이름 |
| `trackRef` | `React.RefObject<HTMLTextAreaElement \| null>` | 스크롤 동기화 대상 textarea |

textarea 위로 컬러 칩 미러를 포탈 없이 렌더한다. 스크롤은 `requestAnimationFrame`으로 동기화한다.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`.
CSS 클래스: `.ohf-tint-*`.
**의존**: `tokenizeForTint` 함수 (`media-mention.tsx`).

---

### MentionMenu — `mention-menu.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `options` | `MentionOption[]` | 후보 목록 |
| `activeIndex` | `number` | 키보드 활성 인덱스 |
| `onPick` | `(option: MentionOption) => void` | 선택 핸들러 |
| `onHover` | `(index: number) => void` | 호버 인덱스 변경 핸들러 |

빈 후보에서 "이 프로젝트에 참조할 이미지가 없어요" 안내를 렌더한다.
토큰: `--tx`, `--tx2`, `--s1`, `--line`, `--tx-off`.
CSS 클래스: `.ohf-popover--mention`, `.ohf-el-empty`, `.ohf-el-hint`.

---

### MoreMenu — `context-menu.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `items` | `MenuItem[]` | 메뉴 항목 배열 |
| `label` | `string?` (기본 `"More actions"`) | `aria-label` |
| `align` | `"start" \| "end"?` (기본 `"end"`) | 패널 정렬 |
| `className` | `string?` | 추가 CSS 클래스 |
| `floating` | `boolean?` (기본 `false`) | `true`면 viewport 좌표 고정 포탈 |

**포탈**: `floating`=true → `.ohf` 또는 `document.body`에 포탈. 토큰 정합성 위해 `.ohf` 스코프 필요.
토큰: `--tx`, `--tx2`, `--tx3`, `--s1`, `--s2`, `--line`, `--shadow-3`, `--danger`, `--danger-bg`, `--danger-line`.
CSS 클래스: `.ohf-more`, `.ohf-more-panel`, `.ohf-more-item`, `.ohf-more-item--danger`, `.ohf-more-sub`.
**의존**: `MenuItem` 타입, `createPortal`.

---

### EditToolsCard — `edit-showcase.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `onOpenExpandCrop` | `(() => void)?` | 확장-자르기 편집기 열기 (선택) |

편집 도구 카드.
토큰: `--tx`, `--tx2`, `--s1`, `--line`.

---

### EditShowcase — `edit-showcase.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `url` | `string` | 편집 대상 이미지 URL |
| `aspect` | `number` | 이미지 종횡비 |
| `modelLabel` | `string?` (기본 `"Krea 2 Turbo"`) | inpaint 모델 라벨 |
| `onInpaint` | `((image, prompt) => void)?` | inpaint 실행 핸들러 |
| `busy` | `boolean?` | 로딩 중 |
| `status` | `string?` | 상태 메시지 |

선택은 피겨 정규화 좌표(0..1)에서 관리. 7개 도구(select·hand·region·lasso·pen·eraser·shapes).
토큰: `--tx`, `--tx2`, `--accent` (선택), `--s1`, `--s2`, `--line`, `--danger`.
CSS 클래스: `.ohf-es-*`.

---

### KeyModal — `key-modal.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `configured` | `boolean` | 키 설정 여부 (제목 분기) |
| `onClose` | `() => void` | 닫기 핸들러 |
| `onSaved` | `() => void` | 저장 성공 핸들러 |
| `onCleared` | `() => void` | 삭제 성공 핸들러 |

**포탈**: `<dialog>` 요소 — 브라우저 모달 레이어. `.ohf` 스코프 정합성 전제.
토큰: `--tx`, `--tx2`, `--tx3`, `--s1`, `--s2`, `--line`, `--danger`, `--danger-bg`.
**의존**: `savePlatformCredentials`·`clearPlatformCredentials` 서버 액션.

---

### FailureModal — `failure-modal.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `record` | `RunRecord \| null` | 실패 레코드 (null → 제네릭 메시지) |
| `onClose` | `() => void` | 닫기 핸들러 |

**포탈**: `<dialog>` 요소. 오류 텍스트 복사 버튼.
토큰: `--tx`, `--tx2`, `--tx3`, `--s1`, `--s2`, `--line`, `--danger`, `--danger-bg`.
**의존**: `RunRecord` 타입 (`history.tsx`).

---

### ProjectDialog — `project-dialog.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `onClose` | `() => void` | 닫기 핸들러 |
| `onCreate` | `(name: string, isPrivate: boolean) => void` | 생성 핸들러 |

이름 필드 자동 포커스.
토큰: `--tx`, `--tx2`, `--tx3`, `--s1`, `--s2`, `--line`, `--accent`.
CSS 클래스: `.ohf-np-root`, `.ohf-np-catcher`, `.ohf-np-card`.

---

## 기능 서피스·오버레이 (14종)

스토리 파일: `component-features-dialogs.stories.tsx`.

---

### CameraDialog — `camera-dialog.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `onClose` | `() => void` | 닫기 핸들러 |
| `onAddMovement` | `(name: string) => void` | 무브먼트 추가 핸들러 |
| `initialTab` | `"settings" \| "movement"?` (기본 `"settings"`) | 시작 탭 |

**포탈**: body로 포탈. `.ohf` body 미러 필요.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--s2`, `--line`, `--shadow-3`.
**의존**: `useCamera` 스토어, `CameraWheel`, `MOVEMENT_PRESETS`.

---

### ReferenceFilmDialog — `reference-film-popover.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `onClose` | `() => void` | 닫기 핸들러 |

**포탈**: body로 포탈. 프롬프트 토큰 스토어에서 검색.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--s2`, `--line`, `--shadow-3`.
**의존**: `usePromptTokens` 스토어, `REFERENCE_FILM_OVERLAY` 상수.

---

### CropTool — `crop-tool.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `url` | `string` | 자를 이미지/비디오 URL |
| `kind` | `AssetKind` (`"image" \| "video"`) | 미디어 종류 |
| `onClose` | `() => void` | 닫기 핸들러 |
| `onApply` | `(croppedUrl: string) => void` | 자르기 결과 핸들러 |

**포탈**: 자르기 스테이지를 body에 포탈.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--s2`, `--line`, `--shadow-3`.

---

### ExpandCropEditor — `expand-crop.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `url` | `string` | 확장/자르기 대상 URL |
| `onOutpaint` | `((image, pads, prompt) => void)?` | cfwui 아웃페인트 경로 |
| `onApplyCrop` | `((image) => void)?` | 로컬 자르기 |
| `busy` | `boolean?` | 로딩 중 |
| `status` | `string?` | 상태 메시지 |
| `onBack` | `() => void` | 기본 편집기로 돌아가기 |
| `onClose` | `() => void` | 닫기 핸들러 |

**포탈**: body.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--s2`, `--line`, `--shadow-3`.

---

### InpaintPanel — `inpaint-panel.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `src` | `string` | 원본 이미지 소스 |
| `busy` | `boolean` | 실행 중 |
| `status` | `string?` | 상태 메시지 |
| `onInpaint` | `(image: string, prompt: string) => void` | 실행 핸들러 |

MaskEditor 브러시 도구를 감싼다.
토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--s2`, `--line`.
**의존**: `MaskEditorCanvas`, `toMask`, `loadImage`.

---

### PreviewLightbox — `preview-lightbox.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `url` | `string` | 미디어 URL |
| `kind` | `AssetKind` | `"image"` | `"video"` | `"audio"` |
| `onClose` | `() => void` | 닫기 핸들러 |

**포탈**: `createPortal(…, document.body)` — 명시적. `.ohf` body 미러 필수.
토큰: `--tx`, `--tx2`, `--shadow-3`, `--plate`, `--line`.
CSS 클래스: `.ohf-v2-scrim`, `.ohf-v2-lightbox`.
**의존**: `toProxyImageUrl` (image proxy).

---

### AssetPicker — `asset-picker.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `model` | `ModelEntry` | 카탈로그 모델 (role cap 결정) |
| `items` | `MediaItem[]` | 현재 surface의 첨부 항목 |
| `uploads` | `UploadRecord[]` | 업로드 기록 |
| `history` | `RunRecord[]` | 생성 히스토리 |
| `staged` | `string \| null` | 마지막 업로드 URL |
| `uploading` | `boolean` | 업로드 중 |
| `initialTab` | `"library" \| "history"?` | 시작 탭 |
| `initialRole` | `MediaRole?` | 초기 선택 역할 |
| `onUpload` | `(file: File) => Promise<string>` | 업로드 핸들러 |
| `onApply` | `(items: MediaItem[]) => void` | 적용 핸들러 |
| `onForget` | `(url: string) => void` | 삭제 핸들러 |
| `onClose` | `() => void` | 닫기 핸들러 |

**포탈**: body로 포탈.
토큰: `--tx`, `--tx2`, `--tx3`, `--accent`, `--s1`, `--s2`, `--line`, `--shadow-3`, `--tx-off`.
**의존**: `useElements`·`useProjects` 스토어, `referencePolicyFor` 카탈로그 함수.

---

### AssetSidebar — `asset-sidebar.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `counts` | `SidebarCounts` | 항목별 카운트 |
| `scope` | `AssetScope` | 활성 스코프 |
| `onSelect` | `(scope: AssetScope) => void` | 선택 핸들러 |

HF `/asset/all` 좌측 레일 미러.
토큰: `--tx`, `--tx2`, `--tx3`, `--accent`, `--s1`, `--s2`, `--line`, `--tx-off`.
CSS 클래스: `.ohf-as-*`.
**의존**: `AssetScope` 타입, `SidebarCounts` 타입.

---

### ElementForm — `element-form.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `editing` | `ElementItem?` | 편집 대상 (생성 시 undefined) |
| `nameHint` | `string?` | 새 항목명 초기값 힌트 |
| `projectId` | `string` | 소속 프로젝트 ID |
| `trayItems` | `MediaItem[]` | 드래그 가능한 첨부 항목 |
| `onClose` | `() => void` | 닫기 핸들러 |
| `onSave` | `(item: ElementItem) => void` | 저장 핸들러 |

이름 필드 자동 포커스.
토큰: `--tx`, `--tx2`, `--tx3`, `--accent`, `--s1`, `--line`, `--danger`.
**의존**: `ElementItem` 타입 (`elements` 스토어), `MediaItem` 타입.

---

### ElementPopover — `element-popover.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `trayItems` | `MediaItem[]` | 첨부 항목 (요소 추가 소스) |
| `mode` | `string` (`"general"` \| `"cinema"`) | 프로젝트 필터 모드 |
| `onMention` | `(name: string) => void` | @멘션 핸들러 |
| `onClose` | `() => void` | 닫기 핸들러 |

**의존**: `useElements`·`useProjects` 스토어.

---

### MediaStrip — `media-tray.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `model` | `ModelEntry` | 카탈로그 모델 (tray 비면 `null`) |

**의존**: `useImageMedia`·`useVideoMedia` 스토어, `rolesOf`, `ROLE_LABELS`.

---

### StripTile — `media-tray.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `item` | `MediaItem` | 단일 첨부 항목 |

토큰: `--tx`, `--tx2`, `--s1`, `--line`.

---

### SelectionBar — `selection-bar.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `records` | `RunRecord[]` | 선택된 레코드 |
| `saving` | `SaveProgress \| null` | 저장 진행도 |
| `menuActions` | `TileMenuActions` | ⋯ 메뉴 액션백 |
| `onOpen` | `(id: string) => void` | 열기 |
| `onReuse` | `(record: RunRecord) => void` | 재사용 |
| `onDownload` | `(records: RunRecord[]) => void` | 일괄 다운로드 |
| `onFavorite` | `(records: RunRecord[]) => void` | 일괄 즐겨찾기 |
| `onDelete` | `(records: RunRecord[]) => void` | 일괄 삭제 |
| `onAddToFolder` | `() => void` | 폴더 추가 |
| `onClose` | `() => void` | 해제 |

토큰: `--tx`, `--tx2`, `--accent`, `--s1`, `--s2`, `--line`, `--danger`, `--shadow-3`.
**의존**: `SaveProgress`·`TileMenuActions` 타입, `buildSelectionMenu`, `MoreMenu`.

---

### CinemaTileView — `cinema-tile-view.tsx`

| prop | 타입 | 설명 |
|---|---|---|
| `view` | `CinemaView` | 그리드 종류 (`"generations"` \| `"elements"` \| `"favorites"`) |
| `history` | `RunRecord[]` | 생성 기록 |
| `onOpenRun` | `((id: string) => void)?` | 완료 실행 열기 |
| `onShowFailure` | `((id: string) => void)?` | 실패 열기 |
| `onOpenElement` | `((element: ElementItem) => void)?` | 요소 열기 |

빈 상태에서 "아직 아무것도 없어요" 안내를 렌더한다.
토큰: `--tx`, `--tx2`, `--tx3`, `--accent`, `--s1`, `--s2`, `--line`, `--tx-off`.
CSS 클래스: `.ohf-cine-tile-*`.
**의존**: `CinemaView` 타입 (`project-surface`), `useElements` 스토어, `RunRecord` 타입, `toProxyImageUrl`.

**분류**: 인벤토리의 `feature_reusable_32`와 `excluded_screen_composite` 양쪽에 동재. 등록 타깃(재사용 32종)에 포함되었으므로 기능 컴포넌트로 문서화. 서술 관점: 재사용 가능한 뷰 라우터.

---

## 스토리 파일 요약

| 파일 | 스토리 | 등재 분류 |
|---|---|---|
| `design-system.stories.tsx` | Palette, Surfaces, Elevation, Type, Easing, Controls, AccentRoles | 토큰/CSS 스와치 (기존) |
| `component-primitives.stories.tsx` | Field (2), OptionList, Slider, SettingPill, SettingPopover | 원시 컨트롤 6 스토리 |
| `component-icons.stories.tsx` | Icon_Sheet (1) | 통합 시트 — 93 글리프 + ModelIcon |
| `component-features-controls.stories.tsx` | CameraWheel → ProjectDialog | 18 스토리 |
| `component-features-dialogs.stories.tsx` | CameraDialog → CinemaTileView | 14 스토리 |

**storybook-static/index.json**: story 46종.

---

## 미등재 (화면·합성 19종)

ruling에 따라 화면/합성 컴포넌트는 단독 디자인 시스템 스토리에서 제외되었다(문서화만). 등재 제외 19종:

`CinemaHomeContent` · `CinemaProjectPanels` · `CinemaSidebar` · `CinemaStudioScreen` · `Composer` · `FeedHeader` · `FeedShowcase` · `Gallery` · `GeneralCreateTabs` · `ImageWorkspace` · `OpenHiggsfieldApp` · `ProjectScreen` · `Topbar` · `VideoEdit` · `Viewer` · 기타 스크린 레벨 컴포넌트.

이들은 앱 화면 루트이며 디자인 시스템 스토리로 단독 등록되지 않는다.
