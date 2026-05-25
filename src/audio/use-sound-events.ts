import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useGameState } from "../ui/context";
import type { SoundEventType } from "../simulation/state";
import type { SoundSettings } from "./sound-settings";
import { soundManager } from "./sound-manager";

export function useSoundEvents(): void {
  const state = useGameState();
  const prevLogLengthRef = useRef(state.log.length);

  useEffect(() => {
    const prevLength = prevLogLengthRef.current;
    const logLength = state.log.length;

    if (logLength > prevLength) {
      const newEntries = state.log.slice(prevLength);
      const played = new Set<SoundEventType>();

      for (const entry of newEntries) {
        if (entry.soundEvent && !played.has(entry.soundEvent)) {
          played.add(entry.soundEvent);
          soundManager.play(entry.soundEvent);
        }
      }
    }

    prevLogLengthRef.current = logLength;
  }, [state.log.length]);
}

export function useSoundSettings(): {
  settings: SoundSettings;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setMusicVolume: (v: number) => void;
  setMusicMuted: (m: boolean) => void;
  setMusicMood: (id: string) => void;
} {
  const settings = useSyncExternalStore(
    (cb) => soundManager.subscribe(cb),
    () => soundManager.getSettings(),
  );

  const setVolume = useCallback((v: number) => soundManager.setVolume(v), []);
  const setMuted = useCallback((m: boolean) => soundManager.setMuted(m), []);
  const setMusicVolume = useCallback((v: number) => soundManager.setMusicVolume(v), []);
  const setMusicMuted = useCallback((m: boolean) => soundManager.setMusicMuted(m), []);
  const setMusicMood = useCallback((id: string) => soundManager.setMusicMood(id), []);

  return {
    settings,
    setVolume,
    setMuted,
    setMusicVolume,
    setMusicMuted,
    setMusicMood,
  };
}
