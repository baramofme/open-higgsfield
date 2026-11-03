"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { MediaItem } from "@/generation/catalog";
import {
  ELEMENT_CATEGORY_LABELS,
  ELEMENT_STATUS_LABELS,
  type ElementAttr,
  type ElementCategory,
  type ElementItem,
  type ElementStatus,
} from "@/generation/stores/elements";

import { CaretDownIcon, CloseIcon, UploadIcon } from "./icons";
import { OptionList } from "./ui";
import { toProxyImageUrl } from "./image-proxy";

/** Name and file an element. The app opens with the media on the left — a
    drop target that takes images and video — and the record on the right:
    what the element is filed as, what it is called, its version stamp, the @
    handle it can be called by, what it is, who performs it and the workflow
    state it sits in. */
const CATEGORY_OPTIONS = (Object.keys(ELEMENT_CATEGORY_LABELS) as ElementCategory[]).map(
  (value) => ({ value, label: ELEMENT_CATEGORY_LABELS[value] }),
);
const STATUS_OPTIONS = (Object.keys(ELEMENT_STATUS_LABELS) as ElementStatus[]).map((value) => ({
  value,
  label: ELEMENT_STATUS_LABELS[value],
}));

export function ElementForm({
  editing,
  nameHint,
  projectId,
  trayItems,
  onClose,
  onSave,
}: {
  editing?: ElementItem;
  nameHint?: string;
  projectId: string;
  trayItems: MediaItem[];
  onClose: () => void;
  onSave: (item: ElementItem) => void;
}) {
  const [url, setUrl] = useState<string | null>(editing?.url ?? null);
  const [isVideo, setIsVideo] = useState(editing ? looksLikeVideo(editing.url) : false);
  const [name, setName] = useState(editing?.name ?? nameHint ?? "");
  const [version, setVersion] = useState(editing?.version ?? "");
  const [elementId, setElementId] = useState(editing?.elementId ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [category, setCategory] = useState<ElementCategory>(editing?.category ?? "auto");
  const [status, setStatus] = useState<ElementStatus>(editing?.status ?? "none");
  const [attrs, setAttrs] = useState<ElementAttr[]>(editing?.attrs ?? []);
  const [dropping, setDropping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  function takeFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setUrl(data);
      setIsVideo(looksLikeVideo(data));
    };
    reader.readAsDataURL(file);
  }

  function build(): ElementItem {
    return {
      id: editing?.id ?? `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || nameHint || "Element",
      url: url ?? "",
      projectId: editing?.projectId ?? projectId,
      category,
      version: version.trim(),
      elementId: elementId.trim(),
      description: description.trim(),
      status,
      attrs: attrs.filter((row) => row.key.trim() !== ""),
      performer: editing?.performer ?? null,
    };
  }

  return createPortal(
    <div className="ohf-v2-scrim" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="ohf-v2-form-card" role="dialog" aria-label={editing ? "Edit element" : "New element"}>
        <div className="ohf-v2-crop-head">
          <h2 className="ohf-v2-project-title">{editing ? "Edit element" : "New element"}</h2>
          <button type="button" className="ohf-v2-round-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="ohf-v2-form-body">
          <div className="ohf-v2-form-media">
            {url ? (
              isVideo ? (
                <video className="ohf-v2-form-preview" src={url} muted playsInline onPointerUp={() => setIsVideo(false)} />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="ohf-v2-form-preview" src={toProxyImageUrl(url)} alt="" onError={() => setIsVideo(true)} />
              )
            ) : (
              <button
                type="button"
                className={"ohf-v2-dropzone" + (dropping ? " ohf-v2-dropzone--over" : "")}
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropping(true);
                }}
                onDragLeave={() => setDropping(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropping(false);
                  takeFile(event.dataTransfer.files?.[0]);
                }}
              >
                <span className="ohf-v2-dropzone-ic">
                  <UploadIcon size={18} />
                </span>
                <span className="ohf-v2-dropzone-title">Drag & drop an image or a video here</span>
                <span className="ohf-v2-dropzone-hint">or click to choose a file</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,video/mp4,video/quicktime"
              onChange={(event) => {
                takeFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {url && (
              <button type="button" className="ohf-v2-ghost-btn ohf-v2-form-replace" onClick={() => setUrl(null)}>
                Replace
              </button>
            )}
            {trayItems.length > 0 && (
              <div className="ohf-v2-form-tray">
                {trayItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={"ohf-v2-tray-tile" + (item.url === url ? " ohf-v2-tray-tile--on" : "")}
                    aria-pressed={item.url === url}
                    title={item.url}
                    onClick={() => {
                      setUrl(item.url);
                      setIsVideo(looksLikeVideo(item.url));
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ohf-v2-tray-thumb" src={item.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ohf-v2-form-fields ohf-scroll">
            <Dropdown
              label="Category"
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={(next) => setCategory(next as ElementCategory)}
            />
            <label className="ohf-v2-field">
              <span className="ohf-v2-field-label">Name</span>
              <input
                ref={nameRef}
                className="ohf-v2-input"
                value={name}
                placeholder="Enter element name"
                onChange={(event) => setName(event.target.value)}
              />
              <span className="ohf-v2-field-help">The display name — e.g. Cal, Oli, Elena</span>
            </label>
            <label className="ohf-v2-field">
              <span className="ohf-v2-field-label">Version</span>
              <input
                className="ohf-v2-input"
                value={version}
                placeholder="e.g. v1"
                onChange={(event) => setVersion(event.target.value)}
              />
            </label>
            <label className="ohf-v2-field">
              <span className="ohf-v2-field-label">Element ID</span>
              <input
                className="ohf-v2-input"
                value={elementId}
                placeholder="e.g. char_oli_v1"
                onChange={(event) => setElementId(event.target.value)}
              />
              <span className="ohf-v2-field-help">The @ handle this element answers to</span>
            </label>
            <label className="ohf-v2-field">
              <span className="ohf-v2-field-label">Description</span>
              <textarea
                className="ohf-v2-input ohf-v2-textarea"
                value={description}
                placeholder="Describe this element (optional)"
                rows={3}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <div className="ohf-v2-field">
              <span className="ohf-v2-field-label">Performer</span>
              <button type="button" className="ohf-v2-performer" aria-disabled tabIndex={-1}>
                No performer
              </button>
            </div>
            <Dropdown
              label="Status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(next) => setStatus(next as ElementStatus)}
            />
            <div className="ohf-v2-field">
              <span className="ohf-v2-field-label">Custom attributes</span>
              {attrs.map((row, index) => (
                <div key={index} className="ohf-v2-attr-row">
                  <input
                    className="ohf-v2-input ohf-v2-attr-key"
                    value={row.key}
                    placeholder="Attribute"
                    onChange={(event) =>
                      setAttrs((prev) =>
                        prev.map((entry, at) => (at === index ? { ...entry, key: event.target.value } : entry)),
                      )
                    }
                  />
                  <input
                    className="ohf-v2-input ohf-v2-attr-value"
                    value={row.value}
                    placeholder="Value"
                    onChange={(event) =>
                      setAttrs((prev) =>
                        prev.map((entry, at) => (at === index ? { ...entry, value: event.target.value } : entry)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="ohf-v2-round-btn"
                    aria-label="Remove attribute"
                    onClick={() => setAttrs((prev) => prev.filter((_, at) => at !== index))}
                  >
                    <CloseIcon size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="ohf-v2-add-attr"
                onClick={() => setAttrs((prev) => [...prev, { key: "", value: "" }])}
              >
                Add custom attribute
              </button>
            </div>
          </div>
        </div>
        <div className="ohf-v2-modal-foot">
          <button type="button" className="ohf-v2-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ohf-v2-solid-btn"
            disabled={!url || !name.trim()}
            onClick={() => {
              onSave(build());
              onClose();
            }}
          >
            {editing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* A data URL carries its own type; a blob URL does not, so the form guesses
   from what it was given and lets the element's own error correct it. */
function looksLikeVideo(url: string): boolean {
  return url.startsWith("data:video") || /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

/** One enum field of the form: the trigger reads as the value in force, the
    panel below is the app's option list. */
function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);
  return (
    <div className={"ohf-v2-dropdown" + (open ? " ohf-v2-dropdown--open" : "")}>
      <span className="ohf-v2-field-label">{label}</span>
      <button
        type="button"
        className="ohf-v2-menu-trigger"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="ohf-v2-dropdown-value">{current?.label ?? value}</span>
        <CaretDownIcon size={12} />
      </button>
      {open && (
        <div className="ohf-v2-dropdown-panel">
          <OptionList
            options={options}
            value={value}
            onChange={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
