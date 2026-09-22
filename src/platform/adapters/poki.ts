import type { PlatformAdapter, PlatformInfo } from "../types";

export const pokiInfo: PlatformInfo = {
  id: "poki",
  name: "Poki",
  icon: "🕹️",
  vendor: "Poki for Developers",
  features: {
    cloudSave: false,
    leaderboards: false,
    interstitialAds: true,
    rewardedAds: true,
    audioSync: true,
    pauseResume: true,
    locale: false,
    socialShare: false,
  },
  description: "Native Poki SDK v2 integration with commercialBreak and rewardedBreak.",
};

declare global {
  interface Window {
    PokiSDK?: {
      init(): Promise<void>;
      gameLoadingFinished(): void;
      gameplayStart(): void;
      gameplayStop(): void;
      commercialBreak(onStart?: () => void): Promise<void>;
      rewardedBreak(onStart?: () => void): Promise<boolean>;
    };
  }
}

export class PokiAdapter implements PlatformAdapter {
  id = "poki" as const;
  name = "Poki";
  info = pokiInfo;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.PokiSDK);
  }

  async init(): Promise<void> {
    if (typeof window !== "undefined" && window.PokiSDK) {
      try {
        await window.PokiSDK.init();
      } catch {
        // Continue
      }
    }
  }

  firstFrameReady(): void {}

  gameReady(): void {
    if (typeof window !== "undefined" && window.PokiSDK) {
      window.PokiSDK.gameLoadingFinished();
    }
  }

  gameplayStart(): void {
    if (typeof window !== "undefined" && window.PokiSDK) {
      window.PokiSDK.gameplayStart();
    }
  }

  gameplayStop(): void {
    if (typeof window !== "undefined" && window.PokiSDK) {
      window.PokiSDK.gameplayStop();
    }
  }

  async loadData<T>(): Promise<T | null> {
    const local = localStorage.getItem("suddenstop_poki_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_poki_save", JSON.stringify(data));
  }

  async submitScore(_score: number): Promise<void> {
    // Poki does not offer direct cloud leaderboards; handles local tracking
  }

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.PokiSDK) {
      try {
        await window.PokiSDK.commercialBreak();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.PokiSDK) {
      try {
        return await window.PokiSDK.rewardedBreak();
      } catch {
        return false;
      }
    }
    return true; // Simulate in dev
  }

  isAudioEnabled(): boolean {
    return true;
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://poki.com", "_blank", "noopener");
    }
  }
}
