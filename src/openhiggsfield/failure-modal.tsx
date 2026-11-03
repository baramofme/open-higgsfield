"use client";

import { useEffect, useRef, useState } from "react";

import { CloseIcon, CopyIcon, WarningIcon } from "./icons";
import { timeAgo, type RunRecord } from "./history";

/* A single labelled row in the detail grid. Both halves are strings so the
   grid never has to branch on the value's type — the caller flattens anything
   structured into text before it gets here. */
type FailureField = {
  label: string;
  value: string;
  /** A value worth rendering in a monospaced block (the raw error, params). */
  mono?: boolean;
  /** When the value is genuinely absent, the row reads as a dash rather than an
      empty cell, so "nothing recorded" looks deliberate, not broken. */
  empty?: boolean;
};

/** Turn any recorded setting value into readable text. Booleans and numbers
    print as themselves; anything else is stringified defensively so a stray
    object in an old record can never throw during render. */
function settingText(value: unknown): string {
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** A wall-clock stamp for the failure, in the visitor's own locale. */
function stamp(epoch: number | undefined): string {
  if (typeof epoch !== "number" || !Number.isFinite(epoch)) return "";
  try {
    return new Date(epoch).toLocaleString();
  } catch {
    return "";
  }
}

/** Flatten the run's resolved settings into "key — value" lines for the input
    block. Guarded so a malformed settings object (present but not an object)
    degrades to nothing rather than crashing the modal. */
function settingsLines(settings: RunRecord["settings"]): string[] {
  if (!settings || typeof settings !== "object") return [];
  return Object.entries(settings).map(([key, value]) => `${key} — ${settingText(value)}`);
}

/** The whole detail picture for one failed run, assembled from the fields the
    app recorded when the run failed. A record with no error text and no
    settings collapses to an empty field list, which the modal reads as
    "details unavailable" rather than a blank panel. */
function fieldsFor(record: RunRecord): FailureField[] {
  const when = stamp(record.failedAt ?? record.createdAt);
  const inputs: string[] = [];
  if (record.prompt) inputs.push(`prompt — ${record.prompt}`);
  if (record.ratio) inputs.push(`ratio — ${record.ratio}`);
  if (record.meta) inputs.push(`meta — ${record.meta}`);
  inputs.push(...settingsLines(record.settings));

  const partial = record.urls.length
    ? record.urls.join("\n")
    : "";

  return [
    { label: "발생 시각", value: when ? `${when} · ${timeAgo(record.failedAt ?? record.createdAt)}` : "—", empty: !when },
    { label: "모델", value: record.modelLabel || record.modelId || "—", empty: !record.modelLabel && !record.modelId },
    { label: "모델 ID", value: record.modelId || "—", empty: !record.modelId },
    { label: "입력 파라미터", value: inputs.join("\n") || "—", mono: true, empty: inputs.length === 0 },
    { label: "부분 출력", value: partial || "부분 출력 없음", mono: !!partial, empty: !partial },
    { label: "요청", value: record.requestId || record.id, mono: true },
  ];
}

export function FailureModal({
  record,
  onClose,
}: {
  record: RunRecord | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
    panelRef.current?.focus();
  }, []);

  // The error message is the one thing worth pasting into a support ticket or a
  // debug session, so it gets its own block and a copy control. A clipboard that
  // refuses (a denied permission, a non-secure context) is swallowed here — the
  // text stays readable on screen regardless.
  const error = record?.error ?? "";
  async function copyError() {
    if (!error) return;
    try {
      await navigator.clipboard?.writeText(error);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // No clipboard available; the text is already visible, so nothing to do.
    }
  }

  const fields = record ? fieldsFor(record) : [];
  /* The error message is the failure detail the whole dialog is built around. A
     record with no error text recorded, or no record at all (deleted or aged out
     of the run log), reads as "nothing to show" — the generic unavailable
     message, never a grid of dashes that looks like real data. */
  const hasDetail = !!record && !!error;
  // Two reasons for the generic message, worded distinctly so the visitor can
  // tell a vanished record apart from a failure recorded without a message.
  const missingReason = !record
    ? "기록된 실패 정보를 찾을 수 없습니다. 이 실행의 상세는 이 브라우저에 남아있지 않습니다."
    : "이 실행에 기록된 에러 메시지가 없습니다. 실패 원인을 확인할 수 없습니다.";

  return (
    <dialog
      ref={ref}
      aria-labelledby="ohf-fail-title"
      onClose={onClose}
      /* Escape dismisses a modal dialog with a native `cancel` before it closes,
         and the `close` event that follows is not delivered to React here — the
         visitor is left with the dialog mounted but closed and the app's
         failureId still set. Every later click on the same failed tile then
         re-sets that id, which re-opens nothing. Handle `cancel` so Escape
         takes the dialog out of the tree like any other dismissal and the next
         click can bring it back (same fix as key-modal.tsx). */
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div ref={panelRef} tabIndex={-1} className="ohf-dialog-panel ohf-fail-panel">
        <div className="ohf-fail-head">
          <div className="ohf-fail-head-ic" aria-hidden>
            <WarningIcon size={15} />
          </div>
          <div className="ohf-fail-head-copy">
            <div id="ohf-fail-title" className="ohf-fail-head-title">
              {record ? `${record.modelLabel || "이 실행"} 실패 상세` : "실패 상세"}
            </div>
            <p className="ohf-fail-head-copy-hint">
              이 브라우저에 기록된 실패 정보입니다. 에러 문구를 복사해 지원 요청이나 디버깅에 쓸 수 있습니다.
            </p>
          </div>
          <button type="button" className="ohf-icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={13} />
          </button>
        </div>

        <div className="ohf-fail-body ohf-scroll">
          {!record || !hasDetail ? (
            <div className="ohf-fail-empty" role="status">
              <span className="ohf-fail-empty-text">
                {missingReason}
              </span>
            </div>
          ) : (
            <>
              {error && (
                <section className="ohf-fail-error">
                  <div className="ohf-fail-error-head">
                    <span className="ohf-fail-row-label">에러 메시지</span>
                    <button
                      type="button"
                      className="ohf-fail-copy"
                      aria-label="에러 메시지 복사"
                      title="에러 메시지 복사"
                      onClick={() => void copyError()}
                    >
                      <CopyIcon size={13} />
                      <span className="ohf-fail-copy-label">{copied ? "복사됨" : "복사"}</span>
                    </button>
                  </div>
                  <pre className="ohf-fail-error-text">{error}</pre>
                </section>
              )}

              <dl className="ohf-fail-grid">
                {fields.map((field) => (
                  <div className="ohf-fail-row" key={field.label}>
                    <dt className="ohf-fail-row-label">{field.label}</dt>
                    <dd
                      className={`ohf-fail-row-value${field.mono ? " ohf-fail-row-value--mono" : ""}${
                        field.empty ? " ohf-fail-row-value--empty" : ""
                      }`}
                    >
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>

        <div className="ohf-fail-foot">
          <button type="button" className="ohf-btn-quiet" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </dialog>
  );
}
