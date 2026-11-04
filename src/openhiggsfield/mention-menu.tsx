"use client";

import type { MentionOption } from "./media-mention";

/** The `@`-mention popup: the currently-attached reference images (colour-coded by slot)
 *  and this project's named elements, as a keyboard-driven list. The composer owns the
 *  ↑/↓ + Enter/Tab + Escape keys (the textarea holds focus), so this component only paints
 *  the list and marks the active row. Mirrors the source editor's openMentionMenu/
 *  mentionOptions/makeMentionChip (minimax_h3_easy_ui.js ~4336 / ~2955 / ~3432). */
export function MentionMenu({
  options,
  activeIndex,
  onPick,
  onHover,
}: {
  options: MentionOption[];
  activeIndex: number;
  onPick: (option: MentionOption) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div
      className="ohf-popover ohf-popover--mention"
      role="listbox"
      aria-label="미디어 참조"
      aria-activedescendant={options[activeIndex] ? `ohf-mrow-${activeIndex}` : undefined}
    >
      {options.length === 0 ? (
        <div className="ohf-el-empty">
          <p className="ohf-el-hint">
            이 프로젝트에 참조할 이미지가 없어요. 요소를 등록하면 여기에 모여요.
          </p>
        </div>
      ) : (
        <ul className="ohf-mention-list">
          {options.map((option, index) => (
            <li
              key={option.token}
              id={`ohf-mrow-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={
                "ohf-mention-row" + (index === activeIndex ? " ohf-mention-row--on" : "")
              }
              onMouseEnter={() => onHover(index)}
              onClick={() => onPick(option)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ohf-mention-thumb" src={option.url} alt="" />
              <span className="ohf-mention-swatch" style={{ background: option.color }} />
              <span className="ohf-mention-label" style={{ color: option.color }}>
                {option.label}
              </span>
              <span className="ohf-mention-kind">
                {option.slot > 0 ? "첨부" : "요소"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
