import { POWERUPS, POWERUP_SPAWN_CHANCE, type PowerUp } from "./powerups";

interface Props {
  onClose: () => void;
}

export default function PowerUpGuide({ onClose }: Props) {
  const items = Object.values(POWERUPS);
  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="neon-border-intense bg-card rounded-2xl p-5 w-full max-w-[360px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-black tracking-widest text-primary text-glow font-[var(--font-display)]">POWER-UPS</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none px-2"
            aria-label="Close power-up guide"
          >×</button>
        </div>
        <p className="text-[11px] text-muted-foreground tracking-wide mb-4 leading-relaxed">
          Power-ups spawn randomly (~{Math.round(POWERUP_SPAWN_CHANCE * 100)}% per round). Each one consumes on your next successful hit.
        </p>
        <div className="flex flex-col gap-2">
          {items.map((pu) => (
            <PowerUpRow key={pu.type} pu={pu} />
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full neon-border bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs tracking-widest uppercase py-2.5 rounded-xl transition-all active:scale-95 font-[var(--font-display)]"
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}

function PowerUpRow({ pu }: { pu: PowerUp }) {
  return (
    <div className="flex items-start gap-3 neon-border bg-muted/20 rounded-lg p-3">
      <span className="text-2xl leading-none mt-0.5">{pu.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold tracking-widest text-accent font-[var(--font-display)]">{pu.label}</div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{pu.description}</p>
      </div>
    </div>
  );
}

/** Compact in-game panel — shows current active power-up with extended detail. */
export function ActiveModifierPanel({
  activePowerUp,
  dailyLabel,
  dailyIcon,
  dailyDesc,
}: {
  activePowerUp: PowerUp | null;
  dailyLabel?: string | null;
  dailyIcon?: string | null;
  dailyDesc?: string | null;
}) {
  if (!activePowerUp && !dailyLabel) return null;
  return (
    <div className="w-full flex flex-col gap-1.5">
      {dailyLabel && (
        <div className="flex items-center gap-2 neon-border bg-accent/5 rounded-lg px-3 py-1.5">
          <span className="text-base">{dailyIcon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-accent font-bold tracking-widest font-[var(--font-display)]">DAILY · {dailyLabel}</div>
            {dailyDesc && <div className="text-[9px] text-muted-foreground truncate">{dailyDesc}</div>}
          </div>
        </div>
      )}
      {activePowerUp && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/40 rounded-lg px-3 py-1.5 animate-in fade-in slide-in-from-left-1 duration-300">
          <span className="text-base">{activePowerUp.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-primary font-bold tracking-widest font-[var(--font-display)]">{activePowerUp.label} · ACTIVE</div>
            <div className="text-[9px] text-muted-foreground truncate">{activePowerUp.description}</div>
          </div>
        </div>
      )}
    </div>
  );
}
