# Graph Report - open-higgsfield  (2026-11-01)

## Corpus Check
- 111 files · ~108,981 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 738 nodes · 1586 edges · 40 communities (37 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b16a0efe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `base()` - 47 edges
2. `videoModel()` - 20 edges
3. `ModelEntry` - 19 edges
4. `compilerOptions` - 18 edges
5. `CloseIcon()` - 15 edges
6. `t2v()` - 14 edges
7. `getModel()` - 13 edges
8. `Composer()` - 13 edges
9. `Surface` - 12 edges
10. `browserStorage()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `createMediaStore()` --calls--> `browserStorage()`  [EXTRACTED]
  src/generation/stores/media.ts → src/generation/stores/browser-storage.ts
- `round()` --calls--> `getGenerationStatuses()`  [EXTRACTED]
  src/generation/poll.ts → src/generation/actions.ts
- `OpenHiggsfieldApp()` --calls--> `getModel()`  [EXTRACTED]
  src/openhiggsfield/openhiggsfield-app.tsx → src/generation/catalog/index.ts
- `Composer()` --calls--> `parseSettings()`  [EXTRACTED]
  src/openhiggsfield/composer.tsx → src/generation/catalog/parse-settings.ts
- `RunRecord` --references--> `Surface`  [EXTRACTED]
  src/openhiggsfield/history.ts → src/generation/catalog/types.ts

## Import Cycles
- 3-file cycle: `src/openhiggsfield/gallery.tsx -> src/openhiggsfield/openhiggsfield-app.tsx -> src/openhiggsfield/selection-bar.tsx -> src/openhiggsfield/gallery.tsx`
- 4-file cycle: `src/openhiggsfield/asset-menu.tsx -> src/openhiggsfield/gallery.tsx -> src/openhiggsfield/openhiggsfield-app.tsx -> src/openhiggsfield/selection-bar.tsx -> src/openhiggsfield/asset-menu.tsx`

## Communities (40 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.14
Nodes (25): ApertureIcon(), ArrowRightIcon(), ArrowUpIcon(), AssetsIcon(), base(), CameraIcon(), CinematicIcon(), ClapperIcon() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.22
Nodes (9): withCamera(), browserStorage(), createPromptStore(), PromptState, useImagePrompt, useVideoPrompt, SettingsState, useSettings (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (22): capHistory(), loadHistory(), mergeHistory(), newerRecord(), readIdb(), readLegacy(), replaceRequest(), RunStatus (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (41): MODELS, MediaItem, MediaRole, createMediaStore(), MediaState, useImageMedia, useVideoMedia, uploadMedia() (+33 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (20): t2v(), videoModel(), dop, flux3, grokImagineVideo15, happyHorse11, happyHorse1, kling25 (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (18): aiCast, cinematicPlace, ideogramVector, seedream45, seedream5Flash, seedream5Pro, kling34k, kling3MotionPro (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (12): GenerationStatus, deliver(), inflight, round(), schedule(), settleAll(), stopWatching(), sweep() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (22): dependencies, fabric, next, react, react-canvas-masker, react-dom, @tanstack/react-virtual, @vercel/blob (+14 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (14): ELEMENT_CATEGORY_LABELS, ELEMENT_DEFAULTS, ELEMENT_STATUS_LABELS, ElementAttr, ElementCategory, ElementItem, ElementState, ElementStatus (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (42): AddGlyph(), AssignGlyph(), ClearGlyph(), DownloadGlyph(), ElementGlyph(), FolderGlyph(), GlyphProps, HeartGlyph() (+34 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (3): LOCAL_USER, CREATED, Tab

### Community 12 - "Community 12"
Cohesion: 0.26
Nodes (13): POST(), readDeviceId(), summarizeBlobEvent(), withDeviceCookie(), withDevicePath(), blobPathname(), DEVICE_COOKIE_OPTIONS, mintDeviceId() (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (6): metadata, viewport, OG_IMAGE, openGraphFor(), SITE_URL, twitterFor()

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): flux3Image, GPT_BATCH, GPT_QUALITY, GPT_RESOLUTION, gptImage15, gptImage2, gptImage25Flare, gptImage25Sunburst (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (13): genjutsu, genjutsuLite, krea2Turbo, seedance2, seedance2Fast, seedance2Mini, seedanceRoles, soul (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (8): imageModel(), VIDEO_ASPECT, flux2, grokImagine2, ideogram4, qwenImage3, recraft41, zImageTurbo

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): Architecture, Commands, Design principles, Environment, Features, Gallery, Generate, Getting started (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (12): CameraChoice, CAMERAS, CameraState, CHOICE_ART, DEFAULTS, LensChoice, LENSES, useCamera (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (7): bleedPlate(), brackets(), CHROME, markSvg(), ROOT, roundedPlate(), WORK

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (23): Asset, ChromeCard, SIDEBAR, SidebarId, SORT_LABELS, SortId, TAB_LABELS, TABS (+15 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (27): applyFeedFilters(), dayKey(), FeedLayout, FeedPeriod, FeedState, LAYOUT_LABELS, PERIOD_FLOOR, PERIOD_LABELS (+19 more)

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): ALLOWED_ROOTS, deny(), GET()

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (10): Surface, fileNameFor(), saveFile(), ActiveRun, failedRows(), failureText(), RunDraft, runningRows() (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (17): ratioBox(), settingLabel(), settingPillLabel(), AudioIcon(), CheckIcon(), ClockIcon(), FormatIcon(), GaugeIcon() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (7): EDIT_TOOLS, EditShowcase(), EditToolsCard(), Point, Region, Tool, TOOLS

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (18): useElements, Project, projectLabel(), ProjectState, useProjects, AssetPicker(), STUDIO_COUNTS, roleNoun() (+10 more)

### Community 32 - "Community 32"
Cohesion: 0.05
Nodes (48): asObject(), clearPlatformCredentials(), createCloudClient(), getGenerationStatuses(), hasPlatformCredentials(), parseRequestIds(), readStoredCredentials(), savePlatformCredentials() (+40 more)

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (7): GalleryView, CINEMA_MODES, CinemaMode, StudioMode, StudioState, MEDIA_ITEMS, Topbar()

### Community 34 - "Community 34"
Cohesion: 0.32
Nodes (6): ActiveState, useActive, ASPECT_MIRROR, CINEMA_TIERS, CinemaPanel(), LENS_MIRROR

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (5): inter, metadata, stepRun(), OpenHiggsfieldApp(), useStudio

### Community 36 - "Community 36"
Cohesion: 0.60
Nodes (3): artFor(), rng(), swatchFor()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (5): addComment(), Comment, key(), loadComments(), removeComment()

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (3): ImageWorkspace(), Tool, TOOL_KEYS

## Knowledge Gaps
- **137 isolated node(s):** `nextConfig`, `name`, `private`, `type`, `dev` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RunRecord` connect `Community 10` to `Community 2`, `Community 11`, `Community 24`, `Community 25`, `Community 27`, `Community 30`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `getModel()` connect `Community 32` to `Community 1`, `Community 34`, `Community 35`, `Community 5`, `Community 27`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `ModelEntry` connect `Community 15` to `Community 3`, `Community 5`, `Community 14`, `Community 16`, `Community 24`, `Community 28`, `Community 30`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `private` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1396011396011396 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06845513413506013 - nodes in this community are weakly interconnected._