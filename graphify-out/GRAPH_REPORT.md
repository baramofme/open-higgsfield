# Graph Report - open-higgsfield  (2026-11-01)

## Corpus Check
- 115 files · ~121,240 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 797 nodes · 1690 edges · 49 communities (47 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `efdfacfa`
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
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]

## God Nodes (most connected - your core abstractions)
1. `base()` - 47 edges
2. `videoModel()` - 20 edges
3. `ModelEntry` - 20 edges
4. `compilerOptions` - 18 edges
5. `CloseIcon()` - 16 edges
6. `t2v()` - 14 edges
7. `Composer()` - 14 edges
8. `getModel()` - 13 edges
9. `Surface` - 12 edges
10. `browserStorage()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `submitGeneration()` --calls--> `parseSettings()`  [EXTRACTED]
  src/generation/actions.ts → src/generation/catalog/parse-settings.ts
- `round()` --calls--> `getGenerationStatuses()`  [EXTRACTED]
  src/generation/poll.ts → src/generation/actions.ts
- `assemblePlane()` --calls--> `getModel()`  [EXTRACTED]
  src/generation/plane.ts → src/generation/catalog/index.ts
- `mapKrea2Cfwui()` --calls--> `getModel()`  [EXTRACTED]
  src/generation/to-platform.ts → src/generation/catalog/index.ts
- `mapVideoCfwui()` --calls--> `getModel()`  [EXTRACTED]
  src/generation/to-platform.ts → src/generation/catalog/index.ts

## Import Cycles
- 3-file cycle: `src/openhiggsfield/gallery.tsx -> src/openhiggsfield/openhiggsfield-app.tsx -> src/openhiggsfield/selection-bar.tsx -> src/openhiggsfield/gallery.tsx`
- 4-file cycle: `src/openhiggsfield/asset-menu.tsx -> src/openhiggsfield/gallery.tsx -> src/openhiggsfield/openhiggsfield-app.tsx -> src/openhiggsfield/selection-bar.tsx -> src/openhiggsfield/asset-menu.tsx`

## Communities (49 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (34): ApertureIcon(), ArrowRightIcon(), ArrowUpIcon(), AssetsIcon(), base(), CameraIcon(), CinematicIcon(), ClapperIcon() (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.20
Nodes (8): browserStorage(), createMediaStore(), MediaState, createPromptStore(), PromptState, CINEMA_MODES, CinemaMode, StudioState

### Community 2 - "Community 2"
Cohesion: 0.30
Nodes (9): capHistory(), loadHistory(), mergeHistory(), newerRecord(), readIdb(), readLegacy(), replaceRequest(), RunStatus (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (22): useImageMedia, useVideoMedia, uploadMedia(), ROLE_ACCEPT, ROLE_LABELS, ROLE_TAGS, browserLegacy(), defaultKv() (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): audioModel(), t2v(), VIDEO_ASPECT, videoModel(), flux3, grokImagineVideo15, happyHorse11, happyHorse1 (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (21): aiCast, cinematicPlace, ideogramVector, seedream45, seedream5Flash, seedream5Pro, dop, kling25 (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (19): H3_CANVAS, h3NamedTemplate(), KREA2_CANVAS, LTX_ASPECT, MAP, mapByPaths(), mapKling3(), mapKlingMotion() (+11 more)

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
Cohesion: 0.08
Nodes (18): Surface, buildAssetMenu(), CROSS_VIEWS, GalleryView, pickSamples(), SAMPLES, blocksOf(), EMPTY (+10 more)

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
Cohesion: 0.12
Nodes (16): genjutsu, genjutsuLite, krea2Turbo, ltx25Local, minimaxH3Local, seedance2, seedance2Fast, seedance2Mini (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (7): imageModel(), flux2, grokImagine2, ideogram4, qwenImage3, recraft41, zImageTurbo

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
Cohesion: 0.15
Nodes (17): MODELS, useFeed, ChipStrip(), FeedHeader(), FilterMenu(), formatDayLabel(), LAYOUTS, PeriodCalendar() (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.47
Nodes (5): ALLOWED_ROOTS, deny(), GET(), guessContentType(), MIME

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (34): SettingsState, useSettings, COUNT_KEYS, defaultRole(), describeModel(), durationBadge(), formatClock(), joinPhrases() (+26 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (17): ASSET_ICON, AssetScope, AssetSidebar(), AUDIO_ICON, ELEMENT_ICON, FAVORITE_ICON, Icon, IMAGE_ICON (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (7): EDIT_TOOLS, EditShowcase(), EditToolsCard(), Point, Region, Tool, TOOLS

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (13): countSetting, metaOf(), ratioToCss(), fileNameFor(), saveFile(), EMPTY_CANCELING_IDS, failedRows(), failureText() (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (21): asObject(), cancelGeneration(), clearPlatformCredentials(), createCloudClient(), getGenerationStatuses(), hasPlatformCredentials(), parseRequestId(), parseRequestIds() (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (9): mapAudioCfwui(), clamp(), Edge, ExpandCropEditor(), HANDLES, Pads, padsFrom(), Rect (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (9): ActiveState, useActive, artFor(), rng(), swatchFor(), ASPECT_MIRROR, CINEMA_TIERS, CinemaPanel() (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.24
Nodes (9): useElements, Project, projectLabel(), ProjectState, useProjects, AssetPicker(), roleNoun(), ElementPopover() (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (22): AddGlyph(), AssignGlyph(), ClearGlyph(), DownloadGlyph(), ElementGlyph(), FolderGlyph(), GlyphProps, HeartGlyph() (+14 more)

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (5): inter, metadata, stepRun(), OpenHiggsfieldApp(), useStudio

### Community 38 - "Community 38"
Cohesion: 0.19
Nodes (13): CANCELING_TOKENS, deliver(), inflight, isCancelingStatus(), round(), schedule(), settleAll(), stopWatching() (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (5): addComment(), Comment, key(), loadComments(), removeComment()

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (3): ImageWorkspace(), Tool, TOOL_KEYS

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (10): STUDIO_COUNTS, CaretDownIcon(), ChevronLeftIcon(), ChevronRightIcon(), HammerIcon(), ImageIcon(), MinusIcon(), VideoIcon() (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (5): asRecord(), audioFailure(), audioUrlFromComplete(), CfwuiClientOptions, QueuedGeneration

### Community 43 - "Community 43"
Cohesion: 0.23
Nodes (9): asRecord(), GenerationStatus, mapQueued(), mapStatus(), messageFromBody(), PlatformClientOptions, PlatformError, StatusResult (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.18
Nodes (11): applyFeedFilters(), dayKey(), FeedLayout, FeedPeriod, FeedState, LAYOUT_LABELS, PERIOD_FLOOR, PERIOD_LABELS (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (7): FailureField, FailureModal(), fieldsFor(), settingsLines(), stamp(), runSubtitle(), timeAgo()

### Community 46 - "Community 46"
Cohesion: 0.39
Nodes (7): parseSettings(), assemblePlane(), withCamera(), useAudioPrompt, useImagePrompt, useVideoPrompt, Composer()

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (3): resolutionTierLabel(), toProxyImageUrl(), Viewer()

### Community 48 - "Community 48"
Cohesion: 1.00
Nodes (3): parseRatio(), realAspect(), slotAspect()

## Knowledge Gaps
- **159 isolated node(s):** `nextConfig`, `name`, `private`, `type`, `dev` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RunRecord` connect `Community 10` to `Community 2`, `Community 36`, `Community 41`, `Community 11`, `Community 44`, `Community 45`, `Community 24`, `Community 30`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `getModel()` connect `Community 32` to `Community 34`, `Community 5`, `Community 6`, `Community 37`, `Community 46`, `Community 30`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `ModelEntry` connect `Community 15` to `Community 3`, `Community 4`, `Community 5`, `Community 41`, `Community 14`, `Community 24`, `Community 27`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `private` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1021021021021021 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11576354679802955 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09176788124156546 - nodes in this community are weakly interconnected._