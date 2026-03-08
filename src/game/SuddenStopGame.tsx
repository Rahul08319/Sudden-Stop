import { useState, useRef, useCallback, useEffect } from "react";
import { ParticleExplosion, StreakFlame } from "./Particles";
import { playPerfect, playGood, playMiss, playGameOver, playStart, playLifeLost, playTick, hapticLight, hapticMedium, hapticHeavy, hapticError, setVolume, setHapticEnabled } from "./audio";
import { useSettings } from "./useSettings";
import SettingsScreen from "./Settings";
import LeaderboardScreen, { addLeaderboardEntry } from "./Leaderboard";
import TutorialOverlay, { hasTutorialBeenSeen } from "./Tutorial";
import SkinsScreen from "./SkinsScreen";
import { getSelectedSkin, type Skin } from "./skins";

export type GameMode = "classic" | "survival" | "timeattack";
type ScreenState = "menu" | "modeselect" | "settings" | "leaderboard" | "skins" | "playing" | "result" | "gameover";
type HitResult = "perfect" | "good" | "miss" | null;

const TRACK_WIDTH = 320;
const OBJECT_SIZE = 28;
const INITIAL_SPEED = 3;
const SPEED_INCREMENT = 0.4;
const TARGET_ZONE_WIDTH = 50;
const PERFECT_ZONE_WIDTH = 18;
const ROUNDS_PER_GAME = 10;
const SURVIVAL_LIVES = 3;
const TIMEATTACK_DURATION = 30;

export default function SuddenStopGame() {
  const { settings, updateSettings } = useSettings();
  const [screen, setScreen] = useState<ScreenState>("menu");
  const [mode, setMode] = useState<GameMode>("classic");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("suddenstop_high");
    return saved ? parseInt(saved) : 0;
  });
  const [objectPos, setObjectPos] = useState(0);
  const [targetPos, setTargetPos] = useState(120);
  const [hitResult, setHitResult] = useState<HitResult>(null);
  const [combo, setCombo] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [direction, setDirection] = useState(1);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [particleActive, setParticleActive] = useState(false);
  const [particleKey, setParticleKey] = useState(0);
  const [lives, setLives] = useState(SURVIVAL_LIVES);
  const [timeLeft, setTimeLeft] = useState(TIMEATTACK_DURATION);
  const [showTutorial, setShowTutorial] = useState(!hasTutorialBeenSeen());
  const [activeSkin, setActiveSkin] = useState<Skin>(() => getSelectedSkin(0));

  const animRef = useRef<number>(0);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(INITIAL_SPEED);
  const isPlayingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const livesRef = useRef(SURVIVAL_LIVES);
  const roundRef = useRef(0);

  // Sync settings to audio module
  useEffect(() => {
    setVolume(settings.volume);
    setHapticEnabled(settings.hapticEnabled);
  }, [settings]);

  // Refresh skin when returning from skins screen or when highScore changes
  useEffect(() => {
    setActiveSkin(getSelectedSkin(highScore));
  }, [highScore, screen]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const endGame = useCallback((finalScore: number) => {
    isPlayingRef.current = false;
    cancelAnimationFrame(animRef.current);
    stopTimer();
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem("suddenstop_high", finalScore.toString());
    }
    addLeaderboardEntry({ name: "PLAYER", score: finalScore, mode, date: Date.now() });
    setScreen("gameover");
    playGameOver();
    hapticError();
  }, [highScore, mode, stopTimer]);

  const startRound = useCallback(() => {
    const newTarget = 40 + Math.random() * (TRACK_WIDTH - 80 - TARGET_ZONE_WIDTH);
    setTargetPos(newTarget);
    posRef.current = 0;
    dirRef.current = 1;
    setObjectPos(0);
    setDirection(1);
    setHitResult(null);
    setParticleActive(false);
    isPlayingRef.current = true;

    const animate = () => {
      if (!isPlayingRef.current) return;
      posRef.current += speedRef.current * dirRef.current;
      if (posRef.current >= TRACK_WIDTH - OBJECT_SIZE) {
        posRef.current = TRACK_WIDTH - OBJECT_SIZE;
        dirRef.current = -1;
      } else if (posRef.current <= 0) {
        posRef.current = 0;
        dirRef.current = 1;
      }
      setObjectPos(posRef.current);
      setDirection(dirRef.current);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  }, []);

  const selectMode = useCallback((m: GameMode) => {
    setMode(m);
    setScore(0);
    scoreRef.current = 0;
    setRound(0);
    roundRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    setSpeed(INITIAL_SPEED);
    setLives(SURVIVAL_LIVES);
    livesRef.current = SURVIVAL_LIVES;
    setTimeLeft(TIMEATTACK_DURATION);
    setScreen("playing");
    playStart();
    hapticLight();

    if (m === "timeattack") {
      let t = TIMEATTACK_DURATION;
      timerRef.current = setInterval(() => {
        t--;
        setTimeLeft(t);
        if (t <= 5 && t > 0) playTick();
        if (t <= 0) {
          endGame(scoreRef.current);
        }
      }, 1000);
    }

    setTimeout(() => startRound(), 300);
  }, [startRound, endGame]);

  const handleTap = useCallback(() => {
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;
    cancelAnimationFrame(animRef.current);

    const objCenter = posRef.current + OBJECT_SIZE / 2;
    const targetCenter = targetPos + TARGET_ZONE_WIDTH / 2;
    const distance = Math.abs(objCenter - targetCenter);

    let result: HitResult;
    let points = 0;
    let newCombo = comboRef.current;

    if (distance <= PERFECT_ZONE_WIDTH / 2) {
      result = "perfect";
      newCombo = newCombo + 1;
      points = 100 + newCombo * 25;
      setFlashColor("primary");
      setParticleActive(true);
      setParticleKey(k => k + 1);
      playPerfect();
      hapticHeavy();
    } else if (distance <= TARGET_ZONE_WIDTH / 2) {
      result = "good";
      newCombo = newCombo + 1;
      points = 50 + newCombo * 10;
      setFlashColor("accent");
      setParticleActive(true);
      setParticleKey(k => k + 1);
      playGood();
      hapticMedium();
    } else {
      result = "miss";
      newCombo = 0;
      setShakeScreen(true);
      setFlashColor("destructive");
      playMiss();
      hapticError();
      setTimeout(() => setShakeScreen(false), 400);

      if (mode === "survival") {
        const newLives = livesRef.current - 1;
        livesRef.current = newLives;
        setLives(newLives);
        playLifeLost();
      }
    }

    setHitResult(result);
    comboRef.current = newCombo;
    setCombo(newCombo);
    const newScore = scoreRef.current + points;
    scoreRef.current = newScore;
    setScore(newScore);
    const newRound = roundRef.current + 1;
    roundRef.current = newRound;
    setRound(newRound);

    setTimeout(() => setFlashColor(null), 300);

    setTimeout(() => {
      if (mode === "classic" && newRound >= ROUNDS_PER_GAME) {
        endGame(newScore);
      } else if (mode === "survival" && livesRef.current <= 0) {
        endGame(newScore);
      } else {
        speedRef.current = INITIAL_SPEED + newRound * SPEED_INCREMENT;
        setSpeed(speedRef.current);
        if (mode !== "timeattack") {
          setScreen("result");
          setTimeout(() => {
            setScreen("playing");
            startRound();
          }, 600);
        } else {
          startRound();
        }
      }
    }, mode === "timeattack" ? 300 : 600);
  }, [targetPos, mode, startRound, endGame]);

  useEffect(() => {
    return () => { cancelAnimationFrame(animRef.current); stopTimer(); };
  }, [stopTimer]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (showTutorial) return;
        if (screen === "menu") setScreen("modeselect");
        else if (screen === "modeselect") selectMode("classic");
        else if (screen === "gameover") setScreen("modeselect");
        else if (screen === "playing" && isPlayingRef.current) handleTap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, handleTap, selectMode, showTutorial]);

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen bg-background transition-transform duration-100 ${shakeScreen ? "translate-x-1" : ""}`}
      onClick={() => {
        if (screen === "playing" && isPlayingRef.current) handleTap();
      }}
      onTouchStart={(e) => {
        if (screen === "playing" && isPlayingRef.current) {
          e.preventDefault();
          handleTap();
        }
      }}
    >
      {/* Tutorial overlay */}
      {showTutorial && <TutorialOverlay onComplete={() => setShowTutorial(false)} />}

      {/* Flash overlay */}
      {flashColor && (
        <div
          className={`fixed inset-0 pointer-events-none z-50 transition-opacity duration-300 ${
            flashColor === "primary" ? "bg-primary/10"
              : flashColor === "accent" ? "bg-accent/10"
              : "bg-destructive/10"
          }`}
        />
      )}

      {screen === "menu" && (
        <MenuScreen
          highScore={highScore}
          onStart={() => setScreen("modeselect")}
          onSettings={() => setScreen("settings")}
          onLeaderboard={() => setScreen("leaderboard")}
          onSkins={() => setScreen("skins")}
        />
      )}
      {screen === "modeselect" && <ModeSelectScreen onSelect={selectMode} onBack={() => setScreen("menu")} />}
      {screen === "settings" && <SettingsScreen settings={settings} onUpdate={updateSettings} onBack={() => setScreen("menu")} />}
      {screen === "leaderboard" && <LeaderboardScreen onBack={() => setScreen("menu")} />}
      {screen === "skins" && <SkinsScreen highScore={highScore} onBack={() => setScreen("menu")} />}
      {screen === "gameover" && (
        <GameOverScreen score={score} highScore={highScore} mode={mode} onRestart={() => setScreen("modeselect")} />
      )}
      {(screen === "playing" || screen === "result") && (
        <PlayScreen
          score={score}
          round={round}
          combo={combo}
          speed={speed}
          objectPos={objectPos}
          targetPos={targetPos}
          hitResult={hitResult}
          particleActive={particleActive}
          particleKey={particleKey}
          mode={mode}
          lives={lives}
          timeLeft={timeLeft}
          skin={activeSkin}
        />
      )}
    </div>
  );
}

/* ---- MENU ---- */
function MenuScreen({ highScore, onStart, onSettings, onLeaderboard, onSkins }: {
  highScore: number; onStart: () => void; onSettings: () => void; onLeaderboard: () => void; onSkins: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-7 px-6 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-wider text-primary text-glow mb-2">
          SUDDEN
        </h1>
        <h1 className="text-5xl sm:text-6xl font-black tracking-widest text-foreground text-glow mb-4">
          STOP
        </h1>
        <div className="w-32 h-1 bg-primary mx-auto rounded-full shadow-[0_0_15px_hsl(var(--game-neon)/0.6)]" />
      </div>

      <p className="text-muted-foreground text-center text-sm max-w-[260px] leading-relaxed">
        The object moves fast. Tap at the exact target zone. Precision is everything.
      </p>

      {highScore > 0 && (
        <div className="neon-border rounded-lg px-6 py-3 bg-muted/30">
          <span className="text-xs text-muted-foreground tracking-widest uppercase">Best</span>
          <span className="text-2xl font-bold text-primary ml-3 font-[var(--font-display)]">{highScore}</span>
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onStart(); }}
        className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-lg tracking-widest uppercase px-12 py-4 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
      >
        PLAY
      </button>

      <div className="flex gap-3 flex-wrap justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); onLeaderboard(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-xs tracking-widest uppercase px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
        >
          🏆 SCORES
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSkins(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-xs tracking-widest uppercase px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
        >
          🎨 SKINS
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSettings(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-xs tracking-widest uppercase px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
        >
          ⚙ SETTINGS
        </button>
      </div>

      <span className="text-muted-foreground/50 text-xs tracking-wider">TAP or SPACE to play</span>
    </div>
  );
}

/* ---- MODE SELECT ---- */
function ModeSelectScreen({ onSelect, onBack }: { onSelect: (m: GameMode) => void; onBack: () => void }) {
  const modes: { mode: GameMode; label: string; desc: string; icon: string }[] = [
    { mode: "classic", label: "CLASSIC", desc: `${ROUNDS_PER_GAME} rounds, increasing speed`, icon: "🎯" },
    { mode: "survival", label: "SURVIVAL", desc: `${SURVIVAL_LIVES} lives, endless rounds`, icon: "❤️" },
    { mode: "timeattack", label: "TIME ATTACK", desc: `${TIMEATTACK_DURATION}s to score max`, icon: "⏱" },
  ];

  return (
    <div className="flex flex-col items-center gap-6 px-6 animate-in fade-in duration-500 w-full max-w-[340px]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">
        SELECT MODE
      </h2>

      <div className="flex flex-col gap-3 w-full">
        {modes.map(({ mode, label, desc, icon }) => (
          <button
            key={mode}
            onClick={(e) => { e.stopPropagation(); onSelect(mode); }}
            className="neon-border bg-muted/30 hover:bg-primary/10 text-left p-4 rounded-xl transition-all duration-200 active:scale-[0.98] group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <span className="text-sm font-bold text-foreground tracking-widest group-hover:text-primary transition-colors font-[var(--font-display)]">
                  {label}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onBack(); }}
        className="text-muted-foreground text-xs tracking-widest uppercase hover:text-foreground transition-colors font-[var(--font-display)] mt-2"
      >
        ← BACK
      </button>
    </div>
  );
}

/* ---- GAME OVER ---- */
function GameOverScreen({ score, highScore, mode, onRestart }: { score: number; highScore: number; mode: GameMode; onRestart: () => void }) {
  const isNewBest = score >= highScore && score > 0;
  const modeLabel = mode === "classic" ? "CLASSIC" : mode === "survival" ? "SURVIVAL" : "TIME ATTACK";

  return (
    <div className="flex flex-col items-center gap-6 px-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">
        GAME OVER
      </h2>
      <span className="text-xs text-primary tracking-widest uppercase font-[var(--font-display)]">{modeLabel}</span>

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Score</span>
        <span className={`text-5xl font-black font-[var(--font-display)] ${isNewBest ? "text-accent text-glow-warning" : "text-primary text-glow"}`}>
          {score}
        </span>
        {isNewBest && (
          <span className="text-accent text-xs tracking-widest uppercase animate-pulse">★ NEW BEST ★</span>
        )}
      </div>

      <div className="neon-border rounded-lg px-6 py-2 bg-muted/30">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Best</span>
        <span className="text-xl font-bold text-primary ml-3 font-[var(--font-display)]">{highScore}</span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onRestart(); }}
        className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-lg tracking-widest uppercase px-12 py-4 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)] mt-2"
      >
        RETRY
      </button>
    </div>
  );
}

/* ---- PLAY SCREEN ---- */
function PlayScreen({
  score, round, combo, speed, objectPos, targetPos, hitResult, particleActive, particleKey, mode, lives, timeLeft, skin,
}: {
  score: number; round: number; combo: number; speed: number; objectPos: number; targetPos: number;
  hitResult: HitResult; particleActive: boolean; particleKey: number; mode: GameMode; lives: number; timeLeft: number;
  skin: Skin;
}) {
  const ballShape = skin.shape === "diamond"
    ? "rotate-45 rounded-sm"
    : skin.shape === "star"
    ? "rounded-sm rotate-[22deg]"
    : "rounded-full";

  const ballStyle: React.CSSProperties = hitResult
    ? hitResult === "miss"
      ? { background: "hsl(0 85% 55%)", boxShadow: "0 0 15px hsl(0 85% 55% / 0.6)" }
      : { background: skin.color, boxShadow: `0 0 20px ${skin.glow}` }
    : { background: skin.color, boxShadow: `0 0 15px ${skin.glow}` };

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-[380px]">
      {/* HUD */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Score</span>
          <span className="text-2xl font-bold text-primary font-[var(--font-display)] text-glow">{score}</span>
        </div>
        <div className="flex flex-col items-center">
          {mode === "classic" && (
            <>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Round</span>
              <span className="text-lg font-bold text-foreground font-[var(--font-display)]">{round + 1}/{ROUNDS_PER_GAME}</span>
            </>
          )}
          {mode === "survival" && (
            <>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Lives</span>
              <span className="text-lg font-bold text-destructive font-[var(--font-display)]">
                {"❤️".repeat(lives)}{"🖤".repeat(Math.max(0, SURVIVAL_LIVES - lives))}
              </span>
            </>
          )}
          {mode === "timeattack" && (
            <>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Time</span>
              <span className={`text-lg font-bold font-[var(--font-display)] ${timeLeft <= 5 ? "text-destructive animate-pulse text-glow-danger" : "text-foreground"}`}>
                {timeLeft}s
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col items-end">
          {combo > 1 && (
            <>
              <span className="text-[10px] text-accent tracking-widest uppercase">Combo</span>
              <span className="text-2xl font-bold text-accent font-[var(--font-display)] text-glow-warning">x{combo}</span>
            </>
          )}
        </div>
      </div>

      {/* Speed indicator */}
      <div className="flex items-center gap-2 w-full">
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Speed</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-destructive rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, ((speed - INITIAL_SPEED) / (INITIAL_SPEED * 3)) * 100 + 15)}%` }}
          />
        </div>
      </div>

      {/* Track */}
      <div className="relative w-[320px] h-20 bg-muted/50 rounded-2xl overflow-hidden border border-border">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: `${(i + 1) * (320 / 17)}px` }} />
        ))}

        {/* Target zone */}
        <div
          className={`absolute top-0 bottom-0 rounded-lg transition-colors duration-200 ${
            hitResult === "perfect" ? "bg-primary/40 shadow-[0_0_30px_hsl(var(--game-neon)/0.5)]"
              : hitResult === "good" ? "bg-accent/30"
              : hitResult === "miss" ? "bg-destructive/20"
              : "bg-primary/15 border border-primary/30"
          }`}
          style={{ left: targetPos, width: TARGET_ZONE_WIDTH }}
        >
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-0.5 bg-primary/60" />
        </div>

        <StreakFlame combo={combo} objectPos={objectPos} />

        {particleActive && hitResult && hitResult !== "miss" && (
          <ParticleExplosion key={particleKey} x={objectPos + OBJECT_SIZE / 2} y={40} type={hitResult as "perfect" | "good"} active={true} />
        )}

        {/* Moving object with skin */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 transition-none ${ballShape}`}
          style={{ left: objectPos, width: OBJECT_SIZE, height: OBJECT_SIZE, ...ballStyle }}
        >
          {combo >= 3 && !hitResult && (
            <div className={`absolute inset-0 animate-pulse ${ballShape}`} style={{
              background: combo >= 5
                ? 'radial-gradient(circle, hsl(50 100% 70% / 0.4), transparent)'
                : 'radial-gradient(circle, hsl(35 100% 60% / 0.3), transparent)',
            }} />
          )}
        </div>
      </div>

      {/* Result text */}
      <div className="h-10 flex items-center justify-center">
        {hitResult === "perfect" && <span className="text-primary text-2xl font-black tracking-widest text-glow animate-in zoom-in duration-200 font-[var(--font-display)]">PERFECT!</span>}
        {hitResult === "good" && <span className="text-accent text-xl font-bold tracking-widest text-glow-warning animate-in zoom-in duration-200 font-[var(--font-display)]">GOOD</span>}
        {hitResult === "miss" && <span className="text-destructive text-xl font-bold tracking-widest text-glow-danger animate-in zoom-in duration-200 font-[var(--font-display)]">MISS</span>}
        {!hitResult && <span className="text-muted-foreground/60 text-sm tracking-widest animate-pulse">TAP NOW</span>}
      </div>
    </div>
  );
}
