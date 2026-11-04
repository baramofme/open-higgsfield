import { registerPromptFeature } from "./prompt-registry";

/* ── The lighting instrument ─────────────────────────────────────────────────
   Two ways to light a shot, mirroring the live app's lighting panel:

   1. Choose a named COMPOSITION (Auto, Silhouette, Practicals, Window,
      Overhead fall, Contre jour, Soft cross). Each is a pre-built lighting
      setup the panel shows as a thumbnail card. Selecting one sets the plate's
      value to the composition's name and drops its phrase into the prompt.
      "Auto" is the default — it says nothing, so the caption stays untouched.

   2. Place lights DIRECTLY on a circular pad (the seats below). The visitor
      drags a seat around the ring and raises its intensity; where it sits turns
      into the role the prompt names — a light in front is a key, behind is a
      backlight, to the side is a rim. Several seats run at once, each with its
      own intensity, and they stack into the caption without fighting.

   This module registers itself at load — it is absent from the core, and neither
   prompt-registry.ts nor assemblePlane has to change to add it. That is the whole
   extensibility contract: the feature owns its vocabulary here. */

/** Angles are degrees around the ring: 0° is straight up (12 o'clock), rising
 *  clockwise to 360°. The camera looks at the subject from the bottom of the
 *  pad, so the front of the subject — the key-light zone — is 180°. */
const FRONT_DEG = 180;

/** One light's live state: where it sits on the ring and how hot it runs. This
 *  is the value the core stores under the seat's controlKey and feeds back to
 *  the fragment. */
export type LightValue = {
  deg: number;   // 0..360, clockwise from the top
  dist: number;  // ring radius fraction, 0.4..1 (how far out from the centre)
  intensity: number; // 0..1 — how bright the seat reads
};

/** Seats laid out at canonical angles so the pad opens with a sensible default
 *  spread before the visitor moves anything. Six gives room for a key, a fill,
 *  a rim on both flanks and a back without crowding the ring. */
export const LIGHT_SEATS: ReadonlyArray<{ id: string; deg: number }> = [
  { id: "light-1", deg: 135 }, // upper-front-right — the classic key position
  { id: "light-2", deg: 225 }, // upper-front-left — the fill, opposite the key
  { id: "light-3", deg: 90 },  // right side — rim
  { id: "light-4", deg: 270 }, // left side — rim
  { id: "light-5", deg: 0 },   // directly behind — backlight/rim from behind
  { id: "light-6", deg: 45 },  // upper-right, behind the shoulder — hair light
];

/** Signed distance from the front, folded into [-180,180] so both directions
 *  around the ring read the same. */
function fromFront(deg: number): number {
  let off = ((deg - FRONT_DEG + 180) % 360 + 360) % 360 - 180;
  return off; // negative = one side, positive = the other; 0 = dead front
}

/** Which role a seat's angle earns. The closer to the camera the hotter the
 *  name — key in front, fill just off it, rim on the flanks, back behind. */
export function classifyLight(deg: number): "key" | "fill" | "rim" | "back" {
  const off = Math.abs(fromFront(deg));
  if (off <= 22) return "key";
  if (off <= 62) return "fill";
  if (off <= 112) return "rim";
  return "back";
}

/** A short word for the intensity, and "say nothing" once it is effectively off
 *  (the core drops an empty fragment, so a seat at zero contributes no words). */
export function intensityWord(intensity: number): "" | "soft" | "strong" {
  if (intensity <= 0.18) return "";        // off — contributes nothing
  if (intensity < 0.45) return "soft";
  if (intensity < 0.75) return "";          // an even, unqualified light
  return "strong";
}

/** Turn a seat's live value into the phrase to inject. Off seats (intensity at
 *  the floor) return "" so the composition drops them; a placed-but-off seat is
 *  still tracked, it simply stays quiet in the caption. */
export function lightPromptFragment(raw: unknown): string {
  const v = raw as Partial<LightValue> | undefined;
  const intensity = v?.intensity ?? 0;
  const word = intensityWord(intensity);
  if (intensity <= 0.18) return ""; // explicitly off — say nothing
  const role = classifyLight(v?.deg ?? FRONT_DEG);
  // word may be "" for an even light; build a clean phrase either way
  return word ? `${word} ${role} light` : `${role} light`;
}

/* ── Named compositions ───────────────────────────────────────────────────────
   The live panel opens on a grid of these — each card is a thumbnail of a
   pre-built lighting setup plus its name, laid in this exact order. The list is
   the ground truth read off the live site, so the order and the labels match the
   source rather than any guess. "Auto" is the no-op default. */
export type LightComposition = {
  id: string;       // the controlKey the selection is stored under
  label: string;    // the name shown under the card and on the plate
  thumb: string;    // /cinema-studio-4/lighting/<id>.webp
  phrase: string;   // the prompt phrase this composition contributes (""); empty for Auto
};

export const LIGHT_COMPOSITIONS: ReadonlyArray<LightComposition> = [
  { id: "auto", label: "Auto", thumb: "/cinema-studio-4/lighting/auto.webp", phrase: "" },
  { id: "silhouette", label: "Silhouette", thumb: "/cinema-studio-4/lighting/silhouette.webp", phrase: "silhouette lighting" },
  { id: "practicals", label: "Practicals", thumb: "/cinema-studio-4/lighting/practicals.webp", phrase: "practical lighting" },
  { id: "window", label: "Window", thumb: "/cinema-studio-4/lighting/window.webp", phrase: "window light" },
  { id: "overhead-fall", label: "Overhead fall", thumb: "/cinema-studio-4/lighting/overhead-fall.webp", phrase: "overhead lighting" },
  { id: "contre-jour", label: "Contre jour", thumb: "/cinema-studio-4/lighting/contre-jour.webp", phrase: "contre-jour lighting" },
  { id: "soft-cross", label: "Soft cross", thumb: "/cinema-studio-4/lighting/soft-cross.webp", phrase: "soft cross lighting" },
];

/** The composition a stored value names, or undefined for Auto / nothing. */
export function compositionById(id: string | undefined): LightComposition | undefined {
  return LIGHT_COMPOSITIONS.find((c) => c.id === id);
}

/** The plate's face. It reads the chosen composition's English name the way the
 *  live site does — "Auto" and the no-selection state both collapse to "자동",
 *  every other composition shows its own name. A saved user preset shows its
 *  own saved name. */
export function lightingChoice(value: unknown): string {
  const id = typeof value === "string" ? value : undefined;
  if (!id) return "자동";
  if (id.startsWith("user-")) {
    const p = loadLightingPresets().find((p) => p.id === id);
    return p ? p.name : "자동";
  }
  const c = compositionById(id);
  if (!c || c.id === "auto") return "자동";
  return c.label;
}

/** A composition's phrase for the caption. Auto returns "" so the core drops it
 *  and the caption stays as the visitor wrote it. A saved user preset contributes
 *  the phrase its orbit was saved with. */
export function compositionFragment(raw: unknown): string {
  const id = typeof raw === "string" ? raw : undefined;
  if (!id) return "";
  const built = LIGHT_COMPOSITIONS.find((c) => c.id === id);
  if (built) return built.phrase;
  if (id.startsWith("user-")) {
    const p = loadLightingPresets().find((p) => p.id === id);
    return p ? p.phrase : "";
  }
  return "";
}

/* Register the instrument with the core. The composition selector is the panel's
   primary control (a single slot, one composition at a time); the seats are the
   manual-pad controls, each its own controlKey, so dragging one re-selects that
   seat (the core replaces it in place, never duplicating) while the others stay
   stacked. Scoped to "video" so the lighting note never bleeds into an image
   caption. */
const seatControls = Object.fromEntries(
  LIGHT_SEATS.map((seat) => [
    seat.id,
    { kind: "slider" as const, fragment: lightPromptFragment },
  ]),
);

registerPromptFeature("lighting", {
  surface: "video",
  controls: {
    composition: { kind: "selector" as const, fragment: compositionFragment },
    ...seatControls,
  },
});

/* ── The "새 조명 프리셋" orbit editor ──────────────────────────────────────────
   The live panel's create card opens a 3D editor: a CSS-3D object sits centre,
   the visitor drags it to spin, and two or more lights orbit it. Each light has
   a position on the ring (chosen by the six-way quick-select pad or by dragging
   its marker), a brightness, a diffusion spread and a colour. When the visitor
   saves, a named preset is written to a persisted store and joins the grid so it
   round-trips — select it again later and the plate reads the same look. */

/** The quick-select pad's six named positions, mapped to an angle on the ring
 *  (0° is the top, rising clockwise). Front is the camera side at 180°, so a
 *  front light reads as a key; back is behind the subject. */
export type LightPosition = "상단" | "정면" | "오른쪽" | "왼쪽" | "뒤로" | "하단";
export const QUICK_POSITIONS: ReadonlyArray<LightPosition> = [
  "상단", "정면", "오른쪽", "왼쪽", "뒤로", "하단",
];
export const POSITION_DEG: Record<LightPosition, number> = {
  "상단": 0,    // top of the ring
  "정면": 180,  // camera side — the key
  "오른쪽": 90, // right flank — a rim
  "왼쪽": 270,  // left flank — a rim
  "뒤로": 180,  // behind the subject (top-down pad, so it folds onto the same
              // axis as front; the editor keeps its own depth label)
  "하단": 359,  // just off the top, the bottom of the frame from the pad's view
};

/** One orbiting light's live state in the editor. */
export type OrbitLight = {
  id: string;
  deg: number;       // 0..360 clockwise from the top of the ring
  dist: number;      // ring radius fraction, 0.4..1
  brightness: number;// 0..1
  diffusion: number; // 0..1 — how soft the spread is
  color: string;     // hex, e.g. "#FFFFFF"
};

/** Default first light: a key on the camera side at half brightness. */
export function defaultOrbitLight(n = 1): OrbitLight {
  return {
    id: `orbit-${n}`,
    deg: POSITION_DEG["정면"],
    dist: 0.82,
    brightness: 0.5,
    diffusion: 0.5,
    color: "#FFFFFF",
  };
}

/** Phrase a single orbit light contributes to the caption. Off lights say nothing. */
export function orbitLightFragment(raw: unknown): string {
  const v = raw as Partial<OrbitLight> | undefined;
  const brightness = v?.brightness ?? 0;
  if (brightness <= 0.18) return "";
  const role = classifyLight(v?.deg ?? FRONT_DEG);
  const soft = (v?.diffusion ?? 0) >= 0.6 ? "soft " : "";
  const strong = brightness >= 0.75 ? "strong " : "";
  return `${soft}${strong}${role} light`;
}

/** Phrase a whole saved preset contributes — the orbit of its lights folded
 *  into one lighting note. */
export function presetPhrase(lights: ReadonlyArray<OrbitLight>): string {
  const parts = lights.map((l) => orbitLightFragment(l)).filter(Boolean);
  if (!parts.length) return "";
  // de-duplicate identical role phrases so an orbit reads cleanly
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const p of parts) { if (!seen.has(p)) { seen.add(p); uniq.push(p); } }
  return uniq.join(", ") + " lighting";
}

/* ── The persisted preset store ───────────────────────────────────────────────
   Saved presets are plain data, keyed so the grid can list and select them. They
   live in localStorage under one key; the core never has to know about them. A
   preset carries the orbit of lights it was saved with plus the caption phrase
   it contributes. */
export type SavedLightingPreset = {
  id: string;       // "user-<slug>", distinct from the built-in composition ids
  name: string;     // the label shown on the card and the plate
  lights: OrbitLight[];
  phrase: string;   // the caption phrase this preset contributes
};

const PRESET_KEY = "openhiggsfield.lightingPresets.v1";

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** A fresh user preset id from a display name, collision-free against the grid. */
export function userPresetId(name: string, existing: ReadonlyArray<SavedLightingPreset>): string {
  const base = `user-${slug(name) || "preset"}`;
  let id = base;
  let n = 2;
  while (existing.some((p) => p.id === id)) id = `${base}-${n++}`;
  return id;
}

export function loadLightingPresets(): SavedLightingPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRESET_KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v as SavedLightingPreset[];
  } catch {
    return [];
  }
}

export function saveLightingPresets(list: ReadonlyArray<SavedLightingPreset>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRESET_KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked — the grid simply won't round-trip */
  }
}

/** Build a preset from the editor's orbit and the chosen name. */
export function makePreset(name: string, lights: ReadonlyArray<OrbitLight>, existing: ReadonlyArray<SavedLightingPreset>): SavedLightingPreset {
  const id = userPresetId(name, existing);
  return { id, name: name.trim(), lights: lights.map((l) => ({ ...l })), phrase: presetPhrase(lights) };
}
