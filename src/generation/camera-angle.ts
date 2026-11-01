import { registerPromptFeature } from "./prompt-registry";

/* ── The camera-angle instrument ──────────────────────────────────────────────
   The image seat's answer to the video seat's camera movement: pick a camera
   angle in the dock and the phrase joins the caption through the same
   UI-to-prompt registry the movement instrument rides. This module registers
   itself at load — it is absent from the core, and neither prompt-registry.ts
   nor assemblePlane changes to add it (the extensibility contract, same as
   camera-movement.ts and lighting.ts).

   The vocabulary is the discrete tokens of ComfyUI-qwenmultiangle (angle-prompt
   spec §1b/§1d): three axes — 방위(view), 앙각(elevation), 화각(distance) — each
   collapsed to its categorical word. The selected VALUE is that English token
   verbatim, so the fragment is an identity map and the downstream workflow
   (t_1d77157a) can read the same token straight off the token store. The
   Korean labels ride the chips; the glossary pairing is the node's own
   (로우 앵글 = low-angle shot, 부감 = high-angle shot, …).

   Single choice per axis: one controlKey per axis, so re-picking replaces the
   slot in place instead of stacking a second phrase — the registry's own
   replacement rule. The custom slot carries free text the visitor types; its
   fragment passes it through trimmed and verbatim, the way krea2-anygles
   appends `extra_prompt` unchanged (spec §2b). Roll terms (dutch-tilt) are NOT
   offered as presets — neither backend models roll (spec key finding) — but
   free text can still say them.

   surface "image" scopes the feature to image captions, so an angle picked on
   the image dock never bleeds into a video prompt. */

/** The three axes the panel offers, in the order the prompt composes them
 *  (declaration order, not click order — the registry's canonical rule). */
export type AngleAxisKey = "view" | "elevation" | "distance";

/** One chip's pair: the English token stored in the slot and the Korean label
 *  the chip shows. The tooltip reads the token, the face reads the label. */
export type AngleOption = {
  value: string;
  label: string;
};

export type AngleAxis = {
  key: AngleAxisKey;
  label: string;
  options: readonly AngleOption[];
};

/** The axes and their chips, in the order the camera composes them:
 *  방위 → 앙각 → 거리, matching the node's own prompt assembly
 *  (" {h_direction} {v_direction} {distance}"). */
export const ANGLE_AXES: readonly AngleAxis[] = [
  {
    key: "view",
    label: "방위",
    options: [
      { value: "front view", label: "정면" },
      { value: "front-right quarter view", label: "우전 45°" },
      { value: "right side view", label: "우측면" },
      { value: "back-right quarter view", label: "우후 45°" },
      { value: "back view", label: "후면" },
      { value: "back-left quarter view", label: "좌후 45°" },
      { value: "left side view", label: "좌측면" },
      { value: "front-left quarter view", label: "좌전 45°" },
    ],
  },
  {
    key: "elevation",
    label: "앙각",
    options: [
      { value: "low-angle shot", label: "로우" },
      { value: "eye-level shot", label: "아이 레벨" },
      { value: "elevated shot", label: "하이" },
      { value: "high-angle shot", label: "부감" },
    ],
  },
  {
    key: "distance",
    label: "화각",
    options: [
      { value: "wide shot", label: "와이드" },
      { value: "medium shot", label: "미디엄" },
      { value: "close-up", label: "클로즈업" },
    ],
  },
] as const;

/** The feature id the panel drives and reads. One place owns the string so the
 *  screen and the fragment can never disagree. */
export const CAMERA_ANGLE_FEATURE = "camera-angle";

/** Stored value → Korean label, across every axis. The dock's trigger pill
 *  reads its summary from here, so the button says what the chips say. */
export function angleLabel(token: string): string {
  for (const axis of ANGLE_AXES) {
    const hit = axis.options.find((opt) => opt.value === token);
    if (hit) return hit.label;
  }
  return token;
}

/* An axis slot holds the English token itself, so the fragment is the identity —
   a stored non-string (a corrupt hydrate) says nothing rather than shouting. */
function axisFragment(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/* The custom slot passes free text through verbatim, trimmed at the ends only —
   the same untouched-append rule krea2-anygles gives `extra_prompt`. */
function customFragment(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* The registration: a module-load side effect, exactly like camera-movement's.
   Importing this file — directly or through the panel — wires the feature once;
   the core stays closed. */
registerPromptFeature(CAMERA_ANGLE_FEATURE, {
  surface: "image",
  controls: {
    view: { kind: "selector", fragment: axisFragment },
    elevation: { kind: "selector", fragment: axisFragment },
    distance: { kind: "selector", fragment: axisFragment },
    custom: { kind: "selector", fragment: customFragment },
  },
});
