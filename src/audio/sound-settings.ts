export interface SoundSettings {
  volume: number;
  muted: boolean;
}

const STORAGE_KEY = "lonely-probe-sound-settings";

const DEFAULT_SETTINGS: SoundSettings = {
  volume: 0.5,
  muted: false,
};

export function loadSoundSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_SETTINGS };

    const obj = parsed as Record<string, unknown>;
    const volume = typeof obj["volume"] === "number"
      ? Math.max(0, Math.min(1, obj["volume"]))
      : DEFAULT_SETTINGS.volume;
    const muted = typeof obj["muted"] === "boolean"
      ? obj["muted"]
      : DEFAULT_SETTINGS.muted;

    return { volume, muted };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable or full — silently ignore
  }
}
