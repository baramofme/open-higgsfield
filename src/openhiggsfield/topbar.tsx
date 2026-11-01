"use client";

import { useEffect, useRef, useState } from "react";

import { type GalleryView } from "./data";
import { AssetsIcon, CloseIcon, KeyIcon, SearchIcon } from "./icons";
import type { StudioMode } from "./studio-mode";
import { LOCAL_USER } from "./local-user";

/* The main navigation mirrors the source's `nav[aria-label="Main"]`: a flat row
   of pills — Image · Video · Audio · a hairline divider · Supercomputer · Cinema
   Studio. Image and Video move the gallery scope; Audio and Supercomputer have
   no page in this studio, so they are inert by design (no click, no dropdown),
   and Cinema Studio carries the general↔cinema switch the old mode button used
   to own — that button is gone, absorbed here. */

const MEDIA_ITEMS = [
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
] as const;

export function Topbar({
  view,
  onView,
  busy,
  keyConfigured,
  onKeys,
  mode,
  onToggle,
  query,
  onQuery,
  onAssets,
}: {
  view: GalleryView;
  onView: (next: GalleryView) => void;
  busy: boolean;
  keyConfigured: boolean;
  onKeys: () => void;
  mode: StudioMode;
  onToggle: () => void;
  query: string;
  onQuery: (value: string) => void;
  onAssets: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  /* The two new popovers share one outside-press guard: a press that lands on
     neither wrap closes both, so the actions row never stacks two plates. */
  useEffect(() => {
    if (!profileOpen && !searchOpen) return;
    const close = (event: PointerEvent) => {
      const node = event.target as Node | null;
      if (profileRef.current?.contains(node) || searchRef.current?.contains(node)) return;
      setProfileOpen(false);
      setSearchOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [profileOpen, searchOpen]);

  return (
    <header className="ohf-topbar">
      <h1 className="ohf-sr">OpenHiggsfield AI — Open source AI studio</h1>

      <div className="ohf-nav-wrap">
        <span className="ohf-brand">OpenHiggsfield</span>

        {/* aria-label="Main" — the same landmark the source names its nav. */}
        <nav className="ohf-nav" aria-label="Main">
          <ul className="ohf-nav-list">
            {MEDIA_ITEMS.map((item) => {
              /* Only Image and Video are real scopes here; Audio is shown for
                 parity with the source but does nothing. */
              const live = item.id === "image" || item.id === "video";
              const active = live && view === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="ohf-nav-item"
                    data-active={active}
                    aria-current={active ? "page" : undefined}
                    aria-disabled={live ? undefined : "true"}
                    onClick={live ? () => onView(item.id as GalleryView) : undefined}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
            <li className="ohf-nav-sep" aria-hidden />
            <li>
              <button type="button" className="ohf-nav-item" aria-disabled="true">
                Supercomputer
              </button>
            </li>
            <li>
              <button
                type="button"
                className="ohf-nav-item"
                aria-pressed={mode === "cinema"}
                onClick={onToggle}
                aria-label={
                  mode === "cinema"
                    ? "Cinema Studio — return to general mode"
                    : "Cinema Studio — enter the cinematic surface"
                }
                title={mode === "cinema" ? "Return to general mode" : "Enter the cinematic surface"}
              >
                Cinema Studio
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* The platform-key lamp stays the one place accent moves, now on the far
          edge of the bar rather than floating centred over the runs. */}
      <div className="ohf-nav-actions">
        {/* Higgsfield's right-edge actions, mirrored: search · assets · profile.
            The platform-key lamp stays at the far edge, after them. */}
        <div className="ohf-search-wrap" ref={searchRef}>
          <button
            type="button"
            className="ohf-act"
            aria-label="Search"
            aria-expanded={searchOpen}
            /* Opening one plate closes the other — the source never stacks two
               right-cluster popovers, and the row would overlap if it did. */
            onClick={() => {
              setProfileOpen(false);
              setSearchOpen((v) => !v);
            }}
          >
            <SearchIcon />
          </button>
          {searchOpen ? (
            <div className="ohf-search-pop">
              <SearchIcon />
              <input
                autoFocus
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                placeholder="Search prompts and models"
                className="ohf-search-input"
              />
              {query ? (
                <button
                  type="button"
                  className="ohf-search-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    onQuery("");
                    setSearchOpen(false);
                  }}
                >
                  <CloseIcon />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="ohf-act ohf-act--labeled"
          onClick={onAssets}
          title="Open the full asset browser"
        >
          <AssetsIcon />
          <span>에셋</span>
        </button>
        {/* The source puts a hairline between the action group and the account
           ring — same 1px×12 line as the nav divider, on --line-2. */}
        <span className="ohf-act-sep" aria-hidden />
        <div className="ohf-profile-wrap" ref={profileRef}>
          <button
            type="button"
            className="ohf-avatar"
            aria-label="Profile"
            aria-expanded={profileOpen}
            onClick={() => {
              setSearchOpen(false);
              setProfileOpen((v) => !v);
            }}
          >
            {LOCAL_USER.initial}
          </button>
          {profileOpen ? (
            <div className="ohf-profile-pop">
              <div className="ohf-profile-user">
                <div className="ohf-avatar ohf-avatar--lg">{LOCAL_USER.initial}</div>
                <div className="ohf-profile-meta">
                  <span className="ohf-profile-handle">@{LOCAL_USER.handle}</span>
                  <span className="ohf-profile-role">{LOCAL_USER.role}</span>
                </div>
              </div>
              <button
                type="button"
                className="ohf-profile-key"
                onClick={() => {
                  setProfileOpen(false);
                  onKeys();
                }}
              >
                <KeyIcon />
                <span>{keyConfigured ? "Your key" : "Add key"}</span>
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="ohf-key"
          data-busy={busy}
          data-ready={keyConfigured}
          onClick={onKeys}
          aria-label={keyConfigured ? "Edit platform key" : "Add platform key"}
          title={keyConfigured ? "Edit platform key" : "Add platform key"}
        >
          <KeyIcon />
          <span className="ohf-key-text">{keyConfigured ? "Your key" : "Add key"}</span>
          <span className="ohf-lamp" />
        </button>
      </div>
    </header>
  );
}
