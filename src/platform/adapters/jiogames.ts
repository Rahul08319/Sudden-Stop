import type { PlatformAdapter, PlatformInfo } from "../types";

export const jiogamesInfo: PlatformInfo = {
  id: "jiogames",
  name: "JioGames",
  icon: "🇮🇳",
  vendor: "Reliance Jio",
  features: {
    cloudSave: true,
    leaderboards: true,
    interstitialAds: true,
    rewardedAds: true,
    audioSync: true,
    pauseResume: true,
    locale: false,
    socialShare: false,
  },
  description: "Native JioGames SDK integration tailored for Jio Set-Top Boxes, JioPhone, and Web.",
};

declare global {
  interface Window {
    JioGames?: {
      init(config?: Record<string, unknown>): void;
      showAd(placement: string, onClosed?: () => void, onError?: () => void): void;
      showRewardedAd(placement: string, onRewarded?: () => void, onClosed?: () => void, onError?: () => void): void;
      postScore(score: number): void;
    };
  }
}

export class JioGamesAdapter implements PlatformAdapter {
  id = "jiogames" as const;
  name = "JioGames";
  info = jiogamesInfo;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.JioGames);
  }

  async init(): Promise<void> {
    if (typeof window !== "undefined" && window.JioGames) {
      window.JioGames.init();
    }
  }

  firstFrameReady(): void {}
  gameReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    const local = localStorage.getItem("suddenstop_jio_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_jio_save", JSON.stringify(data));
  }

  async submitScore(score: number): Promise<void> {
    if (typeof window !== "undefined" && window.JioGames) {
      window.JioGames.postScore(score);
    }
  }

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.JioGames) {
      return new Promise((resolve) => {
        window.JioGames?.showAd(
          "interstitial",
          () => resolve(true),
          () => resolve(false)
        );
      });
    }
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.JioGames) {
      return new Promise((resolve) => {
        let earned = false;
        window.JioGames?.showRewardedAd(
          "rewarded",
          () => {
            earned = true;
          },
          () => resolve(earned),
          () => resolve(false)
        );
      });
    }
    return true; // Simulate in dev
  }

  isAudioEnabled(): boolean {
    return true;
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://jiogames.com", "_blank", "noopener");
    }
  }
}
