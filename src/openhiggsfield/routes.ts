/* Navigation route map — the single source of truth for where each live
   menu pill points. The topbar reads these values; the page routes honour
   the same paths so no menu item can produce a 404. */

import type { StudioMode } from "./studio-mode";

export type NavLink = "image" | "video" | "audio" | "cinema";

/** Each live nav item's href, query-string included. */
export const NAV_ROUTES: Record<NavLink, string> = {
  image: "/ko/ai/image?model=gpt_image_2",
  video: "/ko/ai/video?model=genjutsu",
  audio: "/ko/audio",
  cinema: "/ko/generate",
};

/** Which studio state each route initialises. */
export type RouteInit = {
  surface: "image" | "video" | "audio";
  model?: string;
  mode?: StudioMode;
};

export const ROUTE_INIT: Record<NavLink, RouteInit> = {
  image: { surface: "image", model: "gpt_image_2" },
  video: { surface: "video", model: "genjutsu" },
  audio: { surface: "audio" },
  cinema: { surface: "image", mode: "cinema" },
};
