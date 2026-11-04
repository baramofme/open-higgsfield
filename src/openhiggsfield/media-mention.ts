/** Shared helpers for the dock `@`-mention editor (ported from the H3-Easy rich editor:
 *  openMentionMenu / mentionOptions / makeMentionChip + the colour-coding CSS 8682–8704).
 *  The dock's prompt is a plain textarea, so colour is delivered by a MIRROR overlay
 *  (see PromptTint) painted behind the transparent textarea — not by a contenteditable
 *  rewrite, which would fight the existing caret/auto-grow/IME path. */

import type { MediaItem } from "@/generation/catalog";
import type { ElementItem } from "@/generation/stores/elements";

/** 타입 판정: role(video/audio) 우선, 나머지(reference/start/end)는 URL 스니핑.
 *  cinema가 role:"reference"로 **비디오를** 등록하는 경로가 실재하므로
 *  (openhiggsfield-app.tsx L1021) role만으로는 타입이 안 잡히는 케이스가 있다. */
export type MediaKind = "image" | "video" | "audio";

const KIND_WORD: Record<MediaKind, string> = {
  image: "이미지",
  video: "동영상",
  audio: "오디오",
};

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv|avi)$/i;

export function mediaKindOf(item: MediaItem): MediaKind {
  if (item.role === "video") return "video";
  if (item.role === "audio") return "audio";
  if (item.url.startsWith("data:video/")) return "video";
  const leaf = item.url.split(/[?#]/)[0] ?? "";
  return VIDEO_EXT_RE.test(leaf) ? "video" : "image";
}

export type MentionOption = {
  /** What gets inserted at the caret: "@이미지N"/"@동영상N"/"@오디오N" (index) or "@<handle>" (element). */
  token: string;
  /** Display label shown in the popup (identical to the token). */
  label: string;
  /** Thumbnail url for the row. */
  url: string;
  /** Slot/role colour (a #rrggbb) used for the popup swatch AND the tint chip. */
  color: string;
  /** Ordinal within its type (1-based) for media index tokens; 0 for named elements. */
  slot: number;
  /** What kind of row this is: media type or "element". */
  kind: MediaKind | "element";
};

/* comfyui_media_refs slot palette, inherited so the dock's colour matches the ComfyUI
   canvas chips the visitor already learned. Slots cycle after the three defined ones. */
const SLOT_COLORS = ["#5aa9f0", "#f0a35a", "#5af0b7", "#c08af0", "#f0a0c0", "#7ad0e0"];
/* A named element wears the editor's teal handle text (source: rgba(0,226,187,.98)). */
export const NAMED_ELEMENT_COLOR = "#5aa9f0";

export function slotColorForIndex(n: number): string {
  return SLOT_COLORS[(n - 1) % SLOT_COLORS.length]!;
}

/* 명명 규칙(t_99cb2e9f 운영자 확정): 이미지/비디오/오디오 첨부는 **첨부 순서**의
   타입+인덱스 라벨 — 동영상1, 이미지1, 오디오1…; 요소는 **요소 ID**(elementId,
   예: char_oli_v1)를 이름으로 쓰고 빈 ID는 name으로 폴백한다. 토큰도 같은 명명을
   쓴다: `@이미지N`은 백엔드 리졸버(comfy-webui media_ref_prompt.py)가 치환 가능한
   형식(h3→`<Picture N>`, ltx→starting/ending frame)이고, `@동영상N`/`@오디오N`은
   현재 리졸버가 리터럴로 남긴다(바인딩은 media 슬롯 배선으로 이루어진다 — 실측
   근거: t_99cb2e9f 바인딩 프로브).
   start/end도 이미지 첨부가로서 이미지 인덱스 계산에 참여한다(LTX에서 @이미지1/2가
   시작/끝 프레임 리졸브의 대상이기 때문). 주의: H3 ref2va 슬롯은 start를 목록 맨
   앞에 세우므로(start를 나중에 첨부하면) 첨부 순서와 슬롯 순서가 어긋날 수 있다 —
   재채번 정합은 후속 카드 소관. */
export function buildMentionOptions(
  trayItems: MediaItem[],
  elements: ElementItem[],
  workProject: string,
): MentionOption[] {
  const options: MentionOption[] = [];
  const counters: Record<MediaKind, number> = { image: 0, video: 0, audio: 0 };
  for (const item of trayItems) {
    const kind = mediaKindOf(item);
    const n = (counters[kind] += 1);
    const token = `@${KIND_WORD[kind]}${n}`;
    options.push({
      token,
      label: token,
      url: item.url,
      color: slotColorForIndex(n),
      slot: n,
      kind,
    });
  }
  // Elements ride the popup too, addressed by their @ handle (요소 ID 기준).
  const named = elements
    .filter((e) => (e.projectId ?? "default") === workProject)
    .map((e) => {
      const handle = (e.elementId ?? "").trim() || e.name;
      const token = `@${handle}`;
      return {
        token,
        label: token,
        url: e.url,
        color: NAMED_ELEMENT_COLOR,
        slot: 0,
        kind: "element" as const,
      };
    });
  return [...options, ...named];
}

/** Locate the `@`-mention window active at the caret.
 *  Returns the query text typed after the `@` and the caret index of the `@`, or null.
 *  The window is: the last `@` at or before the caret such that everything between it
 *  and the caret is a single run with no whitespace (a live "typing a handle" state). */
export function findMentionWindow(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const upToCaret = text.slice(0, caret);
  const at = upToCaret.lastIndexOf("@");
  if (at < 0) return null;
  const between = upToCaret.slice(at + 1);
  // Stop offering the menu once a whitespace closes the handle.
  if (/\s/.test(between)) return null;
  return { start: at, query: between };
}

/** Filter a candidate list by the live query (case-insensitive substring on the label). */
export function filterMentionOptions(
  options: MentionOption[],
  query: string,
): MentionOption[] {
  if (!query) return options;
  const q = query.toLowerCase();
  return options.filter((o) => o.label.toLowerCase().includes(q));
}

/** Split `text` into plain segments and coloured token segments for the tint mirror.
 *  namedNames is the set of known element names to recognise as `@name` tokens. */
export type TintSegment = { text: string; color?: string; unresolved?: boolean };

/* Port of the `#` dialogue rule from comfy-webui's dialog_prompt.py, mirrored here so
   the dock paints a dialogue line the way the source editor's teal block did (CSS
   8689–8695). A dialogue line is one whose first non-whitespace char is exactly a single
   `#`: `##`, a `#` mid-line, and pure hex colours (`#ff0000`) stay plain — that is the
   same rule the backend uses, so the dock's cue and the `<d>` injection never disagree.
   A leading `\#` is a literal escaped hash, not a dialogue cue. */
export const DIALOGUE_COLOR = "#00e2bb";

export function isDialogueLine(line: string): boolean {
  const trimmedStart = line.replace(/^[ \t]+/, "");
  if (!trimmedStart.startsWith("#")) return false;
  // `##` (or more) is not a single `#` cue; and an escaped `\#` is literal text.
  const hashRun = /^(#+)/.exec(trimmedStart);
  if (!hashRun || hashRun[1].length !== 1) return false;
  const afterHash = trimmedStart.slice(1);
  // A bare `#` then whitespace-only, or a bare hex colour token, is not dialogue.
  if (/^[0-9a-fA-F]{3,8}\b/.test(afterHash.trim())) return false;
  return afterHash.trim().length > 0;
}

export function tokenizeForTint(text: string, namedNames: string[]): TintSegment[] {
  const segments: TintSegment[] = [];
  // Build a matcher that finds either @이미지N or @name (name longest-first).
  const names = [...namedNames].sort((a, b) => b.length - a.length);
  let i = 0;
  let plainStart = 0;
  const flushPlain = (end: number) => {
    if (end > plainStart) segments.push({ text: text.slice(plainStart, end) });
  };
  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at < 0) break;
    // try index token @이미지N / @동영상N / @오디오N
    const idxMatch = /^@(?:이미지|동영상|오디오)\d+/.exec(text.slice(at));
    if (idxMatch) {
      flushPlain(at);
      const n = parseInt(/\d+/.exec(idxMatch[0])![0], 10);
      segments.push({ text: idxMatch[0], color: slotColorForIndex(n) });
      i = at + idxMatch[0].length;
      plainStart = i;
      continue;
    }
    // try a known name token @<name> (only if the name is non-empty and matches here)
    let matchedName: string | null = null;
    for (const nm of names) {
      if (!nm) continue;
      if (text.slice(at + 1).startsWith(nm)) {
        matchedName = nm;
        break;
      }
    }
    if (matchedName) {
      flushPlain(at);
      segments.push({ text: "@" + matchedName, color: NAMED_ELEMENT_COLOR });
      i = at + 1 + matchedName.length;
      plainStart = i;
      continue;
    }
    // A stray "@..." that is neither index nor a known name: leave it plain (unresolved
    // handles are painted with the unresolved colour when they look like a handle).
    i = at + 1;
  }
  flushPlain(text.length);
  return segments;
}
