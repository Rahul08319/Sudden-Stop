import type { GameMode } from "./SuddenStopGame";
import { isPlayablesEnvironment } from "./youtubePlayables";

export interface GhostTap {
  round: number;
  position: number;
  result: "perfect" | "good" | "miss";
}

export interface GhostRun {
  seed: number;
  mode: Extract<GameMode, "classic" | "survival" | "timeattack">;
  score: number;
  taps: GhostTap[];
}

const GHOST_KEY = "suddenstop_best_ghost";

export function createRunSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

export function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 48271) % 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export function loadBestGhost(): GhostRun | null {
  if (isPlayablesEnvironment()) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(GHOST_KEY) || "null") as GhostRun | null;
    return saved && Array.isArray(saved.taps) ? saved : null;
  } catch {
    return null;
  }
}

export function saveBestGhost(run: GhostRun) {
  if (isPlayablesEnvironment()) return;
  localStorage.setItem(GHOST_KEY, JSON.stringify(run));
}
