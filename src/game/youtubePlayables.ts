import type { GhostRun } from "./ghostReplay";

type PersistedGame = {
  highScore?: number;
  settings?: {
    volume?: number;
    hapticEnabled?: boolean;
    reducedMotion?: boolean;
    colorPalette?: "default" | "highContrast" | "deuteranopia";
  };
  ghost?: GhostRun | null;
};

type PlayablesSdk = {
  IN_PLAYABLES_ENV?: boolean;
  game?: {
    firstFrameReady?: () => void;
    gameReady?: () => void;
    loadData?: () => Promise<string>;
    saveData?: (data: string) => Promise<void>;
  };
  system?: {
    getLanguage?: () => Promise<string>;
    isAudioEnabled?: () => boolean;
    onAudioEnabledChange?: (callback: (enabled: boolean) => void) => (() => void);
    onPause?: (callback: () => void) => (() => void);
    onResume?: (callback: () => void) => (() => void);
  };
  engagement?: { sendScore?: ({ value }: { value: number }) => Promise<void> };
  health?: { logError?: () => void; logWarning?: () => void };
};

declare global {
  interface Window {
    ytgame?: PlayablesSdk;
    render_game_to_text?: () => string;
  }
}

const LOCAL_SAVE_KEY = "suddenstop_playables_save";
let cloudSaveReady = false;

function sdk() { return window.ytgame; }

export function isPlayablesEnvironment() { return Boolean(sdk()?.IN_PLAYABLES_ENV); }

export function reportWarning() { sdk()?.health?.logWarning?.(); }

export function reportError() { sdk()?.health?.logError?.(); }

export function notifyFirstFrameReady() {
  try { sdk()?.game?.firstFrameReady?.(); } catch { reportWarning(); }
}

export function notifyGameReady() {
  try { sdk()?.game?.gameReady?.(); } catch { reportWarning(); }
}

export async function loadPersistedGame(): Promise<PersistedGame> {
  try {
    const playable = isPlayablesEnvironment();
    const raw = playable ? await sdk()?.game?.loadData?.() : localStorage.getItem(LOCAL_SAVE_KEY);
    if (playable) cloudSaveReady = true;
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed as PersistedGame : {};
  } catch {
    reportWarning();
    return {};
  }
}

export async function savePersistedGame(data: PersistedGame) {
  const serialized = JSON.stringify(data);
  try {
    if (isPlayablesEnvironment()) {
      if (!cloudSaveReady) return;
      await sdk()?.game?.saveData?.(serialized);
    }
    else localStorage.setItem(LOCAL_SAVE_KEY, serialized);
  } catch { reportWarning(); }
}

export async function sendBestScore(score: number) {
  if (!Number.isSafeInteger(score) || score < 0) return;
  try { await sdk()?.engagement?.sendScore?.({ value: score }); } catch { reportWarning(); }
}

export async function applyPlayablesLocale() {
  try {
    const language = await sdk()?.system?.getLanguage?.();
    if (language) document.documentElement.lang = language;
  } catch { reportWarning(); }
}

export function subscribeToPlayablesSystem(callbacks: {
  onAudioEnabledChange: (enabled: boolean) => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const system = sdk()?.system;
  if (!system) return () => {};
  try {
    callbacks.onAudioEnabledChange(system.isAudioEnabled?.() ?? true);
    const removeAudioListener = system.onAudioEnabledChange?.(callbacks.onAudioEnabledChange);
    const removePauseListener = system.onPause?.(callbacks.onPause);
    const removeResumeListener = system.onResume?.(callbacks.onResume);
    return () => { removeAudioListener?.(); removePauseListener?.(); removeResumeListener?.(); };
  } catch {
    reportWarning();
    return () => {};
  }
}
