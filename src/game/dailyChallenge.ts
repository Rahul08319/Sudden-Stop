import { supabase } from "@/integrations/supabase/client";

export type DailyModifier =
  | "double_speed"
  | "tiny_zone"
  | "reverse_combo"
  | "silent_mode"
  | "mirror_track"
  | "one_shot";

export interface DailyChallenge {
  id: string;
  challenge_date: string;
  modifier: DailyModifier;
  bonus_multiplier: number;
  seed: number;
}

export const MODIFIER_INFO: Record<DailyModifier, { label: string; desc: string; icon: string }> = {
  double_speed: { label: "DOUBLE SPEED", desc: "Object moves 2x as fast", icon: "⚡" },
  tiny_zone: { label: "TINY ZONE", desc: "Target zone is 50% smaller", icon: "🎯" },
  reverse_combo: { label: "REVERSE COMBO", desc: "Combo grants negative speed boost", icon: "🔁" },
  silent_mode: { label: "SILENT MODE", desc: "No sound cues — pure focus", icon: "🔇" },
  mirror_track: { label: "MIRROR TRACK", desc: "Object starts moving left", icon: "🪞" },
  one_shot: { label: "ONE SHOT", desc: "Single life, infinite rounds", icon: "💥" },
};

export async function fetchTodayChallenge(): Promise<DailyChallenge | null> {
  const { data, error } = await supabase.rpc("get_today_challenge");
  if (error || !data) return null;
  // rpc returns a record; supabase-js wraps it
  return data as unknown as DailyChallenge;
}

const COMPLETED_KEY = "suddenstop_daily_completed";

export function isDailyCompletedToday(challengeId: string): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "{}");
    return saved.id === challengeId;
  } catch {
    return false;
  }
}

export function markDailyCompleted(challengeId: string, score: number) {
  localStorage.setItem(COMPLETED_KEY, JSON.stringify({ id: challengeId, score, at: Date.now() }));
}
