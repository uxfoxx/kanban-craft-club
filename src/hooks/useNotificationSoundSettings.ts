import { useState, useCallback } from 'react';

const SOUND_SETTINGS_KEY = 'notification-sound-settings';

interface SoundSettings {
  enabled: boolean;
  volume: number;
  mutedTypes: string[];
}

const defaultSettings: SoundSettings = { enabled: true, volume: 70, mutedTypes: [] };

const loadSettings = (): SoundSettings => {
  try {
    const stored = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {}
  return defaultSettings;
};

const saveSettings = (settings: SoundSettings) => {
  localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(settings));
};

export const useNotificationSoundSettings = () => {
  const [settings, setSettings] = useState<SoundSettings>(loadSettings);

  const update = useCallback((partial: Partial<SoundSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    update({ enabled: !settings.enabled });
  }, [settings.enabled, update]);

  const setVolume = useCallback((volume: number) => {
    update({ volume });
  }, [update]);

  const toggleMuteType = useCallback((type: string) => {
    const mutedTypes = settings.mutedTypes.includes(type)
      ? settings.mutedTypes.filter(t => t !== type)
      : [...settings.mutedTypes, type];
    update({ mutedTypes });
  }, [settings.mutedTypes, update]);

  return {
    settings,
    toggleEnabled,
    setVolume,
    toggleMuteType,
  };
};
