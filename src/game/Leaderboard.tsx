import type { GameMode } from "./SuddenStopGame";

export interface LeaderboardEntry {
  name: string;
  score: number;
  mode: GameMode;
  date: number;
}

const LB_KEY = "suddenstop_leaderboard";

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const saved = localStorage.getItem(LB_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore storage read error */
  }
  return [];
}

export function addLeaderboardEntry(entry: LeaderboardEntry) {
  const lb = getLeaderboard();
  lb.push(entry);
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(LB_KEY, JSON.stringify(lb.slice(0, 50)));
}

interface LeaderboardScreenProps {
  onBack: () => void;
}

export default function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const entries = getLeaderboard();
  const modes: GameMode[] = ["classic", "survival", "timeattack"];
  const modeLabels: Record<GameMode, string> = {
    classic: "CLASSIC",
    survival: "SURVIVAL",
    timeattack: "TIME ATTACK",
  };

  return (
    <div className="flex flex-col items-center gap-6 px-4 animate-in fade-in duration-500 w-full max-w-[380px] max-h-[80vh]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">
        LEADERBOARD
      </h2>

      <div className="w-full flex flex-col gap-4 overflow-y-auto max-h-[55vh] pr-1">
        {modes.map(mode => {
          const modeEntries = entries.filter(e => e.mode === mode).slice(0, 5);
          if (modeEntries.length === 0) return null;

          return (
            <div key={mode} className="neon-border rounded-xl p-4 bg-muted/30">
              <span className="text-xs text-primary tracking-widest uppercase font-[var(--font-display)] mb-2 block">
                {modeLabels[mode]}
              </span>
              {modeEntries.map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-1.5 ${
                    i === 0 ? "text-accent" : "text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-center font-[var(--font-display)] ${
                      i === 0 ? "text-accent text-glow-warning" : "text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm tracking-wider font-[var(--font-display)]">
                      {entry.name || "PLAYER"}
                    </span>
                  </div>
                  <span className={`text-lg font-bold font-[var(--font-display)] ${
                    i === 0 ? "text-glow-warning" : ""
                  }`}>
                    {entry.score}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <span className="text-sm tracking-wider">No scores yet. Play to set records!</span>
          </div>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onBack(); }}
        className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-sm tracking-widest uppercase px-10 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
      >
        ← BACK
      </button>
    </div>
  );
}
