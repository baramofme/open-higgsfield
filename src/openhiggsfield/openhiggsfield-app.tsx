"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { hasPlatformCredentials, submitGeneration, submitOutpaint, cancelGeneration } from "@/generation/actions";
import { MissingCredentialsError } from "@/generation/credentials";
import { MODELS, getModel, parseSettings } from "@/generation/catalog";
import type { GenerationPlane } from "@/generation/catalog/types";
import type { Surface } from "@/generation/catalog";
import { assemblePlane, withCamera } from "@/generation/plane";
import type { GenerationStatus } from "@/generation/platform";
import { statusErrorText } from "@/generation/platform";
import { POLL_DEADLINE_MS, isCancelingStatus, stopWatching, watchRequest } from "@/generation/poll";
import { useActive } from "@/generation/stores/active";
import { applyFeedFilters, useFeed } from "@/generation/stores/feed";
import { useAudioPrompt, useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { useVideoMedia } from "@/generation/stores/media";
import { useSettings } from "@/generation/stores/settings";
import { DEFAULT_PROJECT_ID, useProjects } from "@/generation/stores/projects";
import { useElements, ELEMENT_DEFAULTS, nextElementName, type ElementItem } from "@/generation/stores/elements";
/* Separate import, anchored away from the top-of-file import cluster so it
   forms its own diff hunk. validateReferenceSubmission comes from the catalog
   barrel; the generation gate below reads the model's derived policy through it. */
import { validateReferenceSubmission } from "@/generation/catalog";

import { GRAIN_URI, artFor } from "./artwork";
import { Composer } from "./composer";
/* Separate CSV imports, anchored beside the download helper the browser calls so
   the codec forms its own diff hunk and never rides in the top-of-file cluster
   where siblings are editing right now: the element record's CSV codec and the
   in-memory-text download helper the export hands the file to. */
import { decodeElementsCsv, encodeElementsCsv, elementsCsvFileName } from "./element-csv";
import type { ChangeEvent } from "react";
import { fileNameFor, saveCsvText, saveFile } from "./download";
import { KeyModal } from "./key-modal";
import { FailureModal } from "./failure-modal";
import {
  CROSS_VIEWS,
  countSetting,
  durationBadge,
  metaOf,
  ratioToCss,
  type GalleryView,
} from "./data";
import { Gallery, type TileMenuActions } from "./gallery";
import { AssetSidebar, type AssetScope, type SidebarCounts } from "./asset-sidebar";
import { FeedHeader, type FeedPanel } from "./feed-header";
import { FeedGuide, FeedShowcase } from "./feed-showcase";
import { loadHistory, mergeHistory, replaceRequest, saveHistory, stepRun, type RunRecord } from "./history";
import { loadComments } from "./comments";
import { CloseIcon, UndoIcon } from "./icons";
import { SelectionBar, type SaveProgress } from "./selection-bar";
import { Topbar } from "./topbar";
import { useStudio } from "./studio-mode";
import { Viewer } from "./viewer";
/* Separate import block, anchored away from the top cluster so it forms its own
   diff hunk: the dedicated Cinematic Studio screen plus the HG-mirrored sidebar
   it adopts as its left column. */
import { CinemaSidebar } from "./cinema-sidebar";
import { CinemaStudioScreen } from "./cinema-studio-screen";
import { VideoSurface } from "./video-surface";

/* Separate import block, anchored away from the top cluster so it forms its own
   diff hunk: the project detail surface plus the view-state store that raises
   it. The swap mirrors the cinematic screen's pattern — the shell is replaced
   while the project is open, so the general layout never overlaps it. */
import { useProjectView } from "@/generation/stores/project-view";
import { useProjectSurface } from "@/generation/stores/project-surface";
import { ProjectScreen } from "./project-screen";

/* Long enough to read the bar and reach it; the drain line states the window. */
const UNDO_MS = 6000;

/* No cancel acknowledged yet. Shared so the set stays referentially stable and
   memoised slots don't recompute until a real acknowledgement arrives. */
const EMPTY_CANCELING_IDS: ReadonlySet<string> = new Set<string>();

/* Separate import, anchored BELOW the const above so it forms its own diff hunk
   well clear of the top import cluster where a sibling is editing right now
   (concurrent-hunk-commit adjacency rule): the nested video/audio create shell
   that replaces the general view's standalone generation dock. */
import { GeneralCreateTabs } from "./general-create-tabs";

/* t_9ddf99e1 — the reference-scoped showcase. Anchored past the create-shell
   import so these lines form their own hunk, clear of the top cluster siblings
   are mutating. Each pulls a symbol the showcase render needs: the role→kind map
   and the role label for the synthesized record, the two media stores so 삭제 can
   reach the right one, and the open seam the strip tile raises. */
import { ROLE_KINDS, ROLE_LABELS } from "./data";
import { useImageMedia } from "@/generation/stores/media";
import { removeStripReference } from "./reference-removal";
import { useReferenceShowcase } from "./reference-showcase";

export interface ActiveRun {
  /** Identifies the skeleton this run occupies, so a batch clears one tile at
      a time as its own request settles. */
  id: string;
  /** The platform request id once the run is submitted. A skeleton that has not
      been submitted yet (a pending press) carries none — its cancel stays hidden
      until the backend actually knows about the run. */
  requestId?: string;
  surface: Surface;
  modelLabel: string;
  ratio: string;
  startedAt: number;
  /** True once the backend has acknowledged a cancel for this run's request —
      either the ack of the cancel call or a mid-cancel status from the poll.
      A Rendering card swaps its label for a cancelling message and drops the
      cancel overlay while this is set. Absent until a cancel is acknowledged. */
  canceling?: boolean;
}

type RunDraft = {
  surface: Surface;
  modelId: string;
  modelLabel: string;
  prompt: string;
  ratio: string;
  meta: string;
  badge?: string;
  settings?: Record<string, unknown>;
  createdAt: number;
  projectId: string;
};

function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

function rowId(requestId: string, offset: number, count: number): string {
  return count > 1 ? `${requestId}#${offset}` : requestId;
}

function draftOf(record: RunRecord): RunDraft {
  return {
    surface: record.surface,
    modelId: record.modelId,
    modelLabel: record.modelLabel,
    prompt: record.prompt,
    ratio: record.ratio,
    meta: record.meta,
    badge: record.badge,
    settings: record.settings,
    createdAt: record.createdAt,
    projectId: record.projectId ?? DEFAULT_PROJECT_ID,
  };
}

function runningRows(requestId: string, count: number, draft: RunDraft): RunRecord[] {
  return Array.from({ length: count }, (_, offset) => {
    const id = rowId(requestId, offset, count);
    return {
      id,
      requestId,
      surface: draft.surface,
      modelId: draft.modelId,
      modelLabel: draft.modelLabel,
      prompt: draft.prompt,
      ratio: draft.ratio,
      meta: draft.meta,
      badge: draft.badge,
      kind: draft.surface,
      urls: [],
      status: "running",
      art: artFor(draft.surface, hueOf(id), id),
      createdAt: draft.createdAt,
      settings: draft.settings,
      projectId: draft.projectId,
    };
  });
}

function terminalRows(
  requestId: string,
  draft: RunDraft,
  status: GenerationStatus,
  finishedAt: number = Date.now(),
): RunRecord[] {
  const urls =
    status.images?.map((image) => image.url) ?? (status.video ? [status.video.url] : []);
  const completed = status.status === "completed" && urls.length > 0;
  const base = status.requestId || requestId;
  const failure = completed ? undefined : failureText(status);
  const delivered: Array<string | null> = completed ? urls : [null];
  /* Wall-clock seconds from submit to terminal — only meaningful once the run
     actually finished, so failed rows are left without it. */
  const durationSeconds = completed
    ? Math.max(0, Math.round((finishedAt - draft.createdAt) / 1000))
    : undefined;
  return delivered.map((url, offset) => {
    const id = rowId(base, offset, delivered.length);
    return {
      id,
      requestId: base,
      surface: draft.surface,
      modelId: draft.modelId,
      modelLabel: draft.modelLabel,
      prompt: draft.prompt,
      ratio: draft.ratio,
      meta: draft.meta,
      badge: draft.badge,
      kind: draft.surface,
      urls: url ? [url] : [],
      status: completed ? "completed" : "failed",
      /* A run the platform canceled keeps the failed status (so the retry path
         and the failed-card layout carry over unchanged) but is tagged so the
         card can swap its wording to read as a cancel. */
      cancelled: status.status === "canceled" ? true : undefined,
      error: failure,
      failedAt: completed ? undefined : finishedAt,
      art: artFor(draft.surface, hueOf(id), id),
      createdAt: draft.createdAt,
      settings: draft.settings,
      projectId: draft.projectId,
      durationSeconds,
    };
  });
}

function failedRows(requestId: string, count: number, draft: RunDraft, error: string): RunRecord[] {
  const failedAt = Date.now();
  return runningRows(requestId, count, draft).map((row) => ({
    ...row,
    status: "failed" as const,
    error,
    failedAt,
  }));
}

function failureText(status: GenerationStatus): string {
  if (status.status === "nsfw") return "the platform flagged the result as NSFW";
  if (status.status === "canceled") return "the run was canceled";
  /* A structured backend error (cfwui's {code,message}) carries the real
     reason; recover it so the card says WHY it failed rather than the generic
     line below. A plain string still wins verbatim. */
  const reason = statusErrorText(status.error);
  if (reason) return reason;
  return "the platform reported a failure";
}

function describeError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);
  if (caught instanceof MissingCredentialsError || message.includes("Missing platform key")) {
    return "Add your platform key to generate.";
  }
  if (message.includes("UNMAPPED_MODEL:")) {
    return "이 모델은 아직 백엔드 연동이 준비되지 않았습니다. 다른 모델을 선택해 주세요.";
  }
  return `Generation failed — ${message}. Try again; if it repeats, check the key in the sidebar.`;
}

export function OpenHiggsfieldApp({ fontClassName = "" }: { fontClassName?: string }) {
  const surface = useActive((state) => state.surface);
  const modelId = useActive((state) => state.model);
  const setModel = useActive((state) => state.setModel);
  const model = getModel(modelId);
  const setSettings = useSettings((state) => state.set);
  /* t_47de09bd — the general cards read their settings through the store, not
     through a one-time getState(): a control's press updates what its own dial
     shows, the way the composer's dials already do. */
  const modelValues = useSettings((state) => state.byModel[model.id]);

  const [history, setHistory] = useState<RunRecord[]>([]);
  const [runs, setRuns] = useState<ActiveRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  /* The failed run whose detail dialog is up, by its row id. A completed run
     opens the media viewer instead, so this only ever names a failed row. */
  const [failureId, setFailureId] = useState<string | null>(null);
  /* The 요소 whose showcase is up. Clicking a 내 요소 tile opens the same Viewer
     the finished runs use, fed a picture-only record derived from the element — a
     baseline showcase showing the element's image and name. The element's own
     category / version / description / editing tabs are separate follow-up work
     (see the showcase child card). */
  const [elementShowcase, setElementShowcase] = useState<ElementItem | null>(null);
  const [inpaintBusy, setInpaintBusy] = useState(false);
  const [outpaintBusy, setOutpaintBusy] = useState(false);
  const [view, setView] = useState<GalleryView>(surface);
  /* HF의 피드 우측 컬럼 상태기계(t_2adadf77): 페이지가 열리면 쇼케이스 판이
     기록 탭이 선택된 채 뜬다(HF 라이브 기본값과 동상태). 탭은 그 판만
     갈아끼운다 — 기록은 로컬 히스토리, 이용 방법은 HF 가이드 정적 미러. */
  const [feedPanel, setFeedPanel] = useState<FeedPanel>("showcase");
  const [focusNonce, setFocusNonce] = useState(0);
  /* The run the viewer last opened — HF flags exactly that asset on the tile. */
  const [lastViewedId, setLastViewedId] = useState("");
  /* Run id → comment-thread length, so each tile's bottom-left bubble counts the
     run's comments the way Higgsfield counts them on the hovered photo. */
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [historyLoaded, setHistoryLoaded] = useState(false);
  /* Deleting drops the only copy of a run — the platform's result URLs are not
     re-derivable — so the records are held aside until the bar times out. */
  const [deleted, setDeleted] = useState<RunRecord[] | null>(null);
  /* Picked runs, in the order they were picked: the count stack shows the most
     recent sheets on top, and a range extends from the last one touched. */
  const [selected, setSelected] = useState<string[]>([]);
  /* requestIds whose cancel the backend has acknowledged — the ack of the cancel
     call or a mid-cancel status from the poll. A Rendering card swaps its label
     to a cancelling message once its request id joins this set. */
  const [cancelingIds, setCancelingIds] = useState<ReadonlySet<string>>(EMPTY_CANCELING_IDS);
  const [saving, setSaving] = useState<SaveProgress | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  /* Topbar search term, matched against every run's prompt and model. */
  const [query, setQuery] = useState("");
  /* The topbar 에셋 button now raises a full-screen asset browser: every surface
     shows at once, the way Higgsfield's /asset/all page does. */
  const [assetsAllOpen, setAssetsAllOpen] = useState(false);
  /* The sidebar's single active scope, mirroring HF's asset rail: 에셋 opens the
     whole browser, and every other row (이미지 · 즐겨찾기 · 도구 …) narrows it. */
  const [assetsAllScope, setAssetsAllScope] = useState<AssetScope>("assets");
  const assetsScrollRef = useRef<HTMLDivElement>(null);
  /* Hidden file input the 요소 scope's 가져오기 button opens; the picked CSV is read
     straight off disk and fed to the decoder, no server round-trip. */
  const csvInputRef = useRef<HTMLInputElement>(null);
  const mode = useStudio((state) => state.mode);
  const setMode = useStudio((state) => state.setMode);
  const cinemaMode = useStudio((state) => state.cinemaMode);
  const activeProjectId = useProjects((state) => state.activeProjectId);
  const projectsList = useProjects((state) => state.projects);
  const elementsList = useElements((state) => state.items);
  const setCinemaMode = useStudio((state) => state.setCinemaMode);

  /* The project detail surface: while open, the dashboard shell is replaced by
     the ProjectScreen — the same swap the cinematic surface uses for its own
     full-screen state. */
  const projectViewOpen = useProjectView((state) => state.open);
  const projectViewId = useProjectView((state) => state.projectId);
  const closeProject = useProjectView((state) => state.closeProject);
  const openProjectView = useProjectView((state) => state.openProject);

  const galleryRef = useRef<HTMLDivElement>(null);
  const rangeAnchor = useRef<number | null>(null);
  const visibleRef = useRef<RunRecord[]>([]);
  /* Presses number their own skeletons, so two batches in flight together can
     never claim the same tile. */
  const press = useRef(0);
  const alive = useRef(true);
  const freshTimers = useRef<number[]>([]);
  const historyRef = useRef(history);
  historyRef.current = history;

  /* The model picker can cross surfaces, so the scope follows it — unless the
     visitor parked on a scope that spans both. */
  useEffect(() => {
    // 시네마틱 owns the gallery entirely: no surface tab can pull the view
    // back to an image or video grid while the cinematic surface is up.
    if (mode === "cinema") return;
    setView((current) => (CROSS_VIEWS.has(current) ? current : surface));
  }, [surface, mode, cinemaMode]);

  /* Read once on mount. A load that finishes after unmount must not mark the
     next mount hydrated, or the empty initial list is written over the store. */
  useEffect(() => {
    let live = true;
    void loadHistory()
      .then((rows) => {
        if (!live) return;
        setHistory((current) => mergeHistory(rows, current));
        setHistoryLoaded(true);
      })
      .catch(() => {
        if (live) setHistoryLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (historyLoaded) void saveHistory(history);
  }, [historyLoaded, history]);

  /* The comment counts ride on each tile's bubble. They are read once per set of
     run ids — a favorite toggle reshuffles the array but not its ids, so the
     bubbles do not re-fetch when only the heart changes. */
  const commentIdsKey = history.map((record) => record.id).join(",");
  useEffect(() => {
    if (!historyLoaded || !commentIdsKey) return;
    let live = true;
    const ids = commentIdsKey.split(",");
    void (async () => {
      const counts: Record<string, number> = {};
      for (const id of ids) counts[id] = (await loadComments(id)).length;
      if (live) setCommentCounts(counts);
    })();
    return () => {
      live = false;
    };
  }, [historyLoaded, commentIdsKey]);

  /* Read whether a key exists, but do NOT open the key dialog on mount. A modal
     dialog shown at mount parks the whole studio behind the dialog's inert
     layer: the visitor's first real click anywhere — a dock control, a tile,
     the showcase close — lands on the dialog (or its backdrop, which hit-tests
     to the dialog too), so the control the visitor actually reached for never
     fires and the click is spent dismissing the gate instead. The unconfigured
     state still announces itself without the gate: the topbar key control reads
     "Add key", pressing Generate without a key opens this dialog with an
     explicit message, and a platform-key error from a live run reopens it. */
  useEffect(() => {
    void hasPlatformCredentials().then((ready) => {
      setKeyConfigured(ready);
    });
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopWatching();
      for (const timer of freshTimers.current) clearTimeout(timer);
    };
  }, []);

  /* Each arrival blooms on its own clock: a batch lands over several seconds,
     and one shared timer would cut the last tile's entrance short. */
  const markFresh = useCallback((ids: string[]) => {
    setFreshIds((prev) => [...prev, ...ids]);
    freshTimers.current.push(
      window.setTimeout(
        () => setFreshIds((prev) => prev.filter((id) => !ids.includes(id))),
        900,
      ),
    );
  }, []);

  /* Mark a request as cancelling the moment the backend acknowledges it — the
     ack of the cancel call or a mid-cancel status surfacing through the poll.
     The id is idempotent: re-acknowledging an already-cancelling run changes
     nothing, so the label swap happens exactly once, without flicker. */
  const markCanceling = useCallback((requestId: string) => {
    if (!requestId) return;
    setCancelingIds((prev) => {
      if (prev.has(requestId)) return prev;
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });
  }, []);

  /* One watch per platform request, used both by Generate and by a reload that
     found running rows already in the log. */
  const resume = useCallback(
    async (requestId: string, draft: RunDraft, expected: number) => {
      try {
        const status = await watchRequest(requestId, {
          deadline: draft.createdAt + POLL_DEADLINE_MS,
          /* A mid-cancel status from the poll (the backend acknowledged the
             cancel but the run has not settled yet) flips the card out of
             "Rendering" into a cancelling message before the terminal arrives. */
          onStatus: (polled) => {
            if (isCancelingStatus(polled.status)) markCanceling(requestId);
          },
        });
        if (!alive.current) return;
        const records = terminalRows(requestId, draft, status);
        setHistory((prev) => {
          const next = replaceRequest(prev, requestId, records);
          void saveHistory(next);
          return next;
        });
        markFresh(records.filter((record) => record.status === "completed").map((record) => record.id));
        if (records.some((record) => record.status === "failed")) {
          const failure = records[0]?.error ?? "the platform reported a failure";
          setError(
            (prev) =>
              prev ?? `Run not delivered — ${failure}. Adjust the prompt or settings and retry.`,
          );
        }
      } catch (caught) {
        if (!alive.current) return;
        const message = describeError(caught);
        if (message.includes("platform key")) setKeysOpen(true);
        setHistory((prev) => {
          const next = replaceRequest(prev, requestId, failedRows(requestId, expected, draft, message));
          void saveHistory(next);
          return next;
        });
        setError((prev) => prev ?? message);
      }
    },
    [markFresh, markCanceling],
  );

  /* After the log hydrates, pick up any request that was still on the platform
     when the last session died. Generate starts its own watch; this is the
     refresh path. */
  useEffect(() => {
    if (!historyLoaded) return;
    const groups = new Map<string, RunRecord[]>();
    for (const record of historyRef.current) {
      if (record.status !== "running" || !record.requestId) continue;
      const rows = groups.get(record.requestId) ?? [];
      rows.push(record);
      groups.set(record.requestId, rows);
    }
    for (const [requestId, rows] of groups) {
      void resume(requestId, draftOf(rows[0]!), rows.length);
    }
  }, [historyLoaded, resume]);

  const feed = useFeed();
  const visible = useMemo(() => {
    const scoped =
      view === "assets"
        ? history
        : view === "favorites"
          ? history.filter((record) => record.favorite === true)
          : history.filter((record) => record.surface === view);
    /* The topbar search narrows the scoped rows before the feed filters run, so
       a typed term narrows whatever view is already showing rather than escaping
       it. Prompt and model are what Higgsfield's search reads. */
    const needle = query.trim().toLowerCase();
    const searched = needle
      ? scoped.filter(
          (record) =>
            record.prompt.toLowerCase().includes(needle) ||
            record.modelLabel.toLowerCase().includes(needle),
        )
      : scoped;
    return applyFeedFilters(searched, feed);
  }, [history, view, feed, query]);

  /* The topbar 에셋 button raises the full-screen asset browser, not the
     composer's picker — the two are different journeys now. Opening clears the
     rail back to 에셋, the way HF's page starts on the full asset list. */
  const openAssets = useCallback(() => {
    setAssetsAllScope("assets");
    setAssetsAllOpen(true);
  }, []);
  const closeAssetsAll = useCallback(() => setAssetsAllOpen(false), []);

  /* 요소 scope's CSV round-trip. Export writes the whole list through the codec's
     header; import rebuilds records under fresh ids (the file's own ids are thrown
     away so a re-import never collides), appending each through the store's add. */
  const csvExport = useCallback(() => {
    if (elementsList.length === 0) return;
    saveCsvText(encodeElementsCsv(elementsList), elementsCsvFileName());
  }, [elementsList]);

  const csvImportFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    /* Clear the value so picking the same file twice still fires change. */
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "").replace(/^\uFEFF/, "");
      const { items } = decodeElementsCsv(text);
      const store = useElements.getState();
      for (const item of items) store.add(item);
    };
    reader.readAsText(file);
  }, []);

  /* The rail's badges are counts of the store's own truth, read the way HF's
     asset page counts: 에셋 is every row, 이미지/비디오 split them by kind,
     즐겨찾기 the deliberate keeps, 프로젝트 the shelves you made, 요소 the
     attachments. 업스케일됨 has no local flag yet, so it reads 0 — the "0" pill
     the source still draws. */
  const assetsCounts = useMemo<SidebarCounts>(
    () => ({
      assets: history.length,
      projects: projectsList.length,
      favorites: history.filter((record) => record.favorite === true).length,
      elements: elementsList.length,
      image: history.filter((record) => record.kind === "image").length,
      video: history.filter((record) => record.kind === "video").length,
      audio: history.filter((record) => record.kind === "audio").length,
      upscaled: 0,
    }),
    [history, projectsList, elementsList],
  );

  /* The active scope narrows the grid before it renders, the way a rail row
     picks which runs the browser shows. 요소/휴지통/오디오/업스케일됨 name sets the
     run log holds none of, so they land on the empty invitation. */
  const assetsItems = useMemo<RunRecord[]>(() => {
    switch (assetsAllScope) {
      case "assets":
        return history;
      case "favorites":
        return history.filter((record) => record.favorite === true);
      case "image":
        return history.filter((record) => record.kind === "image");
      case "video":
        return history.filter((record) => record.kind === "video");
      case "audio":
        return history.filter((record) => record.kind === "audio");
      case "projects":
        return history.filter(
          (record) => record.projectId && record.projectId !== DEFAULT_PROJECT_ID,
        );
      default:
        return [];
    }
  }, [history, assetsAllScope]);

  /* The pult's tabs answer the composer's own question — 이미지 · 비디오 — and
     the dock follows them: whichever surface the tab names takes the model
     seat, so the form and the model agree. What the tabs do NOT touch is the
     app's view: the topbar keeps whatever the visitor parked there. The
     topbar answers the other way round (see switchView). */
  const alignDockToMode = useCallback(
    (next: Surface) => {
      if (useActive.getState().surface === next) return;
      const first = MODELS.find((entry) => entry.surface === next);
      if (first) setModel(first.id);
    },
    [setModel],
  );

  const switchView = useCallback(
    (next: GalleryView) => {
      setView(next);
      galleryRef.current?.scrollTo({ top: 0 });
      // While the cinematic screen is up, its tabs steer the dock's own mode.
      if (mode === "cinema" && (next === "image" || next === "video")) {
        setCinemaMode(next);
        alignDockToMode(next);
      }
      if (CROSS_VIEWS.has(next) || next === surface) return;
      const first = MODELS.find((entry) => entry.surface === next);
      if (first) setModel(first.id);
    },
    [setModel, surface, mode, setCinemaMode, alignDockToMode],
  );

  /* Presses do not wait on each other. A press snapshots its own plane, opens
     its own skeletons and keeps its own watch, so the composer is free the
     moment the tiles appear and any number of runs can be in flight. */
  const generate = useCallback(async () => {
    if (!keyConfigured) {
      setKeysOpen(true);
      setError("Add your platform key to generate.");
      return;
    }
    const plane = withCamera(assemblePlane());
    if (!plane.prompt.text.trim()) return;

    const entry = getModel(plane.model);
    /* Reference-only video runs are rejected before they reach the backend.
       A video model that offers both a start and a reference slot cannot map a
       reference without a start frame, so the plane aborts here and surfaces the
       rule's message in the composer's error slot. The check reads the model's
       derived policy — never re-derive it here, or the rule has two sources. */
    const refCheck = validateReferenceSubmission(entry, plane.media);
    if (!refCheck.ok) {
      setError(refCheck.message);
      return;
    }
    const ratio = ratioToCss(
      plane.settings.aspectRatio,
      entry.surface === "image" ? "4 / 3" : "16 / 9",
    );
    const meta = metaOf(entry, plane.settings);
    const badge = entry.surface === "video" ? durationBadge(plane.settings) : undefined;

    /* Batch size resolves to results, not to requests. A model that carries its
       own count answers one request with that many media; every other model is
       submitted once per result. Either way the grid opens the same number of
       skeletons, and each request clears the ones it owns. */
    const native = countSetting(entry);
    const expected = native
      ? Math.max(1, Number(plane.settings[native.key]) || 1)
      : useActive.getState().batch;
    const startedAt = Date.now();
    const seq = ++press.current;
    const pending: ActiveRun[] = Array.from({ length: expected }, (_, index) => ({
      id: `pending-${seq}-${index}`,
      surface: entry.surface,
      modelLabel: entry.label,
      ratio,
      startedAt,
    }));
    const slots = native
      ? [{ skeletons: pending.map((slot) => slot.id) }]
      : pending.map((slot) => ({ skeletons: [slot.id] }));

    /* Home bootstrap (HF parity): generating an image or video from the cinematic
       HOME — no project surface open, no tile view active, and still parked on the
       default shelf — files the run into a fresh 새프로젝트 and takes the studio
       there, so the right canvas shows a rendering tile now and a result tile when
       the render finishes. Once a surface is up, later generations reuse that
       project, so a session never sprouts duplicate 새프로젝트 cards. Read every
       input off the stores at call time (getState) — generate's dependency list is
       [keyConfigured, resume], so a value captured in this closure would go stale. */
    const modeAtCall = useStudio.getState().mode;
    const activeProjectAtCall = useProjects.getState().activeProjectId;
    let filingProjectId = modeAtCall === "cinema" ? activeProjectAtCall : DEFAULT_PROJECT_ID;
    if (
      modeAtCall === "cinema" &&
      (entry.surface === "image" || entry.surface === "video") &&
      useProjectSurface.getState().projectId === null &&
      useProjectSurface.getState().cinemaView === null &&
      activeProjectAtCall === DEFAULT_PROJECT_ID
    ) {
      const fresh = useProjects.getState().addProject("새프로젝트");
      useProjects.getState().setActive(fresh.id);
      useProjectSurface.getState().openSurface(fresh.id);
      filingProjectId = fresh.id;
    }

    const draft: RunDraft = {
      surface: entry.surface,
      modelId: entry.id,
      modelLabel: entry.label,
      prompt: plane.prompt.text.trim(),
      ratio,
      meta,
      badge,
      settings: plane.settings,
      createdAt: startedAt,
      /* The cinematic surface gathers its runs inside the project it loaded;
         ordinary work files them on the default shelf. A home generation filed
         into a fresh 새프로젝트 routes through filingProjectId above. */
      projectId: filingProjectId,
    };

    setError(null);
    /* Newest press on top, above whatever is still rendering from the last. */
    setRuns((prev) => [...pending, ...prev]);
    galleryRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    const runOne = async (slot: { skeletons: string[] }) => {
      try {
        const queued = await submitGeneration(plane);
        setHistory((prev) => {
          const next = [...runningRows(queued.requestId, slot.skeletons.length, draft), ...prev];
          void saveHistory(next);
          return next;
        });
        setRuns((prev) => prev.filter((active) => !slot.skeletons.includes(active.id)));
        await resume(queued.requestId, draft, slot.skeletons.length);
      } catch (caught) {
        if (!alive.current) return;
        const message = describeError(caught);
        if (message.includes("platform key")) setKeysOpen(true);
        setError((prev) => prev ?? message);
      } finally {
        if (alive.current) {
          setRuns((prev) => prev.filter((active) => !slot.skeletons.includes(active.id)));
        }
      }
    };

    await Promise.all(slots.map(runOne));
  }, [keyConfigured, resume]);

  /* Reuse restores the whole plane the run was made from — model, its dials,
     then the words. A reuse that dropped the ratio and resolution would
     re-render a different picture from the same prompt. */
  const retry = useCallback(
    (record: RunRecord) => {
      if (MODELS.some((entry) => entry.id === record.modelId)) {
        setModel(record.modelId);
        if (record.settings) setSettings(record.modelId, record.settings);
      }
      (record.surface === "image"
        ? useImagePrompt
        : record.surface === "audio"
          ? useAudioPrompt
          : useVideoPrompt).getState().setText(record.prompt);
      setViewerId(null);
      setError(null);
      setFocusNonce((n) => n + 1);
      /* A failed record's retry re-attempts the run, not just the composer
         fill: the state restoration above is synchronous (zustand sets are
         immediate), so generate reads the full plane from the stores below. */
      if (record.status === "failed") void generate();
    },
    [setModel, setSettings, generate],
  );

  const toggleFavorite = useCallback((record: RunRecord) => {
    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === record.id ? { ...entry, favorite: !entry.favorite } : entry,
      ),
    );
  }, []);

  /* A hover "Cancel Request" on a Rendering card reaches here. The request is
     fired for real on the cloud; the LAN backend rejects the attempt and the
     reason surfaces in the composer's error slot. The card's own overlay is
     already locked by the tile's local state, so a second click never fires. */
  const cancelRun = useCallback((requestId: string) => {
    if (!requestId) return;
    void (async () => {
      try {
        await cancelGeneration({ requestId });
        /* The cloud returned OK — that response is the backend's acknowledgement
           of the cancel. Flip the card out of "Rendering" into the cancelling
           message now; the poll's mid-cancel status (if it ever differs) and the
           terminal all agree with this. A LAN/failed cancel throws above and
           never marks the card, so we never claim a cancel we could not make. */
        if (alive.current) markCanceling(requestId);
      } catch (caught) {
        if (!alive.current) return;
        const message = caught instanceof Error ? caught.message : String(caught);
        setError((prev) => prev ?? `취소 요청이 실패했습니다 — ${message}`);
      }
    })();
  }, [markCanceling]);

  const deleteRuns = useCallback((records: RunRecord[]) => {
    if (records.length === 0) return;
    const ids = new Set(records.map((record) => record.id));
    setHistory((prev) => prev.filter((entry) => !ids.has(entry.id)));
    setDeleted(records);
  }, []);

  const deleteRun = useCallback((record: RunRecord) => deleteRuns([record]), [deleteRuns]);

  /* History is newest-first by construction, so the restored runs drop back
     into their own places rather than onto the top of the grid. */
  const restoreDeleted = useCallback(() => {
    if (!deleted) return;
    setHistory((prev) => {
      const here = new Set(prev.map((entry) => entry.id));
      const back = deleted.filter((entry) => !here.has(entry.id));
      if (back.length === 0) return prev;
      return [...prev, ...back].sort((a, b) => b.createdAt - a.createdAt);
    });
    setDeleted(null);
  }, [deleted]);

  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => setDeleted(null), UNDO_MS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeleted(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [deleted]);

  /* ---------- picking runs ----------

     The grid is in selection mode whenever something is picked, so the mode has
     no switch of its own: the checkbox that appears on hover is the way in, and
     the toolbar's cross is the way out. */

  const pickedSet = useMemo(() => new Set(selected), [selected]);
  const byId = useMemo(() => new Map(history.map((record) => [record.id, record])), [history]);
  const pickedRecords = useMemo(
    () => selected.map((id) => byId.get(id)).filter((record) => record !== undefined),
    [selected, byId],
  );

  /* The range gesture walks the scope the visitor is looking at, and the walk
     happens inside the handler — reading it from a dependency would rebuild the
     callback on every history change and re-render all forty tiles with it. */
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  /* A run that left the grid cannot stay picked — deleted, aged out of the cap,
     or released from the shelf while the Favorites scope was the one on screen.
     The toolbar counts what the visitor can still see it acting on. */
  const visibleIds = useMemo(() => new Set(visible.map((record) => record.id)), [visible]);
  useEffect(() => {
    setSelected((prev) => {
      const next = prev.filter((id) => visibleIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [visibleIds]);

  /* Switching scope switches what "everything picked" means, so the selection
     does not travel with it. */
  useEffect(() => {
    setSelected([]);
    rangeAnchor.current = null;
  }, [view]);

  const clearPicked = useCallback(() => {
    setSelected([]);
    rangeAnchor.current = null;
  }, []);

  const togglePick = useCallback((id: string, index: number, range: boolean) => {
    const from = rangeAnchor.current;
    rangeAnchor.current = index;
    setSelected((prev) => {
      if (range && from !== null) {
        const span = visibleRef.current
          .slice(Math.min(from, index), Math.max(from, index) + 1)
          .filter((record) => record.status !== "running")
          .map((record) => record.id);
        const held = new Set(prev);
        return [...prev, ...span.filter((entry) => !held.has(entry))];
      }
      return prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id];
    });
  }, []);

  /* Escape leaves the selection the way it leaves every other transient layer
     in the studio. The viewer owns the key while it is open. */
  useEffect(() => {
    if (selected.length === 0 || viewerId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearPicked();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected.length, viewerId, clearPicked]);

  /* One keep for the whole selection: if every picked run is already kept the
     press releases them, which is what a pressed control has to mean. */
  const favoritePicked = useCallback(() => {
    const ids = new Set(selected);
    const keep = !pickedRecords.every((record) => record.favorite === true);
    setHistory((prev) =>
      prev.map((entry) => (ids.has(entry.id) ? { ...entry, favorite: keep } : entry)),
    );
  }, [selected, pickedRecords]);

  const deletePicked = useCallback(() => {
    deleteRuns(pickedRecords);
    clearPicked();
  }, [deleteRuns, pickedRecords, clearPicked]);

  /* 추가 위치 on the toolbar files the whole selection under a freshly made
     folder, the way the source's "put these in a folder" reads. */
  const addPickedToFolder = useCallback(() => {
    if (pickedRecords.length === 0) return;
    const stamp = new Date().toLocaleDateString("ko-KR");
    const project = useProjects.getState().addProject(`폴더 ${stamp}`);
    const ids = new Set(pickedRecords.map((record) => record.id));
    setHistory((prev) =>
      prev.map((entry) => (ids.has(entry.id) ? { ...entry, projectId: project.id } : entry)),
    );
  }, [pickedRecords]);

  /* One run, saved from its card. The refusal is reported through the strip the
     composer already reserves for it — a 32px button on a picture has no room
     to explain itself, and the viewer's own Download states what to do next. */
  /* A run saved to disk gets a stamp so the feed's 다운로드됨 filter can find
     it later, mirroring the toggleFavorite write that keeps its own truth. */
  const markDownloaded = useCallback((id: string) => {
    setHistory((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, downloadedAt: Date.now() } : entry)),
    );
  }, []);

  const downloadRun = useCallback(async (record: RunRecord) => {
    const url = record.urls[0];
    if (!url) return;
    const ok = await saveFile(url, fileNameFor(record, 0));
    if (!ok) {
      setError(
        "The platform’s CDN refused the read, so this run could not be saved. Open it to save it from the browser instead.",
      );
      return;
    }
    /* A saved run stamps itself so the feed's 다운로드됨 filter can find it. */
    markDownloaded(record.id);
  }, []);

  /* Saved one at a time on purpose: browsers throttle a burst of downloads into
     a single "allow multiple files?" prompt and drop the rest, and a sequence is
     the only version that can report how far it got. */
  const downloadPicked = useCallback(async () => {
    const files = pickedRecords.filter((record) => record.urls[0]);
    if (files.length === 0) return;
    setSaving({ done: 0, total: files.length });
    let refused = 0;
    for (const [index, record] of files.entries()) {
      const ok = await saveFile(record.urls[0]!, fileNameFor(record, index));
      if (!ok) refused++;
      setSaving({ done: index + 1, total: files.length });
    }
    setSaving(null);
    if (refused > 0) {
      setError(
        refused === files.length
          ? "The platform’s CDN refused the read, so nothing could be saved. Open a run to save it from the browser instead."
          : `${refused} of ${files.length} files could not be saved — the platform’s CDN refused the read. Open those runs to save them from the browser.`,
      );
    }
  }, [pickedRecords]);

  /* An empty-gallery starter loads the composer and hands the visitor the
     caret; pressing Generate stays their call. */
  const applyStarter = useCallback(
    (text: string) => {
      (surface === "image"
        ? useImagePrompt
        : surface === "audio"
          ? useAudioPrompt
          : useVideoPrompt).getState().setText(text);
      setError(null);
      setFocusNonce((n) => n + 1);
    },
    [surface],
  );

  const openViewer = useCallback((id: string) => {
    setViewerId(id);
    setLastViewedId(id);
  }, []);
  /* A failed card's body opens its recorded failure here. A completed card goes
     to the media viewer instead, so this handler is wired only to the failed
     tile's overlay. */
  const showFailure = useCallback((id: string) => {
    if (!id) return;
    setFailureId(id);
  }, []);

  /* Build the picture-only record the Viewer renders for an element: the image,
     the element's name as its title, the element's description (or name) as its
     prompt, and a neutral 4/3 frame. It is not a real run — no model, no request,
     no regeneration — so the Viewer's run-only handlers stay inert below. */
  const openElementShowcase = useCallback((element: ElementItem) => {
    setElementShowcase(element);
  }, []);
  const elementViewerRecord = useMemo<RunRecord | null>(() => {
    if (!elementShowcase) return null;
    const url = elementShowcase.url;
    return {
      id: `el-view-${elementShowcase.id}`,
      surface: "image",
      modelId: "",
      modelLabel: elementShowcase.name,
      prompt: elementShowcase.description || elementShowcase.name,
      ratio: "4 / 3",
      meta: elementShowcase.elementId || elementShowcase.category,
      kind: "image",
      urls: url ? [url] : [],
      status: "completed",
      art: "linear-gradient(135deg, rgba(60,64,67,1), rgba(34,38,41,1))",
      createdAt: Date.now(),
    };
  }, [elementShowcase]);
  /* The showcase closes back to the grid; 삭제 drops the element from the shelf
     and the store, not the run log (a baseline viewer never filed it there). */
  const closeElementShowcase = useCallback(() => setElementShowcase(null), []);

  /* t_9ddf99e1 — the reference attachment's scoped showcase. A strip tile raised
     it; the record the viewer renders is derived from the attachment, with the
     media kind read off the role's kind map. The attachment index plays no part
     here — it only names the `@`-mention — so the viewer's existing branches
     render video, audio and image straight from this shape. */
  const referenceItem = useReferenceShowcase((state) => state.item);
  const closeReferenceShowcase = useCallback(() => useReferenceShowcase.getState().close(), []);
  const referenceViewerRecord = useMemo<RunRecord | null>(() => {
    if (!referenceItem) return null;
    const kind = ROLE_KINDS[referenceItem.role];
    const refSurface = kind === "audio" ? "audio" : kind === "video" ? "video" : "image";
    return {
      id: `ref-view-${referenceItem.id}`,
      surface: refSurface,
      modelId: "",
      modelLabel: ROLE_LABELS[referenceItem.role],
      prompt: ROLE_LABELS[referenceItem.role],
      ratio: kind === "video" ? "16 / 9" : "4 / 3",
      meta: "",
      kind,
      urls: [referenceItem.url],
      status: "completed",
      art: "linear-gradient(135deg, rgba(60,64,67,1), rgba(34,38,41,1))",
      createdAt: Date.now(),
    };
  }, [referenceItem]);
  /* A video reference sends itself down the video surface: the reference is already
     attached, so the send is just the move plus the close. An audio reference has no
     onToVideo path, so the viewer's 영상으로 전환 stays disabled there, as this build
     already has it for audio runs. */
  const toVideoFromReference = useCallback(() => {
    switchView("video");
    useReferenceShowcase.getState().close();
  }, [switchView]);
  /* 삭제 drops the reference the way the strip's × does — the 정합 removal that also
     clears a named element on the same url and the prompt handles that pointed at it —
     then closes the showcase. The media store the item lives in is the one for the
     active surface (the same mapping the strip reads). */
  const removeReferenceFromShowcase = useCallback(() => {
    if (!referenceItem) return;
    const media = model.surface === "image" ? useImageMedia.getState() : useVideoMedia.getState();
    removeStripReference(media, model, referenceItem);
    useReferenceShowcase.getState().close();
  }, [referenceItem, model]);
  /* Re-send a finished run down the video surface: the grid switches to Video,
     the picture is laid down as a reference and the words carry over. */
  const toVideoFor = useCallback(
    (record: RunRecord) => {
      const first = record.urls[0];
      if (first) {
        useVideoMedia.getState().add({ id: `video-ref-${record.id}`, url: first, role: "reference" });
      }
      useVideoPrompt.getState().setText(record.prompt);
      switchView("video");
      setViewerId(null);
    },
    [switchView],
  );
  /* ---------- the tile ⋯ menu's reach beyond the card ----------

     Everything here mirrors a row of Higgsfield's "추가 작업" menu. The element
     work builds a real @-referenceable 요소 from the run's finished media and
     threads it into the prompt; the effect row opens the viewer's edit canvas
     for the one effect (인페인트) this build can actually run; sharing copies or
     opens the platform's own intent; filing under a project moves the run's
     shelf. The effects we have no local path for are shown but disabled in the
     menu, so their handlers are never reached. */

  const makeElementFromRun = useCallback(
    (record: RunRecord, kind: "image" | "video") => {
      const url = record.urls[0];
      if (!url) return;
      void kind; // both kinds attach the same finished media; the run's url is the source
      const element: ElementItem = {
        ...ELEMENT_DEFAULTS,
        id: `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        name: nextElementName(useElements.getState().items),
        url,
        projectId: activeProjectId,
      };
      useElements.getState().add(element);
      const store = record.surface === "video" ? useVideoPrompt : useImagePrompt;
      store.getState().setText(`${store.getState().text} @${element.name}`.replace(/^\s+/, ""));
      setFocusNonce((n) => n + 1);
    },
    [activeProjectId],
  );

  const assignElementFromRun = useCallback(
    (record: RunRecord) => {
      const url = record.urls[0];
      if (!url) return;
      const element: ElementItem = {
        ...ELEMENT_DEFAULTS,
        id: `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        name: nextElementName(useElements.getState().items),
        url,
        projectId: activeProjectId,
      };
      useElements.getState().add(element);
      const store = record.surface === "video" ? useVideoPrompt : useImagePrompt;
      store.getState().setText(`${store.getState().text} @${element.name}`.replace(/^\s+/, ""));
      setFocusNonce((n) => n + 1);
    },
    [activeProjectId],
  );

  const addRunEffect = useCallback(
    (record: RunRecord, effect: string) => {
      // 인페인트 is the only effect with a local path: it opens the viewer's edit canvas.
      if (effect === "인페인트") openViewer(record.id);
    },
    [openViewer],
  );

  const shareRun = useCallback(
    (record: RunRecord, target: "link" | "x" | "whatsapp" | "pinterest" | "linkedin") => {
      const url = record.urls[0];
      if (!url) return;
      if (target === "link") {
        void navigator.clipboard?.writeText(url);
        return;
      }
      const enc = encodeURIComponent(url);
      const dest =
        target === "x"
          ? `https://twitter.com/intent/tweet?url=${enc}`
          : target === "whatsapp"
            ? `https://wa.me/?text=${enc}`
            : target === "pinterest"
              ? `https://www.pinterest.com/pin/create/button/?url=${enc}`
              : `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`;
      window.open(dest, "_blank", "noopener,noreferrer");
    },
    [],
  );

  const moveRunToProject = useCallback((record: RunRecord, projectId: string) => {
    setHistory((prev) =>
      prev.map((entry) => (entry.id === record.id ? { ...entry, projectId } : entry)),
    );
  }, []);

  const newProjectWithRun = useCallback(
    (record: RunRecord) => {
      const stamp = new Date().toLocaleDateString("ko-KR");
      const project = useProjects.getState().addProject(`폴더 ${stamp}`);
      moveRunToProject(record, project.id);
    },
    [moveRunToProject],
  );

  const tileMenuActions = useMemo<TileMenuActions>(
    () => ({
      makeElement: makeElementFromRun,
      assignElement: assignElementFromRun,
      addEffect: addRunEffect,
      share: shareRun,
      moveToProject: moveRunToProject,
      newProject: newProjectWithRun,
      projects: () =>
        useProjects.getState().projects.map((project) => ({ id: project.id, label: project.name })),
    }),
    [
      makeElementFromRun,
      assignElementFromRun,
      addRunEffect,
      shareRun,
      moveRunToProject,
      newProjectWithRun,
    ],
  );

  /* Localized repaint from the viewer's edit canvas. The composited image the
     panel hands over already carries the painted alpha hole, so the plane is
     built by hand (a model the visitor may not have seated would still repaint
     it), marked `inpaint`, and run through the very pipeline Generate uses: a
     pending skeleton, a running row, the shared watch. */
  const runInpaint = useCallback(
    async (record: RunRecord, image: string, prompt: string) => {
      const entry = getModel("krea-2-turbo");
      const settings = parseSettings(
        entry,
        useSettings.getState().byModel["krea-2-turbo"] ?? {},
      );
      const plane: GenerationPlane = {
        model: "krea-2-turbo",
        prompt: { text: prompt },
        media: { start: [{ id: "inpaint-src", url: image, role: "start" }] },
        settings,
        studio: "general",
        inpaint: true,
      };
      const startedAt = Date.now();
      const pendingId = `pending-inpaint-${startedAt}`;
      const draft: RunDraft = {
        surface: "image",
        modelId: entry.id,
        modelLabel: entry.label,
        prompt,
        ratio: record.ratio,
        meta: record.meta ?? metaOf(entry, settings),
        settings,
        createdAt: startedAt,
        projectId: DEFAULT_PROJECT_ID,
      };
      setError(null);
      setInpaintBusy(true);
      setRuns((prev) => [
        ...prev,
        { id: pendingId, surface: "image", modelLabel: entry.label, ratio: draft.ratio, startedAt },
      ]);
      try {
        const queued = await submitGeneration(plane);
        setHistory((prev) => {
          const next = [...runningRows(queued.requestId, 1, draft), ...prev];
          void saveHistory(next);
          return next;
        });
        setRuns((prev) => prev.filter((active) => active.id !== pendingId));
        await resume(queued.requestId, draft, 1);
      } catch (caught) {
        const message = describeError(caught);
        setError((prev) => prev ?? message);
        setRuns((prev) => prev.filter((active) => active.id !== pendingId));
      } finally {
        setInpaintBusy(false);
      }
    },
    [resume],
  );
  /* Expand a saved picture outward by padding (the "확장 및 자르기" apply):
     re-sends one existing image to the comfy-webui outpaint task, then runs it
     through the very watch Generate and repaint use, so the widened picture
     lands on the grid as a fresh run. It is not a catalogue generation, so it
     bypasses submitGeneration and calls the dedicated outpaint action. */
  const runOutpaint = useCallback(
    async (
      record: RunRecord,
      image: string,
      pads: { pad_left: number; pad_right: number; pad_top: number; pad_bottom: number },
      prompt: string,
    ) => {
      const entry = getModel("krea-2-turbo");
      const settings = parseSettings(
        entry,
        useSettings.getState().byModel["krea-2-turbo"] ?? {},
      );
      const startedAt = Date.now();
      const pendingId = `pending-outpaint-${startedAt}`;
      const draft: RunDraft = {
        surface: "image",
        modelId: entry.id,
        modelLabel: entry.label,
        prompt,
        ratio: record.ratio,
        meta: record.meta ?? metaOf(entry, settings),
        settings,
        createdAt: startedAt,
        projectId: DEFAULT_PROJECT_ID,
      };
      setError(null);
      setOutpaintBusy(true);
      setRuns((prev) => [
        ...prev,
        { id: pendingId, surface: "image", modelLabel: entry.label, ratio: draft.ratio, startedAt },
      ]);
      try {
        const queued = await submitOutpaint({ image, prompt, ...pads });
        setHistory((prev) => {
          const next = [...runningRows(queued.requestId, 1, draft), ...prev];
          void saveHistory(next);
          return next;
        });
        setRuns((prev) => prev.filter((active) => active.id !== pendingId));
        await resume(queued.requestId, draft, 1);
      } catch (caught) {
        const message = describeError(caught);
        setError((prev) => prev ?? message);
        setRuns((prev) => prev.filter((active) => active.id !== pendingId));
      } finally {
        setOutpaintBusy(false);
      }
    },
    [resume],
  );
  /* A pure crop is cut in the browser, so it lands instantly as a finished run
     carrying the cropped data URI as its media — no backend call is needed. */
  const runCrop = useCallback(
    (record: RunRecord, image: string) => {
      const startedAt = Date.now();
      const id = `crop-${startedAt}`;
      const run: RunRecord = {
        id,
        requestId: id,
        surface: "image",
        modelId: "krea-2-turbo",
        modelLabel: getModel("krea-2-turbo").label,
        prompt: record.prompt,
        ratio: record.ratio,
        meta: record.meta,
        kind: "image",
        urls: [image],
        status: "completed",
        art: artFor("image", hueOf(id), id),
        createdAt: startedAt,
        projectId: DEFAULT_PROJECT_ID,
        durationSeconds: 0,
      };
      setHistory((prev) => {
        const next = [run, ...prev];
        void saveHistory(next);
        return next;
      });
      markFresh([id]);
    },
    [markFresh],
  );
  const openKeys = useCallback(() => setKeysOpen(true), []);
  const runGenerate = useCallback(() => void generate(), [generate]);
  const downloadSelection = useCallback(() => void downloadPicked(), [downloadPicked]);
  const dismissDeleted = useCallback(() => setDeleted(null), []);
  const viewerItem = viewerId
    ? (history.find((record) => record.id === viewerId && record.status !== "running") ?? null)
    : null;
  /* The failed run the detail dialog shows. Resolved from the run log by row id;
     a deleted or aged-out row resolves to null, which the dialog renders as a
     plain "details unavailable" message rather than crashing. */
  const failureRecord = failureId
    ? (history.find((record) => record.id === failureId) ?? null)
    : null;

  /* The walk follows the scope on screen, not the whole log: arrowing out of
     the viewer never lands on a run the grid behind it is not showing. At
     either end there is no neighbour to hand down, and the step goes quiet. */
  const viewable = useMemo(
    () => visible.filter((record) => record.status !== "running"),
    [visible],
  );
  const prevRun = viewerId ? stepRun(viewable, viewerId, -1) : null;
  const nextRun = viewerId ? stepRun(viewable, viewerId, 1) : null;

  const runsHere = useMemo(
    () => runs.filter((active) => view === "assets" || active.surface === view),
    [runs, view],
  );
  const busy = runs.length > 0 || history.some((record) => record.status === "running");

  /* One composer element, two surfaces: general docks it inside .ohf-main,
     cinematic docks it inside the Cinematic Studio screen. Defined once so the
     props live in a single place and both branches reuse the same element. */
  const composerEl = (
    <Composer
      surface={surface}
      model={model}
      mode={mode}
      cinemaMode={cinemaMode}
      onCinemaMode={(next) => {
        setCinemaMode(next);
        // "cinematic" survives only in old saved state; every live rail
        // answer is image or video, and only those move the dock.
        if (next !== "cinematic") alignDockToMode(next);
      }}
      generating={busy}
      error={error}
      focusNonce={focusNonce}
      history={history}
      selecting={selected.length > 0}
      selection={
        <SelectionBar
          records={pickedRecords}
          saving={saving}
          menuActions={tileMenuActions}
          onOpen={openViewer}
          onReuse={retry}
          onDownload={downloadSelection}
          onFavorite={favoritePicked}
          onDelete={deletePicked}
          onAddToFolder={addPickedToFolder}
          onClose={clearPicked}
        />
      }
      onError={setError}
      onGenerate={runGenerate}
      notice={
        deleted && (
          <UndoBar
            records={deleted}
            onUndo={restoreDeleted}
            onDismiss={dismissDeleted}
          />
        )
      }
    />
  );

  return (
    <div className={`ohf ${fontClassName}`} style={{ "--ohf-grain": GRAIN_URI } as React.CSSProperties}>
      {mode === "cinema" ? (
        <CinemaStudioScreen
          composer={composerEl}
          rail={<CinemaSidebar />}
          history={history}
          onOpenRun={openViewer}
          onShowFailure={showFailure}
          onOpenElement={openElementShowcase}
        />
      ) : projectViewOpen ? (
        <ProjectScreen
          onExit={closeProject}
          projectId={projectViewId}
        />
      ) : (
        <div className="ohf-shell">
        <main className="ohf-main">
          <Topbar
            view={view}
            onView={switchView}
            busy={busy}
            keyConfigured={keyConfigured}
            onKeys={openKeys}
            query={query}
            onQuery={setQuery}
            onAssets={openAssets}
            mode={mode}
            /* One switch (user ruling): plain goes straight to the cinematic
               screen, which opens on its image tab; any cinema state returns to
               plain. The pult rail inside the screen is a separate question and
               is deliberately not connected to this button. */
            onToggle={() => {
              if (mode === "general") {
                setMode("cinema");
                setCinemaMode("image");
                alignDockToMode("image");
              } else {
                setMode("general");
                setCinemaMode("image");
              }
            }}
          />


          {/* t_b8a39dd7 — HF's column layout: when on video/audio the body splits
              into a left create card (20rem) beside the feed (1fr), matching
              HF's grid-cols-[20rem_1fr] gap-2 px-4 pb-2 measured at :9222.
              HF's feed controls (tabs, sort) live inside the right column header
              (measured at x=361 y=55, h=32), so FeedHeader moves there too. */}
          {surface === "video" ? (
            /* HF /ko/ai/video?model=minimax_h3 정적 화면 이식(t_bb8f3edb):
               플레이트·생성 폼·피드 컬럼을 GT 306 요소 실측 그대로 미러링했다. */
            <VideoSurface />
          ) : surface === "audio" ? (
            <div className="ohf-create-feed-grid">
              <div className="ohf-create-col">
                <GeneralCreateTabs
                  surface={surface}
                  model={model}
                  values={modelValues ?? {}}
                  onModel={setModel}
                  onSetting={(patch) => setSettings(model.id, patch)}
                  history={history}
                  error={error}
                  onError={setError}
                  notice={deleted && (
                    <UndoBar
                      records={deleted}
                      onUndo={restoreDeleted}
                      onDismiss={dismissDeleted}
                    />
                  )}
                  selection={selected.length > 0 && (
                    <SelectionBar
                      records={pickedRecords}
                      saving={saving}
                      menuActions={tileMenuActions}
                      onOpen={openViewer}
                      onReuse={retry}
                      onDownload={downloadSelection}
                      onFavorite={favoritePicked}
                      onDelete={deletePicked}
                      onAddToFolder={addPickedToFolder}
                      onClose={clearPicked}
                    />
                  )}
                  onGenerate={runGenerate}
                />
              </div>
              <div className="ohf-feed-col">
                <FeedHeader feedTabs panel={feedPanel} onPanel={setFeedPanel} />
                {feedPanel === "showcase" ? (
                  /* 착지 전 기본 표시: 로컬 히스토리 타일 16개(241×241)를
                     HF의 쇼케이스 판으로 전면 교체한 operator ruling의 결과.
                     로컬 히스토리는 기록 탭을 눌러 되찾는다. */
                  <FeedShowcase />
                ) : feedPanel === "guide" ? (
                  <FeedGuide />
                ) : (
                <Gallery
                  view={view}
                  surface={surface}
                  items={visible}
                  layout={feed.layout}
                  splitByDate={feed.splitByDate}
                  cardSize={feed.cardSize}
                  fit={feed.fit}
                  runs={runsHere}
                  freshIds={freshIds}
                  picked={pickedSet}
                  onOpen={openViewer}
                  onShowFailure={showFailure}
                  onPick={togglePick}
                  onReuse={retry}
                  onFavorite={toggleFavorite}
                  onDownload={downloadRun}
                  onToVideo={toVideoFor}
                  lastViewedId={lastViewedId}
                  commentCounts={commentCounts}
                  onDelete={deleteRun}
                  menuActions={tileMenuActions}
                  onStarter={applyStarter}
                  onCancel={cancelRun}
                  cancelingIds={cancelingIds}
                  galleryRef={galleryRef}
                />
                )}
              </div>
            </div>
          ) : (
            <>
              <FeedHeader />
              <Gallery
                view={view}
                surface={surface}
                items={visible}
                layout={feed.layout}
                splitByDate={feed.splitByDate}
                cardSize={feed.cardSize}
                fit={feed.fit}
                runs={runsHere}
                freshIds={freshIds}
                picked={pickedSet}
                onOpen={openViewer}
                onShowFailure={showFailure}
                onPick={togglePick}
                onReuse={retry}
                onFavorite={toggleFavorite}
                onDownload={downloadRun}
                onToVideo={toVideoFor}
                lastViewedId={lastViewedId}
                commentCounts={commentCounts}
                onDelete={deleteRun}
                menuActions={tileMenuActions}
                onStarter={applyStarter}
                onCancel={cancelRun}
                cancelingIds={cancelingIds}
                galleryRef={galleryRef}
              />
              {composerEl}
            </>
          )}
        </main>

        {assetsAllOpen && (
          /* Higgsfield's /asset/all, mirrored: every surface's finished runs in
             one full-screen browse, selectable, opening the viewer — the same
             grid the studio renders, widened to the whole history. */
          <div className="ohf-assets-all" role="dialog" aria-label="에셋 전체 보기">
            <header className="ohf-assets-all-head">
              <span className="ohf-assets-all-title">에셋</span>
              <span className="ohf-assets-all-count">{assetsItems.length}개</span>
              {assetsAllScope === "elements" && (
                /* 요소 scope's CSV toolbar: 내보내기 writes every record the rail's
                   count names; 가져오기 opens the hidden file input. The close button
                   stays where it was — nothing about the existing header moves. */
                <div className="ohf-assets-all-csv">
                  <button
                    type="button"
                    className="ohf-csv-btn"
                    onClick={csvExport}
                    disabled={elementsList.length === 0}
                    title="요소를 CSV로 내보내기"
                  >
                    내보내기
                  </button>
                  <button
                    type="button"
                    className="ohf-csv-btn"
                    onClick={() => csvInputRef.current?.click()}
                    title="CSV로 요소 가져오기"
                  >
                    가져오기
                  </button>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="ohf-csv-input"
                    onChange={csvImportFile}
                    hidden
                  />
                </div>
              )}
              <button
                type="button"
                className="ohf-assets-all-close"
                aria-label="에셋 닫기"
                onClick={closeAssetsAll}
              >
                <CloseIcon size={14} />
              </button>
            </header>
            <div className="ohf-assets-all-body">
              <AssetSidebar
                counts={assetsCounts}
                scope={assetsAllScope}
                onSelect={setAssetsAllScope}
              />
              {assetsAllScope === "projects" && projectsList.length > 0 && (
                /* Project rail: visible rows for each project, so the visitor
                   can enter the detail surface. A row click raises the
                   ProjectScreen and dismisses the asset browser. */
                <div className="ohf-project-rail" aria-label="프로젝트 목록">
                  {projectsList.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className="ohf-project-rail-row"
                      onClick={() => {
                        openProjectView(project.id);
                        closeAssetsAll();
                      }}
                      title={`열기: ${project.name}`}
                    >
                      <span className="ohf-project-rail-name">{project.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <Gallery
                view="assets"
                surface={surface}
                items={assetsItems}
                layout={feed.layout}
                /* HF's /asset/all always breaks the grid into days; the rail's own
                   grouping is separate, so the date split stays on here. */
                splitByDate
                cardSize={feed.cardSize}
                fit={feed.fit}
                runs={runsHere}
                freshIds={freshIds}
                picked={pickedSet}
                onOpen={openViewer}
                onShowFailure={showFailure}
                onPick={togglePick}
                onReuse={retry}
                onFavorite={toggleFavorite}
                onDownload={downloadRun}
                onToVideo={toVideoFor}
                lastViewedId={lastViewedId}
                commentCounts={commentCounts}
                onDelete={deleteRun}
                menuActions={tileMenuActions}
                onStarter={applyStarter}
                onCancel={cancelRun}
                cancelingIds={cancelingIds}
                galleryRef={assetsScrollRef}
              />
            </div>
          </div>
        )}
        </div>
      )}

      {/* The showcase, the key dialog and the failure dialog mount here —
          outside the mode branch — so a tile opened in the cinema canvas finds
          the same showcase the gallery hands it. Inside the general shell alone
          they would never render while the studio is up, and a cinema tile click
          would open nothing. */}
      {viewerItem && (
        <Viewer
          item={viewerItem}
          onPrev={prevRun ? () => setViewerId(prevRun.id) : undefined}
          onNext={nextRun ? () => setViewerId(nextRun.id) : undefined}
          onClose={() => setViewerId(null)}
          onReuse={() => retry(viewerItem)}
          onToVideo={() => toVideoFor(viewerItem)}
          onCommentCount={(count) =>
            setCommentCounts((prev) => ({ ...prev, [viewerItem.id]: count }))
          }
          onInpaint={(image, prompt) => void runInpaint(viewerItem, image, prompt)}
          onOutpaint={(image, pads, prompt) => void runOutpaint(viewerItem, image, pads, prompt)}
          onApplyCrop={(image) => void runCrop(viewerItem, image)}
          outpaintBusy={outpaintBusy}
          busy={inpaintBusy}
          onFavorite={() => toggleFavorite(viewerItem)}
          onDownload={() => void downloadRun(viewerItem)}
          /* The viewer is released along with the run, so undoing the
             delete restores it to the grid and not back over the studio. */
          onDelete={() => {
            setViewerId(null);
            deleteRun(viewerItem);
          }}
        />
      )}
      {keysOpen && (
        <KeyModal
          configured={keyConfigured}
          onClose={() => setKeysOpen(false)}
          onSaved={() => {
            setKeyConfigured(true);
            setKeysOpen(false);
            setError(null);
          }}
          onCleared={() => {
            setKeyConfigured(false);
          }}
        />
      )}
      {failureId && (
        <FailureModal record={failureRecord} onClose={() => setFailureId(null)} />
      )}
      {/* The 요소 showcase reuses the same Viewer the runs open, so a 내 요소 tile
          click lands on a real dialog instead of dead chrome. The run-only actions
          (다시 만들기 · 즐겨찾기) stay inert for an element — it is a stored picture,
          not a generation — while 다운로드 saves its file and 삭제 drops it from the
          요소 shelf and the store. */}
      {elementViewerRecord && elementShowcase && (
        <Viewer
          item={elementViewerRecord}
          onClose={closeElementShowcase}
          onReuse={() => {}}
          onFavorite={() => {}}
          onDownload={() => void downloadRun(elementViewerRecord)}
          onDelete={() => {
            useElements.getState().remove(elementShowcase.id);
            closeElementShowcase();
          }}
        />
      )}
      {/* t_9ddf99e1 — a reference attachment's scoped showcase. A strip tile raised
          this; the viewer is fed the record derived above so a video or audio
          reference renders through the same branches a finished run uses — the Info
          tab carries the role's name, the media is the native player, and the rail
          foot is the documented shell. 다운로드 saves the attached file; 영상으로 전환
          is wired only for a video reference (audio has no path, so the button stays
          disabled as documented). 다시 만들기/좋아요 stay inert — a reference is an
          input, not a generation, the same way they stay inert for an element. The
          레퍼런스 button inside the viewer is already aria-disabled in this build.
          삭제 is the strip's 정합 removal, so it clears the named element too. */}
      {referenceViewerRecord && referenceItem && (
        <Viewer
          item={referenceViewerRecord}
          onClose={closeReferenceShowcase}
          onReuse={() => {}}
          onFavorite={() => {}}
          onToVideo={referenceViewerRecord.kind === "video" ? toVideoFromReference : undefined}
          onDownload={() => void downloadRun(referenceViewerRecord)}
          onDelete={removeReferenceFromShowcase}
        />
      )}
    </div>
  );
}

/* Deletion's receipt, in the strip the composer already reserves for the
   generation error — the studio gains no second floating layer. The hairline
   drains across the bar so the window to change your mind is visible, not
   guessed at. */
function UndoBar({
  records,
  onUndo,
  onDismiss,
}: {
  records: RunRecord[];
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const one = records.length === 1 ? records[0] : null;
  /* The words name the run to the person who wrote them; the model does not —
     a grid made on one model reads back as the same label over and over. Runs
     submitted without a prompt keep the model as their only name. The verb
     leads so a long prompt loses its tail to the ellipsis, not the sentence. */
  const subject = one
    ? one.prompt
      ? `“${one.prompt}”`
      : `${one.modelLabel} run`
    : `${records.length} runs`;

  return (
    <div className="ohf-undo" role="status">
      <span
        className="ohf-undo-drain"
        style={{ animationDuration: `${UNDO_MS}ms` }}
        aria-hidden
      />
      <span className="ohf-undo-text">{`Deleted ${subject}`}</span>
      <button type="button" className="ohf-undo-act" onClick={onUndo}>
        <UndoIcon />
        Undo
      </button>
      <button
        type="button"
        className="ohf-icon-btn ohf-icon-btn--ghost"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <CloseIcon size={12} />
      </button>
    </div>
  );
}
