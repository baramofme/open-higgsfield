/* Shared fixtures for the component feature stories. Every dialog/editor needs a
   deterministic image source and no-op callbacks; a portal overlay needs a full
   TileMenuActions bag even when the story holds nothing selectable.

   SAMPLE_IMG is an inline SVG data url with real intrinsic size (640x400) so the
   crop/edit/inpaint stages measure a non-zero box without a network round-trip.
   The load helpers in those components pass data urls through untouched, so the
   canvas stays untainted and toDataURL is readable in the story. */

export const SAMPLE_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">' +
      '<rect width="640" height="400" fill="#1a1c1f"/>' +
      '<rect x="40" y="40" width="560" height="320" fill="#26282c"/>' +
      '<text x="320" y="205" fill="#d1fe17" font-family="sans-serif" font-size="28" text-anchor="middle">OHF sample</text>' +
      "</svg>",
  );

/** Swallow any callback shape; stories never drive real actions. */
export const noop = (..._args: unknown[]): void => {};
