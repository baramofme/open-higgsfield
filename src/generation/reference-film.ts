/* Reference film: a cinematic instrument registered through the UI-to-prompt
   registry (see prompt-registry.ts). Like camera-movement, the mapping is a
   module-load side effect — importing this file wires the reference-film
   vocabulary; the core file and assemblePlane never change. surface "video"
   scopes it to the cinematic video seat so a film-reference phrase never bleeds
   into an image caption.

   Four reference layers stack without conflict: genre, era, director style and
   colour grading each own one controlKey, so picking a genre AND an era AND a
   director AND a grade composes all four phrases into one prompt. Re-picking
   within one layer replaces that slot in place (the genre can only read one way
   at a time), while a different layer accumulates a new one — which is the
   discipline that keeps a multi-reference grade conflict-free. The intensity
   slider rides its own key and speaks only from the second detent up: a faint
   nod to a look needs no words beyond the reference itself. */

import { registerPromptFeature } from "@/generation/prompt-registry";

/** The feature id the registry keys every reference-film slot under. Fixed by
 *  the orchestrator so the three cinematic siblings never collide on the same
 *  namespace. */
export const REFERENCE_FILM_FEATURE = "reference-film";

/** One reference option: the value stored in the slot, the Korean label the chip
 *  reads, and the prompt phrase the selection injects. */
export type ReferenceOption = {
  value: string;
  label: string;
  phrase: string;
};

/** One reference layer's UI shape: its registry key, its Korean group label and
 *  the options it offers, in the order the prompt composes them. */
export type ReferenceAxis = {
  key: string;
  label: string;
  options: readonly ReferenceOption[];
};

/** The four layers the panel offers, in declaration order — genre, then era,
 *  then director, then colour grading — so the composed prompt reads top-down
 *  regardless of the order the chips were tapped in. */
export const REFERENCE_AXES: readonly ReferenceAxis[] = [
  {
    key: "genre",
    label: "장르",
    options: [
      { value: "film-noir",    label: "필름 느와르", phrase: "film noir mood, low-key lighting, venetian shadows" },
      { value: "neo-noir",     label: "네오 느와르",   phrase: "neo-noir neon, wet-street reflections" },
      { value: "sci-fi",       label: "SF 에픽",       phrase: "sci-fi epic scale, volumetric atmosphere" },
      { value: "western",      label: "웨스턴",         phrase: "spaghetti western dust, wide vistas" },
      { value: "horror",       label: "호러",           phrase: "horror dread, desaturated cold palette" },
      { value: "romance",      label: "로맨스",         phrase: "soft romantic glow, shallow depth" },
      { value: "documentary",  label: "다큐",           phrase: "documentary realism, handheld naturalism" },
    ],
  },
  {
    key: "era",
    label: "시대",
    options: [
      { value: "1960s",  label: "1960s 테크니콜러", phrase: "1960s Technicolor, saturated primaries" },
      { value: "1970s",  label: "1970s 뉴 할리우드", phrase: "1970s film grain, Kodak palette" },
      { value: "1980s",  label: "1980s 네온",       phrase: "1980s VHS sheen, saturated neon" },
      { value: "1990s",  label: "1990s 인디",       phrase: "1990s indie realism, muted colours" },
      { value: "digital", label: "뉴 디지털",       phrase: "clean digital cinema, crisp highlights" },
    ],
  },
  {
    key: "director",
    label: "감독 스타일",
    options: [
      { value: "wong-kar-wai", label: "Wong Kar-wai",      phrase: "Wong Kar-wai step-printed motion, saturated teal" },
      { value: "wes-anderson", label: "Wes Anderson",      phrase: "Wes Anderson symmetrical framing, pastel palette" },
      { value: "roger-deakins", label: "Roger Deakins",    phrase: "Deakins silhouette lighting, composed contrast" },
      { value: "lubezki",      label: "Emmanuel Lubezki",  phrase: "Lubezki long-take natural light" },
      { value: "fincher",      label: "David Fincher",     phrase: "Fincher teal grade, hard shadows" },
    ],
  },
  {
    key: "color",
    label: "컬러 그레이딩",
    options: [
      { value: "teal-orange",     label: "틸·오렌지",       phrase: "teal and orange grade" },
      { value: "bleach-bypass",   label: "블리치 바이패스",  phrase: "bleach bypass, high contrast low saturation" },
      { value: "warm-vintage",    label: "웜 빈티지",       phrase: "warm vintage grade, lifted blacks" },
      { value: "halation",        label: "할레이션",        phrase: "film halation, soft bloom" },
      { value: "clean-digital",   label: "클린 디지털",      phrase: "clean digital grade, neutral whites" },
      { value: "day-for-night",   label: "데이 포 나이트",   phrase: "day-for-night grade, cold moonlight" },
    ],
  },
] as const;

/** The intensity slider's detents. Zero is the resting place (says nothing);
 *  detent 1 is a faint nod that still needs no words beyond the reference
 *  itself, so the phrase only speaks from detent 2 up — mirroring the
 *  camera-movement slider's discipline. */
export const INTENSITY_STEPS = [0, 1, 2, 3, 4] as const;

/** The phrase each detent above the threshold maps to. */
const INTENSITY_PHRASES: Readonly<Record<number, string>> = {
  2: "with moderate style intensity",
  3: "with strong style intensity",
  4: "with intense style intensity",
};

/** Turn an axis's chosen value into the prompt phrase. A value the catalog does
 *  not name yields nothing, so a stale slot can never inject a stray phrase. */
function optionPhrase(axis: ReferenceAxis): (value: unknown) => string {
  const byValue = new Map(axis.options.map((o) => [o.value, o.phrase]));
  return (value: unknown) => byValue.get(String(value)) ?? "";
}

/* The registration: a module-load side effect. Importing this file — directly or
   through the panel that reads the data below — wires the feature once. The core
   stays closed; a sibling never edits it to add a reference layer. */
registerPromptFeature(REFERENCE_FILM_FEATURE, {
  surface: "video",
  controls: {
    genre: { kind: "selector", fragment: optionPhrase(REFERENCE_AXES[0]!) },
    era: { kind: "selector", fragment: optionPhrase(REFERENCE_AXES[1]!) },
    director: { kind: "selector", fragment: optionPhrase(REFERENCE_AXES[2]!) },
    color: { kind: "selector", fragment: optionPhrase(REFERENCE_AXES[3]!) },
    intensity: { kind: "slider", fragment: (n: unknown) => INTENSITY_PHRASES[n as number] ?? "" },
  },
});
