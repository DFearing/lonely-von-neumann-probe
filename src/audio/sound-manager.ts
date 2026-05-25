import type { SoundEventType } from "../simulation/state";
import type { SoundSettings } from "./sound-settings";
import { loadSoundSettings, saveSoundSettings } from "./sound-settings";
import * as recipes from "./sound-recipes";
import { AmbientMusic, MUSIC_MOODS } from "./ambient-music";

type Recipe = (ctx: AudioContext, dest: AudioNode) => void;

export type UISoundType = "tour_step" | "ui_click" | "ui_hover";

const RECIPE_MAP: Record<SoundEventType, Recipe> = {
  research_complete: recipes.researchComplete,
  probe_constructed: recipes.probeConstructed,
  miner_constructed: recipes.minerConstructed,
  reactor_constructed: recipes.reactorConstructed,
  printer_constructed: recipes.printerConstructed,
  station_constructed: recipes.stationConstructed,
  asteroid_impact: recipes.asteroidImpact,
  health_threshold: recipes.healthThreshold,
};

const UI_RECIPE_MAP: Record<UISoundType, Recipe> = {
  tour_step: recipes.tourStep,
  ui_click: recipes.uiClick,
  ui_hover: recipes.uiHover,
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientMusic = new AmbientMusic();
  private musicStarted = false;
  private settings: SoundSettings;
  private subscribers = new Set<() => void>();

  constructor() {
    this.settings = Object.freeze(loadSoundSettings());
  }

  private ensureContext(): { ctx: AudioContext; gain: GainNode } {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.volume;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.settings.musicMuted ? 0 : this.settings.musicVolume;
      this.musicGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    return { ctx: this.ctx, gain: this.masterGain! };
  }

  play(event: SoundEventType): void {
    if (this.settings.muted) return;

    const recipe = RECIPE_MAP[event];
    const { ctx, gain } = this.ensureContext();
    recipe(ctx, gain);
  }

  playUI(event: UISoundType): void {
    if (this.settings.muted) return;

    const recipe = UI_RECIPE_MAP[event];
    const { ctx, gain } = this.ensureContext();
    recipe(ctx, gain);
  }

  preview(event: SoundEventType): void {
    const recipe = RECIPE_MAP[event];
    const { ctx, gain } = this.ensureContext();
    recipe(ctx, gain);
  }

  getSettings(): SoundSettings {
    return this.settings;
  }

  setVolume(v: number): void {
    this.settings = Object.freeze({ ...this.settings, volume: Math.max(0, Math.min(1, v)) });
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.volume;
    }
    saveSoundSettings(this.settings);
    this.notify();
  }

  setMuted(m: boolean): void {
    this.settings = Object.freeze({ ...this.settings, muted: m });
    saveSoundSettings(this.settings);
    this.notify();
  }

  startMusic(): void {
    if (this.musicStarted) return;
    const { ctx } = this.ensureContext();
    const mood = MUSIC_MOODS.find(m => m.id === this.settings.musicMood);
    if (mood) this.ambientMusic.setMood(mood);
    this.ambientMusic.start(ctx, this.musicGain!);
    this.musicStarted = true;
  }

  setMusicMood(moodId: string): void {
    const mood = MUSIC_MOODS.find(m => m.id === moodId);
    if (!mood) return;
    this.settings = Object.freeze({ ...this.settings, musicMood: moodId });
    this.ambientMusic.setMood(mood);
    saveSoundSettings(this.settings);
    this.notify();
  }

  stopMusic(): void {
    this.ambientMusic.stop();
    this.musicStarted = false;
  }

  setMusicVolume(v: number): void {
    this.settings = Object.freeze({ ...this.settings, musicVolume: Math.max(0, Math.min(1, v)) });
    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.musicMuted ? 0 : this.settings.musicVolume;
    }
    saveSoundSettings(this.settings);
    this.notify();
  }

  setMusicMuted(m: boolean): void {
    this.settings = Object.freeze({ ...this.settings, musicMuted: m });
    if (this.musicGain) {
      this.musicGain.gain.value = m ? 0 : this.settings.musicVolume;
    }
    saveSoundSettings(this.settings);
    this.notify();
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notify(): void {
    for (const cb of this.subscribers) {
      cb();
    }
  }
}

export const soundManager = new SoundManager();
