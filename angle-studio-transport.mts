import "./src/generation/camera-angle"; // register the feature at load
import { toPlatform } from "./src/generation/to-platform";
import { createCfwuiClient } from "./src/generation/cfwui-platform";
import { usePromptTokens, mergePromptWithTokens } from "./src/generation/prompt-registry";

/* Runs the studio's OWN transport verbatim — the same mapper + client that
   submitGeneration (the Generate button) uses — against the live backend. This is
   the end-to-end leg: dock angle tokens -> plane -> mapKrea2Cfwui body -> cfwui ->
   ComfyUI graph -> delivered image -> executed /history confirms the tokens reached
   the positive CLIP encode. */
const BASE_URL = process.env.CFWUI_BASE_URL;
if (!BASE_URL) { console.error("set CFWUI_BASE_URL"); process.exit(2); }

const SUBJECT = "A cinematic photograph of a woman with long brown hair in a sunlit studio, sharp focus, soft afternoon light";
const NEEDLE = ["front view", "high-angle shot", "close-up"];

usePromptTokens.getState().reset();
usePromptTokens.getState().select("camera-angle", "view", "front view");
usePromptTokens.getState().select("camera-angle", "elevation", "high-angle shot");
usePromptTokens.getState().select("camera-angle", "distance", "close-up");

const plane: any = {
  model: "krea-2-turbo",
  prompt: { text: mergePromptWithTokens(SUBJECT, "image") },
  media: {},
  studio: "cinema",
  settings: { resolution: "1k", aspectRatio: "1:1", steps: 8, cfg: 1.0, sampler: "euler", scheduler: "simple", batchSize: 1 },
};

const mapped = toPlatform(plane);
console.log("MAPPED_PATH:", mapped.path);
console.log("MAPPED_BODY_PROMPT:", mapped.body.prompt);
const serialized = NEEDLE.every((t) => String(mapped.body.prompt).includes(t));
console.log("SERIALIZED_INTO_BODY:", serialized ? "PASS" : "FAIL");

const client = createCfwuiClient({ baseUrl: BASE_URL } as any);
const queued = await client.submit(mapped.path, mapped.body);
console.log("REQUEST_ID:", queued.requestId);

let status: any;
for (let i = 0; i < 60; i++) {
  status = await client.status(queued.requestId);
  if (status.images && status.images.length) break;
  if (status.error) { console.log("ERROR:", JSON.stringify(status.error)); break; }
  await new Promise((r) => setTimeout(r, 4000));
}
if (!status.images || !status.images.length) { console.log("NO_IMAGE status=" + (status && status.status)); process.exit(1); }

const url = status.images[0].url;
console.log("IMAGE_URL:", url);
const resp = await fetch(url);
const buf = Buffer.from(await resp.arrayBuffer());
const out = "/home/baramofme/.hermes/cache/scratch/studio_run.png";
await (await import("node:fs/promises")).writeFile(out, buf);
console.log("SAVED", out, buf.length, "bytes");

// tie to the executed ComfyUI graph via the output filename in the delivered url
const filename = decodeURIComponent(new URL(url).pathname.split("/file=")[1] ?? url).split("/").pop()!;
const hist: any = await (await fetch("http://127.0.0.1:8189/history")).json();
function walk(x: any, acc: any[] = []): any[] {
  if (x && typeof x === "object") {
    if (typeof x.class_type === "string") acc.push(x);
    for (const k of Object.values(x)) walk(k, acc);
  }
  return acc;
}
let pos: string | null = null; let pid: string | null = null;
for (const [p, item] of Object.entries(hist)) {
  const outs: any = (item as any).outputs || {};
  const names: string[] = [];
  for (const o of Object.values(outs)) for (const img of ((o as any).images || [])) names.push(img.filename);
  if (!names.includes(filename)) continue;
  pid = p;
  for (const nd of walk((item as any).prompt)) {
    if (nd.class_type === "CLIPTextEncode") {
      const t = nd.inputs?.text || "";
      if (t.includes("woman")) pos = t;
    }
  }
}
console.log("GRAPH_PROMPT_ID:", pid);
console.log("POSITIVE_CLIP:", pos ? JSON.stringify(pos) : "NOT FOUND");
const reached = !!pos && NEEDLE.every((t) => pos!.includes(t));
console.log("TOKENS_REACHED_GRAPH:", reached ? "PASS" : "FAIL");
console.log("STUDIO_TRANSPORT:", serialized && reached && buf.length > 5000 ? "STUDIO-END-TO-END-PASS" : "INCOMPLETE");
