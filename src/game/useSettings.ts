import { useState, useCallback, useEffect } from "react";
import { isPlayablesEnvironment } from "./youtubePlayables";

export interface GameSettings {
  volume: number; // 0-1
  hapticEnabled: boolean;
  reducedMotion: boolean;
  colorPalette: "default" | "highContrast" | "deuteranopia";
}

const SETTINGS_KEY = "suddenstop_settings";

const defaultSettings: GameSettings = {
  volume: 0.7,
  hapticEnabled: true,
  reducedMotion: false,
  colorPalette: "default",
};

function loadSettings(): GameSettings {
  if (isPlayablesEnvironment()) return defaultSettings;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {
    /* ignore settings read error */
  }
  return defaultSettings;
}

export function useSettings() {
  const [settings, setSettingsState] = useState<GameSettings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial };
      if (!isPlayablesEnvironment()) localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
