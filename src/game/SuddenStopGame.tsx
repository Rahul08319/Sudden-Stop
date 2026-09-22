import { useState, useRef, useCallback, useEffect } from "react";
import { ParticleExplosion, StreakFlame } from "./Particles";
import { playPerfect, playGood, playMiss, playGameOver, playStart, playLifeLost, playTick, hapticLight, hapticMedium, hapticHeavy, hapticError, setVolume, setHapticEnabled } from "./audio";
import { useSettings } from "./useSettings";
import SettingsScreen from "./Settings";
import LeaderboardScreen, { addLeaderboardEntry } from "./Leaderboard";
import GlobalLeaderboardScreen from "./GlobalLeaderboard";
import DailyChallengeScreen from "./DailyChallengeScreen";
import TutorialOverlay, { hasTutorialBeenSeen, markTutorialSeen } from "./Tutorial";
import SkinsScreen from "./SkinsScreen";
import { getSelectedSkin, type Skin } from "./skins";
import { submitScoreQueued } from "./offlineQueue";
import { type DailyChallenge, type DailyModifier, MODIFIER_INFO, markDailyCompleted } from "./dailyChallenge";
import { rollRandomPowerUp, type PowerUp } from "./powerups";
import PowerUpGuide, { ActiveModifierPanel } from "./PowerUpGuide";
import DailyResultScreen, { recordDailyPB } from "./DailyResultScreen";
import { createRunSeed, loadBestGhost, saveBestGhost, seededRandom, type GhostRun } from "./ghostReplay";
import { getWeeklyChallenge, type WeeklyChallenge } from "./weeklyChallenge";
import {
  applyPlayablesLocale,
  isPlayablesEnvironment,
  loadPersistedGame,
  savePersistedGame,
  sendBestScore,
  subscribeToPlayablesSystem,
  requestPlayablesInterstitialAd,
  requestPlayablesRewardedAd,
  openYouTubeContent,
} from "./youtubePlayables";
import { toast } from "sonner";

export type GameMode = "classic" | "survival" | "timeattack" | "practice";
type ScreenState = "menu" | "modeselect" | "practice" | "weekly" | "settings" | "leaderboard" | "globalLeaderboard" | "daily" | "skins" | "playing" | "result" | "gameover" | "dailyresult";
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
  const inPlayables = isPlayablesEnvironment();
  const [screen, setScreen] = useState<ScreenState>("menu");
  const [mode, setMode] = useState<GameMode>("classic");
  const [isDaily, setIsDaily] = useState(false);
  const [isWeekly, setIsWeekly] = useState(false);
  const [isGhostReplay, setIsGhostReplay] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = isPlayablesEnvironment() ? null : localStorage.getItem("suddenstop_high");
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
  const [playablesAudioEnabled, setPlayablesAudioEnabled] = useState(true);
  const [isSystemPaused, setIsSystemPaused] = useState(false);
  const [cloudSaveLoaded, setCloudSaveLoaded] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!hasTutorialBeenSeen());
  const [activeSkin, setActiveSkin] = useState<Skin>(() => getSelectedSkin(0));
  const [activePowerUp, setActivePowerUp] = useState<PowerUp | null>(null);
  const [powerUpToast, setPowerUpToast] = useState<PowerUp | null>(null);
  const [showPowerUpGuide, setShowPowerUpGuide] = useState(false);
  const [dailyResult, setDailyResult] = useState<{ score: number; isNewBest: boolean; previousBest: number; pendingSync: boolean; challenge: DailyChallenge } | null>(null);
  const [bestGhost, setBestGhost] = useState<GhostRun | null>(loadBestGhost);
  const [trackScale, setTrackScale] = useState(1);
  const [canRevive, setCanRevive] = useState(true);
  const [isAdLoading, setIsAdLoading] = useState(false);

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
  const timeLeftRef = useRef(TIMEATTACK_DURATION);
  const systemPausedRef = useRef(false);
  const wasPlayingBeforePauseRef = useRef(false);
  const pendingRoundAfterResumeRef = useRef(false);
  const runSeedRef = useRef(createRunSeed());
  const randomRef = useRef<() => number>(() => Math.random());
  const ghostTapRef = useRef<GhostRun["taps"]>([]);
  const ghostReplayRef = useRef<GhostRun | null>(null);
  const challengeKindRef = useRef<"daily" | "weekly" | null>(null);
  const practiceSpeedRef = useRef(INITIAL_SPEED);

  // Sync settings to audio module
  useEffect(() => {
    setVolume(playablesAudioEnabled ? settings.volume : 0);
    setHapticEnabled(settings.hapticEnabled);
  }, [settings, playablesAudioEnabled]);

  useEffect(() => {
    setActiveSkin(getSelectedSkin(highScore));
  }, [highScore, screen]);

  useEffect(() => {
    const updateScale = () => setTrackScale(Math.min(1, Math.max(0.55, (window.innerWidth - 32) / TRACK_WIDTH)));
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  useEffect(() => {
    let active = true;
    applyPlayablesLocale();
    loadPersistedGame().then((saved) => {
      if (!active) return;
      if (typeof saved.highScore === "number") setHighScore(saved.highScore);
      if (saved.settings) updateSettings(saved.settings);
      if (saved.ghost) setBestGhost(saved.ghost);
    }).finally(() => {
      if (active) setCloudSaveLoaded(true);
    });
    return () => { active = false; };
  }, [updateSettings]);

  useEffect(() => {
    if (cloudSaveLoaded) void savePersistedGame({ highScore, settings, ghost: bestGhost });
  }, [bestGhost, cloudSaveLoaded, highScore, settings]);

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
    const challengeKind = challengeKindRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
      if (!inPlayables) localStorage.setItem("suddenstop_high", finalScore.toString());
      void sendBestScore(finalScore);
      if (!challengeKind && mode !== "practice") {
        const ghost: GhostRun = { seed: runSeedRef.current, mode, score: finalScore, taps: ghostTapRef.current };
        if (!inPlayables) saveBestGhost(ghost);
        setBestGhost(ghost);
      }
    }
    const wasDaily = challengeKind === "daily";
    const dailyId = dailyRef.current?.id ?? null;
    if (!inPlayables) addLeaderboardEntry({ name: "PLAYER", score: finalScore, mode, date: Date.now() });
    playGameOver();
    hapticError();
    // Submit via offline-friendly queue (auto-retries when network returns)
    const submission = inPlayables
      ? { ok: true, queued: false }
      : await submitScoreQueued(finalScore, challengeKind ?? mode, challengeKind ? dailyId : null).catch(() => ({ ok: false, queued: true }));
    if (wasDaily && dailyId && dailyRef.current) {
      markDailyCompleted(dailyId, finalScore);
      const { isNewBest, previousBest } = recordDailyPB(dailyId, finalScore);
      setDailyResult({
        score: finalScore,
        isNewBest,
        previousBest,
        pendingSync: !submission.ok && submission.queued,
        challenge: dailyRef.current,
      });
      setScreen("dailyresult");
    } else {
      setScreen("gameover");
    }
  }, [highScore, inPlayables, mode, stopTimer]);

  const startCountdown = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      const nextTime = timeLeftRef.current - 1;
      timeLeftRef.current = nextTime;
      setTimeLeft(nextTime);
      if (nextTime <= 5 && nextTime > 0 && !(dailyRef.current?.modifier === "silent_mode")) playTick();
      if (nextTime <= 0) endGame(scoreRef.current);
    }, 1000);
  }, [endGame, stopTimer]);

  const resumeRoundAnimation = useCallback(() => {
    const animate = () => {
      if (!isPlayingRef.current || systemPausedRef.current) return;
      const effectiveSpeed = activePowerUpRef.current?.type === "slow_motion"
        ? speedRef.current * 0.5
        : speedRef.current;
      posRef.current += effectiveSpeed * dirRef.current;
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

  const startRound = useCallback(() => {
    if (systemPausedRef.current) {
      pendingRoundAfterResumeRef.current = true;
      return;
    }
    const zoneW = getZoneWidth();
    const newTarget = 40 + randomRef.current() * (TRACK_WIDTH - 80 - zoneW);
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

    resumeRoundAnimation();
  }, [getZoneWidth, resumeRoundAnimation]);

  const startGame = useCallback((m: GameMode, daily: DailyChallenge | null = null, options: {
    challengeKind?: "daily" | "weekly";
    seed?: number;
    ghost?: GhostRun | null;
    practiceSpeed?: number;
  } = {}) => {
    const challengeKind = options.challengeKind ?? null;
    setMode(m);
    setIsDaily(challengeKind === "daily");
    setIsWeekly(challengeKind === "weekly");
    setIsGhostReplay(!!options.ghost);
    setDailyChallenge(daily);
    isDailyRef.current = !!challengeKind;
    dailyRef.current = daily;
    challengeKindRef.current = challengeKind;
    runSeedRef.current = options.seed ?? createRunSeed();
    randomRef.current = seededRandom(runSeedRef.current);
    ghostTapRef.current = [];
    ghostReplayRef.current = options.ghost ?? null;
    practiceSpeedRef.current = options.practiceSpeed ?? INITIAL_SPEED;
    setScore(0);
    scoreRef.current = 0;
    setRound(0);
    roundRef.current = 0;
    setCombo(0);
    comboRef.current = 0;
    setActivePowerUp(null);
    activePowerUpRef.current = null;
    setCanRevive(true);
    setIsAdLoading(false);

    let baseSpeed = m === "practice" ? practiceSpeedRef.current : INITIAL_SPEED;
    if (daily?.modifier === "double_speed") baseSpeed *= 2;
    speedRef.current = baseSpeed;
    setSpeed(baseSpeed);

    // Daily one_shot = single life endless
    let startLives = SURVIVAL_LIVES;
    if (daily?.modifier === "one_shot") startLives = 1;
    setLives(startLives);
    livesRef.current = startLives;
    timeLeftRef.current = TIMEATTACK_DURATION;
    setTimeLeft(timeLeftRef.current);
    setScreen("playing");
    if (!(daily?.modifier === "silent_mode")) playStart();
    hapticLight();

    if (m === "timeattack") {
      startCountdown();
    }

    setTimeout(() => startRound(), 300);
  }, [startRound, startCountdown]);

  const pauseForSystem = useCallback(() => {
    systemPausedRef.current = true;
    wasPlayingBeforePauseRef.current = isPlayingRef.current;
    void savePersistedGame({ highScore, settings, ghost: bestGhost });
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      cancelAnimationFrame(animRef.current);
      if (mode === "timeattack") stopTimer();
    }
    setIsSystemPaused(true);
  }, [bestGhost, highScore, mode, settings, stopTimer]);

  const resumeFromSystem = useCallback(() => {
    systemPausedRef.current = false;
    setIsSystemPaused(false);
    if (pendingRoundAfterResumeRef.current) {
      pendingRoundAfterResumeRef.current = false;
      startRound();
    } else if (wasPlayingBeforePauseRef.current) {
      isPlayingRef.current = true;
      resumeRoundAnimation();
      if (mode === "timeattack") startCountdown();
    }
    wasPlayingBeforePauseRef.current = false;
  }, [mode, resumeRoundAnimation, startCountdown, startRound]);

  useEffect(() => subscribeToPlayablesSystem({
    onAudioEnabledChange: setPlayablesAudioEnabled,
    onPause: pauseForSystem,
    onResume: resumeFromSystem,
  }), [pauseForSystem, resumeFromSystem]);

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify({
      coordinateSystem: "Track positions run left-to-right from 0 to 320.",
      screen,
      mode,
      score,
      highScore,
      round,
      lives,
      timeLeft,
      paused: isSystemPaused,
      weeklyChallenge: isWeekly,
      ghostReplay: isGhostReplay,
      practiceSpeed: mode === "practice" ? practiceSpeedRef.current : null,
      movingObject: screen === "playing" ? { x: Math.round(objectPos), direction, speed } : null,
      target: screen === "playing" ? { x: Math.round(targetPos), width: Math.round(getZoneWidth()) } : null,
      combo,
      activePowerUp: activePowerUp?.type ?? null,
    });
    return () => { delete window.render_game_to_text; };
  }, [activePowerUp, combo, direction, getZoneWidth, highScore, isGhostReplay, isSystemPaused, isWeekly, lives, mode, objectPos, round, screen, score, speed, targetPos, timeLeft]);

  const selectMode = useCallback((m: Exclude<GameMode, "practice">) => {
    startGame(m, null);
  }, [startGame]);

  const startDailyChallenge = useCallback((c: DailyChallenge) => {
    // Daily uses survival-style (one_shot) or default classic-endless
    const baseMode: GameMode = c.modifier === "one_shot" ? "survival" : "survival";
    startGame(baseMode, c, { challengeKind: "daily", seed: c.seed });
  }, [startGame]);

  const startWeeklyChallenge = useCallback((challenge: WeeklyChallenge) => {
    startGame("survival", {
      id: challenge.id,
      challenge_date: challenge.label,
      modifier: challenge.modifier,
      bonus_multiplier: challenge.bonusMultiplier,
      seed: challenge.seed,
    }, { challengeKind: "weekly", seed: challenge.seed });
  }, [startGame]);

  const startPractice = useCallback((practiceSpeed: number) => {
    startGame("practice", null, { practiceSpeed });
  }, [startGame]);

  const startGhostReplay = useCallback(() => {
    if (bestGhost) startGame(bestGhost.mode, null, { seed: bestGhost.seed, ghost: bestGhost });
  }, [bestGhost, startGame]);

  const handleRewardedRevive = useCallback(async () => {
    if (!canRevive || isAdLoading) return;
    setIsAdLoading(true);
    try {
      const earned = await requestPlayablesRewardedAd("sudden-stop-revive");
      if (earned || !isPlayablesEnvironment()) {
        setCanRevive(false);
        setScreen("playing");
        if (mode === "survival" || isDaily || isWeekly) {
          setLives(1);
          livesRef.current = 1;
        } else if (mode === "timeattack") {
          setTimeLeft(10);
          timeLeftRef.current = 10;
          startCountdown();
        }
        isPlayingRef.current = true;
        playStart();
        hapticLight();
        toast.success("Revived! Streak preserved, go for the target!");
        setTimeout(() => startRound(), 300);
      } else {
        toast.info("Reward ad skipped or unavailable.");
      }
    } catch {
      toast.info("Could not load reward ad at this time.");
    } finally {
      setIsAdLoading(false);
    }
  }, [canRevive, isAdLoading, isDaily, isWeekly, mode, startCountdown, startRound]);

  const handleRestartWithAd = useCallback(async () => {
    void requestPlayablesInterstitialAd();
    setCanRevive(true);
    setScreen(isDaily ? "daily" : isWeekly ? "weekly" : mode === "practice" ? "practice" : "modeselect");
  }, [isDaily, isWeekly, mode]);

  const handleMenuWithAd = useCallback(async () => {
    void requestPlayablesInterstitialAd();
    setCanRevive(true);
    setScreen("menu");
  }, []);

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
    ghostTapRef.current.push({ round: roundRef.current, position: Math.round(posRef.current), result });
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
      const classicEnd = (mode === "classic" || mode === "practice") && !dailyEndless && newRound >= ROUNDS_PER_GAME;
      const survivalEnd = (mode === "survival" || dailyEndless) && livesRef.current <= 0;

      if (classicEnd || survivalEnd) {
        endGame(newScore);
      } else {
        // Speed scaling
        const baseInc = reverseCombo ? -SPEED_INCREMENT * 0.5 : SPEED_INCREMENT;
        const baseInit = isDailyRef.current && dailyRef.current?.modifier === "double_speed" ? INITIAL_SPEED * 2 : INITIAL_SPEED;
        speedRef.current = mode === "practice" ? practiceSpeedRef.current : Math.max(1.5, baseInit + newRound * baseInc);
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
      if (e.code === "KeyF" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
        return;
      }
      if (e.code === "Escape") {
        if (document.fullscreenElement) return;
        if (showTutorial) { markTutorialSeen(); setShowTutorial(false); return; }
        if (screen !== "menu" && screen !== "playing") setScreen("menu");
        return;
      }
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
      className={`flex flex-col items-center justify-center min-h-[100dvh] bg-background transition-transform duration-100 palette-${settings.colorPalette} ${settings.reducedMotion ? "reduced-motion" : ""} ${shakeScreen ? "translate-x-1" : ""}`}
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

      {isSystemPaused && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <p className="font-[var(--font-display)] text-sm font-bold tracking-[0.3em] text-primary">PAUSED</p>
        </div>
      )}

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

      {showPowerUpGuide && <PowerUpGuide onClose={() => setShowPowerUpGuide(false)} />}

      {screen === "menu" && (
        <MenuScreen
          highScore={highScore}
          onStart={() => setScreen("modeselect")}
          onSettings={() => setScreen("settings")}
          onLeaderboard={() => setScreen("globalLeaderboard")}
          onLocal={() => setScreen("leaderboard")}
          onSkins={() => setScreen("skins")}
          onDaily={() => setScreen("daily")}
          onWeekly={() => setScreen("weekly")}
          onPractice={() => setScreen("practice")}
          onGhost={startGhostReplay}
          hasGhost={!!bestGhost}
          onPowerUpGuide={() => setShowPowerUpGuide(true)}
          inPlayables={inPlayables}
        />
      )}
      {screen === "modeselect" && <ModeSelectScreen onSelect={selectMode} onBack={() => setScreen("menu")} />}
      {screen === "practice" && <PracticeScreen onStart={startPractice} onBack={() => setScreen("menu")} />}
      {screen === "weekly" && <WeeklyChallengeScreen onStart={startWeeklyChallenge} onBack={() => setScreen("menu")} />}
      {screen === "settings" && <SettingsScreen settings={settings} onUpdate={updateSettings} onBack={() => setScreen("menu")} />}
      {screen === "leaderboard" && !inPlayables && <LeaderboardScreen onBack={() => setScreen("menu")} />}
      {screen === "globalLeaderboard" && !inPlayables && <GlobalLeaderboardScreen onBack={() => setScreen("menu")} />}
      {screen === "daily" && !inPlayables && <DailyChallengeScreen onPlay={startDailyChallenge} onBack={() => setScreen("menu")} />}
      {screen === "skins" && !inPlayables && <SkinsScreen highScore={highScore} onBack={() => setScreen("menu")} />}
      {screen === "gameover" && (
        <GameOverScreen
          score={score}
          highScore={highScore}
          mode={mode}
          isDaily={isDaily}
          isWeekly={isWeekly}
          isGhostReplay={isGhostReplay}
          showLocalScore={!inPlayables}
          dailyMod={dailyChallenge?.modifier ?? null}
          onRestart={handleRestartWithAd}
          onMenu={handleMenuWithAd}
          onRevive={handleRewardedRevive}
          canRevive={canRevive && mode !== "practice"}
          isAdLoading={isAdLoading}
          onWatchTips={() => void openYouTubeContent("dQw4w9WgXcQ", "VIDEO")}
        />
      )}
      {screen === "dailyresult" && dailyResult && (
        <DailyResultScreen
          challenge={dailyResult.challenge}
          score={dailyResult.score}
          previousBest={dailyResult.previousBest}
          isNewBest={dailyResult.isNewBest}
          pendingSync={dailyResult.pendingSync}
          onRetry={() => { setDailyResult(null); setScreen("daily"); }}
          onMenu={() => { setDailyResult(null); setScreen("menu"); }}
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
          isWeekly={isWeekly}
          ghostPosition={isGhostReplay ? ghostReplayRef.current?.taps[round]?.position ?? null : null}
          trackScale={trackScale}
          activePowerUp={activePowerUp}
        />
      )}
    </div>
  );
}

/* ---- MENU ---- */
function MenuScreen({ highScore, onStart, onSettings, onLeaderboard, onLocal, onSkins, onDaily, onWeekly, onPractice, onGhost, hasGhost, onPowerUpGuide, inPlayables }: {
  highScore: number; onStart: () => void; onSettings: () => void; onLeaderboard: () => void; onLocal: () => void; onSkins: () => void; onDaily: () => void; onWeekly: () => void; onPractice: () => void; onGhost: () => void; hasGhost: boolean; onPowerUpGuide: () => void; inPlayables: boolean;
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

      {!inPlayables && <button
        onClick={(e) => { e.stopPropagation(); onDaily(); }}
        className="neon-border bg-accent/10 hover:bg-accent/20 text-accent font-bold text-sm tracking-widest uppercase px-8 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
      >
        ⭐ DAILY CHALLENGE
      </button>}

      <div className="flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); onWeekly(); }}
          className="neon-border bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          🗓 WEEKLY
        </button>
        <button onClick={(e) => { e.stopPropagation(); onPractice(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          🎛 PRACTICE
        </button>
      </div>

      {hasGhost && (
        <button onClick={(e) => { e.stopPropagation(); onGhost(); }}
          className="neon-border bg-primary/5 hover:bg-primary/15 text-primary font-bold text-[10px] tracking-widest uppercase px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          👻 RACE YOUR BEST
        </button>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        {!inPlayables && <button onClick={(e) => { e.stopPropagation(); onLeaderboard(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          🌍 GLOBAL
        </button>}
        {!inPlayables && <button onClick={(e) => { e.stopPropagation(); onLocal(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          🏆 LOCAL
        </button>}
        {!inPlayables && <button onClick={(e) => { e.stopPropagation(); onSkins(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          🎨 SKINS
        </button>}
        <button onClick={(e) => { e.stopPropagation(); onPowerUpGuide(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          ⚡ POWER-UPS
        </button>
        <button onClick={(e) => { e.stopPropagation(); onSettings(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]">
          ⚙ SETTINGS
        </button>
        <button onClick={(e) => { e.stopPropagation(); void openYouTubeContent("dQw4w9WgXcQ", "VIDEO"); }}
          className="neon-border bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold text-[10px] tracking-widest uppercase px-4 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)] flex items-center gap-1">
          ▶ YOUTUBE
        </button>
      </div>

      <span className="text-muted-foreground/50 text-xs tracking-wider">TAP or SPACE to play</span>
    </div>
  );
}

/* ---- MODE SELECT ---- */
function ModeSelectScreen({ onSelect, onBack }: { onSelect: (m: Exclude<GameMode, "practice">) => void; onBack: () => void }) {
  const modes: { mode: Exclude<GameMode, "practice">; label: string; desc: string; icon: string }[] = [
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

function PracticeScreen({ onStart, onBack }: { onStart: (speed: number) => void; onBack: () => void }) {
  const [speed, setSpeed] = useState(2);
  return (
    <div className="flex flex-col items-center gap-6 px-6 animate-in fade-in duration-500 w-full max-w-[340px]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">PRACTICE</h2>
      <p className="text-xs text-muted-foreground text-center">Ten rounds, fixed speed, no leaderboard pressure.</p>
      <div className="w-full neon-border rounded-xl p-5 bg-muted/30">
        <div className="flex justify-between text-xs tracking-widest uppercase"><span>Speed</span><span className="text-primary">{speed.toFixed(1)}×</span></div>
        <input aria-label="Practice speed" className="w-full mt-4 accent-[hsl(var(--primary))]" type="range" min="1.5" max="8" step="0.5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
      </div>
      <button onClick={(e) => { e.stopPropagation(); onStart(speed); }} className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-base tracking-widest uppercase px-10 py-3 rounded-xl font-[var(--font-display)]">START PRACTICE</button>
      <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="text-muted-foreground text-xs tracking-widest uppercase">← BACK</button>
    </div>
  );
}

function WeeklyChallengeScreen({ onStart, onBack }: { onStart: (challenge: WeeklyChallenge) => void; onBack: () => void }) {
  const challenge = getWeeklyChallenge();
  const modifier = MODIFIER_INFO[challenge.modifier];
  return (
    <div className="flex flex-col items-center gap-6 px-6 animate-in fade-in duration-500 w-full max-w-[380px]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">WEEKLY</h2>
      <span className="text-[10px] text-muted-foreground tracking-widest uppercase">{challenge.label}</span>
      <div className="w-full neon-border-intense rounded-2xl p-6 bg-secondary/5 flex flex-col items-center gap-3">
        <span className="text-5xl">{modifier.icon}</span>
        <span className="text-xl font-black text-secondary tracking-widest font-[var(--font-display)]">{modifier.label}</span>
        <span className="text-xs text-muted-foreground text-center">{modifier.desc}</span>
        <span className="text-xs text-primary font-bold tracking-widest">{challenge.bonusMultiplier}× BONUS</span>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onStart(challenge); }} className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-base tracking-widest uppercase px-10 py-3 rounded-xl font-[var(--font-display)]">START WEEKLY</button>
      <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="text-muted-foreground text-xs tracking-widest uppercase">← BACK</button>
    </div>
  );
}

/* ---- GAME OVER ---- */
function GameOverScreen({
  score,
  highScore,
  mode,
  isDaily,
  isWeekly,
  isGhostReplay,
  showLocalScore,
  dailyMod,
  onRestart,
  onMenu,
  onRevive,
  canRevive,
  isAdLoading,
  onWatchTips,
}: {
  score: number;
  highScore: number;
  mode: GameMode;
  isDaily: boolean;
  isWeekly: boolean;
  isGhostReplay: boolean;
  showLocalScore: boolean;
  dailyMod: DailyModifier | null;
  onRestart: () => void;
  onMenu: () => void;
  onRevive?: () => void;
  canRevive?: boolean;
  isAdLoading?: boolean;
  onWatchTips?: () => void;
}) {
  const isNewBest = score >= highScore && score > 0;
  const modeLabel = isDaily ? `DAILY · ${dailyMod ? MODIFIER_INFO[dailyMod].label : ""}` : isWeekly ? `WEEKLY · ${dailyMod ? MODIFIER_INFO[dailyMod].label : ""}` : isGhostReplay ? "GHOST REPLAY" : (mode === "classic" ? "CLASSIC" : mode === "survival" ? "SURVIVAL" : mode === "practice" ? "PRACTICE" : "TIME ATTACK");

  return (
    <div className="flex flex-col items-center gap-5 px-6 animate-in fade-in duration-500 w-full max-w-[340px]">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">GAME OVER</h2>
      <span className="text-xs text-primary tracking-widest uppercase font-[var(--font-display)]">{modeLabel}</span>

      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Score</span>
        <span className={`text-5xl font-black font-[var(--font-display)] ${isNewBest ? "text-accent text-glow-warning" : "text-primary text-glow"}`}>
          {score}
        </span>
        {isNewBest && <span className="text-accent text-xs tracking-widest uppercase animate-pulse mt-1">★ NEW BEST ★</span>}
      </div>

      <div className="neon-border rounded-lg px-6 py-2 bg-muted/30">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Best</span>
        <span className="text-xl font-bold text-primary ml-3 font-[var(--font-display)]">{highScore}</span>
      </div>

      {showLocalScore && <span className="text-[10px] text-muted-foreground tracking-widest text-center">Score synced with YouTube Playables</span>}

      {/* Rewarded Ad Revive Opportunity */}
      {canRevive && onRevive && mode !== "practice" && (
        <button
          onClick={(e) => { e.stopPropagation(); onRevive(); }}
          disabled={isAdLoading}
          className="w-full neon-border-intense bg-gradient-to-r from-accent/20 to-primary/20 hover:from-accent/30 hover:to-primary/30 text-accent font-black text-xs tracking-widest uppercase px-6 py-3.5 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)] flex items-center justify-center gap-2 shadow-[0_0_20px_hsl(var(--accent)/0.3)] animate-pulse"
        >
          <span>🎬</span>
          <span>{isAdLoading ? "LOADING AD..." : mode === "timeattack" ? "WATCH AD (+10s TIME)" : "WATCH AD TO REVIVE (+1 ❤️)"}</span>
        </button>
      )}

      <div className="flex gap-3 w-full justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); onRestart(); }}
          className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-base tracking-widest uppercase px-8 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)] flex-1"
        >
          RETRY
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          className="neon-border bg-muted/30 hover:bg-muted/50 text-foreground font-bold text-base tracking-widest uppercase px-8 py-3 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)] flex-1"
        >
          MENU
        </button>
      </div>

      {onWatchTips && (
        <button
          onClick={(e) => { e.stopPropagation(); onWatchTips(); }}
          className="text-[10px] text-muted-foreground hover:text-primary tracking-widest uppercase transition-colors font-[var(--font-display)] flex items-center gap-1.5 mt-1"
        >
          <span>▶</span>
          <span>WATCH PLAYABLES TIPS & VIDEOS</span>
        </button>
      )}
    </div>
  );
}

/* ---- PLAY SCREEN ---- */
function PlayScreen({
  score, round, combo, speed, objectPos, targetPos, targetWidth, hitResult, particleActive, particleKey, mode, lives, timeLeft, skin, isDaily, isWeekly, dailyMod, ghostPosition, trackScale, activePowerUp,
}: {
  score: number; round: number; combo: number; speed: number; objectPos: number; targetPos: number; targetWidth: number;
  hitResult: HitResult; particleActive: boolean; particleKey: number; mode: GameMode; lives: number; timeLeft: number;
  skin: Skin; isDaily: boolean; isWeekly: boolean; dailyMod: DailyModifier | null; ghostPosition: number | null; trackScale: number; activePowerUp: PowerUp | null;
}) {
  const ballShape = skin.shape === "diamond" ? "rotate-45 rounded-sm" : skin.shape === "star" ? "rounded-sm rotate-[22deg]" : "rounded-full";
  const ballStyle: React.CSSProperties = hitResult
    ? hitResult === "miss"
      ? { background: "hsl(0 85% 55%)", boxShadow: "0 0 15px hsl(0 85% 55% / 0.6)" }
      : { background: skin.color, boxShadow: `0 0 20px ${skin.glow}` }
    : { background: skin.color, boxShadow: `0 0 15px ${skin.glow}` };

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-[380px]">
      {/* Active modifier panel (daily + power-up combined) */}
      <ActiveModifierPanel
        activePowerUp={activePowerUp}
        dailyLabel={(isDaily || isWeekly) && dailyMod ? MODIFIER_INFO[dailyMod].label : null}
        dailyIcon={(isDaily || isWeekly) && dailyMod ? MODIFIER_INFO[dailyMod].icon : null}
        dailyDesc={(isDaily || isWeekly) && dailyMod ? MODIFIER_INFO[dailyMod].desc : null}
      />

      {/* HUD */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Score</span>
          <span className="text-2xl font-bold text-primary font-[var(--font-display)] text-glow">{score}</span>
        </div>
        <div className="flex flex-col items-center">
          {(mode === "classic" || mode === "practice") && !isDaily && !isWeekly && (
            <>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Round</span>
              <span className="text-lg font-bold text-foreground font-[var(--font-display)]">{round + 1}/{ROUNDS_PER_GAME}</span>
            </>
          )}
          {(mode === "survival" || isDaily || isWeekly) && (
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
      <div className="flex w-full justify-center" style={{ height: `${80 * trackScale}px` }}>
      <div className="relative w-[320px] h-20 bg-muted/50 rounded-2xl overflow-hidden border border-border" style={{ transform: `scale(${trackScale})`, transformOrigin: "top center" }}>
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

        {ghostPosition !== null && !hitResult && (
          <div className="absolute top-2 bottom-2 w-1 rounded-full bg-secondary/80 shadow-[0_0_12px_hsl(var(--secondary)/0.8)]" style={{ left: ghostPosition }}>
            <span className="absolute -top-4 -left-3 text-[8px] text-secondary tracking-wider">GHOST</span>
          </div>
        )}

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
