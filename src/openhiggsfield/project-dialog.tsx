"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon } from "./icons";

/** Name a project. The app's dialog is one input and a private switch — invites
    to a shared project sit behind a plan we do not run, so private is offered
    on by default and shown as a plain badge. */
export function ProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, privateFlag: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return createPortal(
    <div className="ohf-v2-scrim" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="ohf-v2-project-card" role="dialog" aria-label="New project">
        <div className="ohf-v2-project-head">
          <h2 className="ohf-v2-project-title">New project</h2>
          <button type="button" className="ohf-v2-round-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={14} />
          </button>
        </div>
        <label className="ohf-v2-field">
          <span className="ohf-v2-field-label">Project name</span>
          <input
            ref={inputRef}
            className="ohf-v2-input"
            value={name}
            placeholder="e.g. Rabbit Kingdom"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) onCreate(name, isPrivate);
            }}
          />
        </label>
        <label className="ohf-v2-check-row">
          <input
            type="checkbox"
            className="ohf-v2-check-box"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
          />
          <span className="ohf-v2-check-label">Private</span>
        </label>
        <div className="ohf-v2-modal-foot">
          <button type="button" className="ohf-v2-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ohf-v2-solid-btn"
            disabled={!name.trim()}
            onClick={() => onCreate(name, isPrivate)}
          >
            Create
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
