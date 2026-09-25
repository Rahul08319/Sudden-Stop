import { describe, expect, it, beforeEach, vi } from "vitest";
import { platform, PlatformManager } from "./platformManager";
import { YouTubeAdapter } from "./adapters/youtube";
import { FacebookAdapter } from "./adapters/facebook";
import { PokiAdapter } from "./adapters/poki";
import { CrazyGamesAdapter } from "./adapters/crazygames";
import { YandexAdapter } from "./adapters/yandex";
import { GameDistributionAdapter } from "./adapters/gamedistribution";
import { DiscordAdapter } from "./adapters/discord";
import { JioGamesAdapter } from "./adapters/jiogames";
import { Y8Adapter } from "./adapters/y8";
import { LaggedAdapter } from "./adapters/lagged";
import { MsStoreAdapter } from "./adapters/msstore";
import { QuickGameAdapter } from "./adapters/quickgame";
import { RedditMsnAdapter } from "./adapters/redditMsn";
import { StandaloneAdapter } from "./adapters/standalone";
import type { PlatformAdapter } from "./types";

const ALL_ADAPTERS: PlatformAdapter[] = [
  new StandaloneAdapter(),
  new YouTubeAdapter(),
  new FacebookAdapter(),
  new PokiAdapter(),
  new CrazyGamesAdapter(),
  new YandexAdapter(),
  new GameDistributionAdapter(),
  new DiscordAdapter(),
  new JioGamesAdapter(),
  new Y8Adapter(),
  new LaggedAdapter(),
  new MsStoreAdapter(),
  new QuickGameAdapter(),
  new RedditMsnAdapter(),
];

describe("Universal Platform SDK Adapters (Zero-Playgama)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("registers exactly 14 native platform adapters", () => {
    expect(ALL_ADAPTERS).toHaveLength(14);
    const ids = new Set(ALL_ADAPTERS.map((a) => a.id));
    expect(ids.size).toBe(14);
  });

  describe.each(ALL_ADAPTERS)("Platform Adapter: $info.name ($id)", (adapter) => {
    it("has valid metadata and feature flags", () => {
      expect(adapter.id).toBeTruthy();
      expect(adapter.info.name).toBeTruthy();
      expect(adapter.info.icon).toBeTruthy();

      const features = adapter.info.features;
      expect(typeof features.cloudSave).toBe("boolean");
      expect(typeof features.leaderboards).toBe("boolean");
      expect(typeof features.interstitialAds).toBe("boolean");
      expect(typeof features.rewardedAds).toBe("boolean");
      expect(typeof features.pauseResume).toBe("boolean");
      expect(typeof features.audioSync).toBe("boolean");
      expect(typeof features.locale).toBe("boolean");
      expect(typeof features.socialShare).toBe("boolean");
    });

    it("initializes without throwing", async () => {
      await expect(adapter.init()).resolves.not.toThrow();
    });

    it("handles save and load data safely", async () => {
      await adapter.init();
      const testPayload = { score: 999, skin: "neon-cyan", timestamp: 12345 };

      await expect(adapter.saveData(testPayload)).resolves.not.toThrow();
      const loaded = await adapter.loadData<typeof testPayload>();
      if (loaded !== null) {
        expect(loaded).toEqual(testPayload);
      }
    });

    it("handles score submissions without throwing", async () => {
      await adapter.init();
      await expect(adapter.submitScore(850)).resolves.not.toThrow();
    });

    it("keeps dormant optional platform calls safe (resolving to boolean)", async () => {
      await adapter.init();
      const interResult = await adapter.showInterstitial();
      expect(typeof interResult).toBe("boolean");

      const rewardResult = await adapter.showRewarded("revive");
      expect(typeof rewardResult).toBe("boolean");
    });

    it("supports lifecycle callbacks registration and unregistration", () => {
      if (adapter.onPause) {
        const pauseUnsub = adapter.onPause(() => {});
        expect(typeof pauseUnsub).toBe("function");
        pauseUnsub();
      }

      if (adapter.onResume) {
        const resumeUnsub = adapter.onResume(() => {});
        expect(typeof resumeUnsub).toBe("function");
        resumeUnsub();
      }

      if (adapter.onAudioChange) {
        const volUnsub = adapter.onAudioChange(() => {});
        expect(typeof volUnsub).toBe("function");
        volUnsub();
      }
    });

    it("provides language and audio status", () => {
      expect(typeof adapter.isAudioEnabled()).toBe("boolean");
      if (adapter.getLanguage) {
        expect(typeof adapter.getLanguage()).toBe("string");
      }
    });
  });
});

describe("PlatformManager Unified Facade", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to standalone in standard browser without query param", () => {
    const active = platform.getActivePlatform();
    expect(active.id).toBe("standalone");
  });

  it("lists all 14 available platforms", () => {
    const list = platform.getPlatformList();
    expect(list).toHaveLength(14);
    expect(list.some((p) => p.id === "youtube")).toBe(true);
    expect(list.some((p) => p.id === "facebook")).toBe(true);
    expect(list.some((p) => p.id === "poki")).toBe(true);
    expect(list.some((p) => p.id === "crazygames")).toBe(true);
    expect(list.some((p) => p.id === "yandex")).toBe(true);
    expect(list.some((p) => p.id === "discord")).toBe(true);
    expect(list.some((p) => p.id === "msstore")).toBe(true);
    expect(list.some((p) => p.id === "jiogames")).toBe(true);
  });

  it("switches platforms dynamically and triggers subscribers", async () => {
    const listener = vi.fn();
    const unsubscribe = platform.onPlatformChange(listener);

    platform.setPlatform("crazygames");
    expect(platform.getActivePlatform().id).toBe("crazygames");
    expect(listener).toHaveBeenCalledWith(platform.getActivePlatform());

    platform.setPlatform("yandex");
    expect(platform.getActivePlatform().id).toBe("yandex");
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    platform.setPlatform("poki");
    expect(listener).toHaveBeenCalledTimes(2); // no more calls after unsubscribe
  });

  it("routes saveData and loadData through active adapter", async () => {
    platform.setPlatform("standalone");
    await platform.saveData({ val: 42 });
    const res = await platform.loadData<{ val: number }>();
    expect(res).toEqual({ val: 42 });
  });

  it("delegates lifecycle and frame notifications safely", () => {
    expect(() => platform.firstFrameReady()).not.toThrow();
    expect(() => platform.gameReady()).not.toThrow();
    expect(() => platform.gameplayStart()).not.toThrow();
    expect(() => platform.gameplayStop()).not.toThrow();
  });
});
