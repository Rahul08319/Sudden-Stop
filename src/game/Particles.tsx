import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ParticleExplosionProps {
  x: number;
  y: number;
  type: "perfect" | "good";
  active: boolean;
}

let particleId = 0;

export function ParticleExplosion({ x, y, type, active }: ParticleExplosionProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;

    const count = type === "perfect" ? 24 : 12;
    const colors = type === "perfect"
      ? ["hsl(160 100% 50%)", "hsl(160 100% 70%)", "hsl(50 100% 55%)", "hsl(280 80% 60%)", "#fff"]
      : ["hsl(35 100% 55%)", "hsl(35 100% 70%)", "hsl(50 100% 60%)"];

    const newParticles: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      const life = 400 + Math.random() * 400;
      return {
        id: ++particleId,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * (type === "perfect" ? 5 : 3),
        color: colors[Math.floor(Math.random() * colors.length)],
        life,
        maxLife: life,
      };
    });

    setParticles(newParticles);

    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.08,
            life: p.maxLife - elapsed,
          }))
          .filter(p => p.life > 0)
      );
      if (elapsed < 800) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, x, y, type]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: Math.max(0, p.life / p.maxLife),
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            transform: `scale(${0.5 + (p.life / p.maxLife) * 0.5})`,
          }}
        />
      ))}
    </div>
  );
}

interface StreakFlameProps {
  combo: number;
  objectPos: number;
}

export function StreakFlame({ combo, objectPos }: StreakFlameProps) {
  const [flames, setFlames] = useState<{ id: number; x: number; y: number; size: number; opacity: number }[]>([]);

  useEffect(() => {
    if (combo < 2) { setFlames([]); return; }

    const interval = setInterval(() => {
      setFlames(prev => {
        const next = prev
          .map(f => ({ ...f, y: f.y - 1.5, opacity: f.opacity - 0.03, size: f.size * 0.97 }))
          .filter(f => f.opacity > 0);
        const intensity = Math.min(combo, 8);
        for (let i = 0; i < intensity; i++) {
          next.push({
            id: ++particleId,
            x: objectPos + 14 + (Math.random() - 0.5) * 12,
            y: 40 - Math.random() * 5,
            size: 3 + Math.random() * (2 + intensity),
            opacity: 0.7 + Math.random() * 0.3,
          });
        }
        return next.slice(-60);
      });
    }, 30);

    return () => clearInterval(interval);
  }, [combo, objectPos]);

  if (combo < 2) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {flames.map(f => (
        <div
          key={f.id}
          className="absolute rounded-full"
          style={{
            left: f.x,
            top: f.y,
            width: f.size,
            height: f.size * 1.4,
            opacity: f.opacity,
            background: combo >= 5
              ? `radial-gradient(circle, hsl(50 100% 70%), hsl(0 85% 55%))`
              : `radial-gradient(circle, hsl(35 100% 60%), hsl(15 90% 50%))`,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            filter: `blur(${1 + (1 - f.opacity) * 2}px)`,
          }}
        />
      ))}
    </div>
  );
}
