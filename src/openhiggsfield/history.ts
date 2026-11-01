import { browserLegacy, defaultKv, type Kv, type LegacyStore } from "./idb";
import type { Surface } from "@/generation/catalog";

export type RunStatus = "running" | "completed" | "failed";

export interface RunRecord {
  id: string;
  surface: Surface;
  modelId: string;
  modelLabel: string;
  prompt: string;
  /** CSS aspect-ratio value, e.g. "16 / 9" */
  ratio: string;
  meta: string;
  badge?: string;
  kind: "image" | "video" | "audio";
  urls: string[];
  status: RunStatus;
  /** Platform request this row is waiting on. Set while status is running so a
      refresh can resume the poll; completed rows keep it for the same id. */
  requestId?: string;
  error?: string;
  /** True when the run reached its terminal `canceled` state rather than dying
      on its own. The card reuses the failed layout and the retry path unchanged,
      but swaps the badge wording to read as a cancel instead of an error.
      Absent (not false) on runs that finished or genuinely failed. */
  cancelled?: boolean;
  /** Layered-gradient fallback used while media loads or when a run failed. */
  art: string;
  createdAt: number;
  /** Kept deliberately: shows in the Favorites scope and outlives the cap. */
  favorite?: boolean;
  /** Project the run was filed under. The cinematic surface stamps the project
      it loaded; ordinary work lands on the default shelf. Absent on old records. */
  projectId?: string;
  /** Resolved catalog settings this run was submitted with, so reuse can
      restore the dials and not just the words. Absent on pre-existing records. */
  settings?: Record<string, unknown>;
  /** When the visitor saved this run to disk. The feed's 다운로드됨 filter reads
      this stamp; absent means it was never saved. */
  downloadedAt?: number;
  /** Wall-clock seconds this run took, from submit to terminal. Recorded on
      completed rows so future runtimes can be predicted from past ones. The
      viewer's 세부 정보 tab renders it as "Generation Duration: N s". */
  durationSeconds?: number;
  /** When the run reached its terminal failed state — recorded so the failed
      card's detail view can show a real failure timestamp instead of only the
      submit time. Absent on rows that never failed. */
  failedAt?: number;
}

export const HISTORY_KEY = "history.v1";
export const LEGACY_HISTORY_KEY = "openhiggsfield.history.v1";
const MAX_RECORDS = 60;

export async function loadHistory(
  kv: Kv = defaultKv(),
  legacy: LegacyStore | undefined = browserLegacy(),
): Promise<RunRecord[]> {
  const stored = await readIdb(kv);
  const fromLegacy = readLegacy(legacy);
  if (stored.length === 0) return fromLegacy;
  if (fromLegacy.length === 0) return stored;
  return mergeHistory(stored, fromLegacy);
}

export async function saveHistory(
  records: RunRecord[],
  kv: Kv = defaultKv(),
  legacy: LegacyStore | undefined = browserLegacy(),
): Promise<void> {
  const next = capHistory(records.filter(isRunRecord));
  try {
    await kv.set(HISTORY_KEY, next);
  } catch {
    /* private mode or a denied store */
  }
  try {
    legacy?.setItem(LEGACY_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota or a denied store */
  }
}

/** Session rows win on id collision so a generate that landed before IDB
    finished reading is not wiped by the delayed load. */
export function mergeHistory(stored: RunRecord[], live: RunRecord[]): RunRecord[] {
  const byId = new Map<string, RunRecord>();
  for (const row of [...stored, ...live]) {
    const prev = byId.get(row.id);
    if (!prev || newerRecord(row, prev)) byId.set(row.id, row);
  }
  return capHistory([...byId.values()].sort((a, b) => b.createdAt - a.createdAt));
}

async function readIdb(kv: Kv): Promise<RunRecord[]> {
  try {
    const stored = await kv.get<unknown>(HISTORY_KEY);
    if (!Array.isArray(stored)) return [];
    return capHistory(stored.filter(isRunRecord));
  } catch {
    return [];
  }
}

function readLegacy(legacy: LegacyStore | undefined): RunRecord[] {
  if (!legacy) return [];
  try {
    const raw = legacy.getItem(LEGACY_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return capHistory(parsed.filter(isRunRecord));
  } catch {
    return [];
  }
}

/* The cap trims the run log, not the visitor's shelf: a favorite is a
   deliberate keep, so only unmarked runs age out of the window. */
export function capHistory(records: RunRecord[], max = MAX_RECORDS): RunRecord[] {
  if (records.length <= max) return records;
  let kept = 0;
  return records.filter(
    (record) => record.favorite === true || record.status === "running" || kept++ < max,
  );
}

export function requestIdOf(record: RunRecord): string {
  return record.requestId ?? record.id.split("#")[0]!;
}

/** Swap every row of a request for its terminal records, or no-op if the
    visitor already deleted the in-flight tiles. */
export function replaceRequest(
  records: RunRecord[],
  requestId: string,
  next: RunRecord[],
): RunRecord[] {
  if (!records.some((record) => record.status === "running" && requestIdOf(record) === requestId)) {
    return records;
  }
  return capHistory(
    [...next, ...records.filter((record) => requestIdOf(record) !== requestId)].sort(
      (a, b) => b.createdAt - a.createdAt,
    ),
  );
}

function newerRecord(row: RunRecord, prev: RunRecord): boolean {
  const rowDone = row.status !== "running";
  const prevDone = prev.status !== "running";
  if (rowDone !== prevDone) return rowDone;
  return row.createdAt >= prev.createdAt;
}

function isRunRecord(value: unknown): value is RunRecord {
  if (value === null || typeof value !== "object") return false;
  const record = value as Partial<RunRecord>;
  return (
    typeof record.id === "string" &&
    (record.surface === "image" || record.surface === "video" || record.surface === "audio") &&
    typeof record.prompt === "string" &&
    typeof record.ratio === "string" &&
    Array.isArray(record.urls) &&
    (record.cancelled === undefined || typeof record.cancelled === "boolean") &&
    (record.status === "completed" ||
      record.status === "failed" ||
      (record.status === "running" && typeof record.requestId === "string")) &&
    typeof record.createdAt === "number" &&
    (record.requestId === undefined || typeof record.requestId === "string") &&
    (record.favorite === undefined || typeof record.favorite === "boolean") &&
    (record.settings === undefined ||
      (typeof record.settings === "object" && record.settings !== null)) &&
    (record.durationSeconds === undefined || typeof record.durationSeconds === "number") &&
    (record.failedAt === undefined || typeof record.failedAt === "number")
  );
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

/* One step along the runs the visitor is actually looking at, or null at the
   ends — the walk stops there rather than wrapping, so the edge of the scope
   can be felt. A run that has left the list steps nowhere. */
export function stepRun(records: RunRecord[], id: string, delta: number): RunRecord | null {
  const from = records.findIndex((record) => record.id === id);
  if (from < 0) return null;
  return records[from + delta] ?? null;
}
