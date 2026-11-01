import { getGenerationStatuses } from "./actions";
import type { GenerationStatus, StatusResult } from "./platform";

/** Statuses the platform never moves off again. */
const TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"]);

/* The platform's words for "a cancel was accepted and is still working". These
   are NOT terminal: the request keeps reporting until it finally reads
   `canceled`. A card that is Rendering should switch to a cancelling message the
   moment one of these arrives, so the poll surfaces them as they pass through.
   Stored in underscore form because the matcher below folds spaces and hyphens
   into underscores, so a platform's separator or letter-case cannot miss. */
const CANCELING_TOKENS = new Set([
  "canceling",
  "cancelling",
  "cancel_requested",
  "canceling_requested",
  "cancelling_requested",
  "cancel_in_progress",
  "cancellation_requested",
  "cancelling_run",
  "cancel_pending",
  "stopping",
]);

/** True when a poll status means the backend is mid-cancel (not yet terminal). */
export function isCancelingStatus(status: string | undefined): boolean {
  if (typeof status !== "string") return false;
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return CANCELING_TOKENS.has(key);
}

export const POLL_INTERVAL_MS = 4000;
export const POLL_DEADLINE_MS = 10 * 60_000;
/** Rounds allowed to fail back to back before the watches are given up on. One
    dropped round must not end every generation in flight. */
const MAX_MISSES = 3;

type Waiter = {
  deadline: number;
  resolve: (status: GenerationStatus) => void;
  reject: (reason: Error) => void;
  /** Told about every status the poll reads for this request, including the
      non-terminal ones a terminal-only resolve would otherwise drop — so a
      mid-cancel status can reach the UI before the run finally settles. */
  onStatus?: (status: GenerationStatus) => void;
};

const waiting = new Map<string, Waiter>();
const inflight = new Map<string, Promise<GenerationStatus>>();
let timer: ReturnType<typeof setTimeout> | null = null;
let polling = false;
let misses = 0;

/** Resolves when the platform reports a terminal status for this request.
    Every request in flight is asked for together, in one server action per
    interval: Next dispatches server actions one at a time per client, so a
    poll per run would queue ahead of the next submit and the composer would
    stall again — with the lock gone and the queue doing the same work. */
export function watchRequest(
  requestId: string,
  opts?: { deadline?: number; onStatus?: (status: GenerationStatus) => void },
): Promise<GenerationStatus> {
  const existing = inflight.get(requestId);
  if (existing) return existing;
  const promise = new Promise<GenerationStatus>((resolve, reject) => {
    waiting.set(requestId, {
      deadline: opts?.deadline ?? Date.now() + POLL_DEADLINE_MS,
      onStatus: opts?.onStatus,
      resolve: (status) => {
        inflight.delete(requestId);
        resolve(status);
      },
      reject: (reason) => {
        inflight.delete(requestId);
        reject(reason);
      },
    });
    schedule();
  });
  inflight.set(requestId, promise);
  return promise;
}

/** Drops every watch without settling it: the studio unmounted and there is
    nobody left to hand a result to. In-flight jobs stay in history and the
    next mount starts a fresh watch. */
export function stopWatching(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  misses = 0;
  waiting.clear();
  inflight.clear();
}

function schedule(): void {
  if (timer !== null || polling || waiting.size === 0) return;
  timer = setTimeout(() => void round(), POLL_INTERVAL_MS);
}

async function round(): Promise<void> {
  timer = null;
  polling = true;
  try {
    const results = await getGenerationStatuses({ requestIds: [...waiting.keys()] });
    misses = 0;
    for (const result of results) deliver(result);
    sweep();
  } catch (caught) {
    if (++misses < MAX_MISSES) return;
    settleAll(caught instanceof Error ? caught : new Error(String(caught)));
  } finally {
    polling = false;
    schedule();
  }
}

function deliver(result: StatusResult): void {
  const waiter = waiting.get(result.requestId);
  if (!waiter) return;
  if ("error" in result) {
    waiting.delete(result.requestId);
    waiter.reject(new Error(result.error));
    return;
  }
  /* Surface every status the poll reads — including the non-terminal ones — so a
     mid-cancel status can reach the UI before the run settles. A bad observer
     must never break the poll loop, so a throw here is swallowed. */
  if (waiter.onStatus) {
    try {
      waiter.onStatus(result.status);
    } catch {
      /* the poll keeps running regardless of what the subscriber does */
    }
  }
  if (!TERMINAL.has(result.status.status)) return;
  waiting.delete(result.requestId);
  waiter.resolve(result.status);
}

/* A run the platform never finishes would otherwise hold its skeleton open for
   the rest of the session. */
function sweep(): void {
  const now = Date.now();
  for (const [requestId, waiter] of [...waiting]) {
    if (now <= waiter.deadline) continue;
    waiting.delete(requestId);
    waiter.reject(new Error("timed out waiting for the platform"));
  }
}

function settleAll(reason: Error): void {
  const waiters = [...waiting.values()];
  waiting.clear();
  misses = 0;
  for (const waiter of waiters) waiter.reject(reason);
}
