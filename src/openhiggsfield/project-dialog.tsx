"use client";

import { useEffect, useRef, useState } from "react";

import { CloseIcon, LockIcon, PersonAddIcon } from "./icons";

/* The new-project dialog, measured against Higgsfield's live DOM
   (2026-11-03, CDP). The reference mounts as a floating card — fixed, centred,
   480 wide, 380 tall at rest, 24px corners, translucent (rgba(41,43,44,.75)
   over a 40px backdrop blur), hairline white/5 border, with no dimming layer
   behind it; the only backdrop is a transparent catcher that closes it on an
   outside press. Its form is: a centred 32px semibold name field whose
   placeholder is the folder name (내 프로젝트, aria-label 폴더 이름, sized by a
   hidden mirror span), the 비공개 프로젝트 toggle row, the Team upgrade row,
   and a full-width 만들기 button — white on ink when enabled, #292b2c on
   #737475 while the name is still empty. Escape closes, Enter submits and an
   outside press closes, the same order the reference runs. It replaces the
   local-only fields dialog everywhere it is mounted. */

export function ProjectDialog({
  onClose,
  onCreate,
}: {
  /** Dismisses the dialog without creating anything. */
  onClose: () => void;
  /** Receives the trimmed name and the private flag of the folder to add. */
  onCreate: (name: string, isPrivate: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // The reference opens with the name field focused, ready to type.
    inputRef.current?.focus();
  }, []);

  const canCreate = name.trim().length > 0;

  return (
    <div className="ohf-np-root">
      {/* Transparent backdrop catcher — the reference dims nothing, but an
          outside press still dismisses. */}
      <div className="ohf-np-catcher" aria-hidden onPointerDown={onClose} />
      <div
        className="ohf-np-card"
        role="dialog"
        aria-modal="true"
        aria-label="새 프로젝트"
      >
        <div className="ohf-np-head">
          <h2 className="ohf-np-title">새 프로젝트</h2>
          <button
            type="button"
            className="ohf-np-close"
            onClick={onClose}
            aria-label="닫기"
            title="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <form
          className="ohf-np-form"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) return;
            onCreate(trimmed, isPrivate);
            onClose();
          }}
        >
          <div className="ohf-np-hero">
            {/* The folder name doubles as the card's title — 32px semibold,
                centred, placeholder 내 프로젝트. A hidden mirror span sizes
                the text box and the input is laid over it, exactly as measured. */}
            <label className="ohf-np-name-row" htmlFor="ohf-np-name">
              <span className="ohf-np-name-fit">
                <span className="ohf-np-name-mirror" aria-hidden>
                  {name || "내 프로젝트"}
                </span>
                <input
                  id="ohf-np-name"
                  ref={inputRef}
                  className="ohf-np-name-input"
                  value={name}
                  maxLength={100}
                  autoComplete="off"
                  placeholder="내 프로젝트"
                  aria-label="폴더 이름"
                  onChange={(e) => setName(e.target.value)}
                />
              </span>
            </label>
            <button
              type="button"
              className="ohf-np-priv"
              aria-pressed={isPrivate}
              aria-label="비공개 프로젝트"
              title={isPrivate ? "This folder is private" : "Make this folder private"}
              onClick={() => setIsPrivate((v) => !v)}
            >
              <span className="ohf-np-priv-icon" data-on={isPrivate ? "true" : "false"}>
                <LockIcon size={16} />
              </span>
              <span className="ohf-np-priv-label">비공개 프로젝트</span>
            </button>
          </div>

          {/* The Team row is display-only here — no billing, no invites. */}
          <div className="ohf-np-team">
            <div className="ohf-np-team-row">
              <span className="ohf-np-team-icon" aria-hidden>
                <PersonAddIcon size={20} />
              </span>
              <div className="ohf-np-team-text">
                <p className="ohf-np-team-title">Team과 함께 작업하고 싶으세요?</p>
                <p className="ohf-np-team-sub">
                  사람을 초대하려면 요금제를 업그레이드해 주세요
                </p>
              </div>
              <button
                type="button"
                className="ohf-np-upgrade"
                data-off
                aria-disabled="true"
                title="Screen mirror — billing and upgrades live on higgsfield.ai"
              >
                업그레이드
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="ohf-np-submit"
            disabled={!canCreate}
            aria-label="만들기"
          >
            만들기
          </button>
        </form>
      </div>
    </div>
  );
}
