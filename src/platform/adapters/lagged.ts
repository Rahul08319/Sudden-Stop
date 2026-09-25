import type { PlatformAdapter, PlatformInfo } from "../types";

export const laggedInfo: PlatformInfo = {
  id: "lagged",
  name: "Lagged",
  icon: "⚡",
  vendor: "Lagged.com",
  features: {
    cloudSave: false,
    leaderboards: true,
    interstitialAds: false,
    rewardedAds: false,
    audioSync: true,
    pauseResume: true,
    locale: false,
    socialShare: false,
  },
  description: "Lagged.com Games API v2 with high scores, achievements, and ads.",
};

declare global {
  interface Window {
    LaggedAPI?: {
      init(devId: string, pubId: string): void;
      Scores: {
        save(options: { score: number; board: string }, callback?: (res: unknown) => void): void;
      };
      Achievements: {
        save(options: { achievement: string }, callback?: (res: unknown) => void): void;
      };
      showAd(): Promise<void>;
    };
  }
}

export class LaggedAdapter implements PlatformAdapter {
  id = "lagged" as const;
  name = "Lagged";
  info = laggedInfo;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.LaggedAPI);
  }

  async init(): Promise<void> {}
  firstFrameReady(): void {}
  gameReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    const local = localStorage.getItem("suddenstop_lagged_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_lagged_save", JSON.stringify(data));
  }

  async submitScore(score: number): Promise<void> {
    if (typeof window !== "undefined" && window.LaggedAPI) {
      window.LaggedAPI.Scores.save({ score, board: "high_score" });
    }
  }

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.LaggedAPI) {
      try {
        await window.LaggedAPI.showAd();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    return true; // Simulate in dev
  }

  isAudioEnabled(): boolean {
    return true;
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://lagged.com", "_blank", "noopener");
    }
  }
}
