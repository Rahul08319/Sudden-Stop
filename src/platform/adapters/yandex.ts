import type { PlatformAdapter, PlatformInfo } from "../types";

export const yandexInfo: PlatformInfo = {
  id: "yandex",
  name: "Yandex Games",
  icon: "🟡",
  vendor: "Yandex",
  features: {
    cloudSave: true,
    leaderboards: true,
    interstitialAds: true,
    rewardedAds: true,
    audioSync: true,
    pauseResume: true,
    locale: true,
    socialShare: false,
  },
  description: "Native Yandex Games SDK v2 with cloud saves, leaderboards, and Russian/CIS reach.",
};

declare global {
  interface Window {
    YaGames?: {
      init(): Promise<{
        features: {
          LoadingAPI?: {
            ready(): void;
          };
        };
        adv: {
          showFullscreenAdv(options: {
            callbacks?: {
              onClose?: (wasShown: boolean) => void;
              onError?: (error: unknown) => void;
            };
          }): void;
          showRewardedVideo(options: {
            callbacks?: {
              onOpen?: () => void;
              onRewarded?: () => void;
              onClose?: () => void;
              onError?: (error: unknown) => void;
            };
          }): void;
        };
        getPlayer(): Promise<{
          setData(data: Record<string, unknown>): Promise<void>;
          getData(keys?: string[]): Promise<Record<string, unknown>>;
        }>;
        getLeaderboards(): Promise<{
          setLeaderboardScore(name: string, score: number): Promise<void>;
        }>;
        environment: {
          i18n: {
            lang: string;
          };
        };
      }>;
    };
  }
}

export class YandexAdapter implements PlatformAdapter {
  id = "yandex" as const;
  name = "Yandex Games";
  info = yandexInfo;
  private ysdk: Awaited<ReturnType<NonNullable<typeof window.YaGames>["init"]>> | null = null;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.YaGames);
  }

  async init(): Promise<void> {
    if (typeof window !== "undefined" && window.YaGames) {
      try {
        this.ysdk = await window.YaGames.init();
      } catch {
        // Fallback
      }
    }
  }

  firstFrameReady(): void {}

  gameReady(): void {
    if (this.ysdk?.features?.LoadingAPI?.ready) {
      this.ysdk.features.LoadingAPI.ready();
    }
  }

  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    if (this.ysdk) {
      try {
        const player = await this.ysdk.getPlayer();
        const data = await player.getData(["suddenstop_save"]);
        return (data?.suddenstop_save as T) ?? null;
      } catch {
        // Fallback
      }
    }
    const local = localStorage.getItem("suddenstop_yandex_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    if (this.ysdk) {
      try {
        const player = await this.ysdk.getPlayer();
        await player.setData({ suddenstop_save: data });
        return;
      } catch {
        // Fallback
      }
    }
    localStorage.setItem("suddenstop_yandex_save", JSON.stringify(data));
  }

  async submitScore(score: number): Promise<void> {
    if (this.ysdk) {
      try {
        const lb = await this.ysdk.getLeaderboards();
        await lb.setLeaderboardScore("high_score", Math.floor(score));
      } catch {
        // Fallback
      }
    }
  }

  async showInterstitial(): Promise<boolean> {
    if (this.ysdk) {
      return new Promise((resolve) => {
        this.ysdk?.adv.showFullscreenAdv({
          callbacks: {
            onClose: (wasShown) => resolve(wasShown),
            onError: () => resolve(false),
          },
        });
      });
    }
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    if (this.ysdk) {
      return new Promise((resolve) => {
        let earned = false;
        this.ysdk?.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => {
              earned = true;
            },
            onClose: () => {
              resolve(earned);
            },
            onError: () => {
              resolve(false);
            },
          },
        });
      });
    }
    return true; // Simulate in dev
  }

  isAudioEnabled(): boolean {
    return true;
  }

  getLanguage(): string {
    return this.ysdk?.environment?.i18n?.lang || (typeof navigator !== "undefined" ? navigator.language : "en");
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://yandex.com/games", "_blank", "noopener");
    }
  }
}
