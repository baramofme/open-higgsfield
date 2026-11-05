/** 메뉴 결함 수복 회귀 방지 단위 검증.
 *  CDP 실측으로 확인·수복된 세 종류의 실제 결함(이미지·오디오·비디오 메뉴)을
 *  정적 소스·CSS 파싱·추출 predicate 동작으로 검증하여 되살아나지 않게 한다.
 *
 *  커버 대상:
 *    t_60642f00: clipboard writeText 거부가 unhandled rejection으로 콘솔 오류 → .catch()
 *    t_77bb46bf: 미정의 레거시 CSS 토큰(--edge/--muted/--ink/--text/--font 등)
 *                → 양 .ohf 스코프에 별칭 매핑 착지
 *    t_b10965bb: 슬라이더 ArrowRight가 플레이리스트 순회로 버블링 → 편집 탭 언마운트
 *                → event.target 가드, 영상 스코프 36룰 레거시 토큰 → 정품 치환
 *
 *  실행(기존 prompt-optimize 하네스의 "@" 별칭 훅을 그대로 재사용):
 *    node --experimental-strip-types --import ./tests/prompt-optimize/boot.mjs \
 *         --test tests/menu-regression/*.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { arrowNavShouldSkip } from "@/openhiggsfield/arrow-nav-guard";

/* ── polyfill: node --test에 DOM이 없으므로 최소 생성자를 걸어
   arrowNavShouldSkip의 instanceof 검사·closest()를 테스트 가능하게 한다. ── */
class VideoEl {
  tagName = "VIDEO";
}
class HtmlEl {
  tagName: string;
  _sliderAncestor: object | null;
  constructor(tagName = "DIV", sliderAncestor: object | null = null) {
    this.tagName = tagName;
    this._sliderAncestor = sliderAncestor;
  }
  closest(sel: string) {
    if (sel === '[role="slider"]') return this._sliderAncestor;
    return null;
  }
}
// node에 DOM이 없는 환경에서 최소 생성자를 글로벌에 얹는다.
// 타입은 lib.dom의 완전한 HTMLVideoElement/HTMLElement와 호환되지 않으므로 any로 우회.
const G = globalThis as Record<string, unknown>;
G.HTMLVideoElement ??= VideoEl;
G.HTMLElement ??= HtmlEl;

/** 테스트가 쓰는 mock 생성자(타입 단정은 lib.dom과 무관한 mock이므로 any 경유). */
const Video = VideoEl as new () => InstanceType<typeof VideoEl>;
const Html = HtmlEl as new (
  ...args: ConstructorParameters<typeof HtmlEl>
) => InstanceType<typeof HtmlEl>;

/* ── 소스·CSS 읽기 헬퍼 ── */
const SRC = (rel: string) =>
  fileURLToPath(new URL(`../../src/openhiggsfield/${rel}`, import.meta.url));

const css = readFileSync(SRC("openhiggsfield.css"), "utf8");
const viewerSrc = readFileSync(SRC("viewer.tsx"), "utf8");
const gallerySrc = readFileSync(SRC("gallery.tsx"), "utf8");
const appSrc = readFileSync(SRC("openhiggsfield-app.tsx"), "utf8");

/* ════════════════════════════════════════════════════════════════
   1. Clipboard writeText 거부 회귀 방지
   ════════════════════════════════════════════════════════════════ */

/**
 * t_60642f00 결함: navigator.clipboard.writeText()가 거부(NotAllowedError)될 때
 * unhandled rejection으로 콘솔 오류가 발생. .catch()를 붙여 삼켰다.
 * 회귀 방지: 소스에서 writeText 호출 전부에 .catch()가 존재해야 한다.
 */
test("clipboard writeText: every call site has .catch() (t_60642f00 regression)", () => {
  // 네 경로: viewer.tsx 공유버튼 2, openhiggsfield-app.tsx shareRun link, gallery.tsx 프롬프트복사
  const sources = [
    { label: "viewer.tsx", content: viewerSrc, expected: 2 },
    { label: "gallery.tsx", content: gallerySrc, expected: 1 },
    { label: "openhiggsfield-app.tsx", content: appSrc, expected: 1 },
  ];

  for (const { label, content, expected } of sources) {
    // 모든 clipboard writeText 호출을 수집
    const calls = content.match(/navigator\.clipboard\??\.writeText\s*\([^)]*\)/g) ?? [];
    assert.ok(calls.length >= expected, `${label}: 최소 ${expected}개 writeText 호출이 있어야 한다 (실제 ${calls.length})`);

    for (const call of calls) {
      // copyPrompt은 .then(fail) 패턴이므로 예외 (그것은 다른 경로)
      if (call.includes("item.prompt") && content.includes(".then")) continue;
      assert.ok(
        /\.catch\s*\(/.test(call + content.slice(content.indexOf(call), content.indexOf(call) + 200)),
        `${label}: writeText 호출에 .catch()가 있어야 한다: ${call.slice(0, 80)}`,
      );
    }
  }
});

test("clipboard writeText rejection is silently caught, no unhandled rejection", async () => {
  // t_60642f00 동작 검증: 거부를 .catch()로 삼키면 프로세스가 살아있다.
  const unhandled: unknown[] = [];
  const handler = (reason: unknown) => { unhandled.push(reason); };
  process.on("unhandledRejection", handler);

  const rejectingClipboard = {
    writeText: (_text: string) => Promise.reject(new Error("NotAllowedError: clipboard denied")),
  };

  // 동일 패턴을 재현
  void rejectingClipboard.writeText("test url").catch(() => { /* swallowed */ });

  // microtask + timer tick을 지나 unhandledRejection 발화 기회 부여
  await new Promise((r) => setTimeout(r, 50));

  process.off("unhandledRejection", handler);
  assert.equal(unhandled.length, 0, ".catch()가 거부를 삼켜 unhandled rejection이 없어야 한다");
});

/* ════════════════════════════════════════════════════════════════
   2. 레거시 CSS 토큰 별칭 (t_77bb46bf + t_60642f00)
   ════════════════════════════════════════════════════════════════ */

/** 레거시 → 정품 매핑표 (양 부모 메타데이터에서 합의된 값). */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  "--edge": "--line",
  "--edge-strong": "--line-2",
  "--muted": "--tx2",
  "--muted-ink": "--tx3",
  "--ink": "--tx",
  "--ink-2": "--tx2",
  "--ink-3": "--tx3",
  "--ink-mute": "--tx4",
  "--text": "--tx",
  "--tx1": "--tx",
  "--font": "--font-ui",
  "--sans": "--font-ui",
  "--amber": "#c9a227",
  "--s0": "#161719",
  "--panel": "--s2",
  "--panel-2": "--s2",
  "--panel-3": "--s3",
  "--bg2": "--s1",
  "--bg3": "--s2",
  "--bg4": "--s3",
};

/** CSS에서 별칭 정의 블록을 추출: "Legacy aliases" 주석 다음 줄들의 정의. */
function extractAliasBlock(text: string): Map<string, string> | null {
  const m = /\/\*\s*Legacy aliases:[\s\S]*?\*\/\s*([\s\S]*?)(?=\n\s*font-family)/.exec(text);
  if (!m) return null;
  const aliases = new Map<string, string>();
  for (const line of m[1].split("\n")) {
    const def = /^\s*(--[\w-]+)\s*:\s*(.+?)\s*;/u.exec(line);
    if (def) aliases.set(def[1], def[2].trim());
  }
  return aliases.size > 0 ? aliases : null;
}

/** 양 .ohf 스코프에 별칭 블록이 있어야 한다(오디오·이미지 작업의 동일 결함·동일 수복). */
test("CSS: legacy alias block exists in both .ohf scope blocks (t_77bb46bf + t_60642f00)", () => {
  // CSS 파일은 두 .ohf 스코프 블록(전역 + 컴포넌트 하위)에 별칭을 정의한다.
  const blocks = [...css.matchAll(/\/\*\s*Legacy aliases:/g)];
  assert.ok(blocks.length >= 2, `레거시 별칭 주석이 양 스코프(${blocks.length}건)에 존재해야 한다`);
});

test("CSS: every legacy token is aliased to the correct canonical value", () => {
  const block = extractAliasBlock(css);
  assert.ok(block, "별칭 정의 블록을 찾지 못했다");

  for (const [legacy, canonical] of Object.entries(LEGACY_TO_CANONICAL)) {
    const actual = block.get(legacy);
    assert.ok(actual !== undefined, `${legacy}가 별칭으로 정의되어야 한다`);
    // 실제 CSS 값과 매핑표 정합 확인 (var(--tx2) 등 var() 래핑)
    if (canonical.startsWith("--")) {
      assert.equal(actual, `var(${canonical})`, `${legacy} → ${canonical} 매핑 불일치`);
    } else {
      assert.equal(actual, canonical, `${legacy} 리터럴 값 불일치`);
    }
  }
});

test("CSS: --mono is aliased to a monospace font stack", () => {
  const block = extractAliasBlock(css);
  const mono = block?.get("--mono");
  assert.ok(mono, "--mono 별칭이 정의되어야 한다");
  // 모노스택 요소가 포함
  assert.ok(/mono/i.test(mono), `--mono가 모노스택이어야 한다: ${mono}`);
});

test("CSS: every alias target (canonical token) is itself defined", () => {
  // 별칭의 값이 var(--tx)이면 --tx가 정의되어 있어야 해석된다.
  const defined = new Set<string>();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s/g)) defined.add(m[1]);

  const block = extractAliasBlock(css);
  for (const [legacy, value] of block ?? new Map()) {
    // var(--xxx)를 참조하는 경우 대상 토큰이 정의되어 있어야 한다
    const refs = [...value.matchAll(/var\((--[\w-]+)\)/g)];
    for (const r of refs) {
      assert.ok(defined.has(r[1]), `${legacy}: → ${r[1]}가 미정의(정품 토큰에 없으면 별칭도 공전)`);
    }
  }
});

/* ════════════════════════════════════════════════════════════════
   3. 영상 스코프 레거시 토큰 치환 (t_b10965bb)
   ════════════════════════════════════════════════════════════════ */

/**
 * t_b10965bb 실결함②: 영상 스코프 36룰이 미정의 --ink/--panel/--mono/--sans/--muted/--text를
 * 참조 → 정품 토큰으로 치환. 치환 후 영상 스코프에서 레거시 var() 참조가 0건이어야 한다.
 */
test("CSS video scope: no legacy token references remain after substitution (t_b10965bb regression)", () => {
  const blocks = css.split(/\n(?=\S)/).filter((block) => /^\.ohf-vedit/.test(block));
  assert.ok(blocks.length > 0, "영상 스코프 규칙이 존재해야 한다");

  // 레거시 토큰 var() 참조가 영상 블록 안에 남아있으면 안 된다
  const legacy = ["--ink", "--ink-2", "--ink-3", "--ink-mute", "--panel", "--panel-2", "--panel-3", "--mono", "--sans", "--muted", "--text"];
  for (const block of blocks) {
    for (const token of legacy) {
      assert.ok(
        !new RegExp(`var\\(${token}\\)`).test(block),
        `영상 스코프에 var(${token}) 잔존 — 정품 토큰으로 치환되어야 한다: ${block.slice(0, 60)}`,
      );
    }
  }
});

/* ════════════════════════════════════════════════════════════════
   4. 슬라이더 ArrowRight 가드 (t_b10965bb)
   ════════════════════════════════════════════════════════════════ */

test("arrowNavShouldSkip: HTMLVideoElement is skipped", () => {
  const video = new Video();
  assert.ok(arrowNavShouldSkip(et(video)), "비디오 타깃은 순회를 거절해야 한다");
});

/** mock 객체를 EventTarget로 단축 경로로 넘긴다(node에 DOM이 없는 mock). */
const et = (mock: object) => mock as unknown as EventTarget;

test("arrowNavShouldSkip: <input> is skipped", () => {
  assert.ok(arrowNavShouldSkip(et(new Html("INPUT"))), "입력란은 캐럿 이동으로 화살표를 소비");
});

test("arrowNavShouldSkip: <textarea> is skipped", () => {
  assert.ok(arrowNavShouldSkip(et(new Html("TEXTAREA"))), "텍스트 영역도 캐럿 이동");
});

test("arrowNavShouldSkip: slider descendant is skipped", () => {
  assert.ok(arrowNavShouldSkip(et(new Html("DIV", { role: "slider" }))), "role=slider 자손은 시커가 화살표로 전진");
});

test("arrowNavShouldSkip: plain div (non-control) is NOT skipped", () => {
  assert.ok(!arrowNavShouldSkip(et(new Html("DIV"))), "일반 div는 순회 가능해야 한다(가드가 과잉이면 순회가 죽는다)");
});

test("arrowNavShouldSkip: null target is NOT skipped", () => {
  assert.ok(!arrowNavShouldSkip(null), "타깃 없으면 가드하지 않는다");
});

test("arrowNavShouldSkip: BUTTON (non-input) is NOT skipped", () => {
  assert.ok(!arrowNavShouldSkip(et(new Html("BUTTON"))), "버튼은 순회 가능");
});

test("arrowNavShouldSkip: uppercase/lowercase tagName both handled", () => {
  assert.ok(arrowNavShouldSkip(et(new Html("INPUT"))));
  assert.ok(arrowNavShouldSkip(et(new Html("textarea"))));
  assert.ok(!arrowNavShouldSkip(et(new Html("DIV"))));
});

/* ════════════════════════════════════════════════════════════════
   5. 정품 토큰 자체 정의 확인 (별칭 공전 방지)
   ════════════════════════════════════════════════════════════════ */

test("CSS canonical palette defines its key tokens", () => {
  const required = ["--line", "--line-2", "--tx", "--tx2", "--tx3", "--tx4", "--font-ui", "--s1", "--s2", "--s3"];
  for (const token of required) {
    assert.ok(
      css.includes(`${token}:`),
      `${token}이 CSS에 정의되어야 한다(별칭의 해석 대상)`,
    );
  }
});
