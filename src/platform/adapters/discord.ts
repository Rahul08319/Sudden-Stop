import type { PlatformAdapter, PlatformInfo } from "../types";

export const discordInfo: PlatformInfo = {
  id: "discord",
  name: "Discord Activities",
  icon: "💬",
  vendor: "Discord",
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
  description: "Native Discord Embedded App SDK for seamless in-voice channel multiplayer & activities.",
};

declare global {
  interface Window {
    DiscordSDK?: new (clientId: string) => {
      ready(): Promise<void>;
      instanceId: string;
      channelId: string;
    };
  }
}

export class DiscordAdapter implements PlatformAdapter {
  id = "discord" as const;
  name = "Discord Activities";
  info = discordInfo;

  detect(): boolean {
    return (
      typeof window !== "undefined" &&
      (Boolean(window.DiscordSDK) || window.location.hostname.includes("discordsays.com"))
    );
  }

  async init(): Promise<void> {
    // Discord activity ready handshake
  }

  firstFrameReady(): void {}
  gameReady(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}

  async loadData<T>(): Promise<T | null> {
    const local = localStorage.getItem("suddenstop_discord_save");
    return local ? JSON.parse(local) : null;
  }

  async saveData<T>(data: T): Promise<void> {
    localStorage.setItem("suddenstop_discord_save", JSON.stringify(data));
  }

  async submitScore(_score: number): Promise<void> {}

  async showInterstitial(): Promise<boolean> {
    // Discord activities typically do not inject external interstitials
    return false;
  }

  async showRewarded(_rewardId: string): Promise<boolean> {
    // Simulate reward or pass-through
    return true;
  }

  isAudioEnabled(): boolean {
    return true;
  }

  openCommunity(): void {
    if (typeof window !== "undefined") {
      window.open("https://discord.com", "_blank", "noopener");
    }
  }
}
