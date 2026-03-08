// Web Audio API sound effects synthesizer
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playPerfect() {
  const ctx = getCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g).connect(ctx.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(880, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
  g.gain.setValueAtTime(0.3, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  o.start(); o.stop(ctx.currentTime + 0.3);

  // Second harmonic ping
  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.connect(g2).connect(ctx.destination);
  o2.type = 'sine';
  o2.frequency.setValueAtTime(1320, ctx.currentTime + 0.05);
  g2.gain.setValueAtTime(0.2, ctx.currentTime + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
  o2.start(ctx.currentTime + 0.05); o2.stop(ctx.currentTime + 0.25);
}

export function playGood() {
  const ctx = getCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g).connect(ctx.destination);
  o.type = 'triangle';
  o.frequency.setValueAtTime(660, ctx.currentTime);
  g.gain.setValueAtTime(0.25, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  o.start(); o.stop(ctx.currentTime + 0.2);
}

export function playMiss() {
  const ctx = getCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g).connect(ctx.destination);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(200, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
  g.gain.setValueAtTime(0.2, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  o.start(); o.stop(ctx.currentTime + 0.3);
}

export function playGameOver() {
  const ctx = getCtx();
  [440, 350, 260].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g).connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
    g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
    o.start(ctx.currentTime + i * 0.15);
    o.stop(ctx.currentTime + i * 0.15 + 0.3);
  });
}

export function playStart() {
  const ctx = getCtx();
  [520, 660, 880].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g).connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
    g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
    o.start(ctx.currentTime + i * 0.1);
    o.stop(ctx.currentTime + i * 0.1 + 0.2);
  });
}

// Haptic feedback - uses Vibration API (web) with Capacitor Haptics fallback
export async function hapticLight() {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if (navigator.vibrate) navigator.vibrate(15);
  }
}

export async function hapticMedium() {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    if (navigator.vibrate) navigator.vibrate(30);
  }
}

export async function hapticHeavy() {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {
    if (navigator.vibrate) navigator.vibrate(50);
  }
}

export async function hapticError() {
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
  }
}
