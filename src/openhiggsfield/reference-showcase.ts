"use client";

import { create } from "zustand";

import type { MediaItem } from "@/generation/catalog";

/* ============================================================================
   reference-showcase.ts  —  t_9ddf99e1  (the open seam for a reference showcase)

   Why this is its own file and its own store: the sibling cards are editing
   composer.tsx and openhiggsfield-app.tsx live on the SAME tree right now, and
   the concurrent-hunk-commit adjacency rule says a change within a few unchanged
   lines of a sibling's edit MIXES into one hunk and cannot be staged cleanly.
   The attachment strip tile (deep in media-tray.tsx) must be able to raise a
   showcase, and the app (which owns the dialog) must render it. Threading an
   open handler down through the composer's prop chain would put a diff inside
   composer.tsx — the file the siblings are mutating. A one-slot store lets the
   tile raise the showcase by calling `open(item)` and lets the app read it, with
   no handler threading and no shared-file collision.

   The showcase itself is the SAME dialog a finished run or an element opens
   (viewer.tsx), fed a record derived from the attached media. The showcase's
   shape is decided by the media's kind and role, not by the attachment index
   (the index only names the `@`-mention); so the record's kind is read off
   ROLE_KINDS[role] and every kind renders through the viewer's existing branches.
   ========================================================================== */

type ReferenceShowcaseState = {
  /** The reference whose scoped showcase is up, by its media item. Null closes it. */
  item: MediaItem | null;
  /** Raise the showcase for one attachment. The tile's click calls this. */
  open: (item: MediaItem) => void;
  /** Put the showcase away. The dialog's close and its actions call this. */
  close: () => void;
};

/* Transient UI state, deliberately unpersisted: a showcase is up only while the
   session is up, and a reload never reopens one on its own. */
export const useReferenceShowcase = create<ReferenceShowcaseState>()((set) => ({
  item: null,
  open: (item) => set({ item }),
  close: () => set({ item: null }),
}));
