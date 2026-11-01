"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";

import { parseSettings } from "@/generation/catalog";
import type { ModelEntry, Surface } from "@/generation/catalog";
import { MAX_BATCH, useActive } from "@/generation/stores/active";
import { useElements } from "@/generation/stores/elements";
import { useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { useSettings } from "@/generation/stores/settings";
import { projectLabel, useProjects } from "@/generation/stores/projects";

import { swatchFor } from "./artwork";
import { AssetPicker } from "./asset-picker";
import { PROMPT_PLACEHOLDERS, countSetting } from "./data";
import { ElementPopover } from "./element-popover";
import { CameraPopover, CharacterPopover, CinemaTiles } from "./cinema-popover";
import type { CinemaMode, StudioMode } from "./studio-mode";
import type { RunRecord } from "./history";
import { CaretDownIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, HammerIcon, ImageIcon, MinusIcon, PlusIcon, VideoIcon, WarningIcon } from "./icons";
import { MediaStrip, useMediaTray } from "./media-tray";
import { ModelIcon, modelIconSrc } from "./model-icon";
import { ModelPicker } from "./model-picker";
import { SettingPill, SettingPopover } from "./settings";
import { ProjectDialog } from "./project-dialog";

/* Overlay ids: the two fixed panels, or one setting addressed by its catalog
   key — the rail renders whatever the model declares, so the ids cannot be a
   closed union. */
const PICKER = "picker";
const ASSETS = "assets";
const ELEMENTS = "elements";
const SETTING = "setting:";
const CHARACTER = "character";
const CAMERA = "camera";

/* What the studio itself can deliver for a model that carries no count of its
   own: one platform request per result. */
const STUDIO_COUNTS = Array.from({ length: MAX_BATCH }, (_, index) => index + 1);

/** Breathing room between a popover and the control it opened from. */
const POPOVER_GAP = 8;

/** Declared widths keep an opening popover inside the composer's own column. */
function popoverWidth(id: string, model: ModelEntry): number {
  if (id === PICKER || id === ASSETS) return 560;
  if (id === ELEMENTS) return 320;
  if (id === CHARACTER) return 360;
  if (id === CAMERA) return 400;
  /* A list of an enum's values is the narrow panel; a slider needs its travel. */
  if (id.startsWith(SETTING) && model.settings[id.slice(SETTING.length)]?.type === "enum") {
    return 216;
  }
  return 268;
}

export function Composer({
  surface,
  model,
  mode,
  cinemaMode,
  onCinemaMode,
  generating,
  error,
  focusNonce,
  history,
  notice,
  selection,
  selecting,
  onError,
  onGenerate,
}: {
  surface: Surface;
  model: ModelEntry;
  mode: StudioMode;
  cinemaMode: CinemaMode;
  onCinemaMode: (next: CinemaMode) => void;
  generating: boolean;
  error: string | null;
  focusNonce: number;
  /* The finished runs are attachable inputs, so the asset picker reads the same
     log the gallery renders. */
  history: RunRecord[];
  /* Transient receipts from the gallery share the composer's banner strip
     rather than adding a floating layer of their own. */
  notice?: ReactNode;
  /* The bulk toolbar takes the composer's slot while runs are picked; it is
     always mounted so it can animate away, and states its own presence. */
  selection: ReactNode;
  selecting: boolean;
  onError: (message: string | null) => void;
  onGenerate: () => void;
}) {
  const setModel = useActive((state) => state.setModel);
  const batch = useActive((state) => state.batch);
  const setBatch = useActive((state) => state.setBatch);
  const imagePrompt = useImagePrompt();
  const videoPrompt = useVideoPrompt();
  const prompt = surface === "image" ? imagePrompt : videoPrompt;
  const settings = useSettings();
  const values = parseSettings(model, settings.byModel[model.id] ?? {});
  const tray = useMediaTray(model, onError);
  const elements = useElements((state) => state.items);

  const [overlay, setOverlay] = useState<string | null>(null);
  /* The shelf the asset panel should land on. The @ button asks for elements
     by name; the + button lets the panel find the shelf that holds something. */
  const [pickerTab, setPickerTab] = useState<"elements" | null>(null);
  /* The cinematic surface loads a project; the chips under the dock are how it
     is loaded, and the dialog is how a new one is named. */
  const projects = useProjects((state) => state.projects);
  const activeProjectId = useProjects((state) => state.activeProjectId);
  const setActiveProject = useProjects((state) => state.setActive);
  const addProject = useProjects((state) => state.addProject);
  const [projectDialog, setProjectDialog] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [popClear, setPopClear] = useState<number | null>(null);
  const [shortcut, setShortcut] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const controlsFlowRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  /* A run in flight is not a lock: it holds its own tile in the grid, so the
     only thing that can stop a press is having nothing to say. */
  const disabled = prompt.text.trim().length === 0;

  /* One batch control, two mechanisms. A model that declares its own
     results-per-request gets that setting written; the rest are submitted once
     per result by the studio. Either way the control means "results per press",
     so the model's own count key never also appears as a settings pill. */
  const native = countSetting(model);
  const counts = native ? native.counts : STUDIO_COUNTS;
  const batchValue = native ? Number(values[native.key]) || counts[0]! : batch;
  const settingKeys = Object.keys(model.settings).filter((key) => key !== native?.key);

  /* The rail shows only what a run usually needs; the inference knobs wait
     behind the chevron at the rail's far end. The rule is the visitor's own:
     ">>" appears when more options wait beyond, "<<" when the basic view is
     reachable again — never both at once, and never either when a model has
     no hidden settings at all. */
  const moreKeys = settingKeys.filter((key) => model.settings[key]?.advanced);
  const baseKeys = settingKeys.filter((key) => !model.settings[key]?.advanced);
  const [showMore, setShowMore] = useState(false);
  /* Edge controls, ported from the live app's option strip: when the row of
     non-model options overflows, a pair of chevrons rides the row's edges and
     pages it sideways — an edge that has nothing left to reveal goes quiet. */
  const [edgeL, setEdgeL] = useState(false);
  const [edgeR, setEdgeR] = useState(false);
  const visibleKeys = showMore ? settingKeys : baseKeys;

  function setBatchValue(next: number) {
    if (!native) {
      setBatch(next);
      return;
    }
    settings.set(model.id, { [native.key]: native.kind === "enum" ? String(next) : next });
  }

  /* Dropping an @name into the prompt where the caret rests, then handing the
     field back at the end of the mention so typing continues without a re-click. */
  function insertMention(name: string) {
    const el = promptRef.current;
    const mention = `@${name} `;
    const caret = el ? el.selectionStart : prompt.text.length;
    prompt.setText(prompt.text.slice(0, caret) + mention + prompt.text.slice(caret));
    setOverlay(null);
    requestAnimationFrame(() => {
      el?.focus();
      const after = caret + mention.length;
      el?.setSelectionRange(after, after);
    });
  }

  /* The controls are TWO REGIONS (the user's model): a FIXED left group (+, @,
     the model) that never scrolls, and a VARIABLE region (.ohf-controls-flow)
     holding every remaining button. A plate is shown by exactly one test —
     the variable buttons' total width is greater than the variable region can
     show (flow.scrollWidth > flow.clientWidth). When it is not, both plates
     hide. Once scrolled, the left plate answers "there is something to the
     left" and the right one disappears at the far end. */
  useLayoutEffect(() => {
    const flow = controlsFlowRef.current;
    if (!flow) return;
    const read = () => {
      const sl = Math.round(flow.scrollLeft);
      const cw = Math.round(flow.clientWidth);
      const sw = Math.round(flow.scrollWidth);
      /* The user's arithmetic, read as geometry: the buttons are wider than the
         region exactly when the LAST button's own edge falls outside the region's
         right edge. Measuring that edge, not the scroll width, keeps the plates'
         own 34px footprint out of the verdict — an active plate must never be the
         reason the plate is said to be needed. */
      const btns = [...flow.children].filter((el) => !el.classList.contains("ohf-edge")) as HTMLElement[];
      const last = btns[btns.length - 1];
      const overflows = !!last && last.getBoundingClientRect().right > flow.getBoundingClientRect().right + 1; /* all the buttons together are wider than the region */
      const atEnd = sl + cw >= sw; /* nothing further to the right */
      setEdgeR(overflows && !atEnd);
      setEdgeL(sl > 0);
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(flow);
    /* A smooth glide never fires a final scroll event — an edge could keep
       answering from mid-glide. The position is watched per frame and only a
       settled one is read (two matching frames); a rest 1px short of the end
       is squared to the end first, so a sliver cannot keep a plate lit. */
    let last = -1,
      still = 0,
      raf = 0;
    const watch = () => {
      const x = flow.scrollLeft;
      if (x === last) {
        if (++still >= 2) {
          const end = Math.round(flow.scrollWidth - flow.clientWidth);
          if (x < end && end - x <= 1) flow.scrollLeft = end;
          read();
          still = 0;
        }
      } else {
        still = 0;
      }
      last = x;
      raf = requestAnimationFrame(watch);
    };
    raf = requestAnimationFrame(watch);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [overlay, showMore, model.id]);

  /* The dock floats over the gallery, so the gallery cannot reserve its height
     from layout. It reads it from here instead, and the last row keeps clearing
     a composer that grew — a long prompt, a media strip, the undo receipt. */
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const observer = new ResizeObserver(() => {
      dock.parentElement?.style.setProperty("--ohf-dock-h", `${dock.offsetHeight}px`);
    });
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);

  /* The assets browser rises above the composer wrap, so its ceiling is the top
     bar's underside rather than the window's edge. The dock grows as the
     composer grows — the attachment strip, a long prompt, the undo receipt — so
     the room cannot be a constant: it is measured while the panel is open, on
     the wrap's own resize and on any window resize, and handed to CSS as
     --ohf-pop-clear. The 20px taken off the measurement is the panel's 12px
     standoff plus a little breath, so its top edge lands clear of the nav; the
     140px floor keeps the head and tabs whole before the scroll body folds. */
  useEffect(() => {
    if (overlay !== ASSETS) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const read = () => {
      const bar = document.querySelector<HTMLElement>(".ohf-topbar");
      const underside = bar ? bar.getBoundingClientRect().bottom : 0;
      const room = wrap.getBoundingClientRect().top - underside - POPOVER_GAP - 12;
      setPopClear(Math.max(140, Math.round(room)));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(wrap);
    window.addEventListener("resize", read);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [overlay]);

  /* The streaming area scrolls sideways, and a container that scrolls one way
     cannot also let things escape above the other way — a tip that belongs to a
     control inside it is clipped there. The live app solves this by keeping its
     tooltips OUTSIDE the scroller; we mirror that: one tip, carried outside the
     dock's clipping layers, anchored above the control being hovered or
     focused, and it follows the control while the region scrolls beneath a
     still cursor. Controls outside the streaming area keep their own ::after
     tip, which nothing clips. */
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    let hovered: Element | null = null;
    const show = (el: Element | null) => {
      if (!el) {
        setTip(null);
        return;
      }
      /* An open panel already says what the control is; a tip would sit on it. */
      if (el.getAttribute("aria-expanded") === "true") {
        setTip(null);
        return;
      }
      const q = el.getBoundingClientRect();
      setTip({ text: el.getAttribute("data-tip") || "", x: q.left + q.width / 2, y: q.top - 8 });
    };
    const follow = () => {
      if (hovered) show(hovered);
    };
    const within = (el: Element | null) => !!el?.closest(".ohf-stream-area");
    const onOver = (event: PointerEvent) => {
      const el = (event.target as Element)?.closest?.("[data-tip]") ?? null;
      if (within(el)) {
        hovered = el;
        show(el);
      }
    };
    const onOut = (event: PointerEvent) => {
      const el = (event.target as Element)?.closest?.("[data-tip]") ?? null;
      if (el === hovered) {
        hovered = null;
        setTip(null);
      }
    };
    const onFocus = () => {
      const el = document.activeElement?.closest("[data-tip]") ?? null;
      if (within(el)) {
        hovered = el;
        show(el);
      }
    };
    const onBlur = () => {
      hovered = null;
      setTip(null);
    };
    dock.addEventListener("pointerover", onOver, true);
    dock.addEventListener("pointerout", onOut, true);
    dock.addEventListener("focusin", onFocus, true);
    dock.addEventListener("focusout", onBlur, true);
    /* Scrolling happens inside the flow and does not bubble; capture catches it. */
    dock.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      dock.removeEventListener("pointerover", onOver, true);
      dock.removeEventListener("pointerout", onOut, true);
      dock.removeEventListener("focusin", onFocus, true);
      dock.removeEventListener("focusout", onBlur, true);
      dock.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, []);

  useEffect(() => {
    if (!overlay) return;
    const onPointerDown = (event: PointerEvent) => {
      /* Portaled modals live outside the wrap by design and are their own
         dismissers — reaching through them would close the picker underneath
         every click made inside a crop or a lightbox. */
      if ((event.target as Element)?.closest?.(".ohf-v2-scrim, .ohf-modal-backdrop")) return;
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOverlay(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOverlay(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [overlay]);

  /* Auto-grow the prompt, including when text is set programmatically — and
     again when the column narrows, because the field shares its line with the
     attachment now and the same text rewraps onto more of them. Only a width
     change re-measures: reacting to the height we just set would loop. */
  useEffect(() => {
    const el = promptRef.current;
    if (!el) return;
    const grow = () => {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.2)}px`;
    };
    grow();
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      grow();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [prompt.text]);

  useEffect(() => {
    if (focusNonce > 0) promptRef.current?.focus();
  }, [focusNonce]);

  /* A panel anchored to a control the visitor can no longer see is a stray
     plate — the swap closes whatever the composer had open. */
  useEffect(() => {
    if (selecting) setOverlay(null);
  }, [selecting]);

  // Rendered only after mount: the modifier is the visitor's, not the server's.
  useEffect(() => {
    setShortcut(/Mac|iP(hone|ad|od)/.test(navigator.userAgent) ? "⌘↵" : "Ctrl↵");
  }, []);

  /* Popovers are positioned by the composer so the wide ones stay inside its
     column, but they open off the control that summoned them: the anchor
     travels to the trigger's left edge, clamped to the column, and rises from
     just above the trigger's own top rather than from the whole dock.
     One thing outranks the trigger: the attachments. A panel laid over the
     frames already on the plane makes the visitor choose blind, so where the
     strip is present every panel clears it. */
  function toggle(next: string, trigger: HTMLElement) {
    if (overlay === next) {
      setOverlay(null);
      return;
    }
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wrapBox = wrap.getBoundingClientRect();
    const triggerBox = trigger.getBoundingClientRect();
    const strip = wrap.querySelector(".ohf-strip");
    const ceiling = strip
      ? Math.min(triggerBox.top, strip.getBoundingClientRect().top)
      : triggerBox.top;
    const available = wrap.clientWidth;
    const width = Math.min(popoverWidth(next, model), available);
    /* The camera sheet is centred on its tile the way the app floats it,
       clamped into the column; every other panel opens off the trigger's left
       edge as before. */
    const raw =
      next === CAMERA
        ? triggerBox.left + triggerBox.width / 2 - wrapBox.left - width / 2
        : triggerBox.left - wrapBox.left;
    setAnchor({
      x: Math.round(Math.max(0, Math.min(raw, available - width))),
      y: Math.round(wrapBox.bottom - ceiling + POPOVER_GAP),
    });
    setOverlay(next);
  }

  const attachLabel = tray.allFull ? "Change the inputs" : "Add an input";
  const settingKey = overlay?.startsWith(SETTING) ? overlay.slice(SETTING.length) : null;
  const generateLabel = batchValue > 1 ? `Generate ${batchValue} results` : "Generate";
  const generateTip = disabled ? "Write a prompt first" : `${generateLabel} · ${shortcut ?? "⌘↵"}`;

  return (
    <div className="ohf-dock" ref={dockRef} data-selecting={selecting}>
      <div
        className="ohf-composer-wrap ohf-enter-2"
        ref={wrapRef}
        style={
          {
            "--ohf-pop-x": `${anchor.x}px`,
            "--ohf-pop-y": `${anchor.y}px`,
            "--ohf-pop-clear": popClear === null ? undefined : `${popClear}px`,
          } as CSSProperties
        }
      >
        {notice}

        {error && (
          <div className="ohf-alert" role="alert">
            <span className="ohf-alert-ic">
              <WarningIcon />
            </span>
            <span className="ohf-alert-text">{error}</span>
            <button
              type="button"
              className="ohf-icon-btn ohf-icon-btn--ghost"
              aria-label="Dismiss error"
              title="Dismiss error"
              onClick={() => onError(null)}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        )}

        {settingKey && <SettingPopover model={model} settingKey={settingKey} values={values} />}
        {overlay === CHARACTER && <CharacterPopover onClose={() => setOverlay(null)} />}
        {overlay === CAMERA && <CameraPopover onClose={() => setOverlay(null)} />}
        {overlay === ELEMENTS && (
          <ElementPopover
            trayItems={tray.items}
            mode={mode}
            onMention={insertMention}
            onClose={() => setOverlay(null)}
          />
        )}
        {overlay === ASSETS && (
          <AssetPicker
            model={model}
            items={tray.items}
            uploads={tray.uploads}
            history={history}
            staged={tray.staged}
            uploading={tray.uploading}
            initialTab={pickerTab ?? undefined}
            onUpload={tray.begin}
            onApply={tray.apply}
            onForget={tray.forget}
            onClose={() => setOverlay(null)}
          />
        )}
        {overlay === PICKER && (
          <ModelPicker
            selectedId={model.id}
            surface={surface}
            onPick={(next) => {
              setModel(next.id);
              setOverlay(null);
            }}
            onClose={() => setOverlay(null)}
          />
        )}

        {/* One slot, two instruments. Both are laid on the same cell and
            aligned to the same bottom edge, so the dock never changes height
            and the toolbar rises exactly where the composer's rail was. */}
        <div
          className="ohf-swap"
          data-tour-anchor={
            mode === "cinema"
              ? "tour-cinema-form"
              : surface === "video"
                ? "tour-video-form"
                : "tour-image-form"
          }
          data-assets-picker-interaction-boundary=""
        >
          <div className="ohf-composer" data-tour-anchor={surface === "video" ? "tour-video-composition" : undefined}>
            <MediaStrip model={model} />

            {/* The form lays out as the app's does: words and the primary
                action on the first line, the instruments on the second, the
                action riding the right edge of both. */}
            <div className="ohf-form-row">
              {/* The pult rail stands at the composer's left edge (the user's own
                  markup is the source of truth): a 72-wide column with the tabs
                  stacked vertically under one sliding plate. It answers only what
                  the cinematic screen is making — image or video — and never
                  touches the switch at the studio's top; the two states are
                  deliberately not connected (user ruling). */}
              {mode === "cinema" && (
                <div
                  className="ohf-pult"
                  data-tour="pult-mode"
                  data-compact-appearance="cinema"
                  aria-label="생성 모드"
                  role="tablist"
                  aria-orientation="vertical"
                >
                  <span className="ohf-pult-slide" aria-hidden />
                  <button
                    type="button"
                    role="tab"
                    id="ohf-pult-image"
                    aria-selected={cinemaMode === "image"}
                    data-tour="pult-mode-image"
                    className={"ohf-pult-tab" + (cinemaMode === "image" ? " ohf-pult-tab--on" : "")}
                    onClick={() => onCinemaMode("image")}
                  >
                    <ImageIcon size={16} />
                    <span className="ohf-pult-label">이미지</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="ohf-pult-video"
                    aria-selected={cinemaMode === "video"}
                    data-tour="pult-mode-video"
                    className={"ohf-pult-tab" + (cinemaMode === "video" ? " ohf-pult-tab--on" : "")}
                    onClick={() => onCinemaMode("video")}
                  >
                    <VideoIcon size={16} />
                    <span className="ohf-pult-label">비디오</span>
                  </button>
                </div>
              )}
              <div className="ohf-form-col">
                <div className="ohf-composer-head">
                {/* The prompt lives inside the wrap the outside-pointer rule
                  guards, so it has to dismiss for itself: reaching for the words
                  puts the open control away. Pointer and focus both, because a
                  button click does not move focus on every platform — the field
                  can still hold it while a popover stands open. */}
              <textarea
                ref={promptRef}
                className="ohf-prompt"
                data-tour-anchor={surface === "video" ? "tour-video-prompt" : "tour-image-prompt"}
                rows={1}
                value={prompt.text}
                placeholder={PROMPT_PLACEHOLDERS[surface]}
                aria-label="Prompt"
                onPointerDown={() => setOverlay(null)}
                onFocus={() => setOverlay(null)}
                onChange={(event) => prompt.setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    if (!disabled) onGenerate();
                  }
                }}
              />
            </div>

            <div className="ohf-composer-row">
                <div className="ohf-stream-area">
            <div className="ohf-controls">
                <div className="ohf-controls-fixed">
                    {tray.roles.length > 0 && (
                  <>
                    {tray.input}
                    {/* The row mirrors the image-form's control group: the
                        divider says the two buttons ask for different things —
                        one adds input media, the other names what's already
                        there so the prompt can point at it with @. */}
                    <div className="ohf-attach-group">
                      <button
                        type="button"
                        className="ohf-attach ohf-tip ohf-tip--start"
                        data-tour-anchor={surface === "video" ? "tour-video-reference" : undefined}
                        data-tip={attachLabel}
                        disabled={tray.allFull}
                        aria-label={tray.uploading ? "Uploading" : attachLabel}
                        aria-expanded={overlay === ASSETS}
                        aria-haspopup="dialog"
                        onClick={(event) => {
                          setPickerTab(null);
                          toggle(ASSETS, event.currentTarget);
                        }}
                      >
                        {tray.uploading ? (
                          <span className="ohf-spinner" aria-hidden />
                        ) : (
                          <PlusIcon size={16} />
                        )}
                      </button>
                      <span className="ohf-attach-divider" aria-hidden />
                      <button
                        type="button"
                        className="ohf-attach ohf-attach--element ohf-tip ohf-tip--start"
                        data-tip="요소"
                        aria-label="요소"
                        aria-expanded={overlay === ASSETS && pickerTab === "elements"}
                        aria-haspopup="dialog"
                        onClick={(event) => {
                          setPickerTab("elements");
                          toggle(ASSETS, event.currentTarget);
                        }}
                      >
                        <span className="ohf-at-glyph" aria-hidden>@</span>
                        {elements.length > 0 && (
                          <span className="ohf-attach-badge">{elements.length}</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  className="ohf-ctl ohf-ctl--model ohf-tip"
                  data-tour-anchor={surface === "video" ? "tour-video-model" : "tour-image-model"}
                  data-tip="Change model"
                  aria-expanded={overlay === PICKER}
                  aria-haspopup="dialog"
                  onClick={(event) => toggle(PICKER, event.currentTarget)}
                >
                  {/* Below 560 the model answers with a mark alone — the brand
                      icon where the app draws one, a colour chip otherwise. The
                      mark rides hidden at every wider measure; the name carries
                      it there. */}
                  <span className="ohf-model-mark">
                    {modelIconSrc(model.id) ? (
                      <ModelIcon modelId={model.id} />
                    ) : (
                      <span className="ohf-model-swatch" style={{ background: swatchFor(surface, model.id) }} />
                    )}
                  </span>
                  <span className="ohf-ctl-name">{model.label}</span>
                  <span className="ohf-caret">
                    <CaretDownIcon />
                  </span>
                </button>
                </div>
                <div className="ohf-controls-flow" ref={controlsFlowRef}>
                <button
                  type="button"
                  className="ohf-edge ohf-edge--left"
                  aria-label="왼쪽으로 스크롤"
                  title="왼쪽으로 스크롤"
                  data-active={edgeL ? "" : undefined}
                  onClick={() => {
                    const el = controlsFlowRef.current;
                    if (el) el.scrollBy({ left: -el.clientWidth * 0.9, behavior: "smooth" });
                  }}
                >
                  <ChevronLeftIcon size={13} />
                </button>
                {visibleKeys.map((key) => (
                  <SettingPill
                    key={key}
                    model={model}
                    settingKey={key}
                    values={values}
                    open={overlay === `${SETTING}${key}`}
                    onOpen={(trigger) => toggle(`${SETTING}${key}`, trigger)}
                  />
                ))}

                <BatchStepper value={batchValue} counts={counts} onChange={setBatchValue} />

                {showMore && moreKeys.length > 0 && (
                  <button
                    type="button"
                    className="ohf-ctl ohf-ctl--more ohf-tip"
                    data-tip="Back to basics"
                    aria-label="Back to basics"
                    onClick={() => {
                      setOverlay(null);
                      setShowMore(false);
                    }}
                  >
                    <ChevronLeftIcon size={13} />
                  </button>
                )}
                {!showMore && moreKeys.length > 0 && (
                  <button
                    type="button"
                    className="ohf-ctl ohf-ctl--more ohf-tip"
                    data-tip="More options"
                    aria-label="More options"
                    onClick={() => {
                      setOverlay(null);
                      setShowMore(true);
                    }}
                  >
                    <ChevronRightIcon size={13} />
                  </button>
                )}
                <button
                  type="button"
                  className="ohf-edge ohf-edge--right"
                  aria-label="오른쪽으로 스크롤"
                  title="오른쪽으로 스크롤"
                  data-active={edgeR ? "" : undefined}
                  onClick={() => {
                    const el = controlsFlowRef.current;
                    if (el) el.scrollBy({ left: el.clientWidth * 0.9, behavior: "smooth" });
                  }}
                >
                  <ChevronRightIcon size={13} />
                </button>
                </div>
                </div>
              </div>
            </div>
          </div>

            {/* The right column is the fixed edge of the dock: nothing here
                ever scrolls. The generate button owns its corner; when the
                cinematic surface is up, the character and camera presets ride
                the button's top edge. */}
            <div className="ohf-right-col">
              {mode === "cinema" && (
                <CinemaTiles
                  characterOpen={overlay === CHARACTER}
                  cameraOpen={overlay === CAMERA}
                  onCharacter={(trigger) => toggle(CHARACTER, trigger)}
                  onCamera={(trigger) => toggle(CAMERA, trigger)}
                />
              )}
              <span className="ohf-generate-slot ohf-tip ohf-tip--end" data-tip={generateTip}>
                <button
                  type="button"
                  className="ohf-generate"
                  data-tour-anchor={surface === "video" ? "tour-generate-button" : "tour-image-generate"}
                  disabled={disabled}
                  data-busy={generating}
                  aria-label={generateLabel}
                  onClick={onGenerate}
                >
                  {/* The sheen is the only thing a run in flight changes here:
                      the label still names what pressing does, because pressing
                      is still allowed. Progress is the grid's to report. */}
                  {generating && <span className="ohf-generate-sheen" aria-hidden />}
                  {/* Below 560 the button answers with the hammer alone; the
                      mark rides hidden until the column is a thumb's width. */}
                  <span className="ohf-generate-ic" aria-hidden>
                    <HammerIcon size={16} />
                  </span>
                  <span className="ohf-generate-label">Generate</span>
                  {/* Three standing letters carry the plain column below 640;
                      the full word stays for the wide button. The accessible
                      name is the button's own, not the letters' either way. */}
                  <span className="ohf-generate-abbr" aria-hidden>Gen</span>
                  {shortcut && <kbd className="ohf-kbd">{shortcut}</kbd>}
                </button>
              </span>
            </div>
            </div>
            {/* The cinematic surface works inside a project; this strip is how
                it is chosen. The default shelf stays available, and a new
                project is one press away — private, because sharing costs. */}
            {mode === "cinema" && (
              <div className="ohf-project-chips" role="group" aria-label="Project">
                <span className="ohf-project-chips-label">My projects</span>
                <button
                  type="button"
                  className="ohf-project-chip"
                  aria-pressed={activeProjectId === "default"}
                  onClick={() => setActiveProject("default")}
                >
                  {projectLabel(projects, "default")}
                </button>
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="ohf-project-chip"
                    aria-pressed={project.id === activeProjectId}
                    onClick={() => setActiveProject(project.id)}
                  >
                    {project.name}
                    {project.private && <span className="ohf-project-private">Private</span>}
                  </button>
                ))}
                <button
                  type="button"
                  className="ohf-project-chip ohf-project-chip--new"
                  onClick={() => setProjectDialog(true)}
                >
                  <PlusIcon size={12} />
                  New project
                  <span className="ohf-project-private">Private</span>
                </button>
              </div>
            )}
          </div>

          {selection}
        </div>
      </div>
      {/* The tip that escapes the clipping: one element, outside every scroll
          layer, sitting above the control that asked for it. */}
      {tip &&
        createPortal(
          <div className="ohf-portal-tip" style={{ left: tip.x, top: tip.y }}>
            {tip.text}
          </div>,
          document.body,
        )}
      {/* Naming a project is the same dialog the picker offers; the chips reach
          it from here. A new project becomes the one being worked in. */}
      {projectDialog && (
        <ProjectDialog
          onClose={() => setProjectDialog(false)}
          onCreate={(name) => {
            const project = addProject(name);
            setActiveProject(project.id);
            setProjectDialog(false);
          }}
        />
      )}
    </div>
  );
}

/* Results per press. Every unit is a real generation, so the number is a
   spinbutton the keyboard can drive rather than two anonymous arrows, and the
   ceiling stays in view beside it. The arrows walk the counts the model
   actually allows — Soul offers 1 or 4, and there is no 2 to land on. */
function BatchStepper({
  value,
  counts,
  onChange,
}: {
  value: number;
  counts: number[];
  onChange: (next: number) => void;
}) {
  const index = Math.max(0, counts.indexOf(value));
  const last = counts.length - 1;
  const max = counts[last]!;
  const label = `Batch size — ${value} result${value > 1 ? "s" : ""} per press`;

  const step = (delta: number) => {
    const next = counts[Math.min(last, Math.max(0, index + delta))]!;
    if (next !== value) onChange(next);
  };

  return (
    <div className="ohf-batch ohf-tip" data-tip={label}>
      <button
        type="button"
        className="ohf-batch-step"
        aria-label="Fewer results"
        disabled={index <= 0}
        onClick={() => step(-1)}
      >
        <MinusIcon size={12} />
      </button>
      <span
        className="ohf-batch-value"
        role="spinbutton"
        tabIndex={0}
        aria-label="Batch size"
        aria-valuemin={counts[0]}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${max}`}
        onKeyDown={(event) => {
          const delta =
            event.key === "ArrowUp" || event.key === "ArrowRight"
              ? 1
              : event.key === "ArrowDown" || event.key === "ArrowLeft"
                ? -1
                : 0;
          if (delta !== 0) {
            event.preventDefault();
            step(delta);
            return;
          }
          if (event.key === "Home") {
            event.preventDefault();
            onChange(counts[0]!);
          }
          if (event.key === "End") {
            event.preventDefault();
            onChange(max);
          }
        }}
      >
        {value}
        <span className="ohf-batch-max" aria-hidden>
          /{max}
        </span>
      </span>
      <button
        type="button"
        className="ohf-batch-step"
        aria-label="More results"
        disabled={index >= last}
        onClick={() => step(1)}
      >
        <PlusIcon size={12} />
      </button>
    </div>
  );
}
