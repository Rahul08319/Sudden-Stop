import type { PlatformAdapter, PlatformInfo } from "../types";

export const quickgameInfo: PlatformInfo = {
  id: "quickgame",
  name: "Huawei & Xiaomi Quick Games",
  icon: "📱",
  vendor: "Huawei / Xiaomi Alliance",
  features: {
    cloudSave: true,
    leaderboards: false,
    interstitialAds: true,
    rewardedAds: true,
    audioSync: true,
    pauseResume: true,
    locale: true,
    socialShare: false,
  },
  description: "Native Fast App / Quick Game runtime for Huawei AppGallery & Xiaomi GetApps.",
};

declare global {
  interface Window {
    qg?: {
      createInterstitialAd(options: { adUnitId: string }): {
        load(): Promise<void>;
        show(): Promise<void>;
      };
      createRewardedVideoAd(options: { adUnitId: string }): {
        load(): Promise<void>;
        show(): Promise<void>;
        onClose(callback: (res: { isEnded: boolean }) => void): void;
      };
      setStorage(options: { key: string; data: string; success?: () => void }): void;
      getStorage(options: { key: string; success?: (res: { data: string }) => void }): void;
    };
  }
}

export class QuickGameAdapter implements PlatformAdapter {
  id = "quickgame" as const;
  name = "Huawei & Xiaomi Quick Games";
  info = quickgameInfo;

  detect(): boolean {
    return typeof window !== "undefined" && Boolean(window.qg);
  }

  async init(): Promise<void> {}
  firstFrameReady(): void {}
  gameReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    if (typeof window !== "undefined" && window.qg) {
      return new Promise((resolve) => {
        window.qg?.getStorage({
          key: "suddenstop_save",
          success: (res) => {
            try {
              resolve(res.data ? JSON.parse(res.data) : null);
            } catch {
              resolve(null);
            }
          },
        });
      });
    }
    const local = localStorage.getItem("suddenstop_qg_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    const serialized = JSON.stringify(data);
    if (typeof window !== "undefined" && window.qg) {
      window.qg.setStorage({
        key: "suddenstop_save",
        data: serialized,
      });
      return;
    }
    localStorage.setItem("suddenstop_qg_save", serialized);
  }

  async submitScore(_score: number): Promise<void> {}

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.qg) {
      try {
        const ad = window.qg.createInterstitialAd({ adUnitId: "INTERSTITIAL_AD_UNIT" });
        await ad.load();
        await ad.show();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.qg) {
      return new Promise((resolve) => {
        try {
          const ad = window.qg?.createRewardedVideoAd({ adUnitId: "REWARDED_AD_UNIT" });
          ad?.onClose((res) => resolve(Boolean(res.isEnded)));
          ad?.load().then(() => ad.show()).catch(() => resolve(false));
        } catch {
          resolve(false);
        }
      });
    }
    return true; // Simulate in dev
  }

  isAudioEnabled(): boolean {
    return true;
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://developer.huawei.com/consumer/en/quick-app", "_blank", "noopener");
    }
  }
}
