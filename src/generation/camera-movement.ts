/* Camera movement: a cinematic instrument registered through the UI-to-prompt
   registry (see prompt-registry.ts). The mapping is a module-load side effect —
   importing this file wires the camera-movement vocabulary; the core file and
   assemblePlane never change. surface "video" scopes it to the cinematic video
   seat so a movement phrase never bleeds into an image caption.

   Five movements — pan, tilt, dolly, zoom, orbit — each with the directions the
   camera can actually go. Every direction is a toggle keyed by
   "movement-direction": selecting it adds the phrase; switching it off drops it.
   Different controlKeys accumulate, so a pan-left plus a tilt-up plus a dolly-in
   combine into one prompt rather than fighting over a slot. The intensity slider
   rides its own key and speaks only from the second detent up — a subtle push
   needs no words beyond the direction itself. */

import { registerPromptFeature } from "@/generation/prompt-registry";

/** A direction the camera can actually travel for a given movement. */
export type CameraDirection = "left" | "right" | "up" | "down" | "in" | "out";

/** One movement's UI shape: its key, its Korean label and the directions it
 *  can go. The panel renders a tile per movement and one toggle per direction. */
export type CameraMovementDef = {
  key: string;
  label: string;
  directions: CameraDirection[];
};

/** The five movements the panel offers, in the order the prompt composes them
 *  (registration then declaration order, not the click order). */
export const CAMERA_MOVEMENTS: readonly CameraMovementDef[] = [
  { key: "pan",   label: "팬",    directions: ["left", "right"] },
  { key: "tilt",  label: "틸트",  directions: ["up", "down"] },
  { key: "dolly", label: "돌리",  directions: ["in", "out"] },
  { key: "zoom",  label: "줌",     directions: ["in", "out"] },
  { key: "orbit", label: "오비트", directions: ["left", "right"] },
] as const;

/** The registry key for one direction button: `${movement}-${direction}` so
 *  each direction is a distinct controlKey. The panel drives and reads the slot
 *  through this key; the prompt fragment reads the same key's value. */
export function controlKey(movement: string, direction: CameraDirection): string {
  return `${movement}-${direction}`;
}

/** The phrase a direction button maps to — used for the fragment, the aria
 *  label and the panel's own tooltip, so one source reads all three. */
export const DIRECTION_PHRASES: Readonly<Record<string, string>> = {
  "pan-left":    "smooth pan left",
  "pan-right":   "smooth pan right",
  "tilt-up":     "gentle tilt up",
  "tilt-down":   "gentle tilt down",
  "dolly-in":    "slow dolly in",
  "dolly-out":   "slow dolly out",
  "zoom-in":     "gradual zoom in",
  "zoom-out":    "gradual zoom out",
  "orbit-left":  "slow orbit left",
  "orbit-right": "slow orbit right",
};

/** The intensity slider's detents. Zero is the resting place (says nothing);
 *  subtle is detent 1 and still needs no words beyond the direction itself, so
 *  the phrase only speaks from detent 2 up. */
export const INTENSITY_STEPS = [0, 1, 2, 3] as const;

/** The phrase each detent above the threshold maps to. */
const INTENSITY_PHRASES: Readonly<Record<number, string>> = {
  2: "with moderate intensity",
  3: "with strong intensity",
};

/* The registration: a module-load side effect. Importing this file — directly
   or through the panel that reads the data below — wires the feature once. The
   core stays closed; a sibling never edits it to add a movement. */
registerPromptFeature("camera-movement", {
  surface: "video",
  controls: {
    "pan-left":    { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["pan-left"] : "" },
    "pan-right":   { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["pan-right"] : "" },
    "tilt-up":     { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["tilt-up"] : "" },
    "tilt-down":   { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["tilt-down"] : "" },
    "dolly-in":    { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["dolly-in"] : "" },
    "dolly-out":   { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["dolly-out"] : "" },
    "zoom-in":     { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["zoom-in"] : "" },
    "zoom-out":    { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["zoom-out"] : "" },
    "orbit-left":  { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["orbit-left"] : "" },
    "orbit-right": { kind: "toggle", fragment: (v: unknown) => v ? DIRECTION_PHRASES["orbit-right"] : "" },
    "intensity":   { kind: "slider",  fragment: (n: unknown) => INTENSITY_PHRASES[n as number] ?? "" },
  },
});
