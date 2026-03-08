import { useState, useCallback, useEffect } from "react";

export interface GameSettings {
  volume: number; // 0-1
  hapticEnabled: boolean;
}

const SETTINGS_KEY = "suddenstop_settings";

const defaultSettings: GameSettings = {
  volume: 0.7,
  hapticEnabled: true,
};

function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {}
  return defaultSettings;
}

export function useSettings() {
  const [settings, setSettingsState] = useState<GameSettings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
