import { defaultKv, type Kv } from "./idb";

/* Comments live in the same IndexedDB kv the run log uses (idb "openhiggsfield"
   / "kv"), filed under one key per run so a run's thread travels with the run.
   OH has no account, so every comment is the visitor's own; the label is fixed. */
export type Comment = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
};

const PREFIX = "comments.v1.";
const AUTHOR = "You";

function key(runId: string): string {
  return PREFIX + runId;
}

export async function loadComments(runId: string, kv: Kv = defaultKv()): Promise<Comment[]> {
  try {
    const stored = await kv.get<unknown>(key(runId));
    if (!Array.isArray(stored)) return [];
    return (stored as Comment[])
      .filter((c) => typeof c.text === "string" && typeof c.id === "string")
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function addComment(
  runId: string,
  text: string,
  kv: Kv = defaultKv(),
): Promise<Comment[] | null> {
  const body = text.trim();
  if (!body) return null;
  const list = await loadComments(runId, kv);
  const comment: Comment = {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    author: AUTHOR,
    text: body,
    createdAt: Date.now(),
  };
  const next = [...list, comment];
  try {
    await kv.set(key(runId), next);
  } catch {
    /* private mode or a denied store */
    return null;
  }
  return next;
}

export async function removeComment(
  runId: string,
  id: string,
  kv: Kv = defaultKv(),
): Promise<Comment[]> {
  const list = await loadComments(runId, kv);
  const next = list.filter((c) => c.id !== id);
  try {
    await kv.set(key(runId), next);
  } catch {
    /* ignore the failed write */
  }
  return next;
}
