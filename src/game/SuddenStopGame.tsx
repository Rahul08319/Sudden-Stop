import { useState, useRef, useCallback, useEffect } from "react";
import { ParticleExplosion, StreakFlame } from "./Particles";
import { playPerfect, playGood, playMiss, playGameOver, playStart, playLifeLost, playTick, hapticLight, hapticMedium, hapticHeavy, hapticError, setVolume, setHapticEnabled } from "./audio";
import { useSettings } from "./useSettings";
import SettingsScreen from "./Settings";
import LeaderboardScreen, { addLeaderboardEntry } from "./Leaderboard";
import GlobalLeaderboardScreen from "./GlobalLeaderboard";
import DailyChallengeScreen from "./DailyChallengeScreen";
import TutorialOverlay, { hasTutorialBeenSeen } from "./Tutorial";
import SkinsScreen from "./SkinsScreen";
import { getSelectedSkin, type Skin } from "./skins";
import { submitScoreQueued } from "./offlineQueue";
import { type DailyChallenge, type DailyModifier, MODIFIER_INFO, markDailyCompleted } from "./dailyChallenge";
import { rollRandomPowerUp, type PowerUp } from "./powerups";
import PowerUpGuide, { ActiveModifierPanel } from "./PowerUpGuide";
import DailyResultScreen, { recordDailyPB } from "./DailyResultScreen";

export type GameMode = "classic" | "survival" | "timeattack";
type ScreenState = "menu" | "modeselect" | "settings" | "leaderboard" | "globalLeaderboard" | "daily" | "skins" | "playing" | "result" | "gameover" | "dailyresult";
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
  const [isDaily, setIsDaily] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
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
  const [activePowerUp, setActivePowerUp] = useState<PowerUp | null>(null);
  const [powerUpToast, setPowerUpToast] = useState<PowerUp | null>(null);
  const [showPowerUpGuide, setShowPowerUpGuide] = useState(false);
  const [dailyResult, setDailyResult] = useState<{ score: number; isNewBest: boolean; previousBest: number; pendingSync: boolean; challenge: DailyChallenge } | null>(null);

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
  const activePowerUpRef = useRef<PowerUp | null>(null);
  const dailyRef = useRef<DailyChallenge | null>(null);
  const isDailyRef = useRef(false);

  // Sync settings to audio module
  useEffect(() => {
    setVolume(settings.volume);
    setHapticEnabled(settings.hapticEnabled);
  }, [settings]);

  useEffect(() => {
    setActiveSkin(getSelectedSkin(highScore));
  }, [highScore, screen]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Compute effective target zone width (modifiers + power-ups)
  const getZoneWidth = useCallback(() => {
    let w = TARGET_ZONE_WIDTH;
    const mod = dailyRef.current?.modifier;
    if (isDailyRef.current && mod === "tiny_zone") w *= 0.5;
    if (activePowerUpRef.current?.type === "wider_zone") w *= 1.6;
    return w;
  }, []);

  const getPerfectWidth = useCallback(() => {
    return PERFECT_ZONE_WIDTH * (getZoneWidth() / TARGET_ZONE_WIDTH);
  }, [getZoneWidth]);

  const endGame = useCallback(async (finalScore: number) => {
    isPlayingRef.current = false;
    cancelAnimationFrame(animRef.current);
    stopTimer();
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem("suddenstop_high", finalScore.toString());
    }
    const wasDaily = isDailyRef.current;
    const dailyId = dailyRef.current?.id ?? null;
    addLeaderboardEntry({ name: "PLAYER", score: finalScore, mode, date: Date.now() });
    setScreen("gameover");
    playGameOver();
    hapticError();
    // Submit to cloud (fire and forget)
    submitScore(finalScore, wasDaily ? "daily" : mode, wasDaily ? dailyId : null).catch(() => {});
    if (wasDaily && dailyId) markDailyCompleted(dailyId, finalScore);
  }, [highScore, mode, stopTimer]);

  const startRound = useCallback(() => {
    const zoneW = getZoneWidth();
    const newTarget = 40 + Math.random() * (TRACK_WIDTH - 80 - zoneW);
    setTargetPos(newTarget);

    // Roll a power-up for next round (only if none active)
    if (!activePowerUpRef.current) {
      const pu = rollRandomPowerUp();
      if (pu) {
        activePowerUpRef.current = pu;
        setActivePowerUp(pu);
        setPowerUpToast(pu);
        setTimeout(() => setPowerUpToast(null), 1400);
        hapticLight();
      }
    }

    // Apply slow-motion power-up
    const baseSpeed = speedRef.current;
    const effSpeed = activePowerUpRef.current?.type === "slow_motion" ? baseSpeed * 0.5 : baseSpeed;

    // Mirror track modifier: start moving left
    const startDir = isDailyRef.current && dailyRef.current?.modifier === "mirror_track" ? -1 : 1;
    const startPos = startDir === -1 ? TRACK_WIDTH - OBJECT_SIZE : 0;

    posRef.current = startPos;
    dirRef.current = startDir;
    setObjectPos(startPos);
    setDirection(startDir);
    setHitResult(null);
    setParticleActive(false);
    isPlayingRef.current = true;

    const animate = () => {
      if (!isPlayingRef.current) return;
      posRef.current += effSpeed * dirRef.current;
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
  }, [getZoneWidth]);

  const startGame = useCallback((m: GameMode, daily: DailyChallenge | null = null) => {
    setMode(m);
    setIsDaily(!!daily);
    setDailyChallenge(daily);
    isDailyRef.current = !!daily;
    dailyRef.current = daily;
    setScore(0);
    scoreRef.current = 0;
    setRound(0);
    roundRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    setActivePowerUp(null);
    activePowerUpRef.current = null;

    let baseSpeed = INITIAL_SPEED;
    if (daily?.modifier === "double_speed") baseSpeed *= 2;
    speedRef.current = baseSpeed;
    setSpeed(baseSpeed);

    // Daily one_shot = single life endless
    let startLives = SURVIVAL_LIVES;
    if (daily?.modifier === "one_shot") startLives = 1;
    setLives(startLives);
    livesRef.current = startLives;
    setTimeLeft(TIMEATTACK_DURATION);
    setScreen("playing");
    if (!(daily?.modifier === "silent_mode")) playStart();
    hapticLight();

    if (m === "timeattack") {
      let t = TIMEATTACK_DURATION;
      timerRef.current = setInterval(() => {
        t--;
        setTimeLeft(t);
        if (t <= 5 && t > 0 && !(daily?.modifier === "silent_mode")) playTick();
        if (t <= 0) endGame(scoreRef.current);
      }, 1000);
    }

    setTimeout(() => startRound(), 300);
  }, [startRound, endGame]);

  const selectMode = useCallback((m: GameMode) => {
    startGame(m, null);
  }, [startGame]);

  const startDailyChallenge = useCallback((c: DailyChallenge) => {
    // Daily uses survival-style (one_shot) or default classic-endless
    const baseMode: GameMode = c.modifier === "one_shot" ? "survival" : "survival";
    startGame(baseMode, c);
  }, [startGame]);

  const handleTap = useCallback(() => {
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;
    cancelAnimationFrame(animRef.current);

    const zoneW = getZoneWidth();
    const perfectW = getPerfectWidth();
    const objCenter = posRef.current + OBJECT_SIZE / 2;
    const targetCenter = targetPos + zoneW / 2;
    let distance = Math.abs(objCenter - targetCenter);

    // Magnet power-up: snap distance toward zone
    if (activePowerUpRef.current?.type === "magnet" && distance < zoneW) {
      distance = Math.min(distance, perfectW * 0.4);
    }

    const silent = isDailyRef.current && dailyRef.current?.modifier === "silent_mode";
    const reverseCombo = isDailyRef.current && dailyRef.current?.modifier === "reverse_combo";
    const dailyMult = isDailyRef.current ? Number(dailyRef.current?.bonus_multiplier ?? 1) : 1;
    const pointsMult = (activePowerUpRef.current?.type === "double_points" ? 2 : 1) * dailyMult;

    let result: HitResult;
    let points = 0;
    let newCombo = comboRef.current;
    let consumePowerUp = false;

    if (distance <= perfectW / 2) {
      result = "perfect";
      newCombo = newCombo + 1;
      points = Math.round((100 + newCombo * 25) * pointsMult);
      setFlashColor("primary");
      setParticleActive(true);
      setParticleKey(k => k + 1);
      if (!silent) playPerfect();
      hapticHeavy();
      consumePowerUp = !!activePowerUpRef.current;
    } else if (distance <= zoneW / 2) {
      result = "good";
      newCombo = newCombo + 1;
      points = Math.round((50 + newCombo * 10) * pointsMult);
      setFlashColor("accent");
      setParticleActive(true);
      setParticleKey(k => k + 1);
      if (!silent) playGood();
      hapticMedium();
      consumePowerUp = !!activePowerUpRef.current;
    } else {
      result = "miss";
      newCombo = 0;
      setShakeScreen(true);
      setFlashColor("destructive");
      if (!silent) playMiss();
      hapticError();
      setTimeout(() => setShakeScreen(false), 400);

      const losesLife = mode === "survival" || (isDailyRef.current && dailyRef.current?.modifier === "one_shot");
      if (losesLife) {
        const newLives = livesRef.current - 1;
        livesRef.current = newLives;
        setLives(newLives);
        if (!silent) playLifeLost();
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

    if (consumePowerUp) {
      activePowerUpRef.current = null;
      setActivePowerUp(null);
    }

    setTimeout(() => setFlashColor(null), 300);

    setTimeout(() => {
      const dailyEndless = isDailyRef.current; // daily is endless until life lost
      const classicEnd = mode === "classic" && !dailyEndless && newRound >= ROUNDS_PER_GAME;
      const survivalEnd = (mode === "survival" || dailyEndless) && livesRef.current <= 0;

      if (classicEnd || survivalEnd) {
        endGame(newScore);
      } else {
        // Speed scaling
        const baseInc = reverseCombo ? -SPEED_INCREMENT * 0.5 : SPEED_INCREMENT;
        const baseInit = isDailyRef.current && dailyRef.current?.modifier === "double_speed" ? INITIAL_SPEED * 2 : INITIAL_SPEED;
        speedRef.current = Math.max(1.5, baseInit + newRound * baseInc);
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
  }, [targetPos, mode, startRound, endGame, getZoneWidth, getPerfectWidth]);

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
        else if (screen === "gameover") setScreen("menu");
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
      {showTutorial && <TutorialOverlay onComplete={() => setShowTutorial(false)} />}

      {flashColor && (
        <div
          className={`fixed inset-0 pointer-events-none z-50 transition-opacity duration-300 ${
            flashColor === "primary" ? "bg-primary/10"
              : flashColor === "accent" ? "bg-accent/10"
              : "bg-destructive/10"
          }`}
        />
      )}

      {/* Power-up toast */}
      {powerUpToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 neon-border-intense bg-accent/10 px-5 py-2 rounded-full flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-2xl">{powerUpToast.icon}</span>
          <span className="text-xs font-bold tracking-widest text-accent text-glow-warning font-[var(--font-display)]">
            {powerUpToast.label}
          </span>
        </div>
      )}

      {screen === "menu" && (
        <MenuScreen
          highScore={highScore}
          onStart={() => setScreen("modeselect")}
          onSettings={() => setScreen("settings")}
          onLeaderboard={() => setScreen("globalLeaderboard")}
          onLocal={() => setScreen("leaderboard")}
          onSkins={() => setScreen("skins")}
          onDaily={() => setScreen("daily")}
        />
      )}
      {screen === "modeselect" && <ModeSelectScreen onSelect={selectMode} onBack={() => setScreen("menu")} />}
      {screen === "settings" && <SettingsScreen settings={settings} onUpdate={updateSettings} onBack={() => setScreen("menu")} />}
      {screen === "leaderboard" && <LeaderboardScreen onBack={() => setScreen("menu")} />}
      {screen === "globalLeaderboard" && <GlobalLeaderboardScreen onBack={() => setScreen("menu")} />}
      {screen === "daily" && <DailyChallengeScreen onPlay={startDailyChallenge} onBack={() => setScreen("menu")} />}
      {screen === "skins" && <SkinsScreen highScore={highScore} onBack={() => setScreen("menu")} />}
      {screen === "gameover" && (
        <GameOverScreen
          score={score}
          highScore={highScore}
          mode={mode}
          isDaily={isDaily}
          dailyMod={dailyChallenge?.modifier ?? null}
          onRestart={() => setScreen(isDaily ? "daily" : "modeselect")}
          onMenu={() => setScreen("menu")}
        />
      )}
      {(screen === "playing" || screen === "result") && (
        <PlayScreen
          score={score}
          round={round}
          combo={combo}
          speed={speed}
          objectPos={objectPos}
          targetPos={targetPos}
          targetWidth={getZoneWidth()}
          hitResult={hitResult}
          particleActive={particleActive}
          particleKey={particleKey}
          mode={mode}
          lives={lives}
          timeLeft={timeLeft}
          skin={activeSkin}
          isDaily={isDaily}
          dailyMod={dailyChallenge?.modifier ?? null}
          activePowerUp={activePowerUp}
        />
      )}
    </div>
  );
}

/* ---- MENU ---- */
function MenuScreen({ highScore, onStart, onSettings, onLeaderboard, onLocal, onSkins, onDaily }: {
  highScore: number; onStart: () => void; onSettings: () => void; onLeaderboard: () => void; onLocal: () => void; onSkins: () => void; onDaily: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 animate-in fade-in duration-500">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-wider text-primary text-glow mb-2">SUDDEN</h1>
        <h1 className="text-5xl sm:text-6xl font-black tracking-widest text-foreground text-glow mb-4">STOP</h1>
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

      <button
        onClick={(e) => { e.stopPropagation(); onDaily(); }}
        className="neon-border bg-accent/10 hover:bg-accent/20 text-accent font-bold text-sm tracking-widest uppercase px-8 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
      >
        ⭐ DAILY CHALLENGE
      </button>

      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={(e) => { e.stopPropagation(); onLeaderboard(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          🌍 GLOBAL
        </button>
        <button onClick={(e) => { e.stopPropagation(); onLocal(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          🏆 LOCAL
        </button>
        <button onClick={(e) => { e.stopPropagation(); onSkins(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          🎨 SKINS
        </button>
        <button onClick={(e) => { e.stopPropagation(); onSettings(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
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
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">SELECT MODE</h2>
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
function GameOverScreen({ score, highScore, mode, isDaily, dailyMod, onRestart, onMenu }: {
  score: number; highScore: number; mode: GameMode; isDaily: boolean; dailyMod: DailyModifier | null; onRestart: () => void; onMenu: () => void;
}) {
  const isNewBest = score >= highScore && score > 0;
  const modeLabel = isDaily ? `DAILY · ${dailyMod ? MODIFIER_INFO[dailyMod].label : ""}` : (mode === "classic" ? "CLASSIC" : mode === "survival" ? "SURVIVAL" : "TIME ATTACK");

  return (
    <div className="flex flex-col items-center gap-6 px-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">GAME OVER</h2>
      <span className="text-xs text-primary tracking-widest uppercase font-[var(--font-display)]">{modeLabel}</span>

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Score</span>
        <span className={`text-5xl font-black font-[var(--font-display)] ${isNewBest ? "text-accent text-glow-warning" : "text-primary text-glow"}`}>
          {score}
        </span>
        {isNewBest && <span className="text-accent text-xs tracking-widest uppercase animate-pulse">★ NEW BEST ★</span>}
      </div>

      <div className="neon-border rounded-lg px-6 py-2 bg-muted/30">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Best</span>
        <span className="text-xl font-bold text-primary ml-3 font-[var(--font-display)]">{highScore}</span>
      </div>

      <span className="text-[10px] text-muted-foreground tracking-widest">Score submitted to global leaderboard</span>

      <div className="flex gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); onRestart(); }}
          className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-base tracking-widest uppercase px-8 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
        >
          RETRY
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-base tracking-widest uppercase px-8 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
        >
          MENU
        </button>
      </div>
    </div>
  );
}

/* ---- PLAY SCREEN ---- */
function PlayScreen({
  score, round, combo, speed, objectPos, targetPos, targetWidth, hitResult, particleActive, particleKey, mode, lives, timeLeft, skin, isDaily, dailyMod, activePowerUp,
}: {
  score: number; round: number; combo: number; speed: number; objectPos: number; targetPos: number; targetWidth: number;
  hitResult: HitResult; particleActive: boolean; particleKey: number; mode: GameMode; lives: number; timeLeft: number;
  skin: Skin; isDaily: boolean; dailyMod: DailyModifier | null; activePowerUp: PowerUp | null;
}) {
  const ballShape = skin.shape === "diamond" ? "rotate-45 rounded-sm" : skin.shape === "star" ? "rounded-sm rotate-[22deg]" : "rounded-full";
  const ballStyle: React.CSSProperties = hitResult
    ? hitResult === "miss"
      ? { background: "hsl(0 85% 55%)", boxShadow: "0 0 15px hsl(0 85% 55% / 0.6)" }
      : { background: skin.color, boxShadow: `0 0 20px ${skin.glow}` }
    : { background: skin.color, boxShadow: `0 0 15px ${skin.glow}` };

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-[380px]">
      {/* Daily challenge banner */}
      {isDaily && dailyMod && (
        <div className="w-full flex items-center justify-center gap-2 neon-border bg-accent/5 rounded-lg px-3 py-1.5">
          <span className="text-base">{MODIFIER_INFO[dailyMod].icon}</span>
          <span className="text-[10px] text-accent font-bold tracking-widest font-[var(--font-display)]">
            DAILY · {MODIFIER_INFO[dailyMod].label}
          </span>
        </div>
      )}

      {/* HUD */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Score</span>
          <span className="text-2xl font-bold text-primary font-[var(--font-display)] text-glow">{score}</span>
        </div>
        <div className="flex flex-col items-center">
          {mode === "classic" && !isDaily && (
            <>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Round</span>
              <span className="text-lg font-bold text-foreground font-[var(--font-display)]">{round + 1}/{ROUNDS_PER_GAME}</span>
            </>
          )}
          {(mode === "survival" || isDaily) && (
            <>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Lives</span>
              <span className="text-lg font-bold text-destructive font-[var(--font-display)]">
                {"❤️".repeat(Math.max(0, lives))}
              </span>
            </>
          )}
          {mode === "timeattack" && !isDaily && (
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

      {/* Active power-up indicator */}
      {activePowerUp && (
        <div className="w-full flex items-center justify-center gap-2 bg-accent/10 border border-accent/40 rounded-full px-3 py-1">
          <span className="text-base">{activePowerUp.icon}</span>
          <span className="text-[10px] text-accent font-bold tracking-widest font-[var(--font-display)]">
            {activePowerUp.label} ACTIVE
          </span>
        </div>
      )}

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

        <div
          className={`absolute top-0 bottom-0 rounded-lg transition-colors duration-200 ${
            hitResult === "perfect" ? "bg-primary/40 shadow-[0_0_30px_hsl(var(--game-neon)/0.5)]"
              : hitResult === "good" ? "bg-accent/30"
              : hitResult === "miss" ? "bg-destructive/20"
              : "bg-primary/15 border border-primary/30"
          }`}
          style={{ left: targetPos, width: targetWidth }}
        >
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-0.5 bg-primary/60" />
        </div>

        <StreakFlame combo={combo} objectPos={objectPos} />

        {particleActive && hitResult && hitResult !== "miss" && (
          <ParticleExplosion key={particleKey} x={objectPos + OBJECT_SIZE / 2} y={40} type={hitResult as "perfect" | "good"} active={true} />
        )}

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

      <div className="h-10 flex items-center justify-center">
        {hitResult === "perfect" && <span className="text-primary text-2xl font-black tracking-widest text-glow animate-in zoom-in duration-200 font-[var(--font-display)]">PERFECT!</span>}
        {hitResult === "good" && <span className="text-accent text-xl font-bold tracking-widest text-glow-warning animate-in zoom-in duration-200 font-[var(--font-display)]">GOOD</span>}
        {hitResult === "miss" && <span className="text-destructive text-xl font-bold tracking-widest text-glow-danger animate-in zoom-in duration-200 font-[var(--font-display)]">MISS</span>}
        {!hitResult && <span className="text-muted-foreground/60 text-sm tracking-widest animate-pulse">TAP NOW</span>}
      </div>
    </div>
  );
}
