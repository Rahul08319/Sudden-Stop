import { useState } from "react";
import { isPlayablesEnvironment } from "./youtubePlayables";

const TUTORIAL_KEY = "suddenstop_tutorial_seen";

export function hasTutorialBeenSeen(): boolean {
  if (isPlayablesEnvironment()) return true;
  return localStorage.getItem(TUTORIAL_KEY) === "true";
}

export function markTutorialSeen() {
  if (isPlayablesEnvironment()) return;
  localStorage.setItem(TUTORIAL_KEY, "true");
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: "🎯",
      title: "THE GOAL",
      text: "A ball moves back and forth across the track. Your job is to stop it inside the target zone.",
    },
    {
      icon: "👆",
      title: "HOW TO PLAY",
      text: "Tap the screen or press SPACE to stop the ball. Time it perfectly for maximum points!",
    },
    {
      icon: "⭐",
      title: "SCORING",
      text: "PERFECT = 100+ pts, GOOD = 50+ pts. Build combos for bonus multipliers!",
    },
    {
      icon: "🔓",
      title: "UNLOCK SKINS",
      text: "Reach high scores to unlock new ball skins & trail effects. Check the Skins menu!",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLast) {
      markTutorialSeen();
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    markTutorialSeen();
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-center gap-6 px-8 max-w-[320px]">
        {/* Step indicator */}
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/50" : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-6xl animate-in zoom-in duration-300" key={step}>
          {current.icon}
        </div>

        {/* Content */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-300" key={`text-${step}`}>
          <h3 className="text-xl font-black tracking-widest text-primary font-[var(--font-display)] mb-3 text-glow">
            {current.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.text}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-3 w-full mt-2">
          <button
            onClick={handleNext}
            className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm tracking-widest uppercase px-10 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)] w-full"
          >
            {isLast ? "LET'S GO!" : "NEXT"}
          </button>
          {!isLast && (
            <button
              onClick={handleSkip}
              className="text-muted-foreground/50 text-xs tracking-widest uppercase hover:text-muted-foreground transition-colors font-[var(--font-display)]"
            >
              SKIP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
