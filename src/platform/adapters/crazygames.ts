import type { PlatformAdapter, PlatformInfo } from "../types";

export const crazygamesInfo: PlatformInfo = {
  id: "crazygames",
  name: "CrazyGames",
  icon: "🤪",
  vendor: "CrazyGames",
  features: {
    cloudSave: true,
    leaderboards: false,
    interstitialAds: false,
    rewardedAds: false,
    audioSync: true,
    pauseResume: true,
    locale: false,
    socialShare: false,
  },
  description: "Native CrazyGames SDK v3 integration with midgame and rewarded ad hooks.",
};

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        init(): Promise<void>;
        game: {
          gameplayStart(): void;
          gameplayStop(): void;
          loadingStart(): void;
          loadingStop(): void;
        };
        ad: {
          requestAd(
            type: "midgame" | "rewarded",
            callbacks?: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (error: unknown) => void;
            }
          ): Promise<void>;
        };
        data: {
          setItem(key: string, value: string): Promise<void>;
          getItem(key: string): Promise<string | null>;
        };
      };
    };
  }
}

export class CrazyGamesAdapter implements PlatformAdapter {
  id = "crazygames" as const;
  name = "CrazyGames";
  info = crazygamesInfo;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.CrazyGames?.SDK);
  }

  async init(): Promise<void> {
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      try {
        await window.CrazyGames.SDK.init();
      } catch {
        // Continue
      }
    }
  }

  firstFrameReady(): void {
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.loadingStart();
    }
  }

  gameReady(): void {
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.loadingStop();
    }
  }

  gameplayStart(): void {
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.gameplayStart();
    }
  }

  gameplayStop(): void {
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      window.CrazyGames.SDK.game.gameplayStop();
    }
  }

  async loadData<T>(): Promise<T | null> {
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      try {
        const raw = await window.CrazyGames.SDK.data.getItem("suddenstop_save");
        return raw ? JSON.parse(raw) : null;
      } catch {
        // Fallback
      }
    }
    const local = localStorage.getItem("suddenstop_cg_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    const serialized = JSON.stringify(data);
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      try {
        await window.CrazyGames.SDK.data.setItem("suddenstop_save", serialized);
        return;
      } catch {
        // Fallback
      }
    }
    localStorage.setItem("suddenstop_cg_save", serialized);
  }

  async submitScore(_score: number): Promise<void> {}

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      return new Promise((resolve) => {
        window.CrazyGames?.SDK?.ad.requestAd("midgame", {
          adFinished: () => resolve(true),
          adError: () => resolve(false),
        }).catch(() => resolve(false));
      });
    }
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) {
      return new Promise((resolve) => {
        window.CrazyGames?.SDK?.ad.requestAd("rewarded", {
          adFinished: () => resolve(true),
          adError: () => resolve(false),
        }).catch(() => resolve(false));
      });
    }
    return true; // Simulate in dev
  }

  isAudioEnabled(): boolean {
    return true;
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://www.crazygames.com", "_blank", "noopener");
    }
  }
}
