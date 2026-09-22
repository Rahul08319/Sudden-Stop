import { supabase } from "@/integrations/supabase/client";
import type { GameMode } from "./SuddenStopGame";
import { getPlayerName } from "./cloudLeaderboard";

interface QueuedScore {
  id: string;
  player_name: string;
  score: number;
  mode: string;
  daily_challenge_id: string | null;
  queued_at: number;
  attempts: number;
}

const QUEUE_KEY = "suddenstop_offline_queue";
const MAX_ATTEMPTS = 8;
let flushing = false;
const listeners = new Set<(count: number) => void>();

function read(): QueuedScore[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function write(q: QueuedScore[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  listeners.forEach((fn) => fn(q.length));
}

export function subscribeQueue(cb: (count: number) => void): () => void {
  listeners.add(cb);
  cb(read().length);
  return () => { listeners.delete(cb); };
}

export function pendingCount(): number { return read().length; }

async function trySubmit(item: QueuedScore): Promise<boolean> {
  const { error } = await supabase.from("global_scores").insert({
    player_name: item.player_name,
    score: item.score,
    mode: item.mode,
    daily_challenge_id: item.daily_challenge_id,
  });
  return !error;
}

export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  try {
    const queue = read();
    const remaining: QueuedScore[] = [];
    for (const item of queue) {
      const ok = await trySubmit(item);
      if (!ok) {
        item.attempts += 1;
        if (item.attempts < MAX_ATTEMPTS) remaining.push(item);
      }
    }
    write(remaining);
  } finally {
    flushing = false;
  }
}

export async function submitScoreQueued(
  score: number,
  mode: GameMode | "daily",
  dailyChallengeId?: string | null
): Promise<{ ok: boolean; queued: boolean }> {
  if (score <= 0) return { ok: true, queued: false };
  const item: QueuedScore = {
    id: crypto.randomUUID(),
    player_name: (getPlayerName() || "PLAYER").slice(0, 12),
    score: Math.min(999999, Math.max(0, Math.floor(score))),
    mode,
    daily_challenge_id: dailyChallengeId ?? null,
    queued_at: Date.now(),
    attempts: 0,
  };

  const online = typeof navigator === "undefined" || navigator.onLine !== false;
  if (online) {
    const ok = await trySubmit(item);
    if (ok) return { ok: true, queued: false };
  }
  // Persist for retry
  const queue = read();
  queue.push(item);
  write(queue);
  return { ok: false, queued: true };
}

// Auto-flush wiring
if (typeof window !== "undefined") {
  window.addEventListener("online", () => { flushQueue(); });
  window.addEventListener("focus", () => { flushQueue(); });
  // Periodic retry every 45s
  setInterval(() => { flushQueue(); }, 45000);
  // Initial attempt shortly after load
  setTimeout(() => { flushQueue(); }, 2000);
}
