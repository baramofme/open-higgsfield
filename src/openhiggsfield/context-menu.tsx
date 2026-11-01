"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* The three-dot menu Higgsfield reuses everywhere, built once so every surface
   that needs overflow actions gets the same role="menu" popover. The trigger is
   the ⋯ button; the items are handed in by the caller, which keeps the menu
   reusable across the grid, the viewer and the workspace. Outside press and
   Escape both close it, the way any OS overflow menu behaves. */

export type MenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** A leading icon, the way Higgsfield draws each row. */
  icon?: ReactNode;
  /** A separator is drawn before this item when true. */
  dividerBefore?: boolean;
  /** When present, a nested submenu is drawn beneath this item. */
  children?: MenuItem[];
};

export function MoreMenu({
  items,
  label = "More actions",
  align = "end",
  className,
  floating = false,
}: {
  items: MenuItem[];
  label?: string;
  align?: "start" | "end";
  className?: string;
  /** Lift the panel to fixed coordinates anchored above the trigger, so a ⋯
      pressed low in the grid clears the selection toolbar instead of hiding
      behind it. Off by default; the viewer and workspace keep the inline flow. */
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const t = event.target as Node;
      const insideRoot = rootRef.current && rootRef.current.contains(t);
      const insidePanel = panelRef.current && panelRef.current.contains(t);
      if (!insideRoot && !insidePanel) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /* A floating panel is placed in viewport coordinates each time it opens: its
     bottom edge meets the trigger's top, and it may grow only as far as the room
     above. Reading the rect at open time is enough — the trigger does not move
     while the menu is up. */
  useEffect(() => {
    if (!open || !floating) return;
    const btn = btnRef.current;
    const panel = panelRef.current;
    if (!btn || !panel) return;
    const rect = btn.getBoundingClientRect();
    panel.style.position = "fixed";
    panel.style.boxSizing = "border-box";
    // `visible`, never `auto`: a submenu that cascades beside the panel must be
    // able to leave the panel's box, and an `auto` overflow would clip it.
    panel.style.overflow = "visible";
    // No max-height: a clamp would cut the panel's own background short and
    // leave the rows past the limit unbacked, i.e. a transparent strip at the
    // bottom of the menu.
    panel.style.maxHeight = "none";
    // How tall the menu actually is. The cascades only go absolute once the fly
    // direction is set, so for this one measurement they would still stack inline
    // and inflate the panel, pushing it into the top-pinned branch instead of the
    // above-the-trigger one. Hide them, measure the rows alone, then restore.
    const subs = panel.querySelectorAll<HTMLElement>(".ohf-more-sub");
    subs.forEach((s) => { s.style.display = "none"; });
    const needed = panel.offsetHeight;
    subs.forEach((s) => { s.style.removeProperty("display"); });
    const roomAbove = rect.top - 8;
    if (needed <= roomAbove) {
      // It fits in the space above the trigger, so rest it right there.
      panel.style.bottom = `${window.innerHeight - rect.top + 8}px`;
      panel.style.top = "auto";
    } else {
      // Too tall for the space above; pin it just under the top bar so no row
      // is lost off-screen.
      panel.style.top = "8px";
      panel.style.bottom = "auto";
    }
    if (align === "end") {
      panel.style.left = "auto";
      panel.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    } else {
      panel.style.right = "auto";
      panel.style.left = `${Math.max(8, rect.left)}px`;
    }
    /* Choose which side the cascades fly out toward, so they never leave the
       screen. A panel sitting near the left edge sends its children right; one
       near the right edge sends them left. Re-measured after placement. */
    const pr = panel.getBoundingClientRect();
    const roomLeft = pr.left;
    const roomRight = window.innerWidth - pr.right;
    const need = 176;
    panel.dataset.fly =
      roomLeft >= need ? "left"
        : roomRight >= need ? "right"
          : roomLeft >= roomRight ? "left" : "right";
  }, [open, floating, align]);

  return (
    <div ref={rootRef} className={`ohf-more${className ? " " + className : ""}`}>
      <button
        ref={btnRef}
        type="button"
        className="ohf-more-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="ohf-more-glyph" aria-hidden>⋯</span>
      </button>
      {open &&
        (() => {
          const layer = (
            <>
              <div className="ohf-more-backdrop" onPointerDown={() => setOpen(false)} />
              <div ref={panelRef} className={`ohf-more-panel ohf-more-panel--${align}`} role="menu" aria-label={label}>
                {items.map((item) => (
                  <div key={item.id} className="ohf-more-row">
                    {item.dividerBefore && <div className="ohf-more-sep" role="presentation" />}
                    <button
                      type="button"
                      role="menuitem"
                      className={`ohf-more-item${item.danger ? " ohf-more-item--danger" : ""}${
                        item.children?.length ? " ohf-more-item--sub" : ""
                      }`}
                      disabled={item.disabled}
                      aria-haspopup={item.children?.length ? "menu" : undefined}
                      aria-disabled={item.disabled || undefined}
                      onClick={() => {
                        if (item.disabled) return;
                        // A submenu opens on hover, so pressing its row keeps the
                        // menu standing rather than dismissing it.
                        if (item.children?.length) return;
                        setOpen(false);
                        item.onSelect();
                      }}
                    >
                      {item.icon ? <span className="ohf-more-ic" aria-hidden>{item.icon}</span> : null}
                      <span className="ohf-more-label">{item.label}</span>
                      {item.children?.length ? <span className="ohf-more-chev" aria-hidden>›</span> : null}
                    </button>
                    {item.children && item.children.length > 0 && (
                      <div className="ohf-more-sub" role="group" aria-label={item.label}>
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            role="menuitem"
                            className={`ohf-more-subitem${child.danger ? " ohf-more-item--danger" : ""}`}
                            disabled={child.disabled}
                            aria-disabled={child.disabled || undefined}
                            onClick={() => {
                              if (child.disabled) return;
                              setOpen(false);
                              child.onSelect();
                            }}
                          >
                            {child.icon ? <span className="ohf-more-ic" aria-hidden>{child.icon}</span> : null}
                            <span className="ohf-more-label">{child.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          );
          // A floating menu is mounted above the grid. Portaling onto the app
          // root (`.ohf`, which is transform-free) keeps `position: fixed`
          // anchored to the viewport while still inheriting the studio's design
          // tokens — `document.body` would drop those tokens and render the
          // panel transparent.
          const host = document.querySelector(".ohf") || document.body;
          return floating ? createPortal(layer, host) : layer;
        })()}
    </div>
  );
}
