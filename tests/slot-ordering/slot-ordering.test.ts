/** 이미지 레인 좌표계 통일(t_277eac4f, R2+R4)의 단위 검증.
 *  실 `toPlatform`을 H3/LTX 두 레인에 대해 돌리고, 재작성된 토큰 숫자가
 *  슬롯 실파일과 일치하는지(리졸버 수치 전사를 가정) body의 슬롯 표로 대조한다.
 *
 *  실행(기존 prompt-optimize 하네스의 "@/"" 별칭 훅을 그대로 재사용):
 *    node --experimental-strip-types --import ./tests/prompt-optimize/boot.mjs \
 *         --test tests/slot-ordering/*.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import { toPlatform } from "@/generation/to-platform";
import type { GenerationPlane, MediaItem } from "@/generation/catalog/types";

const H3 = "minimax-h3-local";
const LTX = "ltx-2.5-local";

/* 팝업이 채번한 순서와 plane.tray 순서는 동일 스토어 add 순이므로, 테스트의
   첨부는 "같은 객체"를 tray와 media 버킷 양쪽에 얹어 정합을 유지한다. */
function item(url: string, role: MediaItem["role"]): MediaItem {
  return { id: url, url, role };
}

function plane(
  model: string,
  prompt: string,
  attach: { url: string; role: MediaItem["role"] }[],
  opts: { tray?: boolean } = {},
): GenerationPlane {
  const media: Record<string, MediaItem[]> = {};
  const items = attach.map((a) => item(a.url, a.role));
  items.forEach((it) => (media[it.role] ??= []).push(it));
  const base = {
    model,
    prompt: { text: prompt },
    media,
    settings: { duration: 10, resolution: "768p", aspectRatio: "16:9" },
  } as GenerationPlane;
  return opts.tray === false ? base : { ...base, tray: items };
}

type Mapped = { path: string; body: Record<string, unknown> };

/** body의 슬롯 표에서 ref_imageN → URL. */
function h3Slots(mapped: Mapped): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(mapped.body)) {
    const slot = /^ref_image(\d+)$/.exec(key);
    if (slot) out[slot[1]] = String(value);
  }
  return out;
}

/** 재작성 후 토큰 숫자가 가리키는 슬롯의 실파일이 의도 파일과 같은지. */
function tokenPointsAtSameFile(mapped: Mapped, token: string, intentUrl: string): boolean {
  const m = /@(?:이미지|image|Image|img|그림)\s*(\d+)/i.exec(token);
  if (!m) return false;
  return h3Slots(mapped)[m[1]] === intentUrl;
}

test("CASE1 (tray A,B,start): every rewritten token lands on its intent file", () => {
  // 팝업 채번: A=1, B=2, start=3. 슬롯: start=1, A=2, B=3 → 재작성 A:1→2, B:2→3.
  const mapped = toPlatform(plane(H3, "@이미지1 @이미지2", [
    { url: "a.png", role: "reference" },
    { url: "b.png", role: "reference" },
    { url: "start.png", role: "start" },
  ]));
  const prompt = String(mapped.body.prompt);
  assert.ok(prompt.includes("@이미지2"), prompt);
  assert.ok(prompt.includes("@이미지3"), prompt);
  assert.ok(!prompt.includes("@이미지1"), "tray 1(A)의 토큰은 슬롯 2로 이동해야 한다");
  assert.ok(tokenPointsAtSameFile(mapped, "@이미지2", "a.png"));
  assert.ok(tokenPointsAtSameFile(mapped, "@이미지3", "b.png"));
  // 자동 라벨과 같은 좌표계: <Picture 2>는 슬롯 2 = A.
  assert.ok(prompt.includes("carried by <Picture 2>"));
});

test("CASE3 (tray start,A,B): already-coherent lane leaves tokens byte-identical", () => {
  const prompt = "@이미지1 @이미지2";
  const mapped = toPlatform(plane(H3, prompt, [
    { url: "start.png", role: "start" },
    { url: "a.png", role: "reference" },
    { url: "b.png", role: "reference" },
  ]));
  const body = String(mapped.body.prompt);
  assert.ok(body.includes(prompt), "start 선첨 정합(기존 @start→Picture 1 관례)은 무변화");
  assert.ok(tokenPointsAtSameFile(mapped, "@이미지1", "start.png"));
  assert.ok(tokenPointsAtSameFile(mapped, "@이미지2", "a.png"));
});

test("CASE2 (end attached): the end token is dropped, the token after it re-lands", () => {
  // 팝업 채번: start=1, A=2, end=3, B=4. 슬롯에 end가 없다(R4) → end의 3 드롭, B의 4→3.
  const mapped = toPlatform(plane(H3, "@이미지3 @이미지4", [
    { url: "start.png", role: "start" },
    { url: "a.png", role: "reference" },
    { url: "end.png", role: "end" },
    { url: "b.png", role: "reference" },
  ]));
  const prompt = String(mapped.body.prompt);
  assert.ok(!prompt.includes("@이미지4"), "초과 DANGLING 번호는 남아선 안 된다");
  // B의 토큰은 슬롯 3(B)로 다시 착지한다 — @이미지3가 남아있되 그 3은 B를 가리킨다.
  assert.ok(prompt.includes("@이미지3"), prompt);
  assert.ok(tokenPointsAtSameFile(mapped, "@이미지3", "b.png"), prompt);
});

test(">9 attachments: the dropped pick's token is removed, the rest stay slot-correct", () => {
  const attach = Array.from({ length: 10 }, (_, i) => ({
    url: `r${i + 1}.png`,
    role: "reference" as MediaItem["role"],
  }));
  const mapped = toPlatform(plane(H3, "@이미지1 @이미지9 @이미지10", attach));
  const prompt = String(mapped.body.prompt);
  assert.ok(prompt.includes("@이미지1") && prompt.includes("@이미지9"), "슬롯 안 항목은 제 슬롯");
  assert.ok(!prompt.includes("@이미지10"), "9장 캡 잘림 항목의 토큰은 소거(dangling 금지)");
  assert.ok(tokenPointsAtSameFile(mapped, "@이미지1", "r1.png"));
  assert.ok(tokenPointsAtSameFile(mapped, "@이미지9", "r9.png"));
});

test("LTX: an anchor mention rewritten by intent lands on the anchor, free refs drop", () => {
  // 팝업 채번: A=1, B=2, start=3. 주소 가능 슬롯 = start→1(시작 프레임), end→2.
  const mapped = toPlatform(plane(LTX, "the red of @이미지1 with @이미지3", [
    { url: "a.png", role: "reference" },
    { url: "b.png", role: "reference" },
    { url: "start.png", role: "start" },
  ]));
  // 자유 참조(A)는 이 레인이 싣지 못해 소거; start 의도(@이미지3)는 슬롯 1로 이동.
  assert.equal(mapped.body.prompt, "the red of  with @이미지1");
});

test("LTX flf2va: end intent lands on slot 2, start intent on slot 1", () => {
  const mapped = toPlatform(plane(LTX, "@이미지1의 시작 @이미지3의 끝", [
    { url: "start.png", role: "start" },
    { url: "a.png", role: "reference" },
    { url: "end.png", role: "end" },
  ]));
  // start 의도(@이미지1)는 무변화, 자유 참조(@이미지2=A) 소거, end 의도(@이미지3)→2.
  assert.equal(mapped.body.prompt, "@이미지1의 시작 @이미지2의 끝");
});

test("LTX start-first: the already-correct token stays byte-identical", () => {
  const mapped = toPlatform(plane(LTX, "@이미지1", [
    { url: "start.png", role: "start" },
    { url: "a.png", role: "reference" },
  ]));
  assert.equal(mapped.body.prompt, "@이미지1");
});

test("a plane without a tray record is left byte-identical (zero regression)", () => {
  const prompt = "@이미지1 @이미지2";
  const h3 = toPlatform(plane(H3, prompt, [
    { url: "a.png", role: "reference" },
    { url: "b.png", role: "reference" },
  ], { tray: false }));
  assert.ok(String(h3.body.prompt).includes(prompt), String(h3.body.prompt));
  const ltx = toPlatform(plane(LTX, prompt, [
    { url: "a.png", role: "reference" },
    { url: "b.png", role: "reference" },
  ], { tray: false }));
  assert.equal(ltx.body.prompt, prompt);
});

test("video, audio and name tokens are never touched by the image rewrite", () => {
  const mapped = toPlatform(plane(H3, "@동영상1 @오디오1 @이름2 @이미지1", [
    { url: "a.png", role: "reference" },
    { url: "v.mp4", role: "video" },
    { url: "a1.mp3", role: "audio" },
  ]));
  const prompt = String(mapped.body.prompt);
  assert.ok(prompt.includes("@동영상1"), prompt);
  assert.ok(prompt.includes("@오디오1"), prompt);
  assert.ok(prompt.includes("@이름2"), prompt);
  // 이미지 레인은 A 하나(채번 1 = 슬롯 1) → 무변화.
  assert.ok(prompt.includes("@이미지1"), prompt);
});

test("alias words survive; only the number moves", () => {
  const mapped = toPlatform(plane(H3, "@image1 and @그림 2", [
    { url: "a.png", role: "reference" },
    { url: "b.png", role: "reference" },
    { url: "start.png", role: "start" },
  ]));
  const prompt = String(mapped.body.prompt);
  assert.ok(prompt.includes("@image2"), prompt);
  assert.ok(prompt.includes("@그림 3"), prompt);
});
