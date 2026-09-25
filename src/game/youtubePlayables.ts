import type { GhostRun } from "./ghostReplay";

export type PersistedGame = {
  highScore?: number;
  settings?: {
    volume?: number;
    hapticEnabled?: boolean;
    reducedMotion?: boolean;
    colorPalette?: "default" | "highContrast" | "deuteranopia";
  };
  ghost?: GhostRun | null;
  gamesPlayed?: number;
};

const LOCAL_SAVE_KEY = "suddenstop_playables_save";
const MAX_SAVE_BYTES = 3 * 1024 * 1024; // 3 MiB YouTube Playables cloud save limit
let cloudSaveReady = false;

/**
 * Access the global ytgame SDK instance safely.
 */
export function getPlayablesSdk() {
  if (typeof window === "undefined") return undefined;
  return window.ytgame;
}

/**
 * Determines whether the game is currently executing inside the YouTube Playables environment.
 */
export function isPlayablesEnvironment(): boolean {
  const sdk = getPlayablesSdk();
  return Boolean(sdk && sdk.IN_PLAYABLES_ENV);
}

/**
 * Returns the loaded YouTube Playables SDK version string.
 */
export function getPlayablesSdkVersion(): string | undefined {
  return getPlayablesSdk()?.SDK_VERSION;
}

/**
 * Report a warning to YouTube Health API.
 * Rate-limited and best-effort by the SDK.
 */
export function reportWarning(): void {
  try {
    getPlayablesSdk()?.health?.logWarning?.();
  } catch {
    // Fail silently on logging error
  }
}

/**
 * Report an error to YouTube Health API.
 * Rate-limited and best-effort by the SDK.
 */
export function reportError(): void {
  try {
    getPlayablesSdk()?.health?.logError?.();
  } catch {
    // Fail silently on logging error
  }
}

/**
 * Notifies YouTube that the game has begun rendering visual frames.
 * MUST be called before gameReady().
 */
export function notifyFirstFrameReady(): void {
  try {
    const sdk = getPlayablesSdk();
    if (sdk?.game?.firstFrameReady) {
      sdk.game.firstFrameReady();
    }
  } catch {
    reportWarning();
  }
}

/**
 * Notifies YouTube that the game is interactable and ready for player input.
 * MUST NOT be called while loading screens are still visible.
 */
export function notifyGameReady(): void {
  try {
    const sdk = getPlayablesSdk();
    if (sdk?.game?.gameReady) {
      sdk.game.gameReady();
    }
  } catch {
    reportWarning();
  }
}

/**
 * Validates whether a string is well-formed UTF-16 and within the 3 MiB limit.
 */
function isSaveDataValid(data: string): boolean {
  if (typeof data !== "string") return false;
  // Modern browsers support isWellFormed
  if (typeof (data as unknown as { isWellFormed?: () => boolean }).isWellFormed === "function") {
    if (!data.isWellFormed()) return false;
  }
  // Rough byte calculation for UTF-16 string (2 bytes per character)
  const byteEstimate = data.length * 2;
  return byteEstimate <= MAX_SAVE_BYTES;
}

/**
 * Loads game data from YouTube cloud save when in Playables environment,
 * with graceful fallback to localStorage.
 */
export async function loadPersistedGame(): Promise<PersistedGame> {
  try {
    const inPlayables = isPlayablesEnvironment();
    let raw: string | null = null;

    if (inPlayables) {
      const sdk = getPlayablesSdk();
      if (sdk?.game?.loadData) {
        raw = await sdk.game.loadData();
      }
      cloudSaveReady = true;
    } else {
      raw = localStorage.getItem(LOCAL_SAVE_KEY);
    }

    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PersistedGame) : {};
  } catch {
    reportWarning();
    return {};
  }
}

/**
 * Saves game data to YouTube cloud save when in Playables environment,
 * with fallback to localStorage.
 */
export async function savePersistedGame(data: PersistedGame): Promise<void> {
  try {
    const serialized = JSON.stringify(data);
    if (!isSaveDataValid(serialized)) {
      reportWarning();
      return;
    }

    if (isPlayablesEnvironment()) {
      if (!cloudSaveReady) return; // Prevent overwriting before initial cloud load finishes
      const sdk = getPlayablesSdk();
      if (sdk?.game?.saveData) {
        await sdk.game.saveData(serialized);
      }
    } else {
      localStorage.setItem(LOCAL_SAVE_KEY, serialized);
    }
  } catch {
    reportWarning();
  }
}

/**
 * Sends a player's best score to YouTube.
 * The value must be a non-negative safe integer.
 */
export async function sendBestScore(score: number): Promise<void> {
  if (!Number.isSafeInteger(score) || score < 0) return;
  try {
    const sdk = getPlayablesSdk();
    if (sdk?.engagement?.sendScore) {
      await sdk.engagement.sendScore({ value: Math.floor(score) });
    }
  } catch {
    reportWarning();
  }
}

/**
 * Retrieves the user's preferred YouTube language (BCP-47 tag, e.g. "en-US").
 */
export async function getPlayablesLanguage(): Promise<string | undefined> {
  try {
    const sdk = getPlayablesSdk();
    if (sdk?.system?.getLanguage) {
      return await sdk.system.getLanguage();
    }
  } catch {
    reportWarning();
  }
  return typeof navigator !== "undefined" ? navigator.language : undefined;
}

/**
 * Reads user's language from Playables system and sets document.documentElement.lang.
 */
export async function applyPlayablesLocale(): Promise<string | undefined> {
  try {
    const language = await getPlayablesLanguage();
    if (language && typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
    return language;
  } catch {
    reportWarning();
    return undefined;
  }
}

/**
 * Subscribes to YouTube Playables system events:
 * - isAudioEnabled / onAudioEnabledChange
 * - onPause
 * - onResume
 */
export function subscribeToPlayablesSystem(callbacks: {
  onAudioEnabledChange: (enabled: boolean) => void;
  onPause: () => void;
  onResume: () => void;
}): () => void {
  const sdk = getPlayablesSdk();
  const system = sdk?.system;
  if (!system) return () => {};

  try {
    // Initial audio state sync
    const initialAudio = system.isAudioEnabled?.() ?? true;
    callbacks.onAudioEnabledChange(initialAudio);

    const removeAudioListener = system.onAudioEnabledChange?.(callbacks.onAudioEnabledChange);
    const removePauseListener = system.onPause?.(callbacks.onPause);
    const removeResumeListener = system.onResume?.(callbacks.onResume);

    return () => {
      removeAudioListener?.();
      removePauseListener?.();
      removeResumeListener?.();
    };
  } catch {
    reportWarning();
    return () => {};
  }
}
