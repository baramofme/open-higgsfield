import type { MediaRole, ModelEntry, Surface } from "./types";

/* =============================================================================
   Per-mode reference presets — the single source of truth for what the
   reference selector may offer, and how many of each it may hold.

   WHY THIS EXISTS
   The catalog already records, per model, the roles it accepts and their caps
   (`ModelEntry.roles`: role -> max count; a role absent means "not offered").
   That is the raw truth, but it is shaped for the submit mapper, not for a
   human choosing attachments. The picker and the tray need a richer view:
   the full ordered list of reference slots (so a slot can be shown greyed-out
   rather than silently missing), the coarse media kinds the shelf should
   filter to, the start/end-frame capability flags, and the "a reference needs
   a start frame" rule for video. This module derives all of that from the
   same `ModelEntry`, so there is exactly one place a reference limit is
   written and every UI component reads the same answer.

   KEYED BY
   mode = the model's `surface` (image | video | audio). Model truth is already
   keyed by model id, so deriving the policy per model also keys it per mode —
   `referencePolicyFor(model)` is the one query any UI can make.
   ============================================================================= */

/** The coarse unit a reference slot holds — the same vocabulary the asset
    library and the picker's type filter sort by. */
export type ReferenceKind = "image" | "video" | "audio";

/** Every reference slot the selector can ever draw, in the order it lists
    them. Carrying the whole domain (not just the roles a model declares) is
    what lets the picker show "End Frame" as a disabled option in modes that
    have no end frame, instead of it being absent without explanation. */
export const REFERENCE_ROLES: readonly MediaRole[] = [
  "start",
  "end",
  "reference",
  "video",
  "audio",
] as const;

/* What each slot accepts, in the coarse unit. Start and end are stills; a
   reference is a still; a video reference is a clip; an audio reference is a
   track. This mirrors the file-dialog accepts in the picker layer. */
const REFERENCE_ROLE_KIND: Record<MediaRole, ReferenceKind> = {
  start: "image",
  end: "image",
  reference: "image",
  video: "video",
  audio: "audio",
};

/* The kind order the shelf filters in, so `allowedKinds` is deterministic
   rather than a Set's insertion order. */
const REFERENCE_ROLE_KIND_ORDER: readonly ReferenceKind[] = ["image", "video", "audio"] as const;

/** Why a pre-submission reference check rejected the call. The submit handler
    maps each code to a message; today only one exists. */
export type ReferenceRejectionCode = "start_required";

/** One selectable reference slot, resolved for the current model. */
export type ReferenceRoleOption = {
  role: MediaRole;
  kind: ReferenceKind;
  /** How many of this slot the model allows. `0` means the slot is not
      offered at all — the selector should disable (or hide) it. */
  max: number;
  /** Whether the slot is selectable for this model. Equivalent to
      `max > 0 && policy.acceptsReference` — pre-computed so the UI never
      derives it twice and disagrees with itself. */
  enabled: boolean;
};

/** The per-mode reference preset, derived from a single catalog entry. This is
    the object every UI component queries to decide what to enable, filter,
    count-cap, and reject. */
export type ReferencePolicy = {
  surface: Surface;
  /** Whether the model accepts ANY reference media. An audio model whose
      endpoint takes only a caption/lyrics reports `false`, so the selector
      disables every slot — "this model can't take a music reference" reads as
      "nothing is selectable", which is the honest UI. */
  acceptsReference: boolean;
  /** The full ordered domain, each slot resolved for this model. */
  options: ReferenceRoleOption[];
  /** The same options keyed by role, for O(1) lookup by a control that already
      knows which role it is rendering. */
  optionFor: (role: MediaRole) => ReferenceRoleOption;
  /** The coarse kinds the shelf should keep in this mode. An image model
      returns `["image"]` (its type filter locks to Image); a video model
      returns the union of the kinds its enabled slots need. */
  allowedKinds: ReferenceKind[];
  /** True for an image surface — the picker forces the type filter to Image,
      so video and audio never show in the reference shelf. */
  imageOnly: boolean;
  /** Frame-based capability flags for video composition. */
  supportsStart: boolean;
  supportsEnd: boolean;
  allowsVideoRef: boolean;
  allowsAudioRef: boolean;
  /** The video rule: a reference may not be submitted without a start frame.
      True when the surface is video, the model has a start slot, and it also
      offers a reference slot. Pure reference-to-video models (a reference slot
      with no start slot — grok, seedance edit/extend) report `false`, so they
      stay unblocked. */
  requiresStartWithReference: boolean;
};

/* Per-model override hooks for the start-with-reference rule. The derived
   default (video + start slot + reference slot => references need a start)
   matches the shared mapper; a backend that genuinely diverges is the seam to
   pin here. Empty by default — populate with a model id when a run proves the
   opposite. Both sets win over the derived value, and `noStartRequired` wins
   over `startRequired`. */
const START_REQUIRED_OVERRIDES = new Set<string>([]);
const START_NOT_REQUIRED_OVERRIDES = new Set<string>([]);

/** Resolve the reference preset for one model. Pure and synchronous — safe to
    call during render. The `ModelEntry` is the only input, so the catalog stays
    the single place a limit is declared. */
export function referencePolicyFor(model: ModelEntry): ReferencePolicy {
  const imageOnly = model.surface === "image";
  const acceptsReference = model.surface !== "audio" && Object.values(model.roles).some((n) => n > 0);

  const options: ReferenceRoleOption[] = REFERENCE_ROLES.map((role) => {
    const max = model.roles[role] ?? 0;
    return {
      role,
      kind: REFERENCE_ROLE_KIND[role],
      max,
      enabled: acceptsReference && max > 0,
    };
  });

  const enabledKinds = new Set<ReferenceKind>();
  for (const option of options) if (option.enabled) enabledKinds.add(option.kind);
  const allowedKinds: ReferenceKind[] = imageOnly ? ["image"] : REFERENCE_ROLE_KIND_ORDER.filter((k) => enabledKinds.has(k));

  const supportsStart = (model.roles.start ?? 0) > 0;
  const supportsEnd = (model.roles.end ?? 0) > 0;
  const allowsVideoRef = (model.roles.video ?? 0) > 0;
  const allowsAudioRef = (model.roles.audio ?? 0) > 0;

  const requiresStartWithReference =
    START_NOT_REQUIRED_OVERRIDES.has(model.id)
      ? false
      : START_REQUIRED_OVERRIDES.has(model.id) ||
        (model.surface === "video" && supportsStart && (model.roles.reference ?? 0) > 0);

  const byRole = new Map(options.map((option) => [option.role, option]));
  const optionFor = (role: MediaRole): ReferenceRoleOption =>
    byRole.get(role) ?? { role, kind: REFERENCE_ROLE_KIND[role], max: 0, enabled: false };

  return {
    surface: model.surface,
    acceptsReference,
    options,
    optionFor,
    allowedKinds,
    imageOnly,
    supportsStart,
    supportsEnd,
    allowsVideoRef,
    allowsAudioRef,
    requiresStartWithReference,
  };
}

/** How many more of a slot still fit, given what is already attached. Returns
    `0` when the slot is full or not offered — the control reads this to block
    a further add before it opens the file dialog. */
export function referenceSlotsRemaining(
  policy: ReferencePolicy,
  role: MediaRole,
  currentCount: number,
): number {
  const option = policy.optionFor(role);
  if (!option.enabled) return 0;
  return Math.max(0, option.max - currentCount);
}

/** A pre-submission reference check. The submit handler calls this before it
    talks to the backend; a rejection must stop the call and show the message.
    Generic over any array shape so it reads the same off the plane's `media`
    map or the tray's attachment list. */
export function validateReferenceSubmission(
  model: ModelEntry,
  media: Partial<Record<MediaRole, readonly unknown[]>>,
): { ok: true } | { ok: false; code: ReferenceRejectionCode; message: string } {
  const policy = referencePolicyFor(model);
  if (policy.requiresStartWithReference) {
    const hasReference = (media.reference?.length ?? 0) > 0;
    const hasStart = (media.start?.length ?? 0) > 0;
    if (hasReference && !hasStart) {
      return {
        ok: false,
        code: "start_required",
        message: "Video generation requires a Start Frame when using a Reference.",
      };
    }
  }
  return { ok: true };
}

