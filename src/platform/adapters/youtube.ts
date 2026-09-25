import type { PlatformAdapter, PlatformInfo } from "../types";
import {
  isPlayablesEnvironment,
  notifyFirstFrameReady,
  notifyGameReady,
  loadPersistedGame,
  savePersistedGame,
  sendBestScore,
  subscribeToPlayablesSystem,
  getPlayablesLanguage,
  getPlayablesSdk,
  type PersistedGame,
} from "../../game/youtubePlayables";

export const youtubeInfo: PlatformInfo = {
  id: "youtube",
  name: "YouTube Playables",
  icon: "▶️",
  vendor: "Google",
  features: {
    cloudSave: true,
    leaderboards: true,
    interstitialAds: false,
    rewardedAds: false,
    audioSync: true,
    pauseResume: true,
    locale: true,
    socialShare: false,
  },
  description: "Direct integration with official YouTube Playables Web SDK v1.",
};

export class YouTubeAdapter implements PlatformAdapter {
  id = "youtube" as const;
  name = "YouTube Playables";
  info = youtubeInfo;

  detect(): boolean {
    return isPlayablesEnvironment();
  }

  async init(): Promise<void> {
    // SDK is pre-loaded via script tag in index.html
  }

  firstFrameReady(): void {
    notifyFirstFrameReady();
  }

  gameReady(): void {
    notifyGameReady();
  }

  gameplayStart(): void {
    // YouTube tracks interaction via gameReady
  }

  gameplayStop(): void {
    // Handled on pause / game over
  }

  async loadData<T>(): Promise<T | null> {
    const data = await loadPersistedGame();
    return (data as unknown as T) || null;
  }

  async saveData<T>(data: T): Promise<void> {
    await savePersistedGame(data as unknown as PersistedGame);
  }

  async submitScore(score: number): Promise<void> {
    await sendBestScore(score);
  }

  async showInterstitial(_force?: boolean): Promise<boolean> {
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    return false;
  }

  isAudioEnabled(): boolean {
    const sdk = getPlayablesSdk();
    return sdk?.system?.isAudioEnabled?.() ?? true;
  }

  onAudioChange(callback: (enabled: boolean) => void): () => void {
    return subscribeToPlayablesSystem({
      onAudioEnabledChange: callback,
      onPause: () => {},
      onResume: () => {},
    });
  }

  onPause(callback: () => void): () => void {
    return subscribeToPlayablesSystem({
      onAudioEnabledChange: () => {},
      onPause: callback,
      onResume: () => {},
    });
  }

  onResume(callback: () => void): () => void {
    return subscribeToPlayablesSystem({
      onAudioEnabledChange: () => {},
      onPause: () => {},
      onResume: callback,
    });
  }

  getLanguage(): string {
    const sdk = getPlayablesSdk();
    return (sdk as { _lang?: string })?._lang || (typeof navigator !== "undefined" ? navigator.language : "en");
  }

  openCommunity(): void {
    // External navigation is intentionally unavailable inside Playables.
  }
}
