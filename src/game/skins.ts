import { isPlayablesEnvironment } from "./youtubePlayables";

export interface Skin {
  id: string;
  name: string;
  unlockScore: number;
  color: string;        // CSS color/gradient for the ball
  glow: string;         // box-shadow glow color
  trail?: string;       // trail/flame color override
  shape?: "circle" | "diamond" | "star";
  description: string;
}

export const SKINS: Skin[] = [
  {
    id: "default",
    name: "NEON ORB",
    unlockScore: 0,
    color: "hsl(280 80% 60%)",
    glow: "hsl(280 80% 60% / 0.5)",
    description: "The classic neon orb",
  },
  {
    id: "emerald",
    name: "EMERALD",
    unlockScore: 200,
    color: "hsl(160 100% 45%)",
    glow: "hsl(160 100% 50% / 0.6)",
    trail: "hsl(160 100% 60%)",
    description: "Unlocked at 200 pts",
  },
  {
    id: "solar",
    name: "SOLAR FLARE",
    unlockScore: 500,
    color: "linear-gradient(135deg, hsl(35 100% 55%), hsl(15 90% 50%))",
    glow: "hsl(35 100% 55% / 0.6)",
    trail: "hsl(35 100% 60%)",
    description: "Unlocked at 500 pts",
  },
  {
    id: "diamond",
    name: "DIAMOND",
    unlockScore: 1000,
    color: "linear-gradient(135deg, hsl(200 100% 80%), hsl(220 100% 90%))",
    glow: "hsl(200 100% 80% / 0.7)",
    trail: "hsl(200 100% 85%)",
    shape: "diamond",
    description: "Unlocked at 1000 pts",
  },
  {
    id: "plasma",
    name: "PLASMA CORE",
    unlockScore: 2000,
    color: "linear-gradient(135deg, hsl(280 100% 60%), hsl(320 100% 50%))",
    glow: "hsl(300 100% 60% / 0.7)",
    trail: "hsl(300 100% 70%)",
    description: "Unlocked at 2000 pts",
  },
  {
    id: "golden",
    name: "GOLDEN STAR",
    unlockScore: 3000,
    color: "linear-gradient(135deg, hsl(50 100% 55%), hsl(40 100% 45%))",
    glow: "hsl(50 100% 55% / 0.8)",
    trail: "hsl(50 100% 65%)",
    shape: "star",
    description: "Unlocked at 3000 pts",
  },
];

const SKIN_KEY = "suddenstop_selected_skin";

export function getSelectedSkinId(): string {
  if (isPlayablesEnvironment()) return "default";
  return localStorage.getItem(SKIN_KEY) || "default";
}

export function setSelectedSkinId(id: string) {
  if (isPlayablesEnvironment()) return;
  localStorage.setItem(SKIN_KEY, id);
}

export function getUnlockedSkins(highScore: number): Skin[] {
  return SKINS.filter(s => highScore >= s.unlockScore);
}

export function getSelectedSkin(highScore: number): Skin {
  const id = getSelectedSkinId();
  const unlocked = getUnlockedSkins(highScore);
  return unlocked.find(s => s.id === id) || SKINS[0];
}
