"use client";

import { useEffect, useRef } from "react";

import { isDialogueLine, tokenizeForTint, type TintSegment } from "./media-mention";

/** Colour highlight behind the plain prompt textarea. A plain `<textarea>` cannot render
 *  coloured chips inline, so this MIRROR paints the same text with coloured token chips,
 *  positioned on the exact same box as the textarea. The textarea's background is
 *  transparent, so the chips show through under its glyphs (and the textarea's own text
 *  stays fully legible on top). It scrolls in lockstep with the textarea it mirrors. */
export function PromptTint({
  text,
  namedNames,
  trackRef,
}: {
  text: string;
  namedNames: string[];
  /** The textarea whose scroll position this mirror must follow. */
  trackRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);

  // Keep the mirror's scroll aligned with the textarea so chips stay under their glyphs.
  useEffect(() => {
    const ta = trackRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    const sync = () => {
      mirror.scrollTop = ta.scrollTop;
      mirror.scrollLeft = ta.scrollLeft;
    };
    sync();
    ta.addEventListener("scroll", sync, true);
    return () => ta.removeEventListener("scroll", sync, true);
  }, [trackRef, text]);

  const lines = text.split("\n");
  const total = lines.length;
  return (
    <div
      ref={mirrorRef}
      className="ohf-prompt-tint"
      aria-hidden
      // The mirror must not be interactive — the textarea above it owns all input.
      style={{ pointerEvents: "none" }}
    >
      {/* Render line-by-line: a `#` dialogue line wears the editor's teal block cue,
          every other line carries its @imageN / @이름 colour chips. Newlines are kept so
          the mirror's line count stays matched to the textarea. */}
      {lines.map((line, lineIndex) => (
        <span key={lineIndex} className="ohf-prompt-line">
          {isDialogueLine(line) ? (
            <span className="ohf-prompt-dialogue" style={{ color: "transparent" }}>
              {line}
            </span>
          ) : (
            tokenizeForTint(line, namedNames).map((seg: TintSegment, i: number) =>
              seg.color ? (
                <span
                  key={i}
                  className="ohf-prompt-chip"
                  style={{
                    backgroundColor: hexToTint(seg.color),
                    borderColor: seg.color,
                    color: seg.color,
                  }}
                >
                  {seg.text}
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )
          )}
          {/* Re-add the separator newline the split removed, except after the last line. */}
          {lineIndex < total - 1 ? "\n" : ""}
        </span>
      ))}
    </div>
  );
}

/* A chip's translucent fill: paint the hex at ~16% so the textarea's text reads on top. */
function hexToTint(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "transparent";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, 0.16)`;
}
