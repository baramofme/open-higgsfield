"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { MediaItem, MediaRole, ModelEntry } from "@/generation/catalog";
import { referencePolicyFor, referenceSlotsRemaining } from "@/generation/catalog";
import { useElements, nextElementName, type ElementItem } from "@/generation/stores/elements";
import {
  DEFAULT_PROJECT_ID,
  projectLabel,
  useProjects,
  type Project,
} from "@/generation/stores/projects";

import { ROLE_KINDS, ROLE_LABELS, defaultRole, roleNoun, type AssetKind } from "./data";
import type { RunRecord } from "./history";
import {
  AssetsIcon,
  AudioIcon,
  CaretDownIcon,
  CheckIcon,
  CloseIcon,
  CropIcon,
  CubeIcon,
  EyeIcon,
  FolderIcon,
  GlobeIcon,
  HeartIcon,
  PencilIcon,
  PersonIcon,
  PlayBadgeIcon,
  PlusIcon,
  SparkIcon,
  TrashIcon,
  UploadIcon,
} from "./icons";
import { CropTool } from "./crop-tool";
import { ElementForm } from "./element-form";
import { PreviewLightbox } from "./preview-lightbox";
import { ProjectDialog } from "./project-dialog";
import type { UploadRecord } from "./uploads";

/** The library, cut the way the app cuts it: what this device sent, who could
    perform the work, the named elements a project gathers, what has already
    been made, and what was kept. The five are one surface, not five dialogs —
    the sliding plate says which one the body is showing. */
type V2Tab = "uploads" | "influencer" | "elements" | "generations" | "likes";

const TABS: readonly V2Tab[] = ["uploads", "influencer", "elements", "generations", "likes"];

const TAB_LABELS: Record<V2Tab, string> = {
  uploads: "Uploads",
  influencer: "AI Influencer",
  elements: "Elements",
  generations: "Generations",
  likes: "Likes",
};

interface Asset {
  url: string;
  kind: AssetKind;
  /** The tile's name — a file name, or the prompt the run was made from. It is
      the alt text and the pointer title: a grey plate has no other handle. */
  title: string;
  /** The run's layered-gradient art, so a tile whose media is slow to arrive or
      has aged off the platform's CDN is still a picture rather than a hole. */
  art?: string;
}

/* The sidebar files the element library the way the app's category menu does:
   everything, or only one kind of thing at a time. */
type SidebarId = "all" | "character" | "place" | "prop";
const SIDEBAR: readonly { id: SidebarId; label: string; icon: "person" | "globe" | "cube" }[] = [
  { id: "all", label: "All", icon: "person" },
  { id: "character", label: "Characters", icon: "person" },
  { id: "place", label: "Places", icon: "globe" },
  { id: "prop", label: "Props", icon: "cube" },
];

/* The generations shelf can be narrowed to one kind of finished run at a time.
   "All" is the shelf as the run log wrote it; "Video" and "Audio" hide the
   runs whose kind does not answer to the chosen word. */
type GenFilter = "all" | "video" | "audio";
const GEN_FILTERS: readonly { id: GenFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
];

/* The uploads shelf reads newest first, which is what the app's sort answers to
   by default. "Most recent" is not a sort so much as the order things arrive;
   "Oldest first" is the deliberate flip of it. */
type SortId = "recent" | "oldest";
const SORT_LABELS: Record<SortId, string> = {
  recent: "Most recent",
  oldest: "Oldest first",
};

const RECENT_WINDOW = 15;

/** Everything a role can be filled from, in the app's own shape: the files this
    browser sent to Blob, the elements a project gathers, the finished runs, and
    the runs that were kept. All of it is public URLs the plane can carry. */
export function AssetPicker({
  model,
  items,
  uploads,
  history,
  staged,
  uploading,
  initialTab,
  onUpload,
  onApply,
  onForget,
  onClose,
}: {
  model: ModelEntry;
  /** The current surface's attachments. They are what the panel opens holding:
      a role's inputs are edited here, not only added to. */
  items: MediaItem[];
  uploads: UploadRecord[];
  history: RunRecord[];
  staged: string | null;
  uploading: boolean;
  /** Where the panel lands when a trigger asks for a specific shelf instead
      of letting it find the one that holds something. */
  initialTab?: V2Tab;
  onUpload: (role: MediaRole) => void;
  onApply: (role: MediaRole, urls: string[]) => void;
  /** Take a file off the shelf — the hovered card's trash does exactly this. */
  onForget: (url: string) => void;
  onClose: () => void;
}) {
  /* The per-mode reference preset is the single source the selector reads its
     enable/disable and count caps from. Derived once per render — pure and
     render-safe. The picker never re-derives a rule: whatever the catalog says
     about this model is exactly what these chips honour. */
  const policy = referencePolicyFor(model);
  /* Land on the first slot this model actually accepts; an audio model that
     rejects every reference has none, so we fall back to the declared default
     and the panel explains why nothing is selectable. */
  const initialRole = policy.options.find((option) => option.enabled)?.role ?? defaultRole(model);
  const [role, setRole] = useState<MediaRole>(() => initialRole);
  /* null until the visitor lands: the panel opens on the shelf that actually
     holds something, so someone who has generated all day and uploaded nothing
     does not land on an empty tab. */
  const [tab, setTab] = useState<V2Tab | null>(initialTab ?? null);
  /* The role's inputs as this panel would leave them — seeded with what is
     already on the plane, so an attached tile opens marked and can be pressed
     off again. An array, not a Set: the order picked is the order attached. */
  const [selected, setSelected] = useState<string[]>(() => urlsOf(items, initialRole));
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  /* The plate that slides under the chosen tab. Its place is measured, never
     guessed: five labels of five different widths. */
  const [slide, setSlide] = useState<{ left: number; width: number } | null>(null);

  const [scope, setScope] = useState<"recent" | "all">("recent");
  const [sort, setSort] = useState<SortId>("recent");
  const [sidebar, setSidebar] = useState<SidebarId>("all");
  /* Which kind of finished run the generations shelf is showing. It resets with
     the panel itself — the shelf unmounts when the popover closes — so a reopen
     always lands back on the whole log rather than the last narrowing. */
  const [mediaFilter, setMediaFilter] = useState<GenFilter>("all");
  const [sortOpen, setSortOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [preview, setPreview] = useState<Asset | null>(null);
  const [crop, setCrop] = useState<Asset | null>(null);
  const [form, setForm] = useState<{ editing?: ElementItem; nameHint?: string } | null>(null);
  const [projectDialog, setProjectDialog] = useState(false);

  const projects = useProjects((state) => state.projects);
  const activeProjectId = useProjects((state) => state.activeProjectId);
  const setActive = useProjects((state) => state.setActive);
  const addProject = useProjects((state) => state.addProject);
  const elementItems = useElements((state) => state.items);
  const addElement = useElements((state) => state.add);
  const updateElement = useElements((state) => state.update);
  const removeElement = useElements((state) => state.remove);

  const kind = ROLE_KINDS[role];
  const max = model.roles[role] ?? 0;
  const current = useMemo(() => urlsOf(items, role), [items, role]);
  const room = Math.max(0, max - selected.length);

  const uploadAssets = useMemo(() => {
    const rows = uploads
      .filter((record) => record.kind === kind)
      .map((record) => ({ url: record.url, kind: record.kind, title: record.name }));
    if (sort === "oldest") rows.reverse();
    return scope === "recent" ? rows.slice(0, RECENT_WINDOW) : rows;
  }, [uploads, kind, sort, scope]);

  /* Same shelf the rail below the dock draws: every record that finished with
     media in hand, in the same order — the picker filters nothing the gallery
     filters not, so what the visitor sees is what they can attach. A missing
     kind (an older record) reads as a still. The type dial narrows this list
     before the recent window cuts it, so "Video · Recent" is the fifteen most
     recent videos, not fifteen runs pared down to the videos among them. */
  const runAssets = useMemo(() => {
    const out: Asset[] = [];
    const rows = [...history].sort((a, b) =>
      sort === "oldest" ? a.createdAt - b.createdAt : b.createdAt - a.createdAt,
    );
    for (const record of rows) {
      if (record.status === "running" || record.urls.length === 0) continue;
      const kind: AssetKind =
        record.kind === "video" ? "video" : record.kind === "audio" ? "audio" : "image";
      if (mediaFilter !== "all" && kind !== mediaFilter) continue;
      for (const url of record.urls) out.push({ url, kind, title: record.prompt, art: record.art });
    }
    return scope === "recent" ? out.slice(0, RECENT_WINDOW) : out;
  }, [history, sort, scope, mediaFilter]);

  const likedAssets = useMemo(() => {
    const out: Asset[] = [];
    for (const record of history) {
      if (record.status === "running" || record.urls.length === 0 || !record.favorite) continue;
      const kind = record.kind === "video" ? "video" : "image";
      for (const url of record.urls) out.push({ url, kind, title: record.prompt, art: record.art });
    }
    return out;
  }, [history]);

  /* Elements belong to a project; the shelf shown is the one the dropdown (or
     the cinematic surface) is standing in, narrowed by the sidebar's kind. */
  const projectElements = useMemo(
    () =>
      elementItems.filter(
        (element) =>
          element.url !== "" &&
          (element.projectId ?? DEFAULT_PROJECT_ID) === activeProjectId &&
          (sidebar === "all" || element.category === sidebar),
      ),
    [elementItems, activeProjectId, sidebar],
  );

  const opened: V2Tab =
    tab ?? (uploadAssets.length === 0 && runAssets.length > 0 ? "generations" : "uploads");

  // The dialog takes focus on the control that scopes it, not on the grid.
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, []);

  useLayoutEffect(() => {
    const button = tabButtons.current[opened];
    if (button) setSlide({ left: button.offsetLeft, width: button.offsetWidth });
  }, [opened]);

  /* A file uploaded from inside the panel joins the selection rather than the
     plane: one press still applies the whole set. The ref holds whatever was
     staged before this panel opened, so reopening does not re-select it. */
  const seen = useRef(staged);

  /* A new role is a new library and a new set — a start frame cannot follow the
     switch to audio — so the selection is re-seeded. The tab is not: the shelf
     being looked at is the visitor's choice, not the role's. */
  function pickRole(next: MediaRole) {
    /* A slot the preset disables is not a target — the chip guards the click,
       and this guards every other caller (start→end advance) in one place. */
    if (!policy.optionFor(next).enabled) return;
    setRole(next);
    setSelected(urlsOf(items, next));
  }

  /* Start and end are a pair: attaching the start should land on the empty end
     slot instead of closing, so the second frame is one more click, not a
     reopen plus a confirm. */
  function advanceOrClose(filled: MediaRole) {
    if (filled === "start" && (model.roles.end ?? 0) > 0) {
      const endUsed = items.filter((item) => item.role === "end").length;
      if (endUsed < (model.roles.end ?? 0)) {
        pickRole("end");
        return;
      }
    }
    onClose();
  }

  function commit(urls: string[]) {
    onApply(role, urls);
    if (max > 0 && urls.length >= max) {
      advanceOrClose(role);
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (staged === null || staged === seen.current) return;
    seen.current = staged;
    if (max === 1) {
      setSelected([staged]);
      commit([staged]);
      return;
    }
    setSelected((prev) => (prev.includes(staged) ? prev : [...prev, staged]));
    // The upload lands on the shelf the visitor is looking at; make sure it is seen.
    setTab("uploads");
  }, [staged]);

  function toggle(url: string) {
    if (max === 1) {
      const next = selected.includes(url) ? [] : [url];
      setSelected(next);
      onApply(role, next);
      if (next.length === 1) advanceOrClose(role);
      return;
    }
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((entry) => entry !== url) : [...prev, url],
    );
  }

  /* A cut reference replaces the frame it was cut from — where that frame was
     chosen, the cut takes its place; where it was not, nothing changes yet. */
  function applyCrop(original: string, cropped: string) {
    setSelected((prev) => prev.map((url) => (url === original ? cropped : url)));
    setCrop(null);
  }

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const from = TABS.indexOf(opened);
    const to =
      event.key === "ArrowRight"
        ? (from + 1) % TABS.length
        : event.key === "ArrowLeft"
          ? (from - 1 + TABS.length) % TABS.length
          : -1;
    if (to < 0) return;
    event.preventDefault();
    setTab(TABS[to]!);
    tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
  };

  /* The button states the difference it will make, so a set edited down reads
     as a removal rather than as an "Add" that removes. */
  const picked = new Set(selected);
  const added = selected.filter((url) => !current.includes(url)).length;
  const dropped = current.filter((url) => !picked.has(url)).length;
  const applyLabel =
    added && dropped
      ? `Replace ${roleNoun(role, Math.max(added, dropped))}`
      : added
        ? `Add ${added > 1 ? `${added} ` : ""}${roleNoun(role, added)}`
        : dropped
          ? `Remove ${dropped > 1 ? `${dropped} ` : ""}${roleNoun(role, dropped)}`
          : "Done";

  /* The slot's own preset is the gate: a kind the model rejects is never
     uploadable, and a full slot is, whatever the raw max says. Reading both off
     `policy` (never re-deriving) keeps the button, the chip and the count in
     agreement — one answer per slot. */
  const slotEnabled = policy.optionFor(role).enabled;
  const slotFull = slotEnabled && referenceSlotsRemaining(policy, role, selected.length) === 0;
  const canUpload = slotEnabled && room > 0 && !uploading;
  const uploadTip = uploading
    ? "Uploading…"
    : !slotEnabled
      ? `This model does not take a ${roleNoun(role, 1)} reference`
      : slotFull
        ? `Every ${roleNoun(role, 1)} slot is taken — press one off to free it`
        : `Upload a ${roleNoun(role, 1)} from this device`;

  const showToolbar =
    opened === "uploads" || opened === "elements" || opened === "generations";

  return (
    <div className="ohf-popover ohf-popover--assets" role="dialog" aria-label="Add input">
      <header className="ohf-v2-head">
        <div className="ohf-v2-tabs-wrap">
          <div
            className="ohf-v2-tabs"
            role="tablist"
            aria-label="Asset source"
            ref={tabsRef}
            onKeyDown={onTabKeyDown}
          >
            {slide && (
              <span
                className="ohf-v2-slide"
                aria-hidden
                style={{ left: slide.left, width: slide.width }}
              />
            )}
            {TABS.map((id) => {
              const active = id === opened;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  ref={(element) => {
                    tabButtons.current[id] = element;
                  }}
                  className={"ohf-v2-tab" + (active ? " ohf-v2-tab--on" : "")}
                  onClick={() => setTab(id)}
                >
                  <span className="ohf-v2-tab-text">{TAB_LABELS[id]}</span>
                  {id === "influencer" && (
                    <span className="ohf-v2-free-chip">
                      <SparkIcon size={12} />
                      Free
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          className="ohf-v2-round-btn ohf-v2-close"
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          <CloseIcon size={14} />
        </button>
      </header>

      {/* Which slot this panel is editing. The selector always offers the full
          five-slot domain; the per-mode preset decides which chips are live. A
          slot the model does not take stays visible but greyed, so its absence
          reads as a rule rather than a gap (shared vocabulary: render the domain,
          grey out what the preset rejects). */}
      <div className="ohf-assets-roles" role="group" aria-label="Input slot">
        {policy.options.map((option) => {
          const entry = option.role;
          const used =
            entry === role ? selected.length : items.filter((item) => item.role === entry).length;
          const room = referenceSlotsRemaining(policy, entry, used);
          const full = option.enabled && room === 0;
          return (
            <button
              key={entry}
              type="button"
              className="ohf-chip ohf-chip--role"
              aria-pressed={entry === role}
              aria-disabled={!option.enabled}
              disabled={!option.enabled}
              title={
                !option.enabled
                  ? `${ROLE_LABELS[entry]} — this model does not take this reference`
                  : full
                    ? `Every ${ROLE_LABELS[entry]} slot is taken — press one off to free it`
                    : ROLE_LABELS[entry]
              }
              onClick={() => {
                if (!option.enabled) return;
                pickRole(entry);
              }}
            >
              {ROLE_LABELS[entry]}
              <span className="ohf-chip-count" aria-label={`${used} of ${option.max}`}>
                {used}/{option.max}
              </span>
            </button>
          );
        })}
      </div>
      {/* When the model takes no reference at all, say so out loud rather than
          leave five grey chips for the visitor to decipher. */}
      {!policy.acceptsReference && (
        <p className="ohf-assets-roles-note" role="status">
          This model does not accept references — generate from the prompt alone.
        </p>
      )}

      <div className="ohf-v2-block">
        {showToolbar && (
          <div className="ohf-v2-toolbar">
            {opened === "uploads" && (
              <>
                <div className="ohf-v2-seg" role="group" aria-label="Upload scope">
                  <button
                    type="button"
                    className="ohf-v2-seg-tab"
                    aria-pressed={scope === "recent"}
                    onClick={() => setScope("recent")}
                  >
                    Recent
                  </button>
                  <button
                    type="button"
                    className="ohf-v2-seg-tab"
                    aria-pressed={scope === "all"}
                    onClick={() => setScope("all")}
                  >
                    All
                  </button>
                </div>
                <div className={"ohf-v2-menu-holder" + (sortOpen ? " ohf-v2-menu-holder--open" : "")}>
                  <button
                    type="button"
                    className="ohf-v2-menu-trigger"
                    aria-expanded={sortOpen}
                    onClick={() => setSortOpen((prev) => !prev)}
                  >
                    Sort
                    <CaretDownIcon size={12} />
                  </button>
                  {sortOpen && (
                    <>
                      <div className="ohf-v2-menu-backdrop" onPointerDown={() => setSortOpen(false)} />
                      <div className="ohf-v2-menu" role="menu" aria-label="Sort by">
                        {(Object.keys(SORT_LABELS) as SortId[]).map((id) => (
                          <button
                            key={id}
                            type="button"
                            role="menuitemcheckbox"
                            aria-checked={sort === id}
                            className="ohf-v2-menu-item"
                            onClick={() => {
                              setSort(id);
                              setSortOpen(false);
                            }}
                          >
                            <span className="ohf-v2-menu-box" aria-hidden>
                              {sort === id && <CheckIcon size={11} />}
                            </span>
                            {SORT_LABELS[id]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {opened === "elements" && (
              <div className={"ohf-v2-menu-holder" + (projectOpen ? " ohf-v2-menu-holder--open" : "")}>
                <button
                  type="button"
                  className="ohf-v2-menu-trigger"
                  aria-expanded={projectOpen}
                  onClick={() => setProjectOpen((prev) => !prev)}
                >
                  <FolderIcon size={13} />
                  {projectLabel(projects, activeProjectId)}
                  <CaretDownIcon size={12} />
                </button>
                {projectOpen && (
                  <>
                    <div className="ohf-v2-menu-backdrop" onPointerDown={() => setProjectOpen(false)} />
                    <div className="ohf-v2-menu" role="menu" aria-label="Choose project">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={activeProjectId === DEFAULT_PROJECT_ID}
                        className="ohf-v2-menu-item"
                        onClick={() => {
                          setActive(DEFAULT_PROJECT_ID);
                          setProjectOpen(false);
                        }}
                      >
                        {projectLabel(projects, DEFAULT_PROJECT_ID)}
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="ohf-v2-menu-item ohf-v2-menu-item--new"
                        onClick={() => {
                          setProjectOpen(false);
                          setProjectDialog(true);
                        }}
                      >
                        <PlusIcon size={13} />
                        New project…
                      </button>
                      {projects.map((project) => (
                        <ProjectItem
                          key={project.id}
                          project={project}
                          active={project.id === activeProjectId}
                          onChoose={() => {
                            setActive(project.id);
                            setProjectOpen(false);
                          }}
                          onForget={() => removeProjectAndStay(project.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {opened === "generations" && (
              <div className="ohf-v2-seg" role="group" aria-label="Filter runs by type">
                {GEN_FILTERS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="ohf-v2-seg-tab"
                    aria-pressed={mediaFilter === entry.id}
                    title={`Show ${entry.label === "All" ? "every finished run" : `only ${entry.label.toLowerCase()} runs`}`}
                    onClick={() => setMediaFilter(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="ohf-v2-body ohf-scroll">
          {opened === "influencer" && (
            <div className="ohf-v2-empty ohf-v2-empty--tall">
              <span className="ohf-v2-empty-ic">
                <SparkIcon size={18} />
              </span>
              <span className="ohf-v2-empty-title">Create the AI influencer that will carry your next topic.</span>
              <button type="button" className="ohf-btn-solid ohf-v2-empty-action" disabled>
                <PersonIcon size={14} />
                Make your own AI influencer
              </button>
              <span className="ohf-mirror-badge">화면 미러 — 학습 흐름 미구현</span>
            </div>
          )}
          {opened === "likes" && likedAssets.length === 0 && (
            <div className="ohf-v2-empty ohf-v2-empty--tall">
              <span className="ohf-v2-empty-ic">
                <HeartIcon size={16} />
              </span>
              <span className="ohf-v2-empty-title">Runs you favorite appear here.</span>
              <span className="ohf-v2-empty-hint">
                Mark the ones you like in the gallery and they will be saved here for the next run.
              </span>
            </div>
          )}
          {opened === "uploads" && uploadAssets.length === 0 && (
            <div className="ohf-v2-empty">
              <span className="ohf-v2-empty-ic">
                <UploadIcon size={15} />
              </span>
              <span className="ohf-v2-empty-title">Nothing uploaded yet</span>
              <span className="ohf-v2-empty-hint">
                Files you send from this device stay on this shelf for the next run too.
              </span>
              <button
                type="button"
                className="ohf-btn-solid"
                disabled={!canUpload}
                onClick={() => onUpload(role)}
              >
                <UploadIcon />
                Upload file
              </button>
            </div>
          )}
          {opened === "generations" && runAssets.length === 0 && (
            <div className="ohf-v2-empty">
              <span className="ohf-v2-empty-ic">
                <AssetsIcon size={15} />
              </span>
              <span className="ohf-v2-empty-title">
                {mediaFilter === "all"
                  ? "No finished runs yet"
                  : `No ${mediaFilter} runs yet`}
              </span>
              <span className="ohf-v2-empty-hint">
                {mediaFilter === "video" || mediaFilter === "audio"
                  ? "Press All to see the runs the other kind made."
                  : kind === "audio"
                    ? "Attach an audio track from this device instead — it lands on the Uploads shelf."
                    : "Every run you finish lands here, ready to feed the next run."}
              </span>
            </div>
          )}

          {opened === "elements" ? (
            <div className="ohf-v2-elements">
              <nav className="ohf-v2-sidebar" aria-label="Element category">
                {SIDEBAR.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={"ohf-v2-side-item" + (sidebar === entry.id ? " ohf-v2-side-item--on" : "")}
                    aria-pressed={sidebar === entry.id}
                    onClick={() => setSidebar(entry.id)}
                  >
                    <span className="ohf-v2-side-ic" aria-hidden>
                      {entry.icon === "person" ? (
                        <PersonIcon size={14} />
                      ) : entry.icon === "globe" ? (
                        <GlobeIcon size={14} />
                      ) : (
                        <CubeIcon size={14} />
                      )}
                    </span>
                    {entry.label}
                    <span className="ohf-v2-side-count">
                      {entry.id === "all"
                        ? elementItems.filter((element) => (element.projectId ?? DEFAULT_PROJECT_ID) === activeProjectId).length
                        : elementItems.filter(
                            (element) =>
                              (element.projectId ?? DEFAULT_PROJECT_ID) === activeProjectId &&
                              element.category === entry.id,
                          ).length}
                    </span>
                  </button>
                ))}
              </nav>
              <div className="ohf-v2-grid ohf-v2-grid--4">
                <button
                  type="button"
                  className="ohf-v2-new-tile"
                  aria-label="New element"
                  onClick={() => setForm({ nameHint: nextElementName(elementItems) })}
                >
                  <span className="ohf-v2-new-tile-ic">
                    <PlusIcon size={16} />
                  </span>
                  <span>New element</span>
                </button>
                {projectElements.map((element) => (
                  <ElementCard
                    key={element.id}
                    element={element}
                    picked={picked.has(element.url)}
                    blocked={!picked.has(element.url) && room === 0}
                    onToggle={() => toggle(element.url)}
                    onPreview={() => setPreview({ url: element.url, kind: "image", title: element.name })}
                    onEdit={() => setForm({ editing: element })}
                    onRemove={() => removeElement(element.id)}
                  />
                ))}
              </div>
            </div>
          ) : opened === "uploads" && uploadAssets.length > 0 ? (
            <div className="ohf-v2-grid ohf-v2-grid--5">
              <button
                type="button"
                className="ohf-v2-upload-tile"
                disabled={!canUpload}
                title={uploadTip}
                aria-label={uploadTip}
                onClick={() => onUpload(role)}
              >
                {uploading ? <span className="ohf-spinner" aria-hidden /> : <UploadIcon size={17} />}
                <span>Upload file</span>
              </button>
              {uploadAssets.map((asset) => (
                <ChromeCard
                  key={asset.url}
                  asset={asset}
                  picked={picked.has(asset.url)}
                  blocked={!picked.has(asset.url) && room === 0}
                  onToggle={() => toggle(asset.url)}
                  onPreview={() => setPreview(asset)}
                  onCrop={() => setCrop(asset)}
                  onDelete={() => onForget(asset.url)}
                />
              ))}
            </div>
          ) : opened === "generations" && runAssets.length > 0 ? (
            <div className="ohf-v2-grid ohf-v2-grid--5">
              {runAssets.map((asset) => (
                <ChromeCard
                  key={asset.url}
                  asset={asset}
                  picked={picked.has(asset.url)}
                  blocked={!picked.has(asset.url) && room === 0}
                  onToggle={() => toggle(asset.url)}
                  onPreview={() => setPreview(asset)}
                  onCrop={() => setCrop(asset)}
                />
              ))}
            </div>
          ) : opened === "likes" && likedAssets.length > 0 ? (
            <div className="ohf-v2-grid ohf-v2-grid--5">
              {likedAssets.map((asset) => (
                <ChromeCard
                  key={asset.url}
                  asset={asset}
                  picked={picked.has(asset.url)}
                  blocked={!picked.has(asset.url) && room === 0}
                  onToggle={() => toggle(asset.url)}
                  onPreview={() => setPreview(asset)}
                  onCrop={() => setCrop(asset)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ohf-assets-foot">
        <span className="ohf-assets-tally">
          {`${selected.length} of ${max} ${roleNoun(role, max)}`}
        </span>
        {/* Never disabled: with no change left to apply it is simply the way
            out, and the panel always offers one press that ends the task. */}
        <button
          type="button"
          className="ohf-btn-accent"
          data-quiet={added + dropped === 0}
          onClick={() => commit(selected)}
        >
          {applyLabel}
        </button>
      </div>

      {preview && (
        <PreviewLightbox url={preview.url} kind={preview.kind} onClose={() => setPreview(null)} />
      )}
      {crop && (
        <CropTool
          url={crop.url}
          kind={crop.kind}
          onClose={() => setCrop(null)}
          onApply={(cropped) => applyCrop(crop.url, cropped)}
        />
      )}
      {form && (
        <ElementForm
          editing={form.editing}
          nameHint={form.nameHint}
          projectId={activeProjectId === DEFAULT_PROJECT_ID ? DEFAULT_PROJECT_ID : activeProjectId}
          trayItems={items}
          onClose={() => setForm(null)}
          onSave={(element) => {
            if (form.editing) updateElement(element.id, element);
            else addElement(element);
          }}
        />
      )}
      {projectDialog && (
        <ProjectDialog
          onClose={() => setProjectDialog(false)}
          onCreate={(name) => {
            const project = addProject(name);
            setActive(project.id);
            setProjectDialog(false);
          }}
        />
      )}
    </div>
  );

  /* Leaving a project from the dropdown must never strand the dropdown on a
     name that no longer exists; the active seat goes back to the default. */
  function removeProjectAndStay(id: string) {
    useProjects.getState().removeProject(id);
    setProjectOpen(false);
  }
}

function urlsOf(items: MediaItem[], role: MediaRole): string[] {
  return items.filter((item) => item.role === role).map((item) => item.url);
}

/** One project inside the dropdown: its name, its private mark, and the trash
    that only appears while the pointer is on the row. */
function ProjectItem({
  project,
  active,
  onChoose,
  onForget,
}: {
  project: Project;
  active: boolean;
  onChoose: () => void;
  onForget: () => void;
}) {
  return (
    <div className="ohf-v2-project-row" data-active={active}>
      <button
        type="button"
        role="menuitemradio"
        aria-checked={active}
        className="ohf-v2-project-choose"
        onClick={onChoose}
      >
        {project.name}
        {project.private && <span className="ohf-v2-private-chip">Private</span>}
      </button>
      <button
        type="button"
        className="ohf-v2-round-btn ohf-v2-row-trash"
        aria-label={`Delete ${project.name}`}
        onClick={onForget}
      >
        <TrashIcon size={12} />
      </button>
    </div>
  );
}

/* The card the app answers with: a plain frame that grows its chrome when the
   pointer arrives — the choice box at one corner, the actions at the other. */
const ChromeCard = memo(function ChromeCard({
  asset,
  picked,
  blocked,
  onToggle,
  onPreview,
  onCrop,
  onDelete,
}: {
  asset: Asset;
  picked: boolean;
  blocked: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onCrop: () => void;
  onDelete?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="ohf-v2-card" data-picked={picked}>
      <button
        type="button"
        className="ohf-asset ohf-v2-face"
        data-picked={picked}
        disabled={blocked}
        title={asset.title}
        aria-pressed={picked}
        aria-label={asset.title}
        onClick={onToggle}
        onMouseEnter={() => void videoRef.current?.play().catch(() => {})}
        onMouseLeave={() => {
          const video = videoRef.current;
          if (!video) return;
          video.pause();
          video.currentTime = 0;
        }}
      >
        {/* The gallery's slot is a flat slate behind contained media; the art
            gradient only earns its keep where there is no picture to show —
            the audio glyph tiles. Painting it behind a still would leak
            through the letterbox bands. */}
        {asset.kind === "audio" && (
          <span className="ohf-asset-art" style={asset.art ? { background: asset.art } : undefined} />
        )}
        {asset.kind === "video" ? (
          <video
            ref={videoRef}
            className="ohf-asset-media"
            src={asset.url}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : asset.kind === "audio" ? (
          <span className="ohf-asset-glyph">
            <AudioIcon size={20} />
          </span>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="ohf-asset-media" src={asset.url} alt="" style={{ objectFit: "contain" }} />
        )}
        {asset.kind === "video" && (
          <span className="ohf-asset-kind" aria-hidden>
            <PlayBadgeIcon size={8} />
          </span>
        )}
      </button>
      <button
        type="button"
        className={"ohf-v2-check" + (picked ? " ohf-v2-check--on" : "")}
        role="checkbox"
        aria-checked={picked}
        aria-label={`Select ${asset.title}`}
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          if (!blocked) onToggle();
        }}
      >
        {picked && <CheckIcon size={12} />}
      </button>
      <div className="ohf-v2-acts">
        <button type="button" className="ohf-v2-round-btn" aria-label="Preview" tabIndex={-1} onClick={onPreview}>
          <EyeIcon size={13} />
        </button>
        {asset.kind !== "audio" && (
          <button type="button" className="ohf-v2-round-btn" aria-label="Crop" tabIndex={-1} onClick={onCrop}>
            <CropIcon size={13} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="ohf-v2-round-btn ohf-v2-round-btn--danger"
            aria-label="Remove from shelf"
            tabIndex={-1}
            onClick={onDelete}
          >
            <TrashIcon size={12} />
          </button>
        )}
      </div>
    </div>
  );
});

/** An element is a frame with a name: the picture and the name the prompt can
    reach it by, filed under one project. */
function ElementCard({
  element,
  picked,
  blocked,
  onToggle,
  onPreview,
  onEdit,
  onRemove,
}: {
  element: ElementItem;
  picked: boolean;
  blocked: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="ohf-v2-card ohf-v2-el-card" data-picked={picked}>
      <button
        type="button"
        className="ohf-asset ohf-v2-face"
        data-picked={picked}
        disabled={blocked}
        title={element.name}
        aria-pressed={picked}
        aria-label={element.name}
        onClick={onToggle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ohf-asset-media" src={element.url} alt="" loading="lazy" />
      </button>
      <button
        type="button"
        className={"ohf-v2-check" + (picked ? " ohf-v2-check--on" : "")}
        role="checkbox"
        aria-checked={picked}
        aria-label={`Select ${element.name}`}
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          if (!blocked) onToggle();
        }}
      >
        {picked && <CheckIcon size={12} />}
      </button>
      <div className="ohf-v2-acts">
        <button type="button" className="ohf-v2-round-btn" aria-label="Preview" tabIndex={-1} onClick={onPreview}>
          <EyeIcon size={13} />
        </button>
        <button type="button" className="ohf-v2-round-btn" aria-label="Edit element" tabIndex={-1} onClick={onEdit}>
          <PencilIcon size={13} />
        </button>
        <button
          type="button"
          className="ohf-v2-round-btn ohf-v2-round-btn--danger"
          aria-label="Delete element"
          tabIndex={-1}
          onClick={onRemove}
        >
          <TrashIcon size={12} />
        </button>
      </div>
      <span className="ohf-v2-el-name">{element.name}</span>
    </div>
  );
}
