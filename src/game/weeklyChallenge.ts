import type { DailyModifier } from "./dailyChallenge";
import { MODIFIER_INFO } from "./dailyChallenge";

export interface WeeklyChallenge {
  id: string;
  label: string;
  modifier: DailyModifier;
  bonusMultiplier: number;
  seed: number;
}

const WEEKLY_MODIFIERS: DailyModifier[] = ["double_speed", "tiny_zone", "mirror_track", "reverse_combo", "one_shot", "silent_mode"];

function startOfWeek(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

export function getWeeklyChallenge(date = new Date()): WeeklyChallenge {
  const start = startOfWeek(date);
  const stamp = start.toISOString().slice(0, 10);
  const weekIndex = Math.floor(start.getTime() / 604800000);
  const modifier = WEEKLY_MODIFIERS[Math.abs(weekIndex) % WEEKLY_MODIFIERS.length];
  return {
    id: `weekly-${stamp}`,
    label: `WEEK OF ${stamp}`,
    modifier,
    bonusMultiplier: 1.5,
    seed: Math.abs(weekIndex * 7919) || 7919,
  };
}

export { MODIFIER_INFO };
