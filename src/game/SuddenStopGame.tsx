import { useState, useRef, useCallback, useEffect } from "react";

type GameState = "menu" | "playing" | "result" | "gameover";
type HitResult = "perfect" | "good" | "miss" | null;

const TRACK_WIDTH = 320;
const OBJECT_SIZE = 28;
const INITIAL_SPEED = 3;
const SPEED_INCREMENT = 0.4;
const TARGET_ZONE_WIDTH = 50;
const PERFECT_ZONE_WIDTH = 18;
const ROUNDS_PER_GAME = 10;

export default function SuddenStopGame() {
  const [gameState, setGameState] = useState<GameState>("menu");
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

  const animRef = useRef<number>(0);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(INITIAL_SPEED);
  const isPlayingRef = useRef(false);

  const startRound = useCallback(() => {
    const newTarget = 40 + Math.random() * (TRACK_WIDTH - 80 - TARGET_ZONE_WIDTH);
    setTargetPos(newTarget);
    posRef.current = 0;
    dirRef.current = 1;
    setObjectPos(0);
    setDirection(1);
    setHitResult(null);
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

  const startGame = useCallback(() => {
    setScore(0);
    setRound(0);
    setCombo(0);
    speedRef.current = INITIAL_SPEED;
    setSpeed(INITIAL_SPEED);
    setGameState("playing");
    setTimeout(() => startRound(), 300);
  }, [startRound]);

  const handleTap = useCallback(() => {
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;
    cancelAnimationFrame(animRef.current);

    const objCenter = posRef.current + OBJECT_SIZE / 2;
    const targetCenter = targetPos + TARGET_ZONE_WIDTH / 2;
    const distance = Math.abs(objCenter - targetCenter);

    let result: HitResult;
    let points = 0;
    let newCombo = combo;

    if (distance <= PERFECT_ZONE_WIDTH / 2) {
      result = "perfect";
      newCombo = combo + 1;
      points = 100 + newCombo * 25;
      setFlashColor("primary");
    } else if (distance <= TARGET_ZONE_WIDTH / 2) {
      result = "good";
      newCombo = combo + 1;
      points = 50 + newCombo * 10;
      setFlashColor("accent");
    } else {
      result = "miss";
      newCombo = 0;
      setShakeScreen(true);
      setFlashColor("destructive");
      setTimeout(() => setShakeScreen(false), 400);
    }

    setHitResult(result);
    setCombo(newCombo);
    const newScore = score + points;
    setScore(newScore);
    const newRound = round + 1;
    setRound(newRound);

    setTimeout(() => setFlashColor(null), 300);

    setTimeout(() => {
      if (newRound >= ROUNDS_PER_GAME) {
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem("suddenstop_high", newScore.toString());
        }
        setGameState("gameover");
      } else {
        speedRef.current = INITIAL_SPEED + newRound * SPEED_INCREMENT;
        setSpeed(speedRef.current);
        setGameState("result");
        setTimeout(() => {
          setGameState("playing");
          startRound();
        }, 800);
      }
    }, 600);
  }, [targetPos, combo, score, round, highScore, startRound]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (gameState === "menu" || gameState === "gameover") startGame();
        else if (gameState === "playing" && isPlayingRef.current) handleTap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, handleTap, startGame]);

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen bg-background transition-transform duration-100 ${shakeScreen ? "translate-x-1" : ""}`}
      onClick={() => {
        if (gameState === "playing" && isPlayingRef.current) handleTap();
      }}
      onTouchStart={(e) => {
        if (gameState === "playing" && isPlayingRef.current) {
          e.preventDefault();
          handleTap();
        }
      }}
    >
      {/* Flash overlay */}
      {flashColor && (
        <div
          className={`fixed inset-0 pointer-events-none z-50 transition-opacity duration-300 ${
            flashColor === "primary"
              ? "bg-primary/10"
              : flashColor === "accent"
              ? "bg-accent/10"
              : "bg-destructive/10"
          }`}
        />
      )}

      {gameState === "menu" && <MenuScreen highScore={highScore} onStart={startGame} />}
      {gameState === "gameover" && (
        <GameOverScreen score={score} highScore={highScore} onRestart={startGame} />
      )}
      {(gameState === "playing" || gameState === "result") && (
        <PlayScreen
          score={score}
          round={round}
          combo={combo}
          speed={speed}
          objectPos={objectPos}
          targetPos={targetPos}
          hitResult={hitResult}
        />
      )}
    </div>
  );
}

function MenuScreen({ highScore, onStart }: { highScore: number; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-8 px-6 animate-in fade-in duration-500">
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
          <span className="text-2xl font-bold text-primary ml-3 font-[var(--font-display)]">
            {highScore}
          </span>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onStart();
        }}
        className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-lg tracking-widest uppercase px-12 py-4 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)]"
      >
        START
      </button>

      <span className="text-muted-foreground/50 text-xs tracking-wider">TAP or SPACE to play</span>
    </div>
  );
}

function GameOverScreen({
  score,
  highScore,
  onRestart,
}: {
  score: number;
  highScore: number;
  onRestart: () => void;
}) {
  const isNewBest = score >= highScore && score > 0;

  return (
    <div className="flex flex-col items-center gap-6 px-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-black tracking-widest text-foreground font-[var(--font-display)]">
        GAME OVER
      </h2>

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Score</span>
        <span className={`text-5xl font-black font-[var(--font-display)] ${isNewBest ? "text-accent text-glow-warning" : "text-primary text-glow"}`}>
          {score}
        </span>
        {isNewBest && (
          <span className="text-accent text-xs tracking-widest uppercase animate-pulse">
            ★ NEW BEST ★
          </span>
        )}
      </div>

      <div className="neon-border rounded-lg px-6 py-2 bg-muted/30">
        <span className="text-xs text-muted-foreground tracking-widest uppercase">Best</span>
        <span className="text-xl font-bold text-primary ml-3 font-[var(--font-display)]">
          {highScore}
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRestart();
        }}
        className="neon-border-intense bg-primary/10 hover:bg-primary/20 text-primary font-bold text-lg tracking-widest uppercase px-12 py-4 rounded-xl transition-all duration-200 active:scale-95 font-[var(--font-display)] mt-2"
      >
        RETRY
      </button>
    </div>
  );
}

function PlayScreen({
  score,
  round,
  combo,
  speed,
  objectPos,
  targetPos,
  hitResult,
}: {
  score: number;
  round: number;
  combo: number;
  speed: number;
  objectPos: number;
  targetPos: number;
  hitResult: HitResult;
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-[380px]">
      {/* HUD */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Score</span>
          <span className="text-2xl font-bold text-primary font-[var(--font-display)] text-glow">
            {score}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Round</span>
          <span className="text-lg font-bold text-foreground font-[var(--font-display)]">
            {round + 1}/{ROUNDS_PER_GAME}
          </span>
        </div>
        <div className="flex flex-col items-end">
          {combo > 1 && (
            <>
              <span className="text-[10px] text-accent tracking-widest uppercase">Combo</span>
              <span className="text-2xl font-bold text-accent font-[var(--font-display)] text-glow-warning">
                x{combo}
              </span>
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
        {/* Grid lines */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-border/30"
            style={{ left: `${(i + 1) * (320 / 17)}px` }}
          />
        ))}

        {/* Target zone */}
        <div
          className={`absolute top-0 bottom-0 rounded-lg transition-colors duration-200 ${
            hitResult === "perfect"
              ? "bg-primary/40 shadow-[0_0_30px_hsl(var(--game-neon)/0.5)]"
              : hitResult === "good"
              ? "bg-accent/30"
              : hitResult === "miss"
              ? "bg-destructive/20"
              : "bg-primary/15 border border-primary/30"
          }`}
          style={{ left: targetPos, width: TARGET_ZONE_WIDTH }}
        >
          {/* Perfect zone center line */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-0.5 bg-primary/60" />
        </div>

        {/* Moving object */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-none ${
            hitResult
              ? hitResult === "miss"
                ? "bg-destructive shadow-[0_0_15px_hsl(var(--game-danger)/0.6)]"
                : "bg-primary shadow-[0_0_15px_hsl(var(--game-neon)/0.6)]"
              : "bg-secondary shadow-[0_0_15px_hsl(280_80%_60%/0.5)]"
          }`}
          style={{
            left: objectPos,
            width: OBJECT_SIZE,
            height: OBJECT_SIZE,
          }}
        />
      </div>

      {/* Result text */}
      <div className="h-10 flex items-center justify-center">
        {hitResult === "perfect" && (
          <span className="text-primary text-2xl font-black tracking-widest text-glow animate-in zoom-in duration-200 font-[var(--font-display)]">
            PERFECT!
          </span>
        )}
        {hitResult === "good" && (
          <span className="text-accent text-xl font-bold tracking-widest text-glow-warning animate-in zoom-in duration-200 font-[var(--font-display)]">
            GOOD
          </span>
        )}
        {hitResult === "miss" && (
          <span className="text-destructive text-xl font-bold tracking-widest text-glow-danger animate-in zoom-in duration-200 font-[var(--font-display)]">
            MISS
          </span>
        )}
        {!hitResult && (
          <span className="text-muted-foreground/60 text-sm tracking-widest animate-pulse">
            TAP NOW
          </span>
        )}
      </div>
    </div>
  );
}
