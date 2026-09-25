import type { PlatformAdapter, PlatformInfo } from "../types";

export const facebookInfo: PlatformInfo = {
  id: "facebook",
  name: "Facebook Instant Games",
  icon: "🌐",
  vendor: "Meta",
  features: {
    cloudSave: true,
    leaderboards: true,
    interstitialAds: false,
    rewardedAds: false,
    audioSync: false,
    pauseResume: true,
    locale: true,
    socialShare: true,
  },
  description: "Native Meta FBInstant SDK v7 integration for Messenger & Facebook web.",
};

declare global {
  interface Window {
    FBInstant?: {
      initializeAsync(): Promise<void>;
      setLoadingProgress(progress: number): void;
      startGameAsync(): Promise<void>;
      getLocale(): string;
      player: {
        getDataAsync(keys: string[]): Promise<Record<string, unknown>>;
        setDataAsync(data: Record<string, unknown>): Promise<void>;
        getName(): string;
        getID(): string;
      };
      getLeaderboardAsync(name: string): Promise<{
        setScoreAsync(score: number, extraData?: string): Promise<{ getScore(): number; getRank(): number }>;
      }>;
      getInterstitialAdAsync(placementId: string): Promise<{
        loadAsync(): Promise<void>;
        showAsync(): Promise<void>;
      }>;
      getRewardedVideoAsync(placementId: string): Promise<{
        loadAsync(): Promise<void>;
        showAsync(): Promise<void>;
      }>;
      onPause(callback: () => void): void;
    };
  }
}

export class FacebookAdapter implements PlatformAdapter {
  id = "facebook" as const;
  name = "Facebook Instant Games";
  info = facebookInfo;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.FBInstant);
  }

  async init(): Promise<void> {
    if (typeof window !== "undefined" && window.FBInstant) {
      try {
        await window.FBInstant.initializeAsync();
        window.FBInstant.setLoadingProgress(100);
      } catch {
        // Fallback gracefully if initialization fails
      }
    }
  }

  firstFrameReady(): void {
    // Handled in FBInstant
  }

  gameReady(): void {
    if (typeof window !== "undefined" && window.FBInstant) {
      void window.FBInstant.startGameAsync().catch(() => {});
    }
  }

  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    if (typeof window !== "undefined" && window.FBInstant) {
      try {
        const data = await window.FBInstant.player.getDataAsync(["suddenstop_save"]);
        return (data?.suddenstop_save as T) ?? null;
      } catch {
        // Fallback
      }
    }
    const local = localStorage.getItem("suddenstop_fb_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    if (typeof window !== "undefined" && window.FBInstant) {
      try {
        await window.FBInstant.player.setDataAsync({ suddenstop_save: data });
        return;
      } catch {
        // Fallback
      }
    }
    localStorage.setItem("suddenstop_fb_save", JSON.stringify(data));
  }

  async submitScore(score: number): Promise<void> {
    if (typeof window !== "undefined" && window.FBInstant) {
      try {
        const lb = await window.FBInstant.getLeaderboardAsync("global_leaderboard");
        await lb.setScoreAsync(Math.floor(score));
      } catch {
        // Log or fallback
      }
    }
  }

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.FBInstant) {
      try {
        const ad = await window.FBInstant.getInterstitialAdAsync("INTERSTITIAL_PLACEMENT_ID");
        await ad.loadAsync();
        await ad.showAsync();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.FBInstant) {
      try {
        const ad = await window.FBInstant.getRewardedVideoAsync("REWARDED_PLACEMENT_ID");
        await ad.loadAsync();
        await ad.showAsync();
        return true;
      } catch {
        return false;
      }
    }
    return true; // Simulate reward in dev
  }

  isAudioEnabled(): boolean {
    return true;
  }

  onPause(callback: () => void): () => void {
    if (typeof window !== "undefined" && window.FBInstant) {
      window.FBInstant.onPause(callback);
    }
    return () => {};
  }

  getLanguage(): string {
    return typeof window !== "undefined" && window.FBInstant
      ? window.FBInstant.getLocale()
      : (typeof navigator !== "undefined" ? navigator.language : "en");
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://www.facebook.com/gaming", "_blank", "noopener");
    }
  }
}
