import { SKINS, getUnlockedSkins, getSelectedSkinId, setSelectedSkinId, type Skin } from "./skins";
import { useState } from "react";

interface SkinsScreenProps {
  highScore: number;
  onBack: () => void;
}

export default function SkinsScreen({ highScore, onBack }: SkinsScreenProps) {
  const [selectedId, setSelectedId] = useState(getSelectedSkinId());
  const unlocked = getUnlockedSkins(highScore);
  const unlockedIds = new Set(unlocked.map(s => s.id));

  const handleSelect = (skin: Skin) => {
    if (!unlockedIds.has(skin.id)) return;
    setSelectedSkinId(skin.id);
    setSelectedId(skin.id);
  };

  return (
    <div className="flex flex-col items-center gap-6 px-4 animate-in fade-in duration-500 w-full max-w-[380px] max-h-[85vh]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">
        SKINS
      </h2>

      <div className="w-full grid grid-cols-2 gap-3 overflow-y-auto max-h-[55vh] pr-1">
        {SKINS.map(skin => {
          const isUnlocked = unlockedIds.has(skin.id);
          const isSelected = skin.id === selectedId;

          return (
            <button
              key={skin.id}
              onClick={(e) => { e.stopPropagation(); handleSelect(skin); }}
              disabled={!isUnlocked}
              className={`relative rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 active:scale-[0.97] ${
                isSelected
                  ? "neon-border-intense bg-primary/15"
                  : isUnlocked
                  ? "neon-border bg-muted/30 hover:bg-muted/50"
                  : "border border-border/30 bg-muted/10 opacity-50 cursor-not-allowed"
              }`}
            >
              {/* Ball preview */}
              <div
                className={`w-10 h-10 ${skin.shape === "diamond" ? "rotate-45 rounded-md" : skin.shape === "star" ? "rounded-sm" : "rounded-full"}`}
                style={{
                  background: skin.color,
                  boxShadow: isUnlocked ? `0 0 20px ${skin.glow}` : "none",
                }}
              />

              <span className={`text-[10px] font-bold tracking-wider font-[var(--font-display)] ${
                isSelected ? "text-primary" : isUnlocked ? "text-foreground" : "text-muted-foreground"
              }`}>
                {skin.name}
              </span>

              <span className="text-[9px] text-muted-foreground">
                {isUnlocked ? skin.description.replace(/Unlocked at .*/, "UNLOCKED") || "DEFAULT" : skin.description}
              </span>

              {isSelected && (
                <span className="absolute top-2 right-2 text-xs text-primary">✓</span>
              )}

              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                  <span className="text-xs text-muted-foreground font-[var(--font-display)] tracking-wider">
                    🔒 {skin.unlockScore}
                  </span>
                </div>
              )}
            </button>
          );
        })}
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
