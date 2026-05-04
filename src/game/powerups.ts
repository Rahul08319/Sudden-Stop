export type PowerUpType = "slow_motion" | "wider_zone" | "double_points" | "magnet";

export interface PowerUp {
  type: PowerUpType;
  label: string;
  icon: string;
  durationRounds: number;
  description: string;
}

export const POWERUPS: Record<PowerUpType, PowerUp> = {
  slow_motion: { type: "slow_motion", label: "SLOW-MO", icon: "🐢", durationRounds: 1, description: "Object moves at half speed" },
  wider_zone: { type: "wider_zone", label: "WIDER ZONE", icon: "📏", durationRounds: 1, description: "Target zone +60%" },
  double_points: { type: "double_points", label: "2X POINTS", icon: "✨", durationRounds: 1, description: "Double points on next hit" },
  magnet: { type: "magnet", label: "MAGNET", icon: "🧲", durationRounds: 1, description: "Auto-snap to good zone" },
};

// 18% chance per round to spawn a power-up
export const POWERUP_SPAWN_CHANCE = 0.18;

export function rollRandomPowerUp(): PowerUp | null {
  if (Math.random() > POWERUP_SPAWN_CHANCE) return null;
  const types: PowerUpType[] = ["slow_motion", "wider_zone", "double_points", "magnet"];
  const t = types[Math.floor(Math.random() * types.length)];
  return POWERUPS[t];
}
