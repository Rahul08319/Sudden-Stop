import type { PlatformAdapter, PlatformInfo } from "../types";

export const redditMsnInfo: PlatformInfo = {
  id: "reddit_msn",
  name: "MSN & Reddit Games",
  icon: "👾",
  vendor: "Microsoft MSN / Reddit Dev Platform",
  features: {
    cloudSave: true,
    leaderboards: true,
    interstitialAds: false,
    rewardedAds: false,
    audioSync: true,
    pauseResume: true,
    locale: true,
    socialShare: true,
  },
  description: "Standardized iframe postMessage protocol for Reddit Developer Platform & MSN Games portal.",
};

export class RedditMsnAdapter implements PlatformAdapter {
  id = "reddit_msn" as const;
  name = "MSN & Reddit Games";
  info = redditMsnInfo;

  detect(): boolean {
    return (
      typeof window !== "undefined" &&
      (window.location.hostname.includes("reddit.com") ||
        window.location.hostname.includes("msn.com") ||
        (window.self !== window.top && Boolean(window.parent)))
    );
  }

  async init(): Promise<void> {
    if (typeof window !== "undefined" && window.parent && window.self !== window.top) {
      window.parent.postMessage({ type: "GAME_INIT", game: "sudden-stop" }, "*");
    }
  }

  firstFrameReady(): void {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "FIRST_FRAME_READY" }, "*");
    }
  }

  gameReady(): void {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "GAME_READY" }, "*");
    }
  }

  gameplayStart(): void {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "GAMEPLAY_START" }, "*");
    }
  }

  gameplayStop(): void {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "GAMEPLAY_STOP" }, "*");
    }
  }

  async loadData<T>(): Promise<T | null> {
    const local = localStorage.getItem("suddenstop_redditmsn_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_redditmsn_save", JSON.stringify(data));
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "SAVE_DATA", payload: data }, "*");
    }
  }

  async submitScore(score: number): Promise<void> {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "SUBMIT_SCORE", score: Math.floor(score) }, "*");
    }
  }

  async showInterstitial(): Promise<boolean> {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "REQUEST_INTERSTITIAL" }, "*");
    }
    return true;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage({ type: "REQUEST_REWARDED" }, "*");
    }
    return true; // Graceful reward resolution
  }

  isAudioEnabled(): boolean {
    return true;
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://reddit.com/r/webgames", "_blank", "noopener");
    }
  }
}
