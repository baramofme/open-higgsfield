"use client";

/* ============================================================================
   reference-use-next.tsx  —  t_114a2802 (image centre-click → "use as next")

   The config card that rises when the centre of an image reference's showcase
   figure is clicked. "Use as next" hands this same picture to the next run; the
   card decides which role it plays there — Start frame, End frame or Reference.
   The three map straight onto the media roles the planner already speaks
   (start → img2img, end → last-frame flf2v, reference → the reference slot), so
   picking a row writes the role in place rather than re-attaching.

   House style is the reference-film popover's own pattern: a role=dialog with a
   header (title · 초기화 · Close icon-btn) over a column of option rows. It is
   mounted inside the showcase's media wrap so it rides the dialog's top layer
   and never hides under it. This file is the only place the use-as-next feature
   touches the UI; the role write itself lives in the media store's setRole.
   ========================================================================== */

import type { MediaRole } from "@/generation/catalog";
import { ROLE_LABELS } from "./data";
import { CloseIcon } from "./icons";

/* The image roles a still can serve on the next run, in the order the card
   lists them. ROLE_KINDS already proves these three hold images; the video and
   audio roles are absent here because an image cannot become them. */
const IMAGE_ROLES = ["start", "end", "reference"] as const;

/* One line under each option, naming where the picture lands. These read the
   planner's real mapping so the choice is not a guess at what it does. */
const ROLE_HINT: Record<MediaRole, string> = {
  start: "다음 생성의 시작 프레임으로 — img2img로 이어갑니다",
  end: "마지막 프레임으로 — 시작과 함께 flf2v로 이어갑니다",
  reference: "구성·스타일 레퍼런스로 붙습니다",
  video: "",
  audio: "",
};

export function ReferenceUseNextPopover({
  currentRole,
  onPick,
  onClose,
}: {
  /** Which role the picture holds right now — the row that wears the ring. */
  currentRole: MediaRole | undefined;
  /** Write the chosen role onto the held attachment. */
  onPick: (role: MediaRole) => void;
  onClose: () => void;
}) {
  return (
    <div className="ohf-ref-next-pop" role="dialog" aria-label="다음으로 사용 설정">
      <header className="ohf-ref-next-head">
        <span className="ohf-ref-next-title">다음으로 사용</span>
        {/* 초기화 drops the picture back to the plain reference slot, the way the
            film panel's reset returns every layer to its resting place. */}
        <button
          type="button"
          className="ohf-ref-next-reset"
          onClick={() => onPick("reference")}
        >
          초기화
        </button>
        <button
          type="button"
          className="ohf-icon-btn ohf-icon-btn--ghost"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon size={12} />
        </button>
      </header>

      <div className="ohf-ref-next-body" role="group" aria-label="배정할 역할">
        {IMAGE_ROLES.map((role) => {
          const selected = role === currentRole;
          return (
            <button
              key={role}
              type="button"
              className="ohf-ref-next-opt"
              data-selected={selected || undefined}
              aria-pressed={selected}
              onClick={() => onPick(role)}
            >
              <span className="ohf-ref-next-opt-label">{ROLE_LABELS[role]}</span>
              <span className="ohf-ref-next-opt-hint">{ROLE_HINT[role]}</span>
            </button>
          );
        })}
      </div>

      <span className="ohf-ref-next-receipt">
        {currentRole ? `${ROLE_LABELS[currentRole]} — 이 이미지가 다음 생성의 입력으로 쓰입니다` : "배정할 역할을 고르세요"}
      </span>
    </div>
  );
}
