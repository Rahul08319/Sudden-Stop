import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getWeeklyChallenge } from "./weeklyChallenge";

const root = process.cwd();

describe("YouTube Playables integration", () => {
  it("loads the SDK before the application entrypoint", () => {
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    expect(html.indexOf("https://www.youtube.com/game_api/v1"))
      .toBeLessThan(html.indexOf("/src/main.tsx"));
  });

  it("keeps weekly challenges deterministic for a given week", () => {
    const date = new Date("2026-09-10T12:00:00Z");
    expect(getWeeklyChallenge(date)).toEqual(getWeeklyChallenge(date));
  });

  it("does not include Playables advertising APIs", () => {
    const source = readFileSync(resolve(root, "src/game/youtubePlayables.ts"), "utf8");
    expect(source).not.toContain("requestInterstitialAd");
    expect(source).not.toContain("requestRewardedAd");
  });
});
