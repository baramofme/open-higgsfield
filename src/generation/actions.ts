"use server";

import { cookies } from "next/headers";

import { createCfwuiClient } from "./cfwui-platform";
import { isCfwuiMode, isCfwuiTaskId, isLocalModel } from "./cfwui-mode";
import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import {
  MissingCredentialsError,
  PLATFORM_KEY_COOKIE,
  PLATFORM_KEY_COOKIE_OPTIONS,
  decodeCredentials,
  encodeCredentials,
  parseCredentialInput,
} from "./credentials";
import { createPlatformClient } from "./platform";
import type { StatusResult } from "./platform";
import { toPlatform } from "./to-platform";

export async function savePlatformCredentials(data: unknown) {
  const { apiKey } = parseCredentialInput(data);
  const jar = await cookies();
  jar.set(PLATFORM_KEY_COOKIE, encodeCredentials(apiKey), PLATFORM_KEY_COOKIE_OPTIONS);
}

export async function clearPlatformCredentials() {
  const jar = await cookies();
  jar.set(PLATFORM_KEY_COOKIE, "", { ...PLATFORM_KEY_COOKIE_OPTIONS, maxAge: 0 });
}

/** When CFWUI_BASE_URL is set the studio runs against the local comfy-webui
    backend: unauthenticated LAN mode, so no cookie is required. */
export async function hasPlatformCredentials() {
  if (isCfwuiMode()) return true;
  return (await readStoredCredentials()) !== null;
}

export async function submitGeneration(plane: GenerationPlane) {
  const model = getModel(plane.model);
  const parsed: GenerationPlane = {
    ...plane,
    settings: parseSettings(model, plane.settings),
  };
  /* The cinematic screen is a screen, not a paywall: its image and video tabs
     run whatever the composer holds, so routing follows the model alone —
     local models keep their LAN backend even inside the screen, and the
     camera/lens extras the screen adds simply do not reach the local body. */
  const { path, body, data } = toPlatform(parsed);
  /* A standalone-audio plane carries positional args (`data`) instead of a json
     body: the local audio endpoint is synchronous and has no task id to poll, so
     submitAudio opens its stream and reads it to completion, returning the
     finished URL inside the request id. Everything else keeps the run + poll
     contract. */
  if (isLocalModel(model.id) && data) {
    return createCfwuiClient({ baseUrl: process.env.CFWUI_BASE_URL! }).submitAudio(path, data);
  }
  const client = isLocalModel(model.id)
    ? createCfwuiClient({ baseUrl: process.env.CFWUI_BASE_URL! })
    : await createCloudClient();
  return client.submit(path, body);
}

/** Extend a saved picture outward by per-side pixel padding (Higgsfield's
 *  "확장 및 자르기" apply). This is the comfy-webui outpaint task, which paints
 *  the new border from the prompt. It bypasses the plane system because a crop
 *  or expand is not a catalogue generation: it re-sends one existing image with
 *  padding, not a model run. LAN mode only — the cloud has no such task. */
export async function submitOutpaint(input: {
  image: string;
  prompt: string;
  pad_left: number;
  pad_right: number;
  pad_top: number;
  pad_bottom: number;
  feathering?: number;
}) {
  if (!isCfwuiMode()) throw new Error("아웃페인트는 comfy-webui 백엔드가 필요합니다");
  const client = createCfwuiClient({ baseUrl: process.env.CFWUI_BASE_URL! });
  return client.submit("ImageGen_run_imagegen", {
    task_type: "outpaint",
    model: "Krea-2-Turbo",
    prompt: input.prompt,
    image: input.image,
    pad_left: input.pad_left,
    pad_right: input.pad_right,
    pad_top: input.pad_top,
    pad_bottom: input.pad_bottom,
    feathering: input.feathering ?? 10,
    async_execution: true,
  });
}

/** Every request in flight, answered in one round trip. Next dispatches server
 *  actions one at a time per client, so a poll per run would queue ahead of the
 *  next submit — the fan-out belongs on this side of the call, where it is
 *  genuinely parallel. */
export async function getGenerationStatuses(data: unknown): Promise<StatusResult[]> {
  const requestIds = parseRequestIds(data);
  return Promise.all(
    requestIds.map(async (requestId): Promise<StatusResult> => {
      try {
        const client = isCfwuiTaskId(requestId)
          ? createCfwuiClient({ baseUrl: process.env.CFWUI_BASE_URL! })
          : await createCloudClient();
        return { requestId, status: await client.status(requestId) };
      } catch (caught) {
        return { requestId, error: caught instanceof Error ? caught.message : String(caught) };
      }
    }),
  );
}

/** Cancel an in-flight run the moment the visitor asks for it. The Higgsfield
 *  cloud owns a cancel endpoint (its submit response carries a `cancel_url`), so
 *  a cloud request is cancelled for real. comfy-webui tasks carry a family
 *  prefix and the LAN backend exposes no high-level cancel api_name, so there is
 *  nothing to fire — we report that plainly instead of pretending a call. */
export async function cancelGeneration(data: unknown): Promise<void> {
  const requestId = parseRequestId(data);
  if (isCfwuiTaskId(requestId)) {
    throw new Error("로컬 comfy-webui 백엔드는 실행 중 취소를 지원하지 않습니다.");
  }
  const client = await createCloudClient();
  await client.cancel(requestId);
}

async function readStoredCredentials() {
  const jar = await cookies();
  return decodeCredentials(jar.get(PLATFORM_KEY_COOKIE)?.value);
}

async function createCloudClient() {
  const stored = await readStoredCredentials();
  if (!stored) throw new MissingCredentialsError();
  const baseUrl = process.env.HF_API_BASE_URL;
  if (!baseUrl) throw new Error("Missing HF_API_BASE_URL");
  return createPlatformClient({ ...stored, baseUrl });
}

function parseRequestIds(data: unknown): string[] {
  const payload = asObject(data, "Invalid status payload");
  const requestIds = payload.requestIds;
  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new Error("Invalid request ids");
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId) throw new Error("Invalid request id");
    return requestId;
  });
}

/* One id, for the cancel call — the same guard the fan-out uses. */
function parseRequestId(data: unknown): string {
  const payload = asObject(data, "Invalid cancel payload");
  const requestId = payload.requestId;
  if (typeof requestId !== "string" || !requestId) throw new Error("Invalid request id");
  return requestId;
}

function asObject(data: unknown, message: string): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error(message);
  return data as Record<string, unknown>;
}
