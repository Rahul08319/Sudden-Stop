import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getWeeklyChallenge } from "./weeklyChallenge";
import {
  isPlayablesEnvironment,
  getPlayablesSdkVersion,
  notifyFirstFrameReady,
  notifyGameReady,
  loadPersistedGame,
  savePersistedGame,
  sendBestScore,
  getPlayablesLanguage,
  applyPlayablesLocale,
  subscribeToPlayablesSystem,
  reportError,
  reportWarning,
} from "./youtubePlayables";

const root = process.cwd();

describe("YouTube Playables integration", () => {
  beforeEach(() => {
    delete (window as { ytgame?: unknown }).ytgame;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads the SDK before the application entrypoint in index.html", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    const sdkIndex = html.indexOf("https://www.youtube.com/game_api/v1");
    const appIndex = html.indexOf("/src/main.tsx");
    expect(sdkIndex).toBeGreaterThan(-1);
    expect(appIndex).toBeGreaterThan(-1);
    expect(sdkIndex).toBeLessThan(appIndex);
  });

  it("keeps weekly challenges deterministic for a given week", () => {
    const date = new Date("2026-09-10T12:00:00Z");
    expect(getWeeklyChallenge(date)).toEqual(getWeeklyChallenge(date));
  });

  it("exports required YouTube Playables lifecycle and data functions", () => {
    expect(typeof notifyFirstFrameReady).toBe("function");
    expect(typeof notifyGameReady).toBe("function");
    expect(typeof loadPersistedGame).toBe("function");
    expect(typeof savePersistedGame).toBe("function");
    expect(typeof subscribeToPlayablesSystem).toBe("function");
  });

  it("exports recommended YouTube Playables engagement, health, and locale functions", () => {
    expect(typeof getPlayablesLanguage).toBe("function");
    expect(typeof applyPlayablesLocale).toBe("function");
    expect(typeof sendBestScore).toBe("function");
    expect(typeof reportError).toBe("function");
    expect(typeof reportWarning).toBe("function");
  });

  it("does not request advertising or external YouTube content", () => {
    const source = readFileSync(resolve(root, "src/game/youtubePlayables.ts"), "utf8");
    expect(source).not.toContain("requestInterstitialAd");
    expect(source).not.toContain("requestRewardedAd");
    expect(source).not.toContain("openYTContent");
  });

  it("correctly identifies non-Playables environment and uses localStorage fallback", async () => {
    expect(isPlayablesEnvironment()).toBe(false);

    // Save and load via fallback
    await savePersistedGame({ highScore: 420 });
    const loaded = await loadPersistedGame();
    expect(loaded.highScore).toBe(420);
  });

  it("invokes SDK lifecycle methods when in Playables environment", () => {
    const firstFrameReadyMock = vi.fn();
    const gameReadyMock = vi.fn();

    (window as { ytgame?: unknown }).ytgame = {
      IN_PLAYABLES_ENV: true,
      SDK_VERSION: "1.0.0",
      game: {
        firstFrameReady: firstFrameReadyMock,
        gameReady: gameReadyMock,
      },
    };

    expect(isPlayablesEnvironment()).toBe(true);
    expect(getPlayablesSdkVersion()).toBe("1.0.0");

    notifyFirstFrameReady();
    expect(firstFrameReadyMock).toHaveBeenCalledOnce();

    notifyGameReady();
    expect(gameReadyMock).toHaveBeenCalledOnce();
  });

  it("subscribes to YouTube Playables system events (audio, pause, resume)", () => {
    const onAudioEnabledChangeMock = vi.fn();
    const onPauseMock = vi.fn();
    const onResumeMock = vi.fn();

    const mockUnsub = vi.fn();

    (window as { ytgame?: unknown }).ytgame = {
      IN_PLAYABLES_ENV: true,
      system: {
        isAudioEnabled: vi.fn(() => false),
        onAudioEnabledChange: vi.fn((cb) => {
          onAudioEnabledChangeMock(cb);
          return mockUnsub;
        }),
        onPause: vi.fn((cb) => {
          onPauseMock(cb);
          return mockUnsub;
        }),
        onResume: vi.fn((cb) => {
          onResumeMock(cb);
          return mockUnsub;
        }),
      },
    };

    const audioHandler = vi.fn();
    const pauseHandler = vi.fn();
    const resumeHandler = vi.fn();

    const unsubscribe = subscribeToPlayablesSystem({
      onAudioEnabledChange: audioHandler,
      onPause: pauseHandler,
      onResume: resumeHandler,
    });

    // Initial audio state should have been passed to callback
    expect(audioHandler).toHaveBeenCalledWith(false);
    expect(onAudioEnabledChangeMock).toHaveBeenCalled();
    expect(onPauseMock).toHaveBeenCalled();
    expect(onResumeMock).toHaveBeenCalled();

    unsubscribe();
    expect(mockUnsub).toHaveBeenCalledTimes(3);
  });

  it("sends valid scores to YouTube engagement API and filters invalid ones", async () => {
    const sendScoreMock = vi.fn().mockResolvedValue(undefined);
    (window as { ytgame?: unknown }).ytgame = {
      IN_PLAYABLES_ENV: true,
      engagement: { sendScore: sendScoreMock },
    };

    // Valid integer score
    await sendBestScore(250);
    expect(sendScoreMock).toHaveBeenCalledWith({ value: 250 });

    // Invalid negative score should be ignored
    sendScoreMock.mockClear();
    await sendBestScore(-5);
    expect(sendScoreMock).not.toHaveBeenCalled();

    // Invalid non-integer should be rounded or skipped
    sendScoreMock.mockClear();
    await sendBestScore(NaN);
    expect(sendScoreMock).not.toHaveBeenCalled();
  });

});
