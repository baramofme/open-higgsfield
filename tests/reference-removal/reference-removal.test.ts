/** 도크 참조 제거(t_58f16ca5)의 단위 검증.
 *  두 갈래를 다룬다:
 *   - 순수 문자열 로직 `prunePromptHandles`: `@이미지N` 재지정과 `@name` 핸들 제거,
 *     그리고 삭제된 이름이 라이브 핸들의 접두사일 때 훼손하지 않는 경계 보호.
 *   - 실 zustand 스토어 연동 `removeStripReference`: strip 제거 한 번으로
 *     media·named 요소·프롬프트 핸들이 동시에 정합하게 비워지는지.
 *
 *  실행(기존 prompt-optimize 하네스의 "@/" 별칭 훅을 그대로 재사용):
 *    node --experimental-strip-types --import ./tests/prompt-optimize/boot.mjs \
 *         --test tests/reference-removal/*.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import { getModel } from "@/generation/catalog";
import { useImageMedia } from "@/generation/stores/media";
import { useElements } from "@/generation/stores/elements";
import { useImagePrompt } from "@/generation/stores/prompt";
import { ELEMENT_DEFAULTS } from "@/generation/stores/elements";
import { prunePromptHandles, removeStripReference } from "@/openhiggsfield/reference-removal";

const MODEL = getModel("krea-2-turbo"); // surface: "image"

test("prunePromptHandles reindexes @이미지N when a reference is removed", () => {
  // 첫 번째 참조(순번 1)가 제거되면 그 토큰은 버리고 뒤 토큰은 한 칸 당긴다.
  const out = prunePromptHandles("@이미지1 @이미지2 @이미지3", [], { kind: "image", ordinal: 1 });
  assert.equal(out, "@이미지1 @이미지2");
});

test("prunePromptHandles reindexes @동영상N only within its type", () => {
  // 동영상 순번 1 제거: 동영상 스트림만 재채번하고 @이미지N/@오디오N은 건드리지 않는다.
  const out = prunePromptHandles("@동영상1 @동영상2 @이미지1 @오디오1", [], { kind: "video", ordinal: 1 });
  assert.equal(out, "@동영상1 @이미지1 @오디오1");
});

test("prunePromptHandles leaves index tokens untouched when a non-reference is removed", () => {
  // 제거 대상이 reference가 아니라면(null) @이미지N을 손대지 않는다.
  const out = prunePromptHandles("shot @이미지2", [], null);
  assert.equal(out, "shot @이미지2");
});

test("prunePromptHandles drops the deleted element's @name handle", () => {
  // 제거된 참조의 순번이 2이므로 `@이미지1`은 그대로 남고 `@이미지2`만 버려진다.
  const out = prunePromptHandles("a photo @Oli with @이미지1 and @이미지2", ["Oli"], {
    kind: "image",
    ordinal: 2,
  });
  assert.ok(!out.includes("@Oli"), "@name 핸들이 사라져야 한다");
  assert.ok(out.includes("@이미지1"), "제거 순번보다 앞선 @이미지1은 그대로 남는다");
  assert.ok(!out.includes("@이미지2"), "제거된 참조의 @이미지2는 버려진다");
});

test("prunePromptHandles does not mangle a live handle that starts with a deleted name", () => {
  // 삭제된 이름 "Oli"가 라이브 요소 "Olivia"의 접두사여도 `@Olivia`를 건드리지 않는다.
  const out = prunePromptHandles("@Oli and @Olivia stay", ["Oli"], null);
  assert.ok(out.includes("@Olivia"), "라이브 `@Olivia`는 원형 그대로 남는다");
  assert.ok(!out.includes("@Oli "), "실제 `@Oli` 핸들만 제거된다");
});

test("removeStripReference purges the tied element, the media row, and the prompt handle", () => {
  // 사용 워크플로를 재현: 참조를 strip에 올리고 같은 URL로 named 요소로 명명한 뒤
  // strip에서 제거하면 세 곳이 동시에 정합해야 한다.
  useImageMedia.getState().add({ id: "r1", url: "u1", role: "reference" });
  useImageMedia.getState().add({ id: "r2", url: "u2", role: "reference" });
  useImageMedia.getState().add({ id: "r3", url: "u3", role: "reference" });
  useElements.getState().add({ ...ELEMENT_DEFAULTS, id: "el-oli", name: "Oli", url: "u1" });
  useElements.getState().add({ ...ELEMENT_DEFAULTS, id: "el-loose", name: "Loose", url: "u9" });
  useImagePrompt.getState().setText("a portrait of @Oli beside @이미지1 and @이미지2");

  const item = useImageMedia.getState().items.find((it) => it.id === "r1")!;
  const outcome = removeStripReference(useImageMedia.getState(), MODEL, item);

  // (1) media: r1만 빠지고 r2/r3는 남는다 → 참조 영역·referenceCount 정합.
  const ids = useImageMedia.getState().items.map((it) => it.id);
  assert.ok(!ids.includes("r1"), "r1은 media에서 제거된다");
  assert.deepEqual(ids.sort(), ["r2", "r3"], "남은 참조는 r2/r3");

  // (2) elements: 같은 URL(u1)을 쓰던 "Oli"는 함께 삭제, 무관한 "Loose"는 유지 → '@' 배지(elements.length) 감소.
  const names = useElements.getState().items.map((e) => e.name).sort();
  assert.deepEqual(names, ["Loose"], "제거된 URL의 named 요소는 사라지고 무관한 요소는 남는다");
  assert.deepEqual(outcome.removedElementNames, ["Oli"], "함께 삭제된 요소 이름을 보고한다");
  assert.equal(outcome.removedOrdinal, 1, "r1의 참조 순번은 1");

  // (3) prompt: '@Oli' 핸들과 제거된 '@이미지1'이 빠지고 '@이미지2'는 '@이미지1'로 재지정된다.
  const prompt = useImagePrompt.getState().text;
  assert.ok(!prompt.includes("@Oli"), "프롬프트에서 제거된 참조의 @핸들이 정돈된다");
  assert.ok(!prompt.includes("@이미지2"), "이전 @이미지2는 남지 않는다");
  assert.ok(prompt.includes("@이미지1"), "재지정된 @이미지1이 남아 남은 참조를 가리킨다");
  assert.equal(outcome.promptText, prompt, "보고된 프롬프트가 실 프롬프트와 일치한다");
});

test("removing a reference with no tied element leaves other elements and their handles intact", () => {
  // r2(url u2)에 매달린 요소가 없다면 배지는 줄지 않고(의도된 동작), 다른 요소의 핸들은 건드리지 않는다.
  useImageMedia.getState().add({ id: "r4", url: "u4", role: "reference" });
  useElements.getState().add({ ...ELEMENT_DEFAULTS, id: "el-kim", name: "Kim", url: "u5" });
  useImagePrompt.getState().setText("keep @Kim");
  const item = useImageMedia.getState().items.find((it) => it.id === "r4")!;
  const outcome = removeStripReference(useImageMedia.getState(), MODEL, item);

  assert.ok(useImageMedia.getState().items.some((it) => it.id === "r4") === false, "r4 제거");
  assert.deepEqual(outcome.removedElementNames, [], "매달린 named 요소가 없다");
  assert.ok(useElements.getState().items.some((e) => e.name === "Kim"), "무관한 요소 Kim은 유지");
  assert.ok(useImagePrompt.getState().text.includes("@Kim"), "무관한 프롬프트 핸들 @Kim은 유지");
});

test("removeStripReference also purges the element's @elementId handle and reports it", () => {
  // 요소 ID(elementId) 핸들로 가리킨 경우에도 제거 한 번으로 정합해야 한다(t_99cb2e9f 명명).
  useImageMedia.setState({ items: [] });
  useElements.setState({ items: [] });
  useImageMedia.getState().add({ id: "r7", url: "u7", role: "reference" });
  useElements
    .getState()
    .add({ ...ELEMENT_DEFAULTS, id: "el-id", name: "한별", elementId: "char_hb_v2", url: "u7" });
  useImagePrompt.getState().setText("portrait of @char_hb_v2 with @이미지1");
  const item = useImageMedia.getState().items.find((it) => it.id === "r7")!;
  const outcome = removeStripReference(useImageMedia.getState(), MODEL, item);

  assert.ok(!outcome.promptText.includes("@char_hb_v2"), "요소 ID 핸들이 정돈된다");
  assert.ok(!outcome.promptText.includes("@이미지1"), "제거된 참조의 토큰이 버려진다");
  assert.deepEqual(
    [...outcome.removedElementNames].sort(),
    ["char_hb_v2", "한별"].sort(),
    "name과 elementId 두 핸들을 함께 보고한다",
  );
  assert.equal(outcome.removedKind, "image", "제거 항목의 타입을 보고한다");
  assert.equal(outcome.removedOrdinal, 1, "이미지 스트림에서 r7의 순번은 1");
});

test("start/end attachments count in the image stream and reindex on removal", () => {
  // t_99cb2e9f: start/end도 이미지 첨부가로서 @이미지N 채번에 참여한다(LTX 리졸브 대상).
  useImageMedia.setState({ items: [] });
  useElements.setState({ items: [] });
  useImageMedia.getState().add({ id: "st1", url: "us", role: "start" });
  useImageMedia.getState().add({ id: "rf5", url: "ur", role: "reference" });
  useImageMedia.getState().add({ id: "vd1", url: "uv", role: "video" });
  useImagePrompt.getState().setText("@이미지1 then @이미지2 and @동영상1");
  const item = useImageMedia.getState().items.find((it) => it.id === "st1")!;
  const outcome = removeStripReference(useImageMedia.getState(), MODEL, item);

  // start 제거 → 이미지 스트림만 재채번(이미지2→이미지1), @동영상1은 무손상.
  assert.equal(outcome.removedKind, "image", "start는 이미지 타입으로 계산");
  assert.equal(outcome.removedOrdinal, 1, "start가 이미지 순번 1을 차지");
  assert.ok(outcome.promptText.includes("@이미지1"), "reference가 @이미지1로 재지정");
  assert.ok(!outcome.promptText.includes("@이미지2"), "이전 @이미지2는 남지 않는다");
  assert.ok(outcome.promptText.includes("@동영상1"), "동영상 스트림은 건드리지 않는다");
});
