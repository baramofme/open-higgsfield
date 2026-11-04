import type { Surface } from "@/generation/catalog";
import type { CinemaMode, StudioMode } from "./studio-mode";

/* The dock's cinematic-vs-normal face is decided in ONE place so the render never
   re-derives it. A mode-keyed record holds the half that is constant across every
   cinematic seat and every plain seat — the model's icon, the caret, the generate
   word, whether the plate mounts and whether the settings pills answer with HF's
   marks. A second, seat-keyed record holds the instruments that mount only under
   the clapper: the image seat keeps its preset tiles, the video seat
   through the instrument row above the prompt and the movement key. Both halves
   are folded into one object by `dockConfig`, so switching the studio mode (or the
   clapper's seat) re-renders the dock's icons and layout without touching the
   page — the studio store flips a value, React re-renders, and the dock reads the
   new face straight off the config. */

/** The model pill's icon family and the caret's glyph, named by the surface that
    owns them. The cinematic seat answers with HF's brand mark and the scan chevron
    the site puts on every model; the plain studio keeps the model's own icon (a
    colour chip when it has no brand art) and the caret the studio was built on. */
type DockMark = "lime" | "model";
type DockCaret = "chevron" | "caret";

/** The mode-keyed half: identical for every cinematic seat, identical for every
    plain seat. Keyed directly by the studio mode — the question the whole dock
    asks first, "is this the cinematic surface or the plain one". */
type DockMode = {
  plate: boolean;     // the mode rail on the dock's left
  cinemaPill: boolean; // settings pills answer with HF's own marks
  mark: DockMark;     // the model pill's icon
  caret: DockCaret;   // the model pill's caret glyph
  label: string;      // the generate button's word
};

const DOCK_BY_MODE: Record<StudioMode, DockMode> = {
  general: { plate: false, cinemaPill: false, mark: "model", caret: "caret", label: "Generate" },
  cinema: { plate: true, cinemaPill: true, mark: "lime", caret: "chevron", label: "생성하기" },
};

/** The instruments that mount only under the clapper, keyed by the seat the mode
    rail (or the pult) has chosen. `videoTop` is the video seat's instrument row
    above the prompt; `movement` is the camera-movement key that row's seat also
    carries in the rail; `tiles` are the
    character/camera presets in the right column, present on the seats that keep
    the button's corner free — image and cinematic — and folded away on video. */
type DockSeat = {
  videoTop: boolean;
  movement: boolean;
  tiles: boolean;
};

const CINEMA_SEAT: Record<CinemaMode, DockSeat> = {
  image: { videoTop: false, movement: false, tiles: true },
  video: { videoTop: true, movement: true, tiles: false },
  cinematic: { videoTop: false, movement: false, tiles: true },
};

/** The plain studio mounts none of the clapper's instruments — the app leaves the
    image and video forms plain outside the screen. */
const PLAIN_SEAT: DockSeat = { videoTop: false, movement: false, tiles: false };

/** The full face the render reads: the mode-keyed half plus the seat's instruments
    plus the tour anchor that mirrors the source's per-state anchor set. */
export type DockConfig = DockMode & DockSeat & {
  cinematic: boolean; // the mode, kept for class hooks and the plate's compact look
  anchor: string;     // data-tour-anchor the swap carries
};

/** Fold both records into the single face the dock reads. The anchor mirrors the
    source verbatim: the cinematic surface carries `tour-cinema-form`, the plain
    studio's swap carries the per-surface form anchor. */
export function dockConfig(mode: StudioMode, cinemaMode: CinemaMode, surface: Surface): DockConfig {
  const modeHalf = DOCK_BY_MODE[mode];
  const seatHalf = mode === "cinema" ? CINEMA_SEAT[cinemaMode] : PLAIN_SEAT;
  return {
    ...modeHalf,
    ...seatHalf,
    cinematic: mode === "cinema",
    anchor:
      mode === "cinema"
        ? "tour-cinema-form"
        : surface === "video"
          ? "tour-video-form"
          : "tour-image-form",
  };
}
