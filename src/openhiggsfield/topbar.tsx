"use client";

import { useEffect, useRef, useState } from "react";

import { type GalleryView } from "./data";
import { AssetsIcon, CloseIcon, KeyIcon, SearchIcon } from "./icons";
import type { StudioMode } from "./studio-mode";
import { LOCAL_USER } from "./local-user";

/* The main navigation mirrors the source's `nav[aria-label="Main"]` item for
   item: 26 pills in HF's order — 둘러보기·이미지·비디오·오디오·MCP·API, a hairline
   divider, then Genjutsu·Shorts·Content Factory·플레이어블·Mangaka·AI Influencer·
   Academy·Katana·ChatGPT 플러그인·Ads Studio·이펙트·Cinema Studio·콘테스트·Marketing
   Studio·Supercomputer·편집·커뮤니티·플러그인·Canvas·Originals (live harvest on
   :9222, 2026-11-05). HF paints the current page's pill in lime and the rest in
   white/30; the studio keeps that painting. Of the 26, the studio answers only
   이미지·비디오·오디오 (gallery scope) and Cinema Studio (the mode switch) — every
   other label is HF's page that this app does not carry, so it sits honest inert
   (`aria-disabled="true"` + `data-off=""`) exactly as the rest of the mirror does.
   `신규` rides the three pills HF wears it on: Shorts · Mangaka · Academy. */
type NavLink = "image" | "video" | "audio" | "cinema";
type NavEntry = {
  id: string;
  label: string;
  /** the studio surface this pill switches to; null = HF-only page, honest inert. */
  link: NavLink | null;
  /** HF mounts the `신규` badge on this pill. */
  badge?: "신규";
  /** HF's hairline sits after API — the row carries it as its own slot. */
  sep?: boolean;
};

const HF_NAV: NavEntry[] = [
  { id: "explore", label: "둘러보기", link: null },
  { id: "image", label: "이미지", link: "image" },
  { id: "video", label: "비디오", link: "video" },
  { id: "audio", label: "오디오", link: "audio" },
  { id: "mcp", label: "MCP", link: null },
  { id: "api", label: "API", link: null },
  { id: "sep", label: "", link: null, sep: true },
  { id: "genjutsu", label: "Genjutsu", link: null },
  { id: "shorts", label: "Shorts", link: null, badge: "신규" },
  { id: "content-factory", label: "Content Factory", link: null },
  { id: "playable", label: "플레이어블", link: null },
  { id: "mangaka", label: "Mangaka", link: null, badge: "신규" },
  { id: "ai-influencer", label: "AI Influencer", link: null },
  { id: "academy", label: "Academy", link: null, badge: "신규" },
  { id: "katana", label: "Katana", link: null },
  { id: "chatgpt-plugin", label: "ChatGPT 플러그인", link: null },
  { id: "ads-studio", label: "Ads Studio", link: null },
  { id: "effects", label: "이펙트", link: null },
  { id: "cinema", label: "Cinema Studio", link: "cinema" },
  { id: "contests", label: "콘테스트", link: null },
  { id: "marketing-studio", label: "Marketing Studio", link: null },
  { id: "supercomputer", label: "Supercomputer", link: null },
  { id: "layers", label: "편집", link: null },
  { id: "community", label: "커뮤니티", link: null },
  { id: "plugins", label: "플러그인", link: null },
  { id: "canvas", label: "Canvas", link: null },
  { id: "originals", label: "Originals", link: null },
];

/* HF's brand block is a 20×20 glyph at x16 y8 whose path was harvested live off
   :9222 (the same practice that localized the feed media). The studio wears the
   art but keeps its own name in the accessible label. */
function BrandGlyph() {
  return (
    <span className="ohf-brand ohf-brand--glyph" role="img" aria-label="OpenHiggsfield">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M18.3498 9.83713L18.3339 9.65759C18.1831 7.93447 17.0963 4.69261 14.0816 4.69261C11.8445 4.69261 10.1545 6.97097 8.66311 8.97967C7.47302 10.5883 6.4419 11.9683 5.3073 11.9683C5.00574 11.9357 4.61708 11.7805 4.3792 11.4294C4.16497 11.1108 4.10948 10.7026 4.22046 10.2126C4.39489 9.43684 5.39463 8.7182 6.44963 7.95063C7.02864 7.54238 7.6238 7.10955 8.03634 6.69311C9.22643 5.5091 9.82932 4.65164 9.82932 3.2717C9.82932 1.89176 9.09157 1.20565 8.47276 0.911636C7.23514 0.323844 5.41851 0.666781 4.26026 1.69583C4.08583 1.85922 3.91117 2.01418 3.75243 2.16119C2.58622 3.23097 1.80094 3.95781 0 3.40232V5.63972C2.38791 6.72588 4.39512 4.65164 5.15675 3.69633C5.74372 3.06758 6.36253 2.70006 6.82283 2.70006H6.84671C7.05298 2.70825 7.22741 2.78995 7.35454 2.93696C7.56081 3.18204 7.64018 3.46786 7.60038 3.78622C7.51305 4.45594 6.83875 5.23967 5.60113 6.09713C4.14928 7.10159 1.7218 8.78374 1.53122 10.8987C1.3884 12.4177 2.15003 13.9365 3.34012 14.5243C6.11669 15.8798 7.80665 13.5444 9.5994 11.0783C10.9719 9.1756 12.273 7.37103 14.0818 7.37103C15.7081 7.37103 16.311 8.75916 16.311 9.63301V9.80459L16.1523 9.83713C12.2095 10.5558 10.0595 14.3611 10.0595 16.1167C10.0595 17.8724 11.5034 19.375 13.2804 19.375C15.359 19.375 17.9293 17.5458 18.3419 12.4013L18.3578 12.2136H20V9.83737H18.3498V9.83713ZM16.1998 12.4746C15.8826 15.5531 14.3513 16.9904 13.4232 16.9904C13.0027 16.9904 12.4158 16.631 12.4158 15.9615C12.4158 15.2104 13.5026 12.932 15.946 12.2543L16.2316 12.1808L16.1998 12.4748V12.4746Z"
        />
      </svg>
    </span>
  );
}

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
        <BrandGlyph />

        {/* aria-label="Main" — the same landmark the source names its nav. */}
        <nav className="ohf-nav" aria-label="Main">
          <ul className="ohf-nav-list">
            {HF_NAV.map((entry) => {
              if (entry.sep) return <li key="sep" className="ohf-nav-sep" aria-hidden />;
              if (entry.link === "cinema")
                return (
                  <li key={entry.id}>
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
                      {entry.label}
                    </button>
                  </li>
                );
              /* 이미지·비디오·오디오 are the three scopes this studio answers; the
                 rest of HF's row is a page this app does not carry — inert chrome
                 in HF's own paint. */
              const live =
                entry.link === "image" || entry.link === "video" || entry.link === "audio";
              const active = live && view === entry.link;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="ohf-nav-item"
                    data-active={active || undefined}
                    aria-current={active ? "page" : undefined}
                    aria-disabled={live ? undefined : "true"}
                    data-off={live ? undefined : ""}
                    onClick={live ? () => onView(entry.link as GalleryView) : undefined}
                  >
                    {entry.label}
                    {entry.badge ? (
                      <span className="ohf-nav-badge">{entry.badge}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* The platform-key lamp stays the one place accent moves, now on the far
          edge of the bar rather than floating centred over the runs. */}
      <div className="ohf-nav-actions">
        {/* HF's primary right group, harvested off :9222: Enterprise (x1189 90×24,
            white/30) and 요금제 -30% (x1291 101×24, lime). Neither is a page this
            app carries — and the studio does not bill — so both sit honest inert
            while keeping HF's exact paint and metrics. */}
        <button
          type="button"
          className="ohf-nav-ent"
          aria-disabled="true"
          data-off=""
          title="화면 미러 — OH는 엔터프라이즈 페이지를 담지 않습니다"
        >
          Enterprise
        </button>
        <button
          type="button"
          className="ohf-nav-price"
          aria-disabled="true"
          data-off=""
          title="화면 미러 — OH는 과금하지 않습니다"
        >
          요금제 -30%
        </button>
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
