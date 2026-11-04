# Graph Report - open-higgsfield  (2026-11-04)

## Corpus Check
- 155 files · ~212,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1222 nodes · 2615 edges · 66 communities (62 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e4d7297`
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
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]

## God Nodes (most connected - your core abstractions)
1. `base()` - 48 edges
2. `ModelEntry` - 23 edges
3. `CloseIcon()` - 21 edges
4. `videoModel()` - 20 edges
5. `useProjects` - 18 edges
6. `compilerOptions` - 18 edges
7. `Surface` - 17 edges
8. `RunRecord` - 17 edges
9. `Composer()` - 16 edges
10. `browserStorage()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `readDeviceId()` --calls--> `cookies()`  [INFERRED]
  src/app/api/blob/route.ts → tests/prompt-optimize/next-headers-stub.mjs
- `shoot()` --calls--> `resolve()`  [INFERRED]
  scripts/build-brand-assets.mjs → tests/prompt-optimize/repo-resolve-hook.mjs
- `savePlatformCredentials()` --calls--> `cookies()`  [INFERRED]
  src/generation/actions.ts → tests/prompt-optimize/next-headers-stub.mjs
- `clearPlatformCredentials()` --calls--> `cookies()`  [INFERRED]
  src/generation/actions.ts → tests/prompt-optimize/next-headers-stub.mjs
- `readStoredCredentials()` --calls--> `cookies()`  [INFERRED]
  src/generation/actions.ts → tests/prompt-optimize/next-headers-stub.mjs

## Import Cycles
- 3-file cycle: `src/openhiggsfield/gallery.tsx -> src/openhiggsfield/openhiggsfield-app.tsx -> src/openhiggsfield/selection-bar.tsx -> src/openhiggsfield/gallery.tsx`
- 4-file cycle: `src/openhiggsfield/asset-menu.tsx -> src/openhiggsfield/gallery.tsx -> src/openhiggsfield/openhiggsfield-app.tsx -> src/openhiggsfield/selection-bar.tsx -> src/openhiggsfield/asset-menu.tsx`

## Communities (66 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (7): CaptionSeg, CLIP_TOOLS, ClipTool, SEED_CAPTIONS, TICKS, VideoEditor(), VideoEditRail()

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (6): ELEMENT_DEFAULTS, nextElementName(), BRIEF_STARTERS, CLUSTER_ITEMS, ELEMENT_TABS, elementsCsvFileName()

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (38): ApertureIcon(), ArrowRightIcon(), ArrowUpIcon(), AudioIcon(), base(), CameraIcon(), CaretDownIcon(), ChevronRightIcon() (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (11): referenceSlotsRemaining(), Project, projectLabel(), ProjectState, useProjects, AssetPicker(), ProjectSettings(), CinemaSidebar() (+3 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (16): t2v(), videoModel(), dop, flux3, happyHorse11, happyHorse1, kling26, ltx25Fast (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (22): AddGlyph(), AssignGlyph(), ClearGlyph(), DownloadGlyph(), ElementGlyph(), FolderGlyph(), GlyphProps, HeartGlyph() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (29): classifyLight(), compositionById(), compositionFragment(), defaultOrbitLight(), fromFront(), intensityWord(), LIGHT_COMPOSITIONS, LIGHT_SEATS (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (23): dependencies, fabric, next, react, react-canvas-masker, react-dom, @tanstack/react-virtual, @vercel/blob (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (14): flux3Image, GPT_BATCH, GPT_QUALITY, GPT_RESOLUTION, gptImage15, gptImage2, gptImage25Flare, gptImage25Sunburst (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (24): AudioSource, averageChannels(), cachedWaveformForAsset(), computePeaks(), createCanvas(), decodeToMono(), DEFAULTS, escapeAttr() (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (5): resolutionTierLabel(), useAudioWaveform(), CREATED, Tab, Viewer()

### Community 12 - "Community 12"
Cohesion: 0.26
Nodes (13): POST(), readDeviceId(), summarizeBlobEvent(), withDeviceCookie(), withDevicePath(), blobPathname(), DEVICE_COOKIE_OPTIONS, mintDeviceId() (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (6): metadata, viewport, OG_IMAGE, openGraphFor(), SITE_URL, twitterFor()

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (12): CAMERA_MOVEMENTS, CameraDirection, CameraMovementDef, controlKey(), DIRECTION_PHRASES, INTENSITY_PHRASES, INTENSITY_STEPS, usePromptTokens (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (10): composePromptFragment(), featureOrder, features, isTokenActive(), PromptControl, PromptControlKind, PromptFeature, PromptToken (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (12): audioModel(), imageModel(), VIDEO_ASPECT, flux2, grokImagine2, ideogram4, kling25, klingO1 (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (12): Architecture, Commands, Design principles, Environment, Features, Gallery, Generate, Getting started (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (8): useImagePrompt, kindOrdinalOf(), MediaStripStore, promptStoreFor(), prunePromptHandles(), removeStripReference(), StripRemovalOutcome, MODEL

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (14): bleedPlate(), brackets(), CHROME, markSvg(), ROOT, roundedPlate(), shoot(), WORK (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (26): Asset, ChromeCard, ElementCard(), GEN_FILTERS, GenFilter, SIDEBAR, SidebarId, SORT_LABELS (+18 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (20): applyFeedFilters(), FeedLayout, FeedPeriod, FeedState, LAYOUT_LABELS, PERIOD_FLOOR, PERIOD_LABELS, periodFloor() (+12 more)

### Community 26 - "Community 26"
Cohesion: 0.47
Nodes (5): ALLOWED_ROOTS, deny(), GET(), guessContentType(), MIME

### Community 27 - "Community 27"
Cohesion: 0.06
Nodes (47): MODELS, AspectIcon(), AudioIcon(), DurationIcon(), ResolutionIcon(), COUNT_KEYS, countSetting, CROSS_VIEWS (+39 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (17): ASSET_ICON, AssetScope, AssetSidebar(), AUDIO_ICON, ELEMENT_ICON, FAVORITE_ICON, Icon, IMAGE_ICON (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (7): EDIT_TOOLS, EditShowcase(), EditToolsCard(), Point, Region, Tool, TOOLS

### Community 30 - "Community 30"
Cohesion: 0.07
Nodes (27): SettingField, AudioBody(), BITRATE_LABEL, DRAW_CREDITS, DRAW_TOOLS, drawClock(), DrawClockFormat, DrawModal() (+19 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (21): aiCast, cinematicPlace, ideogramVector, seedream45, seedream5Flash, seedream5Pro, grokImagineVideo15, kling34k (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (11): REFERENCE_ROLE_KIND, REFERENCE_ROLE_KIND_ORDER, REFERENCE_ROLES, ReferenceKind, ReferencePolicy, referencePolicyFor(), ReferenceRejectionCode, ReferenceRoleOption (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (15): dayKey(), buildAssetMenu(), blocksOf(), clampAspect(), EMPTY, FeedBlock, parseRatio(), planFeed() (+7 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (24): cache, cacheKey(), chatContentText(), endpointKind(), geminiUrlWithQuery(), GenerationMode, KNOWN_ENDPOINT_SUFFIXES, normalizeBaseUrl() (+16 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (9): mapAudioCfwui(), clamp(), Edge, ExpandCropEditor(), HANDLES, Pads, padsFrom(), Rect (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.08
Nodes (17): BarPref, CHIP_STOPS, clampWidth(), DotsIcon(), FolderIcon(), GlyphProps, PanelIcon(), PanelOpenIcon() (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (7): createMediaStore(), MediaState, useImageMedia, useVideoMedia, GeneralCreateTabs(), MediaStrip(), useMedia()

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (5): addComment(), Comment, key(), loadComments(), removeComment()

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (3): ImageWorkspace(), Tool, TOOL_KEYS

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (13): registerPromptFeature(), FILM_STILLS, REFERENCE_AXES, ReferenceAxis, ReferenceOption, ERA_STILLS, EraRuler(), FILM_CAPTIONS (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (31): H3_CANVAS, h3NamedTemplate(), h3SlotCoordinate(), imageLaneOrdinals(), KREA2_CANVAS, LTX_ASPECT, ltxSlotCoordinate(), MAP (+23 more)

### Community 45 - "Community 45"
Cohesion: 0.27
Nodes (10): capHistory(), loadHistory(), mergeHistory(), newerRecord(), readIdb(), readLegacy(), replaceRequest(), RunStatus (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (11): ELEMENT_CATEGORY_LABELS, ELEMENT_STATUS_LABELS, ElementAttr, ElementCategory, ElementItem, ElementState, ElementStatus, CATEGORY_OPTIONS (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.05
Nodes (50): asObject(), cancelGeneration(), clearPlatformCredentials(), createCloudClient(), getGenerationStatuses(), hasPlatformCredentials(), optimizePromptDraft(), parseRequestId() (+42 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (13): DirectorState, useDirector, DirectorSettings(), ModelItem, CheckIcon(), ChevronLeftIcon(), FolderIcon(), SlidersIcon() (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.16
Nodes (12): useVideoPrompt, BatchMinusIcon(), BatchPlusIcon(), CamMoveIcon(), KeycapPlusIcon(), LimeIcon(), ModelChevronIcon(), RailImageIcon() (+4 more)

### Community 50 - "Community 50"
Cohesion: 0.16
Nodes (12): CINEMA_SEAT, DOCK_BY_MODE, DockCaret, dockConfig, DockMark, DockMode, DockSeat, PLAIN_SEAT (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.19
Nodes (12): useElements, CinemaView, ProjectPanel, ProjectSurfaceState, useProjectSurface, CinemaHomeContent(), CinemaProjectSurface(), ProjectElements() (+4 more)

### Community 52 - "Community 52"
Cohesion: 0.11
Nodes (20): Surface, withCamera(), statusErrorText(), artFor(), rng(), swatchFor(), fileNameFor(), saveCsvText() (+12 more)

### Community 53 - "Community 53"
Cohesion: 0.13
Nodes (20): APERTURE_ART, ApertureChoice, APERTURES, CameraChoice, CAMERAS, CameraState, CHOICE_ART, DEFAULTS (+12 more)

### Community 54 - "Community 54"
Cohesion: 0.23
Nodes (12): CATEGORIES, csvField(), decodeElementsCsv(), ELEMENT_CSV_HEADER, ElementCsvResult, encodeElementsCsv(), newElementId(), parseAttrs() (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.23
Nodes (6): browserStorage(), ProjectViewState, useProjectView, createPromptStore(), PromptState, SettingsState

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (5): AssetsIcon(), KeyIcon(), SearchIcon(), LOCAL_USER, MEDIA_ITEMS

### Community 60 - "Community 60"
Cohesion: 0.40
Nodes (3): calls, LLM_RESPONSE, warnings

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (14): buildMentionOptions(), filterMentionOptions(), findMentionWindow(), isDialogueLine(), KIND_WORD, MediaKind, mediaKindOf(), MentionOption (+6 more)

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (10): MediaItem, uploadMedia(), ROLE_ACCEPT, ROLE_TAGS, MediaTray, ReferenceShowcaseState, useReferenceShowcase, kindOfFile() (+2 more)

### Community 66 - "Community 66"
Cohesion: 0.24
Nodes (13): getModel(), parseSettings(), assemblePlane(), mergePromptWithTokens(), ActiveState, useActive, useAudioPrompt, useSettings (+5 more)

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (7): FailureField, FailureModal(), fieldsFor(), settingsLines(), stamp(), runSubtitle(), timeAgo()

### Community 68 - "Community 68"
Cohesion: 0.20
Nodes (11): browserLegacy(), defaultKv(), idbKv(), Kv, LegacyStore, memoryKv(), loadUploads(), mergeUploads() (+3 more)

### Community 69 - "Community 69"
Cohesion: 0.29
Nodes (7): base24(), FeedCalendarIcon(), FeedFilterIcon(), FeedFitIcon(), FeedModelIcon(), FeedViewIcon(), LockIcon()

### Community 73 - "Community 73"
Cohesion: 0.13
Nodes (13): genjutsu, genjutsuLite, krea2Turbo, ltx25Local, minimaxH3Local, seedance2, seedance2Fast, seedance2Mini (+5 more)

## Knowledge Gaps
- **254 isolated node(s):** `nextConfig`, `name`, `private`, `type`, `dev` (+249 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cookies()` connect `Community 47` to `Community 12`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `RunRecord` connect `Community 52` to `Community 1`, `Community 34`, `Community 67`, `Community 5`, `Community 43`, `Community 11`, `Community 45`, `Community 49`, `Community 51`, `Community 24`, `Community 25`, `Community 30`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `getModel()` connect `Community 66` to `Community 32`, `Community 44`, `Community 47`, `Community 18`, `Community 52`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `private` to the rest of the system?**
  _254 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09986504723346828 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09425287356321839 - nodes in this community are weakly interconnected._