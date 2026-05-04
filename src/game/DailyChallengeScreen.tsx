import { useEffect, useState } from "react";
import { fetchTodayChallenge, MODIFIER_INFO, isDailyCompletedToday, type DailyChallenge } from "./dailyChallenge";

interface Props {
  onPlay: (challenge: DailyChallenge) => void;
  onBack: () => void;
}

export default function DailyChallengeScreen({ onPlay, onBack }: Props) {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await fetchTodayChallenge();
      if (cancelled) return;
      if (!c) setError("Could not load today's challenge");
      else setChallenge(c);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const completed = challenge ? isDailyCompletedToday(challenge.id) : false;

  return (
    <div className="flex flex-col items-center gap-6 px-6 animate-in fade-in duration-500 w-full max-w-[380px]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">
        DAILY CHALLENGE
      </h2>
      <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Resets at UTC midnight</span>

      {loading && <div className="text-muted-foreground text-sm tracking-wider py-8">Loading…</div>}
      {error && <div className="text-destructive text-sm tracking-wider py-8">{error}</div>}

      {challenge && (
        <>
          <div className="w-full neon-border-intense rounded-2xl p-6 bg-accent/5 flex flex-col items-center gap-3">
            <span className="text-5xl">{MODIFIER_INFO[challenge.modifier].icon}</span>
            <div className="text-center">
              <div className="text-xl font-black text-accent text-glow-warning tracking-widest font-[var(--font-display)]">
                {MODIFIER_INFO[challenge.modifier].label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{MODIFIER_INFO[challenge.modifier].desc}</div>
            </div>
            <div className="mt-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/30">
              <span className="text-xs text-primary font-bold tracking-widest font-[var(--font-display)]">
                {challenge.bonus_multiplier}× BONUS POINTS
              </span>
            </div>
          </div>

          {completed && (
            <span className="text-[10px] text-accent tracking-widest uppercase animate-pulse">
              ★ Already played today — try to beat your score
            </span>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onPlay(challenge); }}
            className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-lg tracking-widest uppercase px-12 py-4 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
          >
            START CHALLENGE
          </button>
        </>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onBack(); }}
        className="text-muted-foreground text-xs tracking-widest uppercase hover:text-foreground transition-colors font-[var(--font-display)]"
      >
        ← BACK
      </button>
    </div>
  );
}
