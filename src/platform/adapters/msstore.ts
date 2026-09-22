import type { PlatformAdapter, PlatformInfo } from "../types";

export const msstoreInfo: PlatformInfo = {
  id: "msstore",
  name: "Microsoft Store (PWA)",
  icon: "🪟",
  vendor: "Microsoft",
  features: {
    cloudSave: true,
    leaderboards: false,
    interstitialAds: false,
    rewardedAds: false,
    audioSync: true,
    pauseResume: true,
    locale: true,
    socialShare: true,
  },
  description: "Progressive Web App packaged for Windows 11 / Microsoft Store with offline capabilities.",
};

export class MsStoreAdapter implements PlatformAdapter {
  id = "msstore" as const;
  name = "Microsoft Store (PWA)";
  info = msstoreInfo;

  detect(): boolean {
    return (
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)")?.matches ||
        window.navigator.userAgent.includes("MSStore") ||
        (typeof navigator !== "undefined" && "windowControlsOverlay" in navigator))
    );
  }

  async init(): Promise<void> {
    // Register service worker if available
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // Continue
      }
    }
  }

  firstFrameReady(): void {}
  gameReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    const local = localStorage.getItem("suddenstop_msstore_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_msstore_save", JSON.stringify(data));
  }

  async submitScore(_score: number): Promise<void> {}

  async showInterstitial(): Promise<boolean> {
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    return true; // Simulate in dev
  }

  isAudioEnabled(): boolean {
    return true;
  }

  getLanguage(): string {
    return typeof navigator !== "undefined" ? navigator.language : "en";
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://apps.microsoft.com", "_blank", "noopener");
    }
  }
}
