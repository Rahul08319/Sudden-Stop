import type { PlatformAdapter, PlatformId, PlatformInfo } from "./types";
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

export class PlatformManager {
  private static instance: PlatformManager;
  private adapters: Map<PlatformId, PlatformAdapter> = new Map();
  private activeAdapter: PlatformAdapter;
  private listeners: Set<(platform: PlatformAdapter) => void> = new Set();

  private constructor() {
    // Register all 14 adapters (13 platforms + standalone)
    const allAdapters: PlatformAdapter[] = [
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
      new StandaloneAdapter(),
    ];

    for (const adapter of allAdapters) {
      this.adapters.set(adapter.id, adapter);
    }

    this.activeAdapter = this.detectActivePlatform();
  }

  public static getInstance(): PlatformManager {
    if (!PlatformManager.instance) {
      PlatformManager.instance = new PlatformManager();
    }
    return PlatformManager.instance;
  }

  private detectActivePlatform(): PlatformAdapter {
    if (typeof window === "undefined") {
      return this.adapters.get("standalone")!;
    }

    // 1. Check URL query parameter override (?platform=poki, ?platform=facebook, etc.)
    const params = new URLSearchParams(window.location.search);
    const queryPlatform = params.get("platform") as PlatformId | null;
    if (queryPlatform && this.adapters.has(queryPlatform)) {
      return this.adapters.get(queryPlatform)!;
    }

    // 2. Check saved manual selection in localStorage for developer/user simulator
    const saved = localStorage.getItem("suddenstop_target_platform") as PlatformId | null;
    if (saved && this.adapters.has(saved)) {
      return this.adapters.get(saved)!;
    }

    // 3. Auto-detect based on platform globals and environment
    for (const [id, adapter] of this.adapters.entries()) {
      if (id !== "standalone" && adapter.detect()) {
        return adapter;
      }
    }

    // 4. Default to standalone
    return this.adapters.get("standalone")!;
  }

  public getPlatformList(): PlatformInfo[] {
    return Array.from(this.adapters.values()).map((a) => a.info);
  }

  public getActivePlatform(): PlatformAdapter {
    return this.activeAdapter;
  }

  public setPlatform(id: PlatformId): void {
    const adapter = this.adapters.get(id);
    if (adapter) {
      this.activeAdapter = adapter;
      if (typeof window !== "undefined") {
        localStorage.setItem("suddenstop_target_platform", id);
      }
      this.listeners.forEach((listener) => listener(adapter));
      void adapter.init();
    }
  }

  public onPlatformChange(callback: (platform: PlatformAdapter) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Unified SDK Facade Delegation Methods:
  public async init(): Promise<void> {
    await this.activeAdapter.init();
  }

  public firstFrameReady(): void {
    this.activeAdapter.firstFrameReady();
  }

  public gameReady(): void {
    this.activeAdapter.gameReady();
  }

  public gameplayStart(): void {
    this.activeAdapter.gameplayStart();
  }

  public gameplayStop(): void {
    this.activeAdapter.gameplayStop();
  }

  public async loadData<T>(): Promise<T | null> {
    return await this.activeAdapter.loadData<T>();
  }

  public async saveData<T>(data: T): Promise<void> {
    await this.activeAdapter.saveData<T>(data);
  }

  public async submitScore(score: number): Promise<void> {
    await this.activeAdapter.submitScore(score);
  }

  public async showInterstitial(force?: boolean): Promise<boolean> {
    return await this.activeAdapter.showInterstitial(force);
  }

  public async showRewarded(rewardId: string): Promise<boolean> {
    return await this.activeAdapter.showRewarded(rewardId);
  }

  public isAudioEnabled(): boolean {
    return this.activeAdapter.isAudioEnabled();
  }

  public onAudioChange(callback: (enabled: boolean) => void): () => void {
    return this.activeAdapter.onAudioChange?.(callback) ?? (() => {});
  }

  public onPause(callback: () => void): () => void {
    return this.activeAdapter.onPause?.(callback) ?? (() => {});
  }

  public onResume(callback: () => void): () => void {
    return this.activeAdapter.onResume?.(callback) ?? (() => {});
  }

  public getLanguage(): string {
    return this.activeAdapter.getLanguage?.() || (typeof navigator !== "undefined" ? navigator.language : "en");
  }

  public openCommunity(): void {
    this.activeAdapter.openCommunity?.();
  }
}

export const platform = PlatformManager.getInstance();
