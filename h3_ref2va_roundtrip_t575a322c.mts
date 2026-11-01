/**
 * t_575a322c — OH transport 라이브 왕복 1회 (ref2va, 컴포저 경로 최종 검증)
 *
 * submitGeneration이 하는 일 그대로: toPlatform(plane) → createCfwuiClient → submit → status 폴.
 * React 스토어 없이 plane을 수동 조립하되, 매저·클라이언트·status 라우팅은 OH 실 코드를 import한다.
 * 평문 프롬프트 → 매저가 6절 named 템플릿을 자동 조립하는 경로도 함께 검증한다.
 */
import fs from "node:fs";
import path from "node:path";
import { toPlatform } from "./src/generation/to-platform.ts";
import { createCfwuiClient } from "./src/generation/cfwui-platform.ts";
import type { GenerationPlane } from "./src/generation/catalog/types.ts";

const CFWUI = "http://127.0.0.1:7861";
const COMFY = "http://127.0.0.1:8189";
const WS = "/home/baramofme/.hermes/kanban/workspaces/t_575a322c";

// 기성 실 파일 참조 (cfwui가 직접 읽는 로컬 경로 — _parse_*가 os.path.exists를 최우선으로accept)
const REF_IMAGE = "/mnt/nvmedata/comfy/output/ComfyUI_00018_.png";          // 1024x1024 실 PNG
const REF_VIDEO = "/mnt/nvmedata/comfy/output/video/2026-11-01-14-46-46-542_00001_.mp4"; // h264+aac 실 mp4
const REF_AUDIO = "/mnt/nvmedata/comfy/input/temp_audio_15060.wav";         // pcm_s16le 실 wav

// 평문 프롬프트(6절 마커 없음 → 자동 조립 경로). 문구 마커는 그래프 추적용 고유 문자열.
const MARKER = "brass-and-glass hummingbird";
const PLAIN_PROMPT =
  `A ${MARKER} hovers over a copper feeder in early morning light, wings blurred mid-hover, ` +
  `soft bokeh background, warm cinematic tones.`;

const plane: GenerationPlane = {
  model: "minimax-h3-local",
  prompt: { text: PLAIN_PROMPT },
  media: {
    reference: [{ id: "ref1", url: REF_IMAGE, role: "reference" }],
    video: [{ id: "vid1", url: REF_VIDEO, role: "video" }],
    audio: [{ id: "aud1", url: REF_AUDIO, role: "audio" }],
  },
  settings: { resolution: "768p", outputFormat: "mp4", generateAudio: true },
  studio: "general",
};

const { path: apiPath, body } = toPlatform(plane);

const results: string[] = [];
function assert(name: string, cond: unknown): boolean {
  const ok = !!cond;
  results.push(`${ok ? "PASS" : "FAIL"} :: ${name}`);
  return ok;
}

/* ---- 오프라인 매저 asserts (컴포저가 만들 본체의 형태) ---- */
assert("path is VideoGen_H3_run", apiPath === "VideoGen_H3_run");
assert("task_type is ref2va", body.task_type === "ref2va");
assert("async_execution true (composer canon)", body.async_execution === true);
assert("ref_image1 = image slot", body.ref_image1 === REF_IMAGE);
assert("ref_video1 = video slot", body.ref_video1 === REF_VIDEO);
assert("ref_audio1 = audio slot", body.ref_audio1 === REF_AUDIO);
assert("canvas 1344x768 (768p/16:9)", body.width === 1344 && body.height === 768);
assert("duration 5 default", Number(body.duration) === 5);
assert("steps 20 named default", body.steps === 20 && body.cfg === 6.0 && body.flow_shift === 3.0);
assert("output_format mp4", body.output_format === "mp4" && body.generate_audio === true);

const promptOut = String(body.prompt);
const SECTIONS = [
  "subject_definitions:",
  "summary:",
  "retention_analysis:",
  "detailed_description:",
  "overall_soundscape:",
  "non_diegetic_music:",
];
assert("6-section named template auto-assembled", SECTIONS.every((s) => promptOut.includes(s)));
assert("plain text lands in detailed_description", promptOut.includes(`detailed_description:\n${PLAIN_PROMPT}`));
assert("<Picture 1> label for the image ref", promptOut.includes("<Picture 1>"));
assert("<Video 1> label for the video ref", promptOut.includes("<Video 1>"));
assert("standalone audio ordinal = K+i (K=1)", promptOut.includes("<Audio 2>"));
assert("audio reference type in summary", promptOut.includes("audio reference"));
assert("verbatim guard stays open (plain prompt expanded, not verbatim)", !/subject_definitions:\s*A /.test(promptOut));

console.log("== mapped body ==");
console.log(JSON.stringify(body, null, 2));

/* DRY=1 → 매저 asserts만 검증하고 submit하지 않는다(그린런 전에 오프라인 판정). */
if (process.env.DRY === "1") {
  console.log("\n== asserts ==");
  console.log(results.join("\n"));
  const fails = results.filter((r) => r.startsWith("FAIL"));
  console.log(`\n${results.length - fails.length}/${results.length} PASS (dry)`);
  process.exit(fails.length ? 3 : 0);
}

/* ---- submit-before 스냅샷 (형제 작업 오염 방지: 자기 파일로만 귀속) ---- */
const outDir = "/mnt/nvmedata/comfy/output/video";
const before = new Set(
  fs.readdirSync(outDir).filter((f) => f.endsWith(".mp4")).map((f) => `${f}:${fs.statSync(path.join(outDir, f)).size}`),
);

/* ---- 실 왕복: client.submit → status 폴 (재폴 규칙: 같은 task_id만 오래 폴) ---- */
const client = createCfwuiClient({ baseUrl: CFWUI });
const t0 = Date.now();
const queued = await client.submit(apiPath, body);
console.log("== queued ==", JSON.stringify(queued));
const requestId = queued.requestId;
assert("requestId minted h3_task_*", requestId.startsWith("h3_task"));

let myPromptId: string | undefined;
const pollErrors: string[] = [];
let finalStatus: Awaited<ReturnType<typeof client.status>> | undefined;

const DEADLINE = 1300_000; // ~11분 GPU + 큐 대기 여유
while (Date.now() - t0 < DEADLINE) {
  await new Promise((r) => setTimeout(r, 5000));
  try {
    const st = await client.status(requestId);
    const progress = (st as { progress?: unknown }).progress;
    console.log(
      `[poll +${((Date.now() - t0) / 1000).toFixed(0)}s] status=${st.status}` +
        (progress !== undefined ? ` progress=${progress}` : ""),
    );
    if (st.status === "completed") { finalStatus = st; break; }
    if (st.status === "failed") { finalStatus = st; break; }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pollErrors.push(msg);
    console.log(`[poll +${((Date.now() - t0) / 1000).toFixed(0)}s] poll error: ${msg}`);
  }
  // 그래프 추적을 위해 내 prompt_id를 큐에서 낚시 (마커 문자열로 형제 프롬프트와 구분)
  if (!myPromptId) {
    try {
      const q = await (await fetch(`${COMFY}/queue`)).json();
      const all = [...(q.queue_running ?? []), ...(q.queue_pending ?? [])];
      for (const item of all) {
        const graph = JSON.stringify(item[2] ?? "");
        if (graph.includes(MARKER) && graph.includes("MiniMaxH3ReferenceToVideo")) {
          myPromptId = String(item[0]);
          console.log(`[graph] captured my prompt_id=${myPromptId}`);
          break;
        }
      }
    } catch { /* 큐 조회 실패는 무시 — 폴 루프가 본체 */ }
  }
}

if (!finalStatus) {
  console.log("RESULT: TIMEOUT — task never reached terminal status inside the window");
  fs.writeFileSync(path.join(WS, "roundtrip_report.txt"), results.concat(["TIMEOUT", ...pollErrors]).join("\n"));
  process.exit(2);
}
assert("terminal status completed", finalStatus.status === "completed");
if (finalStatus.status !== "completed") {
  console.log("RESULT: FAILED", JSON.stringify(finalStatus.error ?? finalStatus));
  fs.writeFileSync(path.join(WS, "roundtrip_report.txt"), results.concat(["FAILED", JSON.stringify(finalStatus.error ?? finalStatus)]).join("\n"));
  process.exit(1);
}

/* ---- 결과물 다운로드 & ffprobe ---- */
const mediaUrl = finalStatus.images?.[0]?.url;
assert("status returned an mp4 url", typeof mediaUrl === "string" && mediaUrl.includes(".mp4"));
console.log("media url:", mediaUrl);

let delivered: string | undefined;
if (mediaUrl) {
  const res = await fetch(mediaUrl);
  console.log("download HTTP", res.status);
  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    delivered = path.join(WS, "roundtrip_ref2va.mp4");
    fs.writeFileSync(delivered, buf);
    console.log(`saved ${buf.length} bytes → ${delivered}`);
  }
}
if (!delivered) {
  // HTTP 경로 실패 시 디스크에서 직접 (스킬 규칙: 파일은 디스크에 있다)
  const urlPath = mediaUrl ? new URL(mediaUrl).pathname : "";
  const decoded = decodeURIComponent(urlPath.replace("/gradio_api/file=", ""));
  if (fs.existsSync(decoded)) {
    delivered = path.join(WS, "roundtrip_ref2va.mp4");
    fs.copyFileSync(decoded, delivered);
    console.log(`disk fallback copy → ${delivered} (${fs.statSync(delivered).size} bytes)`);
  }
}
assert("deliverable file exists", delivered && fs.existsSync(delivered));

/* ---- 귀속 확인: 이 런이 만든 새 파일만 인정 ---- */
const after = fs.readdirSync(outDir).filter((f) => f.endsWith(".mp4")).map((f) => `${f}:${fs.statSync(path.join(outDir, f)).size}`);
const added = after.filter((f) => !before.has(f));
console.log("[attribution] new mp4 files after run:", added.join(", ") || "(none)");
if (mediaUrl) {
  const decoded = decodeURIComponent(new URL(mediaUrl).pathname.replace("/gradio_api/file=", ""));
  assert("result url's own file is among the newly created", added.some((f) => f.startsWith(`${path.basename(decoded)}:`)));
}

/* ---- TASKS_DB 실체 (gradio queue-REST로 직접) & /history 그래프 판독 ---- */
try {
  const st2 = await (await fetch(`${CFWUI}/gradio_api/call/VideoGen_H3_get_task_status`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [requestId] }),
  })).json();
  const ev = await (await fetch(`${CFWUI}/gradio_api/call/VideoGen_H3_get_task_status/${st2.event_id}`)).text();
  // SSE는 event 라인이 data 앞에 온다 — complete 블록만 추출
  let rec: unknown;
  {
    let event = "";
    for (const line of ev.split(/\r?\n/)) {
      if (line.startsWith("event:")) { event = line.slice(6).trim(); continue; }
      if (event === "complete" && line.startsWith("data:")) {
        rec = JSON.parse(line.slice(5).trim());
        rec = Array.isArray(rec) ? rec[0] : rec;
      }
    }
  }
  const taskRec = rec as Record<string, unknown>;
  console.log("[TASKS_DB] status=", taskRec?.status, "task_type=", (taskRec?.result as Record<string, unknown>)?.task_type,
    "execution_time=", (taskRec?.result as Record<string, unknown>)?.execution_time_seconds,
    "WxH=", (taskRec?.result as Record<string, unknown>)?.width, "x", (taskRec?.result as Record<string, unknown>)?.height);
  assert("TASKS_DB entry completed", taskRec?.status === "completed");
  assert("TASKS_DB task_type ref2va", (taskRec?.result as Record<string, unknown>)?.task_type === "ref2va");
} catch (e) {
  console.log("[TASKS_DB] direct read failed:", e instanceof Error ? e.message : String(e));
}

if (myPromptId) {
  try {
    const h = await (await fetch(`${COMFY}/history/${myPromptId}`)).json();
    const item = h[myPromptId] ?? Object.values(h)[0];
    const graph = item?.prompt;
    const nodes: Array<Record<string, unknown>> = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) { v.forEach(walk); return; }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.class_type === "string") nodes.push(o);
        Object.values(o).forEach(walk);
      }
    };
    walk(graph);
    const byClass: Record<string, number> = {};
    for (const n of nodes) { const c = String(n.class_type); byClass[c] = (byClass[c] ?? 0) + 1; }
    console.log("[graph] node classes:", JSON.stringify(byClass));
    const refNode = nodes.find((n) => n.class_type === "MiniMaxH3ReferenceToVideo");
    const nodePrompt = refNode ? String((refNode.inputs as Record<string, unknown>)?.prompt ?? "") : "";
    assert("named template reached the executed graph", nodePrompt.includes("subject_definitions:") && nodePrompt.includes("detailed_description:") && nodePrompt.includes(MARKER));
    assert("graph LoadImage present", byClass["LoadImage"] >= 1);
    assert("graph LoadVideo present", byClass["LoadVideo"] >= 1);
    assert("graph LoadAudio present", byClass["LoadAudio"] >= 1);
    assert("graph GetVideoComponents present", (byClass["GetVideoComponents"] ?? 0) >= 1);
    fs.writeFileSync(path.join(WS, "history_graph.json"), JSON.stringify(item?.outputs ?? item, null, 2));
  } catch (e) {
    console.log("[graph] history read failed:", e instanceof Error ? e.message : String(e));
  }
} else {
  console.log("[graph] prompt_id never captured (queue empty at poll time or marker missed)");
}

console.log("\n== asserts ==");
console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL"));
console.log(`\n${results.length - fails.length}/${results.length} PASS`);
fs.writeFileSync(path.join(WS, "roundtrip_report.txt"),
  [
    `requestId=${requestId}`,
    `wall=${((Date.now() - t0) / 1000).toFixed(1)}s`,
    `promptId=${myPromptId ?? "n/a"}`,
    `mediaUrl=${mediaUrl}`,
    `delivered=${delivered}`,
    ...results,
    `pollErrors=${pollErrors.length}`,
  ].join("\n"));
if (fails.length) { console.log("RESULT: ASSERT-FAIL"); process.exit(3); }
console.log("RESULT: ROUNDTRIP OK");
