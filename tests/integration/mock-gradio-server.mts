/**
 * mock-gradio-server.mts — the integration-test stand-in for comfy-webui.
 *
 * It speaks the same Gradio queue-REST contract the real backend does
 * (src/generation/cfwui-platform.ts), so the app's submit→poll path runs
 * end-to-end against a deterministic, instant "completed" backend instead of a
 * GPU. This is what lets an integration test drive a real UI press all the way
 * through the server action and the platform client without a live ComfyUI.
 *
 * Protocol mirrored (see cfwui-platform.ts header):
 *   POST {base}/gradio_api/call/{api_name}   {"data":[arg,...]} → {"event_id":...}
 *   GET  {base}/gradio_api/call/{api_name}/{event_id}           → SSE stream,
 *        `event: complete` carries the return values as a JSON array.
 *
 * Behaviour the tests rely on:
 *   - a run api returns a task id with the right family prefix (img_task /
 *     ltx2_5_task) so the poll routes to the matching status api;
 *   - every status api answers "completed" on its very first call, handing back
 *     a plain media URL (no /gradio_api/file= marker, so the image proxy leaves
 *     it alone and the tile loads it straight from this server);
 *   - the audio api is synchronous and returns its file URL on the complete.
 *
 * Media URLs point at this server's own origin, so the browser fetches the
 * bytes here. The files are deliberately tiny placeholders — an integration
 * test asserts the run card reaches "completed" and a tile appears, not that a
 * codec decodes.
 */

import process from "node:process";
import { Buffer } from "node:buffer";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";

/** A 1×1 PNG (the smallest real image a browser will happily render). */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
/* A real, decodable MP3 would be ideal; the audio tile falls back to its
   <audio> player when no waveform can be built, so placeholder bytes still
   render a complete tile. The integration test asserts the tile exists and
   carries the run's URL — not that the clip plays. */
const MP3 = Buffer.from("ID3\n\x00\x00\x00\x00", "latin1");
const MP4 = Buffer.from("\x00\x00\x00 ftypisom\x00\x00\x00\x00", "latin1");

type MediaKind = "image" | "video" | "audio";

const MEDIA_FILES: Record<string, { body: Buffer; type: string }> = {
  "out.png": { body: PNG, type: "image/png" },
  "out.mp3": { body: MP3, type: "audio/mpeg" },
  "out.mp4": { body: MP4, type: "video/mp4" },
};

/* Which api_name belongs to which output kind — read off to-platform.ts. */
const KIND_BY_API: Array<{ test: RegExp; kind: MediaKind }> = [
  { test: /^AudioGen_/i, kind: "audio" },
  { test: /^VideoGen_/i, kind: "video" },
  { test: /^ImageGen_/i, kind: "image" },
];

let counter = 0;
/** eventId → { api, args }. A status call reads the request id the run passed
 *  back; we only need the api name to choose which media to hand back. */
const events = new Map<string, { api: string; args: unknown[] }>();

function kindOf(api: string): MediaKind {
  for (const entry of KIND_BY_API) {
    if (entry.test.test(api)) return entry.kind;
  }
  return "image";
}

function isStatusApi(api: string): boolean {
  return api.includes("get_task_status");
}
function isAudioApi(api: string): boolean {
  return /^AudioGen_/i.test(api);
}

function mediaFile(kind: MediaKind): string {
  return kind === "video" ? "out.mp4" : kind === "audio" ? "out.mp3" : "out.png";
}
/** The family prefix the real backend mints per module, so statusApiFor routes
 *  the poll to the right status endpoint: ImageGen → img_task, LTX → ltx2_5_task,
 *  H3 → h3_task. A wrong prefix here would send an image run down the video poll
 *  and hand back the wrong media, so map it straight off the api name. */
function taskPrefix(api: string): string {
  if (/^VideoGen_H3/i.test(api)) return "h3_task";
  if (/^VideoGen_/i.test(api)) return "ltx2_5_task";
  return "img_task";
}

/** Build the media URL from the request's own Host so it always points back at
 *  the listening port (works whether the port was fixed or ephemeral). */
function originOf(req: IncomingMessage): string {
  const host = req.headers.host ?? "127.0.0.1";
  return `http://${host}`;
}
function mediaUrl(req: IncomingMessage, kind: MediaKind): string {
  return `${originOf(req)}/media/${mediaFile(kind)}`;
}

function writeSse(res: ServerResponse, payload: unknown): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("event: complete\n");
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  res.end();
}

function sendJson(res: ServerResponse, code: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(text) });
  res.end(text);
}

function sendMedia(res: ServerResponse, name: string): void {
  const file = MEDIA_FILES[name];
  if (!file) {
    sendJson(res, 404, { detail: `unknown media ${name}` });
    return;
  }
  res.writeHead(200, {
    "Content-Type": file.type,
    "Content-Length": file.body.length,
    "Access-Control-Allow-Origin": "*",
  });
  res.end(file.body);
}

export type MockGradio = {
  server: Server;
  baseUrl: string;
  close: () => Promise<void>;
  /** The media URL this server hands back for a kind, so a test can assert the
   *  run's tile carries exactly what the mock returned (proves the poll path
   *  round-trips the URL through the whole pipeline). */
  mediaUrl: (kind: MediaKind) => string;
};

/** Start the mock on `port` (0 = ephemeral). Resolves once it is listening. */
export function startMockGradio(port = 3131): Promise<MockGradio> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const callMatch = req.url?.match(/^\/gradio_api\/call\/([^/]+)\/?$/);
    const streamMatch = req.url?.match(/^\/gradio_api\/call\/([^/]+)\/([^/]+)$/);
    const mediaMatch = req.url?.match(/^\/media\/([A-Za-z0-9._-]+)$/);

    if (req.method === "POST" && callMatch) {
      let args: unknown[] = [];
      try {
        const raw = (req as IncomingMessage & { _body?: string })._body ?? "{}";
        const body = JSON.parse(raw);
        if (Array.isArray(body.data)) args = body.data;
      } catch {
        args = [];
      }
      const api = decodeURIComponent(callMatch[1]);
      const eventId = `evt-${++counter}`;
      events.set(eventId, { api, args });
      sendJson(res, 200, { event_id: eventId });
      return;
    }

    if (req.method === "GET" && streamMatch) {
      const api = decodeURIComponent(streamMatch[1]);
      const eventId = streamMatch[2];
      const stored = events.get(eventId);
      const args = stored?.args ?? [];
      const kind = kindOf(api);

      if (isAudioApi(api)) {
        // synchronous: the complete carries the finished file URL as [url]
        writeSse(res, [mediaUrl(req, "audio")]);
        events.delete(eventId);
        return;
      }
      if (isStatusApi(api)) {
        const requestId = typeof args[0] === "string" ? args[0] : "";
        const payload: Record<string, unknown> = {
          status: "completed",
          task_id: requestId,
          result: kind === "video" ? { video_url: mediaUrl(req, "video") } : { images: [mediaUrl(req, "image")] },
        };
        writeSse(res, [payload]);
        events.delete(eventId);
        return;
      }
      // a run api: mint a family-prefixed task id and report it queued
      const taskId = `${taskPrefix(api)}-${++counter}`;
      writeSse(res, [{ task_id: taskId, status: "queued" }]);
      return;
    }

    if (req.method === "GET" && mediaMatch) {
      sendMedia(res, mediaMatch[1]);
      return;
    }

    sendJson(res, 404, { detail: `no route ${req.method} ${req.url}` });
  });

  // buffer the POST body before routing (small payloads only)
  server.on("request", (req: IncomingMessage) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString("utf8");
      if (raw.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      (req as IncomingMessage & { _body?: string })._body = raw;
    });
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      const baseUrl = `http://127.0.0.1:${actualPort}`;
      resolve({
        server,
        baseUrl,
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
          }),
        mediaUrl: (kind) => `${baseUrl}/media/${mediaFile(kind)}`,
      });
    });
  });
}

/* A tiny helper so a stray `node mock-gradio-server.mts` gives a live server on
   the default port for manual poking. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const mock = await startMockGradio(Number(process.env.MOCK_PORT || 3111));
  console.info(`[mock-gradio] listening on ${mock.baseUrl}`);
}
