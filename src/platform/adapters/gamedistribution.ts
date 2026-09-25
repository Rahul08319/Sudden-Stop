import type { PlatformAdapter, PlatformInfo } from "../types";

export const gamedistributionInfo: PlatformInfo = {
  id: "gamedistribution",
  name: "GameDistribution",
  icon: "🌐",
  vendor: "GameDistribution / OrangeGames",
  features: {
    cloudSave: false,
    leaderboards: false,
    interstitialAds: false,
    rewardedAds: false,
    audioSync: true,
    pauseResume: true,
    locale: false,
    socialShare: false,
  },
  description: "Worldwide publisher network adapter with HTML5 ad monetization.",
};

declare global {
  interface Window {
    gdsdk?: {
      showAd(type?: "interstitial" | "rewarded"): Promise<void>;
    };
    GD_OPTIONS?: Record<string, unknown>;
  }
}

export class GameDistributionAdapter implements PlatformAdapter {
  id = "gamedistribution" as const;
  name = "GameDistribution";
  info = gamedistributionInfo;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.gdsdk);
  }

  async init(): Promise<void> {}
  firstFrameReady(): void {}
  gameReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    const local = localStorage.getItem("suddenstop_gd_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_gd_save", JSON.stringify(data));
  }

  async submitScore(_score: number): Promise<void> {}

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.gdsdk) {
      try {
        await window.gdsdk.showAd("interstitial");
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.gdsdk) {
      try {
        await window.gdsdk.showAd("rewarded");
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  isAudioEnabled(): boolean {
    return true;
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://gamedistribution.com", "_blank", "noopener");
    }
  }
}
