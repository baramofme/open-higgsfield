/* ── Discrete-chip → numeric translation layer ───────────────────────────────
   Pure, side-effect-free function: the dock's three discrete axis selections
   (the English qwenmultiangle tokens stored in the camera-angle token store)
   are re-expanded into numeric node inputs for BOTH camera backends —
   qwenmultiangle (continuous → categorical LoRA vocabulary) and krea2-anygles
   (continuous yaw/elevation/distance + a relative-camera instruction sentence).

   Single source of truth: this layer does NOT register anything and does NOT
   touch the prompt-token channel (prompt-registry.ts / camera-angle.ts /
   composePromptFragment stay untouched — the t_1d77157a wiring is intact). It
   is an additive reader that takes the chip strings the store already holds and
   derives numbers; the store remains the writer/reader of record.

   Bucket midpoints are verbatim from angle-prompt-spec.md §1b:
     - view: 45° buckets over horizontal_angle % 360 (8-way)
     - elevation: <-15 low | <15 eye | <45 elevated | >=45 high (vertical_angle -30..60)
     - distance: <2 wide | <6 medium | >=6 close-up (zoom 0..10)
   Each chip maps to the centre of its bucket. Composition order is the node's
   own: view → elevation → distance.

   Unselected or unknown chips fall back to that axis's neutral default — the
   same "says nothing rather than shouts" stance camera-angle.ts takes for a
   corrupt slot. A missing axis means "let the model decide", which is the
   numeric identity (front / eye-level / neutral distance). */

/** Numeric node inputs for ComfyUI-qwenmultiangle. The node takes continuous
 *  angles and re-collapses them to the 8/4/3 categorical vocabulary — feeding
 *  the bucket midpoint reproduces the chip the visitor picked. */
export type QwenMultiangleNumeric = {
  /** horizontal_angle (Int, 0..360) — azimuth */
  h: number;
  /** vertical_angle (Int, -30..60) — elevation */
  v: number;
  /** zoom (Float, 0..10) — 0 wide … 10 close-up */
  z: number;
};

/** Numeric node inputs + instruction sentence for krea2-anygles. */
export type AnyglesNumeric = {
  /** yaw (Float, -180..180) — negative=left, positive=right */
  yaw: number;
  /** elevation (Float, -60..60) — negative=down, positive=up */
  elevation: number;
  /** distance (Float, 0.6..1.8) — <1 closer, >1 farther */
  distance: number;
  /** the relative-camera instruction sentence (spec §2b anygles.camera_prompt) */
  camera_prompt: string;
  /** optional English qwenmultiangle tokens, " {view} {elev} {dist}" (spec §1c
   *  prompt_format). Kept SEPARATE from camera_prompt — the node only appends
   *  extra_prompt when the caller supplies it (spec §2b rule 4). */
  extra_prompt: string;
};

export type AngleNumeric = {
  qwenmultiangle: QwenMultiangleNumeric;
  anygles: AnyglesNumeric;
};

/* ── Bucket midpoints ─────────────────────────────────────────────────────────
   The eight view chips are the centres of the node's 45° buckets: front view's
   bucket wraps across the 0° seam (>=337.5 | <22.5 → centre 0°), the rest sit
   at clean 45° steps. Azimuth is stored 0..360; krea2 yaw is the same physical
   angle re-signed to -180..180 (right-side positive, left-side negative). */
const VIEW_MID: Record<string, number> = {
  "front view": 0,
  "front-right quarter view": 45,
  "right side view": 90,
  "back-right quarter view": 135,
  "back view": 180,
  "back-left quarter view": 225,
  "left side view": 270,
  "front-left quarter view": 315,
};

/* Elevation bucket centres over vertical_angle's -30..60 domain, rounded to the
   node's Int step=1 for qwenmultiangle; krea2 keeps the exact float centre. */
const ELEV_QWEN_INT: Record<string, number> = {
  "low-angle shot": -22, // ( -30 + -15 ) / 2 = -22.5 → Int step=1
  "eye-level shot": 0, //    ( -15 + 15 ) / 2 = 0
  "elevated shot": 30, //    ( 15 + 45 ) / 2 = 30
  "high-angle shot": 53, //  ( 45 + 60 ) / 2 = 52.5 → Int step=1
};
const ELEV_ANYGLES_FLOAT: Record<string, number> = {
  "low-angle shot": -22.5,
  "eye-level shot": 0,
  "elevated shot": 30,
  "high-angle shot": 52.5,
};

/* Distance/zoom. medium is the neutral baseline (zoom 4 = the node's own 5≈medium
   middle, distance 1.0 = krea2's "no camera-move" identity). wide pulls the
   camera farther (>1), close-up pushes it closer (<1) — so the shot-scale words
   trigger exactly the spec's farther/closer sentences. zoom midpoints are the
   centres of the node's <2 / <6 / >=6 buckets over 0..10. */
const ZOOM_MID: Record<string, number> = {
  "wide shot": 1, //        [0,2)   centre
  "medium shot": 4, //      [2,6)   centre
  "close-up": 8, //         [6,10]  centre
};
const DIST_MID: Record<string, number> = {
  "wide shot": 1.4, // farther — midpoint of the >1 half of 0.6..1.8
  "medium shot": 1.0, // neutral — krea2 default, no distance sentence
  "close-up": 0.8, // closer — midpoint of the <1 half of 0.6..1.8
};

/* Axis-neutral defaults when a chip is absent (auto) or unrecognised. */
const NEUTRAL = {
  viewH: 0, // front
  elevInt: 0, // eye-level
  zoom: 5.0, // medium (node default)
  yaw: 0,
  elev: 0,
  dist: 1.0,
};

/* Python's non-negative modulo, mirrored for the left-only relative angle:
   left_angle = (-yaw) % 360, with 0/360 normalised to 0 (spec §2b). */
function leftAngle(yaw: number): number {
  const a = ((-yaw % 360) + 360) % 360;
  return a === 360 ? 0 : a;
}

/* Format a number the way the node does (`{n:g}` — trailing zeros dropped).
   For every value this layer produces (integers, .5 floats), String() already
   matches :g; kept as one named helper so the rule is in one place. */
function g(n: number): string {
  return String(n);
}

/* Assemble the relative-camera sentence per spec §2b. The base sentence is
   always present; elevation/distance clauses appear only when non-neutral. */
function cameraPrompt(yaw: number, elevation: number, distance: number): string {
  const parts: string[] = [
    `Same figure. Move the camera ${g(leftAngle(yaw))} degrees to the left relative to the input view.`,
  ];
  if (elevation !== 0) {
    const dir = elevation < 0 ? "downward" : "upward";
    parts.push(
      `Move the camera ${g(Math.abs(elevation))} degrees ${dir} relative to the input view.`,
    );
  }
  if (distance !== 1.0) {
    parts.push(
      distance > 1
        ? "Move the camera farther away from the figure."
        : "Move the camera closer to the figure.",
    );
  }
  return parts.join(" ");
}

/* Look up a chip's numeric; unknown/missing → that axis's neutral default. */
function num(table: Record<string, number>, chip: string | undefined, fallback: number): number {
  if (typeof chip !== "string") return fallback;
  const hit = table[chip];
  return hit === undefined ? fallback : hit;
}

/**
 * Translate the dock's three discrete chips into numeric node inputs for both
 * backends. Order is fixed: view → elevation → distance.
 *
 * @param viewChip      one of the 8 view tokens (or undefined for auto)
 * @param elevationChip one of the 4 elevation tokens (or undefined)
 * @param distanceChip  one of the 3 distance tokens (or undefined)
 */
export function chipsToNumeric(
  viewChip?: string,
  elevationChip?: string,
  distanceChip?: string,
): AngleNumeric {
  const h = num(VIEW_MID, viewChip, NEUTRAL.viewH);
  const v = num(ELEV_QWEN_INT, elevationChip, NEUTRAL.elevInt);
  const z = num(ZOOM_MID, distanceChip, NEUTRAL.zoom);

  // krea2 yaw is the same physical azimuth re-signed into -180..180.
  const yaw = h > 180 ? h - 360 : h;
  const elevation = num(ELEV_ANYGLES_FLOAT, elevationChip, NEUTRAL.elev);
  const distance = num(DIST_MID, distanceChip, NEUTRAL.dist);

  // Optional English qwenmultiangle tokens (identity words, spec §1c).
  const words = [viewChip, elevationChip, distanceChip]
    .filter((w): w is string => typeof w === "string" && w.length > 0)
    .join(" ");
  const extra_prompt = words ? ` ${words}` : "";

  return {
    qwenmultiangle: { h, v, z },
    anygles: {
      yaw,
      elevation,
      distance,
      camera_prompt: cameraPrompt(yaw, elevation, distance),
      extra_prompt,
    },
  };
}
