import { useEffect, useState } from "react";
import { fetchTopScores, fetchDailyTopScores, type CloudScore, getPlayerName, setPlayerName } from "./cloudLeaderboard";
import { fetchTodayChallenge, MODIFIER_INFO, type DailyChallenge } from "./dailyChallenge";
import type { GameMode } from "./SuddenStopGame";

interface Props { onBack: () => void }

const TABS: { key: GameMode | "daily"; label: string }[] = [
  { key: "classic", label: "CLASSIC" },
  { key: "survival", label: "SURVIVAL" },
  { key: "timeattack", label: "TIME ATTACK" },
  { key: "daily", label: "DAILY" },
];

export default function GlobalLeaderboardScreen({ onBack }: Props) {
  const [tab, setTab] = useState<GameMode | "daily">("classic");
  const [entries, setEntries] = useState<CloudScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [name, setNameLocal] = useState(getPlayerName());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      if (tab === "daily") {
        const c = await fetchTodayChallenge();
        if (cancelled) return;
        setChallenge(c);
        if (c) {
          const data = await fetchDailyTopScores(c.id, 10);
          if (!cancelled) setEntries(data);
        } else {
          setEntries([]);
        }
      } else {
        const data = await fetchTopScores(tab, 10);
        if (!cancelled) setEntries(data);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tab]);

  const onNameBlur = () => {
    setPlayerName(name);
    setNameLocal(getPlayerName());
  };

  return (
    <div className="flex flex-col items-center gap-5 px-4 animate-in fade-in duration-500 w-full max-w-[400px] max-h-[85vh]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">
        GLOBAL SCORES
      </h2>

      <div className="w-full flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Name</span>
        <input
          value={name}
          onChange={(e) => setNameLocal(e.target.value.toUpperCase().slice(0, 12))}
          onBlur={onNameBlur}
          onClick={(e) => e.stopPropagation()}
          maxLength={12}
          className="flex-1 bg-muted/30 border border-border rounded-md px-2 py-1 text-sm font-bold text-foreground tracking-widest font-[var(--font-display)] outline-none focus:border-primary"
        />
      </div>

      <div className="flex gap-1 w-full overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={(e) => { e.stopPropagation(); setTab(t.key); }}
            className={`flex-1 min-w-[70px] text-[10px] font-bold tracking-widest px-2 py-2 rounded-md transition-all font-[var(--font-display)] ${
              tab === t.key ? "bg-primary/20 text-primary neon-border" : "bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "daily" && challenge && (
        <div className="w-full neon-border rounded-lg p-3 bg-accent/5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{MODIFIER_INFO[challenge.modifier].icon}</span>
            <div>
              <div className="text-xs text-accent font-bold tracking-widest font-[var(--font-display)]">
                {MODIFIER_INFO[challenge.modifier].label}
              </div>
              <div className="text-[10px] text-muted-foreground">{MODIFIER_INFO[challenge.modifier].desc}</div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col gap-1.5 overflow-y-auto max-h-[45vh] pr-1">
        {loading && (
          <div className="text-center text-muted-foreground py-8 text-sm tracking-wider">Loading…</div>
        )}
        {!loading && entries.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm tracking-wider">
            No scores yet. Be the first!
          </div>
        )}
        {!loading && entries.map((e, i) => (
          <div
            key={e.id}
            className={`flex items-center justify-between py-2 px-3 rounded-lg ${
              i === 0 ? "bg-accent/10 neon-border" : "bg-muted/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold w-6 text-center font-[var(--font-display)] ${
                i === 0 ? "text-accent text-glow-warning" : "text-muted-foreground"
              }`}>
                {i + 1}
              </span>
              <span className="text-sm tracking-wider text-foreground font-[var(--font-display)]">
                {e.player_name}
              </span>
            </div>
            <span className={`text-lg font-bold font-[var(--font-display)] ${
              i === 0 ? "text-accent text-glow-warning" : "text-primary"
            }`}>
              {e.score}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={(ev) => { ev.stopPropagation(); onBack(); }}
        className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-sm tracking-widest uppercase px-10 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
      >
        ← BACK
      </button>
    </div>
  );
}
