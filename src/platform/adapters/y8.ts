import type { PlatformAdapter, PlatformInfo } from "../types";

export const y8Info: PlatformInfo = {
  id: "y8",
  name: "Y8 Games",
  icon: "🎱",
  vendor: "Y8.com",
  features: {
    cloudSave: true,
    leaderboards: true,
    interstitialAds: true,
    rewardedAds: false,
    audioSync: true,
    pauseResume: true,
    locale: false,
    socialShare: false,
  },
  description: "Legacy & modern Y8 Account and GameBreak API integration.",
};

declare global {
  interface Window {
    ID?: {
      init(options: { appId: string }): void;
      GameBreak(callback?: () => void): void;
      submitScore(score: number): void;
    };
  }
}

export class Y8Adapter implements PlatformAdapter {
  id = "y8" as const;
  name = "Y8 Games";
  info = y8Info;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.ID);
  }

  async init(): Promise<void> {}
  firstFrameReady(): void {}
  gameReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    const local = localStorage.getItem("suddenstop_y8_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_y8_save", JSON.stringify(data));
  }

  async submitScore(score: number): Promise<void> {
    if (typeof window !== "undefined" && window.ID?.submitScore) {
      window.ID.submitScore(score);
    }
  }

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.ID?.GameBreak) {
      return new Promise((resolve) => {
        window.ID?.GameBreak(() => resolve(true));
      });
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
      window.open("https://y8.com", "_blank", "noopener");
    }
  }
}
