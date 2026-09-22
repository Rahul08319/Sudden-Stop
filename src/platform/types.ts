/**
 * Universal Platform SDK (UPS) Type Definitions
 * Cross-platform gaming abstraction layer for 13 major web & instant gaming platforms
 * Completely independent of Playgama or third-party aggregator SDKs.
 */

export type PlatformId =
  | "youtube"          // YouTube Playables
  | "facebook"         // Facebook Instant Games
  | "poki"             // Poki SDK
  | "crazygames"       // CrazyGames SDK
  | "yandex"           // Yandex Games
  | "gamedistribution" // GameDistribution
  | "discord"          // Discord Activities
  | "jiogames"         // JioGames
  | "y8"               // Y8 Games
  | "lagged"           // Lagged
  | "msstore"          // Microsoft Store (PWA)
  | "quickgame"        // Huawei & Xiaomi Quick Games
  | "reddit_msn"       // MSN & Reddit Web Games
  | "standalone";      // Standard Web / Localhost / Capacitor

export interface PlatformFeatures {
  cloudSave: boolean;
  leaderboards: boolean;
  interstitialAds: boolean;
  rewardedAds: boolean;
  audioSync: boolean;
  pauseResume: boolean;
  locale: boolean;
  socialShare: boolean;
}

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  icon: string;
  vendor: string;
  features: PlatformFeatures;
  description: string;
}

export interface PlatformAdapter {
  id: PlatformId;
  name: string;
  info: PlatformInfo;

  /**
   * Checks if this platform environment is active.
   */
  detect(): boolean;

  /**
   * Initializes the platform SDK.
   */
  init(): Promise<void>;

  /**
   * Notifies the platform that the initial visual frame is rendered.
   */
  firstFrameReady(): void;

  /**
   * Notifies the platform that the game is interactable and ready for input.
   */
  gameReady(): void;

  /**
   * Marks that active round gameplay has started.
   */
  gameplayStart(): void;

  /**
   * Marks that active round gameplay has stopped (game over / menu).
   */
  gameplayStop(): void;

  /**
   * Loads persisted game save data.
   */
  loadData<T>(): Promise<T | null>;

  /**
   * Saves game data to cloud/local storage.
   */
  saveData<T>(data: T): Promise<void>;

  /**
   * Transmits score to platform leaderboards.
   */
  submitScore(score: number): Promise<void>;

  /**
   * Requests an interstitial ad at natural gameplay breaks.
   */
  showInterstitial(force?: boolean): Promise<boolean>;

  /**
   * Requests a rewarded ad to award player items or revives.
   */
  showRewarded(rewardId: string): Promise<boolean>;

  /**
   * Queries if platform allows game audio.
   */
  isAudioEnabled(): boolean;

  /**
   * Subscribes to platform audio toggle events.
   */
  onAudioChange?(callback: (enabled: boolean) => void): () => void;

  /**
   * Subscribes to platform pause events.
   */
  onPause?(callback: () => void): () => void;

  /**
   * Subscribes to platform resume events.
   */
  onResume?(callback: () => void): () => void;

  /**
   * Retrieves player's preferred language tag.
   */
  getLanguage?(): string;

  /**
   * Opens community or related video content.
   */
  openCommunity?(): void;
}
