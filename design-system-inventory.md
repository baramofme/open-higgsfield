# 디자인 시스템 컴포넌트 인벤토리 (t_33de1666)

생성: 2026-11-06T14:33:35.575Z  ·  total exported React components = **149**

## 디자인 시스템 현재 레지스트리

서빙: `~/designsystem-ohf (Storybook 10 static, ds.mezeet.com)` (source: `src/openhiggsfield/design-system.stories.tsx`)

기존 스토리 (전부 토큰/CSS 스와치 — **React 컴포넌트 스토리 0개**):

- Design System / Palette
- Design System / Surfaces
- Design System / Elevation
- Design System / Type
- Design System / Easing
- Design System / Controls
- Design System / Accent Roles
- (newer lineages) Design System / Gallery

> 검증: `index.json` 7개 항목 = 토큰 스토리뿐. 스토리 파일에 app 컴포넌트 import 없음. → **모든 `src/openhiggsfield` 컴포넌트가 미등록**.
> 디자인 토큰(.ohf custom properties)은 이미 등록됨 — 토큰 공백 없음.

## 분류 규칙 (오케스트레이터 ruling)

- **primitive-icon / primitive-control / feature-reusable** → 디자인 시스템 등록 **타깃** (재사용 컴포넌트 계층).
- **screen-composite** (앱 화면·합성 루트) → 문서화하되 **단독 DS 스토리 제외** (DS 원자가 아니라 페이지 surfaces).
- 아이콘 93종은 개별 스토리 93개가 아니라 **통합 아이콘 시트 1개 스토리**로 등록 권장.

### Tier breakdown

| Tier | Count | Reg. target? |
|---|---|---|
| primitive-icon | 93 | YES |
| feature-reusable | 32 | YES |
| screen-composite | 19 | no |
| primitive-control | 5 | YES |

## A. 등록 타깃 컴포넌트 (130)

| Component | File:line | Category | DS status | Reg. target | #importers |
|---|---|---|---|---|---|
| `Field` | ui.tsx:9 | Control primitive (field/option/slider/pill/popover) | not-in-DS | YES | 2 |
| `OptionList` | ui.tsx:74 | Control primitive (field/option/slider/pill/popover) | not-in-DS | YES | 3 |
| `SettingPill` | settings.tsx:50 | Control primitive (field/option/slider/pill/popover) | not-in-DS | YES | 1 |
| `SettingPopover` | settings.tsx:115 | Control primitive (field/option/slider/pill/popover) | not-in-DS | YES | 1 |
| `Slider` | ui.tsx:115 | Control primitive (field/option/slider/pill/popover) | not-in-DS | YES | 2 |

### Feature-level (reusable widgets)

| Component | File:line | Category | DS status | Reg. target | #importers |
|---|---|---|---|---|---|
| `AssetPicker` | asset-picker.tsx:113 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 2 |
| `AssetSidebar` | asset-sidebar.tsx:187 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `CameraDialog` | camera-dialog.tsx:104 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `CameraMovementPanel` | camera-movement-panel.tsx:90 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `CameraWheel` | cinema-popover.tsx:62 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `CharacterPopover` | cinema-popover.tsx:18 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `CinemaTiles` | cinema-popover.tsx:251 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `CinemaTileView` | cinema-tile-view.tsx:115 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `CropTool` | crop-tool.tsx:18 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `DirectorSettings` | director-settings.tsx:22 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `EditShowcase` | edit-showcase.tsx:21 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `EditToolsCard` | edit-showcase.tsx:497 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `ElementForm` | element-form.tsx:33 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 2 |
| `ElementPopover` | element-popover.tsx:16 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `ExpandCropEditor` | expand-crop.tsx:96 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `FailureModal` | failure-modal.tsx:79 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `InpaintPanel` | inpaint-panel.tsx:10 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 0 |
| `KeyModal` | key-modal.tsx:9 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `LightingPopover` | lighting-popover.tsx:89 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `MediaStrip` | media-tray.tsx:378 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 2 |
| `MentionMenu` | mention-menu.tsx:10 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `ModelPicker` | model-picker.tsx:14 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `MoreMenu` | context-menu.tsx:26 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 3 |
| `PreviewLightbox` | preview-lightbox.tsx:11 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `ProjectDialog` | project-dialog.tsx:20 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 2 |
| `PromptOptimizeButton` | prompt-optimize-button.tsx:28 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `PromptTint` | prompt-tint.tsx:12 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 2 |
| `ReferenceFilmButton` | reference-film-popover.tsx:79 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `ReferenceFilmDialog` | reference-film-popover.tsx:445 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `ReferenceUseNextPopover` | reference-use-next.tsx:39 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `SelectionBar` | selection-bar.tsx:39 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 1 |
| `StripTile` | media-tray.tsx:257 | Feature-level reusable widget (popover/dialog/panel/picker/bar/button) | not-in-DS | YES | 0 |

### Icon / glyph library (93 → 통합 시트 권장)

| Component | File:line | Category | DS status | Reg. target | #importers |
|---|---|---|---|---|---|
| `AddGlyph` | asset-icons.tsx:67 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ApertureIcon` | icons.tsx:350 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ArrowRightIcon` | icons.tsx:135 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ArrowUpIcon` | icons.tsx:276 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `AspectIcon` | cinema-icons.tsx:68 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `AssetsIcon` | icons.tsx:55 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `AssignGlyph` | asset-icons.tsx:59 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `AudioIcon` | cinema-icons.tsx:80 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 5 |
| `AudioIcon` | icons.tsx:41 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 5 |
| `BatchMinusIcon` | cinema-icons.tsx:86 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `BatchPlusIcon` | cinema-icons.tsx:92 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `CameraIcon` | icons.tsx:433 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `CamMoveIcon` | cinema-icons.tsx:38 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `CaretDownIcon` | icons.tsx:74 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `CheckIcon` | icons.tsx:90 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 6 |
| `ChevronIcon` | icons.tsx:412 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `ChevronLeftIcon` | icons.tsx:160 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 4 |
| `ChevronRightIcon` | icons.tsx:152 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `CinematicIcon` | icons.tsx:400 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `ClapperIcon` | icons.tsx:327 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ClearGlyph` | asset-icons.tsx:133 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ClockIcon` | icons.tsx:187 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `CloseIcon` | icons.tsx:82 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 19 |
| `CopyIcon` | icons.tsx:256 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `CreditHammerIcon` | cinema-icons.tsx:98 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `CropIcon` | icons.tsx:474 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `CubeIcon` | icons.tsx:502 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `DotsGlyph` | asset-icons.tsx:122 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `DownloadGlyph` | asset-icons.tsx:105 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 4 |
| `DownloadIcon` | icons.tsx:221 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `DurationIcon` | cinema-icons.tsx:74 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ElementGlyph` | asset-icons.tsx:51 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ElementGlyphIcon` | cinema-icons.tsx:32 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `EyeIcon` | icons.tsx:465 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `FeedCalendarIcon` | icons.tsx:620 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `FeedFilterIcon` | icons.tsx:557 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `FeedFitIcon` | icons.tsx:630 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `FeedGuideIcon` | icons.tsx:587 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `FeedModelIcon` | icons.tsx:607 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `FeedMoreInfoIcon` | icons.tsx:597 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `FeedRecordIcon` | icons.tsx:579 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `FeedViewIcon` | icons.tsx:566 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `FolderGlyph` | asset-icons.tsx:94 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `FolderIcon` | icons.tsx:513 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `FormatIcon` | icons.tsx:196 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `FrameIcon` | icons.tsx:369 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `GaugeIcon` | icons.tsx:453 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `GemIcon` | icons.tsx:178 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `GlobeIcon` | icons.tsx:492 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `HammerIcon` | icons.tsx:443 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `HeartGlyph` | asset-icons.tsx:78 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 4 |
| `HeartIcon` | icons.tsx:290 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `ImageGlyph` | asset-icons.tsx:138 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `ImageIcon` | icons.tsx:22 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `KeycapPlusIcon` | cinema-icons.tsx:20 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `KeyIcon` | icons.tsx:65 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `LensIcon` | icons.tsx:388 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `LimeIcon` | cinema-icons.tsx:44 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `LockIcon` | icons.tsx:645 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `MinusIcon` | icons.tsx:168 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ModelChevronIcon` | cinema-icons.tsx:50 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ModelIcon` | model-icon.tsx:27 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `OpenGlyph` | asset-icons.tsx:30 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `OpenOutIcon` | icons.tsx:234 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `PaletteIcon` | icons.tsx:339 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `PencilIcon` | icons.tsx:483 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `PersonAddIcon` | icons.tsx:359 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `PersonIcon` | icons.tsx:380 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `PlayBadgeIcon` | icons.tsx:213 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `PlayIcon` | icons.tsx:205 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `PlusIcon` | icons.tsx:144 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 6 |
| `PromptPlusIcon` | cinema-icons.tsx:26 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `PublishGlyph` | asset-icons.tsx:101 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `RailImageIcon` | cinema-icons.tsx:8 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `RailVideoIcon` | cinema-icons.tsx:14 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `RegenerateGlyph` | asset-icons.tsx:34 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ResolutionIcon` | cinema-icons.tsx:62 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `RetryIcon` | icons.tsx:116 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ReuseGlyph` | asset-icons.tsx:41 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `ScrollChevronIcon` | cinema-icons.tsx:56 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `SearchIcon` | icons.tsx:98 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `ShareGlyph` | asset-icons.tsx:86 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `ShuffleIcon` | icons.tsx:107 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |
| `SlidersIcon` | icons.tsx:265 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 5 |
| `SparkIcon` | icons.tsx:523 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `TrashGlyph` | asset-icons.tsx:109 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `TrashIcon` | icons.tsx:300 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 2 |
| `UndoIcon` | icons.tsx:310 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `UploadIcon` | icons.tsx:245 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `VideoGlyph` | asset-icons.tsx:148 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `VideoIcon` | icons.tsx:32 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 1 |
| `WarningIcon` | icons.tsx:125 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 3 |
| `WaveBadgeIcon` | icons.tsx:319 | Icon / glyph primitive (reusable library) | not-in-DS | YES | 0 |

## B. 제외된 screen-composite (19) — 문서화, DS 원자 아님

| Component | File:line | Category | DS status | Reg. target | #importers |
|---|---|---|---|---|---|
| `CinemaHomeContent` | cinema-home-content.tsx:199 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `CinemaProjectSurface` | cinema-project-panels.tsx:407 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `CinemaSidebar` | cinema-sidebar.tsx:481 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `CinemaStudioScreen` | cinema-studio-screen.tsx:27 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `Composer` | composer.tsx:123 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `DirectorPanel` | project-screen.tsx:103 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `FeedGuide` | feed-showcase.tsx:133 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `FeedHeader` | feed-header.tsx:483 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `FeedShowcase` | feed-showcase.tsx:105 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `Gallery` | gallery.tsx:605 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `GeneralCreateTabs` | general-create-tabs.tsx:2131 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `ImageWorkspace` | image-workspace.tsx:52 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `OpenHiggsfieldApp` | openhiggsfield-app.tsx:253 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `ProjectChat` | project-screen.tsx:294 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `ProjectScreen` | project-screen.tsx:45 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 2 |
| `Topbar` | topbar.tsx:79 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `VideoEditor` | video-edit.tsx:55 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `VideoEditRail` | video-edit.tsx:298 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |
| `Viewer` | viewer.tsx:245 | App screen / composition root (NOT a DS atom) | not-in-DS | no (screen) | 1 |

## C. 비(非)컴포넌트 export (9) — 스캔 결과, 등록 대상 아님

| Export | Kind | File:line | 이유 |
|---|---|---|---|
| `buildAssetMenu` | function | asset-menu.tsx:31 | data/hook/style-string factory (JSX 반환 아님) |
| `buildSelectionMenu` | function | asset-menu.tsx:113 | data/hook/style-string factory (JSX 반환 아님) |
| `runSubtitle` | function | gallery.tsx:1232 | data/hook/style-string factory (JSX 반환 아님) |
| `generalCreateTabsStyle` | const | general-create-tabs.tsx:2360 | data/hook/style-string factory (JSX 반환 아님) |
| `useMediaTray` | function | media-tray.tsx:55 | data/hook/style-string factory (JSX 반환 아님) |
| `modelIconFile` | function | model-icon.tsx:4 | data/hook/style-string factory (JSX 반환 아님) |
| `modelIconSrc` | function | model-icon.tsx:22 | data/hook/style-string factory (JSX 반환 아님) |
| `REFERENCE_FILM_OVERLAY` | const | reference-film-popover.tsx:36 | data/hook/style-string factory (JSX 반환 아님) |
| `SEED_CAPTIONS` | const | video-edit.tsx:22 | data/hook/style-string factory (JSX 반환 아님) |

---
_전체 기계가독 목록은 `design-system-inventory.json` 참조._
