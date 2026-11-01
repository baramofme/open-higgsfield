import { PlatformError } from "./platform";
import type { GenerationStatus, QueuedGeneration } from "./platform";

/**
 * cfwui (comfy-webui) transport — speaks Gradio's queue REST instead of the
 * Higgsfield platform contract. Same surface as createPlatformClient:
 * submit(toolName, params) / status(requestId).
 *
 * Protocol (verified live on comfy-webui :7861):
 *   POST {base}/gradio_api/call/{api_name}  {"data":[arg,...]}  -> {"event_id":...}
 *   GET  {base}/gradio_api/call/{api_name}/{event_id}           -> SSE stream;
 *        "event: complete" carries the return values as a JSON array
 *        (proper JSON, unlike the MCP text channel's Python repr).
 */

export type CfwuiClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
};

export function createCfwuiClient(options: CfwuiClientOptions) {
  const base = options.baseUrl.replace(/\/$/, "");
  const origin = new URL(base).origin;
  const fetchImpl = options.fetch ?? fetch;

  async function callTool(apiName: string, args: unknown[]): Promise<unknown> {
    const startUrl = `${base}/gradio_api/call/${apiName}`;
    console.info("[cfwui] call", { apiName });
    const start = await fetchImpl(startUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: args }),
    });
    if (!start.ok) throw new PlatformError(start.status, await readBody(start));

    const eventId = stringField(asRecord(await readJson(start)), "event_id");
    if (!eventId) throw new PlatformError(502, { detail: "cfwui call returned no event_id" });

    const streamUrl = `${base}/gradio_api/call/${apiName}/${eventId}`;
    const stream = await fetchImpl(streamUrl);
    if (!stream.ok) throw new PlatformError(stream.status, await readBody(stream));
    return parseComplete(await stream.text(), apiName);
  }

  return {
    /** `tool` is the cfwui api_name (e.g. "ImageGen_run_imagegen"); `params` is
     * the semantic-API json_params object. */
    async submit(tool: string, params: Record<string, unknown>): Promise<QueuedGeneration> {
      const ret = asRecord(await callTool(tool, [params]));
      if (ret.error) throw new PlatformError(400, ret);
      const requestId = stringField(ret, "task_id");
      if (!requestId) throw new PlatformError(502, { detail: "cfwui run returned no task_id" });
      return {
        status: stringField(ret, "status") ?? "queued",
        requestId,
        statusUrl: "",
        cancelUrl: "",
      };
    },

    async status(requestId: string): Promise<GenerationStatus> {
      if (!requestId) throw new PlatformError(400, { detail: "Missing request id" });
      const ret = asRecord(await callTool(statusApiFor(requestId), [requestId]));
      const status = stringField(ret, "status");
      if (!status) {
        if (ret.error) throw new PlatformError(404, ret);
        throw new PlatformError(502, ret);
      }
      const result = asRecord(ret.result);
      const rawImages = Array.isArray(result.images) ? result.images : [];
      const images = rawImages.flatMap((item) =>
        typeof item === "string" ? [{ url: rewriteFileUrl(item, origin) }] : [],
      );
      /* The video modules hand back a single mp4 url instead of an image list,
         so a finished task with no images still carries its output as a URL. */
      const media = images.length
        ? images
        : (() => {
            const url = findMediaUrl(ret);
            return url ? [{ url: rewriteFileUrl(url, origin) }] : [];
          })();
      return {
        status,
        requestId: stringField(ret, "task_id") ?? requestId,
        ...(media.length ? { images: media } : {}),
        ...(ret.error !== undefined ? { error: ret.error } : {}),
      };
    },
  };
}

/** Output URLs come back rooted at the Gradio bind address (often
 * http://0.0.0.0:7861). Keep the path, swap the host for ours. */
function rewriteFileUrl(url: string, origin: string): string {
  try {
    const parsed = new URL(url);
    return `${origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/** Which status endpoint answers for a given task id, routed by its family
 *  prefix so the video modules poll their own status, not the image one. */
function statusApiFor(requestId: string): string {
  if (requestId.startsWith("ltx2_5_task")) return "VideoGen_LTX_2_5_get_task_status";
  if (requestId.startsWith("h3_task")) return "VideoGen_H3_get_task_status";
  return "ImageGen_get_task_status";
}

/** A finished run's media URL, recovered by scanning the returned record for a
 *  file when the module gives back no explicit image list. */
function findMediaUrl(obj: unknown): string | undefined {
  try {
    const m = JSON.stringify(obj).match(/https?:\/\/[^"\\]+?\.(?:png|mp4|webm|mov)/);
    return m ? m[0] : undefined;
  } catch {
    return undefined;
  }
}

function parseComplete(text: string, apiName: string): unknown {
  let event = "";
  let value: unknown;
  let failure: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (event === "complete") {
      try {
        const parsed = JSON.parse(payload) as unknown;
        value = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        failure = `cfwui ${apiName}: unparseable complete payload`;
      }
    } else if (event === "error") {
      failure = payload || "cfwui stream error";
    }
  }
  if (failure) throw new Error(failure);
  if (value === undefined) throw new Error(`cfwui ${apiName}: stream ended without a complete event`);
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
