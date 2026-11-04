"use client";

import { useState } from "react";

import type { MediaItem } from "@/generation/catalog/types";
import { useElements, type ElementItem } from "@/generation/stores/elements";
import { projectLabel, useProjects } from "@/generation/stores/projects";

import { CloseIcon, PlusIcon } from "./icons";
import { ElementForm } from "./element-form";

/** The 요소 panel: the elements the current project gathers, named by the
 *  visitor and dropped into the prompt as @name. Outside the cinematic surface
 *  that project is the default shelf; inside it, the project that was loaded —
 *  so the pool the mention draws from is the pool being worked in. */
export function ElementPopover({
  trayItems,
  mode,
  onMention,
  onClose,
}: {
  trayItems: MediaItem[];
  mode: string;
  onMention: (name: string) => void;
  onClose: () => void;
}) {
  const items = useElements((state) => state.items);
  const add = useElements((state) => state.add);
  const rename = useElements((state) => state.rename);
  const remove = useElements((state) => state.remove);
  const projects = useProjects((state) => state.projects);
  const activeProjectId = useProjects((state) => state.activeProjectId);
  /* The pool a mention draws from follows the mode, not the last browse: the
     cinematic surface works in the loaded project; general work draws on the
     default shelf whatever the picker happens to be showing. */
  const workProject = mode === "cinema" ? activeProjectId : "default";
  /* The record sheet is the same one the picker opens; naming an element here
     is the quick way in from the composer. */
  const [formOpen, setFormOpen] = useState(false);

  const shown = items.filter(
    (element) => (element.projectId ?? "default") === workProject,
  );

  return (
    <div className="ohf-popover ohf-popover--elements" role="dialog" aria-label="요소">
      <div className="ohf-pop-head">
        <span className="ohf-pop-title">{projectLabel(projects, workProject)}</span>
        <span className="ohf-pop-count">{shown.length}</span>
        <button
          type="button"
          className="ohf-icon-btn ohf-icon-btn--ghost"
          aria-label="에셋 선택기 닫기"
          title="Close"
          onClick={onClose}
        >
          <CloseIcon size={12} />
        </button>
      </div>

      {shown.length === 0 && !formOpen ? (
        <div className="ohf-el-empty">
          <p className="ohf-el-hint">
            이 프로젝트에는 아직 요소가 없어요. 새 요소로 파일과 이름을 정하면 여기에 모여요.
          </p>
          <button
            type="button"
            className="ohf-el-new"
            aria-label="새 요소"
            onClick={() => setFormOpen(true)}
          >
            <PlusIcon size={14} />
            <span>새 요소</span>
          </button>
        </div>
      ) : (
        <div className="ohf-scroll ohf-el-list">
          {shown.map((element) => (
            <ElementRow
              key={element.id}
              element={element}
              onRename={(name) => rename(element.id, name)}
              onRemove={() => remove(element.id)}
              onMention={() => onMention(element.elementId?.trim() || element.name)}
            />
          ))}
          <button
            type="button"
            className="ohf-el-new"
            aria-label="새 요소"
            onClick={() => setFormOpen(true)}
          >
            <PlusIcon size={14} />
            <span>새 요소</span>
          </button>
        </div>
      )}

      {formOpen && (
        <ElementForm
          projectId={workProject}
          trayItems={trayItems}
          onClose={() => setFormOpen(false)}
          onSave={add}
        />
      )}
    </div>
  );
}

function ElementRow({
  element,
  onRename,
  onRemove,
  onMention,
}: {
  element: ElementItem;
  onRename: (name: string) => void;
  onRemove: () => void;
  onMention: () => void;
}) {
  return (
    <div className="ohf-el-row">
      <img className="ohf-el-thumb" src={element.url} alt="" />
      <input
        className="ohf-el-name"
        value={element.name}
        aria-label={`${element.name} 이름`}
        onChange={(event) => onRename(event.target.value)}
      />
      <button
        type="button"
        className="ohf-el-mention"
        aria-label={`${element.name}를 프롬프트에 @로 가리키기`}
        title="Insert @mention"
        onClick={onMention}
      >
        @
      </button>
      <button
        type="button"
        className="ohf-icon-btn ohf-icon-btn--ghost"
        aria-label="요소 삭제"
        title="Remove"
        onClick={onRemove}
      >
        <CloseIcon size={12} />
      </button>
    </div>
  );
}
