import type { PlatformAdapter, PlatformInfo } from "../types";

export const standaloneInfo: PlatformInfo = {
  id: "standalone",
  name: "Web / Apple Standalone",
  icon: "",
  vendor: "Independent Web / Apple Safari / iOS",
  features: {
    cloudSave: true,
    leaderboards: true,
    interstitialAds: true,
    rewardedAds: true,
    audioSync: true,
    pauseResume: true,
    locale: true,
    socialShare: true,
  },
  description: "Native Web app with Apple Liquid Glass design, local storage, and simulation mode.",
};

export class StandaloneAdapter implements PlatformAdapter {
  id = "standalone" as const;
  name = "Web / Apple Standalone";
  info = standaloneInfo;

  detect(): boolean {
    return true; // Default fallback
  }

  async init(): Promise<void> {}
  firstFrameReady(): void {}
  gameReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    const raw = localStorage.getItem("suddenstop_standalone_save");
    return raw ? JSON.parse(raw) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_standalone_save", JSON.stringify(data));
  }

  async submitScore(_score: number): Promise<void> {}

  async showInterstitial(): Promise<boolean> {
    // Simulated interstitial delay
    return new Promise((resolve) => setTimeout(() => resolve(true), 250));
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    // Simulated rewarded ad delay
    return new Promise((resolve) => setTimeout(() => resolve(true), 350));
  }

  isAudioEnabled(): boolean {
    return true;
  }

  getLanguage(): string {
    return typeof navigator !== "undefined" ? navigator.language : "en";
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://github.com/Rahul08319/sudden-stop-challenge", "_blank", "noopener");
    }
  }
}
