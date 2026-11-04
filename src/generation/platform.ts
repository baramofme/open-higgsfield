import { toAuthorizationHeader } from "./credentials";

const MODEL_ID = /^[a-z0-9][a-z0-9._/-]*$/i;

export class PlatformError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(messageFromBody(status, body));
    this.name = "PlatformError";
    this.status = status;
    this.body = body;
  }
}

export type QueuedGeneration = {
  status: string;
  requestId: string;
  statusUrl: string;
  cancelUrl: string;
};

export type GenerationStatus = {
  status: string;
  requestId: string;
  images?: Array<{ url: string }>;
  video?: { url: string };
  error?: unknown;
};

/** One request's answer inside a batched status poll. A request that errors
    carries its reason alone, so it cannot lose the answers standing beside it. */
export type StatusResult =
  | { requestId: string; status: GenerationStatus }
  | { requestId: string; error: string };

export type PlatformClientOptions = {
  apiKey: string;
  baseUrl: string;
  fetch?: typeof fetch;
};

export function isModelId(model: string): boolean {
  return MODEL_ID.test(model) && !model.includes("..");
}

export function createPlatformClient(options: PlatformClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const fetchImpl = options.fetch ?? fetch;
  const auth = toAuthorizationHeader(options.apiKey);

  async function send(method: "GET" | "POST", path: string, body?: Record<string, unknown>) {
    const url = `${baseUrl}${path}`;
    console.info("[platform] request", { method, url, body: body ?? null });
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const payload = await readJson(response);
    console.info("[platform] response", { method, url, status: response.status, body: payload });
    if (!response.ok) throw new PlatformError(response.status, payload);
    return payload;
  }

  return {
    async submit(model: string, input: Record<string, unknown>): Promise<QueuedGeneration> {
      if (!isModelId(model)) throw new PlatformError(400, { detail: "Invalid model" });
      return mapQueued(await send("POST", `/${model}`, input));
    },
    async status(requestId: string): Promise<GenerationStatus> {
      if (!requestId) throw new PlatformError(400, { detail: "Missing request id" });
      return mapStatus(await send("GET", `/requests/${encodeURIComponent(requestId)}/status`));
    },
    /* Cancelling an in-flight request. The submit response already carries a
       `cancel_url`, so the platform owns a cancel endpoint; the natural sibling
       of `GET /requests/:id/status` is `POST /requests/:id/cancel`. */
    async cancel(requestId: string): Promise<unknown> {
      if (!requestId) throw new PlatformError(400, { detail: "Missing request id" });
      return send("POST", `/requests/${encodeURIComponent(requestId)}/cancel`);
    },
  };
}

function mapQueued(payload: unknown): QueuedGeneration {
  const data = asRecord(payload);
  const requestId = stringField(data, "request_id");
  if (!requestId) throw new PlatformError(502, { detail: "Platform response missing request_id" });
  return {
    status: stringField(data, "status") ?? "queued",
    requestId,
    statusUrl: stringField(data, "status_url") ?? "",
    cancelUrl: stringField(data, "cancel_url") ?? "",
  };
}

function mapStatus(payload: unknown): GenerationStatus {
  const data = asRecord(payload);
  const requestId = stringField(data, "request_id") ?? "";
  const images = Array.isArray(data.images)
    ? data.images.flatMap((item) => {
        const url = asRecord(item).url;
        return typeof url === "string" ? [{ url }] : [];
      })
    : undefined;
  const videoUrl = asRecord(data.video).url;

  return {
    status: stringField(data, "status") ?? "unknown",
    requestId,
    ...(images?.length ? { images } : {}),
    ...(typeof videoUrl === "string" ? { video: { url: videoUrl } } : {}),
    ...(data.error !== undefined ? { error: data.error } : {}),
  };
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

function messageFromBody(status: number, body: unknown): string {
  const detail = asRecord(body).detail;
  if (typeof detail === "string" && detail) return detail;
  return `Platform request failed (${status})`;
}

/** Turn whatever the platform reported as a run's failure into one readable
    sentence. The cfwui backend returns a structured `{code, message}` dict —
    carrying a real, actionable reason — but the failed-card renderer only
    accepted a plain string, so an object collapsed to the generic "the platform
    reported a failure" and hid the reason (the "no partial output" class). This
    recovers the reason: prefer `message`, fall back to `detail`, then a short
    line naming the bare `code`. Returns undefined only when nothing usable is
    present, leaving the caller's generic fallback standing. */
export function statusErrorText(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw || undefined;
  if (raw !== null && typeof raw === "object") {
    const rec = asRecord(raw);
    const message = rec.message;
    if (typeof message === "string" && message) return message;
    const detail = rec.detail;
    if (typeof detail === "string" && detail) return detail;
    const code = rec.code;
    if (typeof code === "string" && code) return `The run failed (${code}).`;
  }
  return undefined;
}
