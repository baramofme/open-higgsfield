/** 상단 참조(strip) 타일의 제거 버튼을 "정합 제거"로 확장한다.
 *
 *  도크의 참조 이미지는 두 개의 독립된 persisted 스토어에 공존할 수 있다(t_81928daf 진단):
 *    - media 스토어(useImageMedia/useVideoMedia): strip과 생성 plane의 실제 image slot을 drive한다.
 *    - elements 스토어(useElements): '@' 위 배지와 `@`-mention 팝업이 읽는 named 요소.
 *
 *  예전 strip 제거(`media.remove(item.id)`)는 media 스토어만 지웠기 때문에,
 *  같은 URL로 만든 named 요소와 그 '@'-핸들이 살아남았다. 결과적으로
 *    (증상 1) '@' 위 배지(`elements.length`)가 줄지 않았고,
 *    (증상 2) 제거된 참조가 named 요소/프롬프트 핸들로 생성 컨텍스트에 잔존할 수 있었다.
 *
 *  이 모듈은 제거를 한 번의 정합 동작으로 만든다: media에서 항목을 떼고, 같은 URL을
 *  가리키는 named 요소를 모두 지우고, 그 요소의 핸들(name과 elementId 전부)과 제거된
 *  첨부의 `@타입N` 토큰을 프롬프트에서 정리한다. 생성 plane은 매 프레스 fresh로 live
 *  media만 읽으므로(plane.ts:21) media가 정확히 초기화되면 plane 자체에는 stale가
 *  남지 않는다 — 남는 통로는 elements/프롬프트뿐이기에 바로 그 두 곳을 이 함수가 비운다. */

import type { MediaItem, ModelEntry, Surface } from "@/generation/catalog";
import { useElements } from "@/generation/stores/elements";
import { useAudioPrompt, useImagePrompt, useVideoPrompt } from "@/generation/stores/prompt";
import { mediaKindOf, type MediaKind } from "./media-mention";

/** strip 타일이 쓰는 media 스토어의 제거 가능한 최소 모양. 실제 인자로 넘기는 것은
 *  useImageMedia/useVideoMedia의 스냅샷이므로 `items`와 `remove`를 모두 갖는다. */
type MediaStripStore = {
  items: MediaItem[];
  remove: (id: string) => void;
};

/** 제거 결과가 프롬프트/요소에 미친 영향(진단·검증용). */
export type StripRemovalOutcome = {
  /** media에서 분리한 항목 id. */
  removedId: string;
  /** 같은 URL 때문에 함께 삭제된 named 요소의 핸들(name과 elementId를 합친 것). */
  removedElementNames: string[];
  /** 제거된 항목의 타입(image/video/audio). 재채번은 이 타입 안에서만 일어난다. */
  removedKind: MediaKind;
  /** 제거된 항목이 자기 타입에서 차지하던 1-based 순번(buildMentionOptions의 채번과
   *  같은, 첨부 순서 기준). `@타입N` 재지정의 기준이 된다. */
  removedOrdinal: number;
  /** 정리된 프롬프트 원문(변화가 없으면 동일). */
  promptText: string;
};

/** 제거 대상이 자기 타입에서 차지하는 순번을 되돌린다(buildMentionOptions의 1-based
 *  채번과 같은 순서로: trayItems를 순서대로 훑며 같은 mediaKindOf 타입만 센다.
 *  명명 체계가 타입+인덱스이므로 start/end도 이미지 스트림의 일원으로 센다). */
function kindOrdinalOf(
  items: MediaItem[],
  item: MediaItem,
): { kind: MediaKind; ordinal: number } {
  const kind = mediaKindOf(item);
  let ordinal = 0;
  for (const it of items) {
    if (mediaKindOf(it) !== kind) continue;
    if (it.id === item.id) return { kind, ordinal: ordinal + 1 };
    ordinal += 1;
  }
  // 일반적으론 도달 불가(items에 없는 항목이 먼저 제거된 경우의 안전변).
  return { kind, ordinal: Math.max(ordinal, 1) };
}

/** surface별 caption 스토어. composer(179)와 plane(18)과 동일한 대응을 쓴다. */
function promptStoreFor(surface: Surface) {
  if (surface === "image") return useImagePrompt;
  if (surface === "audio") return useAudioPrompt;
  return useVideoPrompt;
}

/** 프롬프트에서 제거된 참조의 흔적을 지운다. 두 종류를 함께 다룬다:
 *   - 삭제된 named 요소의 `@name`/`@elementId` 토큰(해당 요소를 가리키던 핸들),
 *   - 제거된 첨부의 `@이미지N`/`@동영상N`/`@오디오N`(제거된 순번은 버리고, 같은 타입의
 *     그 뒤 순번을 한 칸 당겨 남은 첨부 스트림에 다시 묶는다). 다른 타입의 토큰은
 *     건드리지 않는다.
 *
 *  앞→뒤 한 번의 스캔으로 출력을 조립한다. `@`을 만나면 그 앞의 평문은 그대로 두고,
 *  `@` 뒤가 (1) `@타입N`(인덱스), (2) 삭제된 이름(핸들), (3) 알 수 없는 `@`
 *  중 어느인지로 분기한다. 알 수 없는 `@`(예: 이메일)는 평문의 일부로 남겨 그대로 둔다. */
export function prunePromptHandles(
  text: string,
  removedNames: string[],
  removed: { kind: MediaKind; ordinal: number } | null,
): string {
  // 긴 이름 우선: 한 핸들의 앞부분이 다른 삭제된 이름과 겹쳐도 끝까지 매치해 부분 삭제를 막는다.
  const names = removedNames.filter((name) => name.length > 0).sort((a, b) => b.length - a.length);
  const drop = removed?.ordinal ?? 0; // 0은 "제거 없음" — 순번은 1부터이므로 절대 매치하지 않음.
  const INDEX = /^@(이미지|동영상|오디오)(\d+)/;
  const WORD_KIND: Record<string, MediaKind> = { 이미지: "image", 동영상: "video", 오디오: "audio" };
  let out = "";
  let plainStart = 0;
  let i = 0;
  while (i < text.length) {
    const at = text.indexOf("@", i);
    if (at < 0) {
      out += text.slice(plainStart);
      break;
    }
    out += text.slice(plainStart, at); // 이 `@` 앞의 평문은 그대로.
    const after = text.slice(at);
    const idx = INDEX.exec(after);
    if (idx) {
      const word = idx[1]!;
      const n = parseInt(idx[2]!, 10);
      const tokLen = idx[0].length;
      const tailSpace = text[at + tokLen] === " " ? 1 : 0;
      const end = at + tokLen + tailSpace;
      const sameKind = removed !== null && WORD_KIND[word] === removed.kind;
      if (sameKind && n === drop) {
        i = end;
        plainStart = end; // 토큰(과 그 뒤의 공백 하나)을 버린다.
        continue;
      }
      const newN = sameKind && drop > 0 && n > drop ? n - 1 : n;
      out += `@${word}${newN}` + (tailSpace ? " " : "");
      i = end;
      plainStart = end;
      continue;
    }
    const rest = text.slice(at + 1);
    // 긴 이름 우선으로 접두사 매치하되, 삭제된 이름이 "실제 핸들"일 때만 지운다:
    // 이름 바로 뒤가 문자/숫자가 아니면(공백·구두점·문자열 끝) 경계가 잡힌다.
    // 그렇지 않으면(예: 라이브 `@Olivia` 안의 삭제된 `Oli`) 부분 매치를 거부해
    // 라이브 핸들을 훼손하지 않는다.
    const hit = names.find(
      (name) => rest.startsWith(name) && !/[\p{L}\p{N}]/u.test(text[at + 1 + name.length] ?? ""),
    );
    if (hit) {
      const trailing = text[at + 1 + hit.length] === " " ? 1 : 0;
      const end = at + 1 + hit.length + trailing;
      i = end;
      plainStart = end; // 삭제된 요소의 핸들(`@name`)과 후행 공백을 버린다.
      continue;
    }
    // 인덱스도 삭제된 이름도 아닌 `@`: 평문의 일부로 남긴다(이메일 등).
    out += "@";
    i = at + 1;
    plainStart = i;
  }
  return out;
}

/** strip 타일의 제거 버튼이 호출하는 정합 제거.
 *  1) 제거 대상이 자기 타입에서 차지하던 순번을 제거 전에 읽는다.
 *  2) media에서 항목을 떼어 strip과 생성 plane에서 즉시 사라지게 한다.
 *  3) 같은 URL을 가리키던 named 요소를 모두 지운다(media는 전역 단일 스토어이므로
 *     다른 프로젝트의 요소도 이 URL이 사라지면 매달리므로 함께 비운다).
 *  4) 그 표면의 caption에서 삭제된 요소의 핸들(name/elementId)과 제거된 첨부의
 *     `@타입N`을 정리한다 — 같은 타입 안에서만 재채번한다. */
export function removeStripReference(
  media: MediaStripStore,
  model: ModelEntry,
  item: MediaItem,
): StripRemovalOutcome {
  const { kind: removedKind, ordinal: removedOrdinal } = kindOrdinalOf(media.items, item);
  media.remove(item.id);

  const elements = useElements.getState();
  const tied = elements.items.filter((element) => element.url === item.url);
  for (const element of tied) elements.remove(element.id);
  // 핸들은 name과 elementId(요소 ID) 두 형식이 모두 프롬프트에 들어올 수 있으므로 둘 다 모은다.
  const removedElementNames = tied.flatMap((element) =>
    [element.name, element.elementId].filter((h): h is string => !!h && h.trim().length > 0),
  );

  const prompt = promptStoreFor(model.surface);
  const before = prompt.getState().text;
  const promptText = prunePromptHandles(before, removedElementNames, {
    kind: removedKind,
    ordinal: removedOrdinal,
  });
  if (promptText !== before) prompt.getState().setText(promptText);

  return {
    removedId: item.id,
    removedElementNames,
    removedKind,
    removedOrdinal,
    promptText,
  };
}
