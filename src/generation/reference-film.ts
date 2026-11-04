/* Reference film: a cinematic instrument registered through the UI-to-prompt
   registry (see prompt-registry.ts). Like camera-movement, the mapping is a
   module-load side effect — importing this file wires the reference-film
   vocabulary; the core file and assemblePlane never change. surface "video"
   scopes it to the cinematic video seat so a film-reference phrase never bleeds
   into an image caption.

   The axes mirror the app's own film dialog exactly (live-measured 2026-11-04,
   CDP :9222): three wheels — genre (장르, 7 items), era (시대, 6 incl. Auto) and
   tempo (템포, 5 incl. Auto). Each axis owns one controlKey, so picking a genre
   AND an era AND a tempo composes all three phrases into one prompt; re-picking
   inside one axis replaces that slot in place. Auto is the axis's resting place:
   selecting it clears the slot, so the plate reads 자동 again — the same rule the
   app shows when a selected label is tapped back off.

   `display` is the word the seat's plate wears for a selection — the app spells
   its genre selections in English (Epic, Noir, ...) even under a Korean UI, so
   the plate copies those spellings verbatim; era and tempo keep their own. */

import { registerPromptFeature } from "@/generation/prompt-registry";

/** The feature id the registry keys every reference-film slot under. Fixed by
 *  the orchestrator so the three cinematic siblings never collide on the same
 *  namespace. */
export const REFERENCE_FILM_FEATURE = "reference-film";

/** One reference option: the value stored in the slot, the Korean label the
 *  wheel reads, the plate's display word, and the prompt phrase the selection
 *  injects. An empty phrase means the option says nothing beyond itself (Auto). */
export type ReferenceOption = {
  value: string;
  label: string;
  display: string;
  phrase: string;
};

/** One axis's UI shape: its registry key, its Korean tab label and the options
 *  it offers, in the order the plate joins them (genre, era, tempo — the app's
 *  own canonical order, not the order the wheels were tapped in). */
export type ReferenceAxis = {
  key: string;
  label: string;
  options: readonly ReferenceOption[];
};

/* The stills the wheels ride are the app's own creative-control scenes, copied
   into public/cinema-studio-4/film/ (measured from the CDN 2026-11-04). The map
   below names the file per option value; the panel resolves value -> url. */
export const FILM_STILLS: Readonly<Record<string, string>> = {
  general: "/cinema-studio-4/film/genre/general.webp",
  epic: "/cinema-studio-4/film/genre/epic.webp",
  drama: "/cinema-studio-4/film/genre/drama.webp",
  noir: "/cinema-studio-4/film/genre/noir.webp",
  comedy: "/cinema-studio-4/film/genre/comedy.webp",
  horror: "/cinema-studio-4/film/genre/horror.webp",
  action: "/cinema-studio-4/film/genre/action.webp",
  auto: "/cinema-studio-4/film/tempo/auto.webp",
  chaotic: "/cinema-studio-4/film/tempo/chaotic.webp",
  dynamic: "/cinema-studio-4/film/tempo/dynamic.webp",
  calm: "/cinema-studio-4/film/tempo/calm.webp",
  single_shot: "/cinema-studio-4/film/tempo/single-shot.webp",
};

/** The three wheels the dialog offers, in declaration order — genre, era,
 *  tempo — so the composed prompt reads top-down regardless of tap order. The
 *  item lists are the app's, measured live: the genre cycle names seven stories,
 *  the era wheel five decades plus Auto, the tempo wheel five beats plus Auto. */
export const REFERENCE_AXES: readonly ReferenceAxis[] = [
  {
    key: "genre",
    label: "장르",
    options: [
      { value: "general", label: "일반",   display: "General", phrase: "natural cinematic tone, unforced coverage" },
      { value: "epic",    label: "에픽",   display: "Epic",    phrase: "epic scale, grand sweeping vistas, volumetric atmosphere" },
      { value: "drama",   label: "드라마", display: "Drama",   phrase: "grounded human drama, naturalistic performance" },
      { value: "noir",    label: "누아르", display: "Noir",    phrase: "film noir mood, low-key lighting, venetian shadows" },
      { value: "comedy",  label: "코미디", display: "Comedy",  phrase: "comedic timing, bright even lighting" },
      { value: "horror",  label: "호러",   display: "Horror",  phrase: "horror dread, desaturated cold palette" },
      { value: "action",  label: "액션",   display: "Action",  phrase: "kinetic action energy, punchy kinetic coverage" },
    ],
  },
  {
    key: "era",
    label: "시대",
    options: [
      { value: "auto",    label: "Auto",  display: "Auto",  phrase: "" },
      { value: "1960s",   label: "1960s", display: "1960s", phrase: "1960s Technicolor, saturated primaries" },
      { value: "1980s",   label: "1980s", display: "1980s", phrase: "1980s VHS sheen, saturated neon" },
      { value: "1990s",   label: "1990s", display: "1990s", phrase: "1990s indie realism, muted colours" },
      { value: "2000s",   label: "2000s", display: "2000s", phrase: "early-2000s digital intermediate, crisp contrast" },
      { value: "2020s",   label: "2020s", display: "2020s", phrase: "modern digital cinema, clean highlights" },
    ],
  },
  {
    key: "tempo",
    label: "템포",
    options: [
      { value: "auto",        label: "Auto",        display: "Auto",        phrase: "" },
      { value: "chaotic",     label: "Chaotic",     display: "Chaotic",     phrase: "frantic montage, rapid jump cuts" },
      { value: "dynamic",     label: "Dynamic",     display: "Dynamic",     phrase: "dynamic pacing, energetic cuts" },
      { value: "calm",        label: "Calm",        display: "Calm",        phrase: "slow contemplative pacing, long takes" },
      { value: "single_shot", label: "Single shot", display: "Single shot", phrase: "one continuous unbroken take" },
    ],
  },
] as const;

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
    tempo: { kind: "selector", fragment: optionPhrase(REFERENCE_AXES[2]!) },
  },
});
