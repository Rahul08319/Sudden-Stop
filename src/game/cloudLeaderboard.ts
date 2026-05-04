import { supabase } from "@/integrations/supabase/client";
import type { GameMode } from "./SuddenStopGame";

export interface CloudScore {
  id: string;
  player_name: string;
  score: number;
  mode: string;
  daily_challenge_id: string | null;
  created_at: string;
}

const NAME_KEY = "suddenstop_player_name";

export function getPlayerName(): string {
  return localStorage.getItem(NAME_KEY) || "PLAYER";
}

export function setPlayerName(name: string) {
  const clean = name.trim().slice(0, 12).toUpperCase() || "PLAYER";
  localStorage.setItem(NAME_KEY, clean);
}

export async function submitScore(
  score: number,
  mode: GameMode | "daily",
  dailyChallengeId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (score <= 0) return { ok: true };
  const player_name = getPlayerName().slice(0, 12) || "PLAYER";
  const { error } = await supabase.from("global_scores").insert({
    player_name,
    score: Math.min(999999, Math.max(0, Math.floor(score))),
    mode,
    daily_challenge_id: dailyChallengeId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchTopScores(mode: GameMode | "daily", limit = 10): Promise<CloudScore[]> {
  const { data, error } = await supabase
    .from("global_scores")
    .select("*")
    .eq("mode", mode)
    .order("score", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as CloudScore[];
}

export async function fetchDailyTopScores(challengeId: string, limit = 10): Promise<CloudScore[]> {
  const { data, error } = await supabase
    .from("global_scores")
    .select("*")
    .eq("daily_challenge_id", challengeId)
    .order("score", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as CloudScore[];
}
