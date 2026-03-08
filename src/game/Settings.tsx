import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { GameSettings } from "./useSettings";

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdate: (partial: Partial<GameSettings>) => void;
  onBack: () => void;
}

export default function SettingsScreen({ settings, onUpdate, onBack }: SettingsScreenProps) {
  return (
    <div className="flex flex-col items-center gap-8 px-6 animate-in fade-in duration-500 w-full max-w-[340px]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">
        SETTINGS
      </h2>

      <div className="w-full flex flex-col gap-6">
        {/* Volume */}
        <div className="neon-border rounded-xl p-5 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-foreground tracking-wider uppercase font-[var(--font-display)]">
              Volume
            </span>
            <span className="text-sm text-primary font-bold font-[var(--font-display)]">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <Slider
            value={[settings.volume * 100]}
            onValueChange={([v]) => onUpdate({ volume: v / 100 })}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Haptic */}
        <div className="neon-border rounded-xl p-5 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-foreground tracking-wider uppercase font-[var(--font-display)]">
                Haptics
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                Vibration feedback on hits
              </span>
            </div>
            <Switch
              checked={settings.hapticEnabled}
              onCheckedChange={(checked) => onUpdate({ hapticEnabled: checked })}
            />
          </div>
        </div>
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
