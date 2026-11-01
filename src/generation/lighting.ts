import { registerPromptFeature } from "./prompt-registry";

/* ── The lighting instrument ─────────────────────────────────────────────────
   A circular pad with a lit object at its centre. Light seats ride the ring;
   the visitor drags one around the circle and raises its intensity, and where
   the seat sits on the ring turns into the role the prompt names — a light in
   front of the subject is a key light, one behind is a backlight, one to the
   side is a rim. Multiple seats are live at once, each carrying its own
   intensity, so several lights stack into the caption without fighting.

   This module registers itself at load — it is absent from the core, and neither
   prompt-registry.ts nor assemblePlane has to change to add it. That is the
   whole extensibility contract: the feature owns its vocabulary here. */

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

/* Register the instrument with the core. Each seat is its own controlKey, so
   dragging one re-selects that seat (the core replaces it in place, never
   duplicating) while the others stay stacked — multiple lights, each with its
   own intensity, fall out of the mechanism for free. Scoped to "video" so the
   lighting note never bleeds into an image caption. */
registerPromptFeature("lighting", {
  surface: "video",
  controls: Object.fromEntries(
    LIGHT_SEATS.map((seat) => [
      seat.id,
      { kind: "slider" as const, fragment: lightPromptFragment },
    ]),
  ),
});
