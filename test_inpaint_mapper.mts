import { toPlatform } from "./src/generation/to-platform";

function mk(overrides: any): any {
  return {
    model: "krea-2-turbo",
    prompt: { text: "repaint the lake" },
    settings: {
      resolution: "1k",
      aspectRatio: "1:1",
      denoise: 0.75,
      steps: 8,
      cfg: 1.0,
      batchSize: 1,
    },
    media: {},
    studio: "image",
    ...overrides,
  };
}

const START = [{ url: "data:image/png;base64,AAAA" }];

const cases: Array<[string, any]> = [
  ["txt2img", mk({})],
  ["img2img", mk({ media: { start: START } })],
  ["inpaint", mk({ media: { start: START }, inpaint: true })],
];

for (const [name, plane] of cases) {
  const m = toPlatform(plane);
  const b = m.body;
  console.log(
    name,
    "| path=" + m.path,
    "| task_type=" + b.task_type,
    "| width=" + b.width,
    "| height=" + b.height,
    "| has_image=" + (b.image != null),
    "| denoise=" + b.denoise,
  );
}

// Assert the inpaint branch specifically.
const inp = toPlatform(mk({ media: { start: START }, inpaint: true })).body;
const ok = inp.task_type === "inpaint" && inp.width === undefined && inp.height === undefined && inp.image != null;
console.log("INPAINT_BRANCH_ASSERT", ok ? "PASS" : "FAIL", JSON.stringify(inp));
