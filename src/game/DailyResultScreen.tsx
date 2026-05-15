import { MODIFIER_INFO, type DailyChallenge } from "./dailyChallenge";

interface Props {
  challenge: DailyChallenge;
  score: number;
  previousBest: number;
  isNewBest: boolean;
  pendingSync: boolean;
  onRetry: () => void;
  onMenu: () => void;
}

export default function DailyResultScreen({
  challenge, score, previousBest, isNewBest, pendingSync, onRetry, onMenu,
}: Props) {
  const info = MODIFIER_INFO[challenge.modifier];
  const bonus = Number(challenge.bonus_multiplier).toFixed(1);
  const delta = score - previousBest;

  return (
    <div className="flex flex-col items-center gap-5 px-6 animate-in fade-in duration-500 w-full max-w-[360px]">
      <div className="text-center">
        <span className="text-[10px] tracking-[0.3em] text-accent font-[var(--font-display)]">DAILY CHALLENGE</span>
        <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)] mt-1">COMPLETE</h2>
      </div>

      <div className="w-full neon-border bg-accent/5 rounded-xl p-3 flex items-center gap-3">
        <span className="text-3xl">{info.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-accent tracking-widest font-[var(--font-display)]">{info.label}</div>
          <div className="text-[11px] text-muted-foreground leading-snug">{info.desc}</div>
          <div className="text-[10px] text-primary mt-1 tracking-widest font-[var(--font-display)]">×{bonus} BONUS</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Today's Score</span>
        <span className={`text-5xl font-black font-[var(--font-display)] ${isNewBest ? "text-accent text-glow-warning" : "text-primary text-glow"}`}>
          {score}
        </span>
        {isNewBest ? (
          <span className="text-accent text-xs tracking-widest uppercase animate-pulse font-[var(--font-display)]">★ NEW PERSONAL BEST ★</span>
        ) : previousBest > 0 ? (
          <span className="text-muted-foreground text-[11px] tracking-wider">
            Best today: {previousBest} ({delta >= 0 ? "+" : ""}{delta})
          </span>
        ) : (
          <span className="text-muted-foreground text-[11px] tracking-wider">First attempt today</span>
        )}
      </div>

      <div className="w-full grid grid-cols-2 gap-2">
        <Stat label="MODIFIER" value={info.label.split(" ")[0]} />
        <Stat label="MULTIPLIER" value={`×${bonus}`} />
      </div>

      <div className={`text-[10px] tracking-widest font-[var(--font-display)] ${pendingSync ? "text-accent" : "text-muted-foreground"}`}>
        {pendingSync ? "⏳ QUEUED — WILL SYNC WHEN ONLINE" : "✓ SUBMITTED TO GLOBAL LEADERBOARD"}
      </div>

      <div className="flex gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onRetry(); }}
          className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-base tracking-widest uppercase px-7 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
        >
          RETRY
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-base tracking-widest uppercase px-7 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
        >
          MENU
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="neon-border rounded-lg bg-muted/20 px-3 py-2 flex flex-col items-center">
      <span className="text-[9px] text-muted-foreground tracking-widest uppercase">{label}</span>
      <span className="text-sm font-bold text-foreground font-[var(--font-display)] tracking-wider">{value}</span>
    </div>
  );
}

/** Per-challenge personal best stored locally. */
const PB_KEY = "suddenstop_daily_pb";
export function getDailyPB(challengeId: string): number {
  try {
    const m = JSON.parse(localStorage.getItem(PB_KEY) || "{}");
    return Number(m[challengeId] || 0);
  } catch { return 0; }
}
export function recordDailyPB(challengeId: string, score: number): { isNewBest: boolean; previousBest: number } {
  const previousBest = getDailyPB(challengeId);
  const isNewBest = score > previousBest;
  if (isNewBest) {
    try {
      const m = JSON.parse(localStorage.getItem(PB_KEY) || "{}");
      m[challengeId] = score;
      localStorage.setItem(PB_KEY, JSON.stringify(m));
    } catch { /* ignore */ }
  }
  return { isNewBest, previousBest };
}
