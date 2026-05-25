export interface MusicMood {
  id: string;
  label: string;
  description: string;
  scale: readonly number[];
  droneRoots: readonly number[];
  chords: readonly (readonly number[])[];
  melodyRange: readonly [number, number];
  timing: {
    droneHold: readonly [number, number];
    droneFade: number;
    padInterval: readonly [number, number];
    padAttack: number;
    padRelease: number;
    melodyPhraseGap: readonly [number, number];
    melodyNoteCount: readonly [number, number];
  };
}

export const MUSIC_MOODS: readonly MusicMood[] = [
  {
    id: "deep_space",
    label: "Deep Space",
    description: "Dark, vast, contemplative",
    scale: [
      65.41, 77.78, 87.31, 98.0, 116.54,
      130.81, 155.56, 174.61, 196.0, 233.08,
      261.63, 311.13, 349.23, 392.0, 466.16, 523.25,
    ],
    droneRoots: [0, 2, 3],
    chords: [
      [5, 6, 8],
      [7, 9, 10],
      [2, 5, 8],
      [6, 8, 10],
      [3, 7, 10],
      [5, 8, 10],
      [3, 6, 9],
      [2, 7, 10],
    ],
    melodyRange: [10, 15],
    timing: {
      droneHold: [12, 20],
      droneFade: 4,
      padInterval: [12, 18],
      padAttack: 2,
      padRelease: 3,
      melodyPhraseGap: [15, 30],
      melodyNoteCount: [2, 4],
    },
  },
  {
    id: "nebula",
    label: "Nebula",
    description: "Bright, warm, wonder",
    scale: [
      65.41, 73.42, 82.41, 98.0, 110.0,
      130.81, 146.83, 164.81, 196.0, 220.0,
      261.63, 293.66, 329.63, 392.0, 440.0, 523.25,
    ],
    droneRoots: [0, 3, 4],
    chords: [
      [5, 7, 9],
      [6, 8, 10],
      [5, 8, 11],
      [7, 10, 12],
      [4, 7, 10],
      [6, 9, 12],
      [5, 9, 12],
    ],
    melodyRange: [10, 15],
    timing: {
      droneHold: [10, 16],
      droneFade: 3,
      padInterval: [10, 15],
      padAttack: 1.5,
      padRelease: 2.5,
      melodyPhraseGap: [12, 25],
      melodyNoteCount: [2, 5],
    },
  },
  {
    id: "drift",
    label: "Drift",
    description: "Dreamlike, floating, ethereal",
    scale: [
      65.41, 73.42, 82.41, 92.5, 103.83, 116.54,
      130.81, 146.83, 164.81, 185.0, 207.65, 233.08,
      261.63, 293.66, 329.63, 369.99, 415.3, 466.16,
    ],
    droneRoots: [0, 2, 4],
    chords: [
      [6, 8, 10],
      [7, 9, 11],
      [6, 10, 14],
      [8, 12, 15],
      [5, 9, 13],
      [7, 11, 14],
      [6, 9, 12],
    ],
    melodyRange: [12, 17],
    timing: {
      droneHold: [16, 24],
      droneFade: 5,
      padInterval: [15, 22],
      padAttack: 3,
      padRelease: 4,
      melodyPhraseGap: [20, 40],
      melodyNoteCount: [2, 3],
    },
  },
  {
    id: "void",
    label: "Void",
    description: "Mysterious, eerie, vast emptiness",
    scale: [
      65.41, 69.3, 87.31, 98.0, 116.54,
      130.81, 138.59, 174.61, 196.0, 233.08,
      261.63, 277.18, 349.23, 392.0, 466.16, 523.25,
    ],
    droneRoots: [0, 1, 3],
    chords: [
      [5, 7, 9],
      [6, 8, 10],
      [5, 8, 11],
      [1, 5, 8],
      [6, 9, 11],
      [3, 7, 11],
      [5, 6, 9],
    ],
    melodyRange: [10, 15],
    timing: {
      droneHold: [14, 22],
      droneFade: 4,
      padInterval: [14, 20],
      padAttack: 2.5,
      padRelease: 3.5,
      melodyPhraseGap: [18, 35],
      melodyNoteCount: [2, 4],
    },
  },
] as const;

export const DEFAULT_MOOD_ID = "deep_space";

const MELODY_MAX_JUMP = 3;

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

interface FeedbackDelay {
  input: GainNode;
  allNodes: AudioNode[];
}

function createFeedbackDelay(
  ctx: AudioContext,
  dest: AudioNode,
): FeedbackDelay {
  const input = ctx.createGain();
  input.gain.value = 0.3;

  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.3;

  const feedback = ctx.createGain();
  feedback.gain.value = 0.5;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2000;

  const output = ctx.createGain();
  output.gain.value = 1.0;

  input.connect(delay);
  delay.connect(filter);
  filter.connect(feedback);
  feedback.connect(delay);
  delay.connect(output);
  output.connect(dest);

  return { input, allNodes: [input, delay, filter, feedback, output] };
}

export class AmbientMusic {
  private schedulerHandle: ReturnType<typeof setInterval> | null = null;
  private ctx: AudioContext | null = null;
  private dest: GainNode | null = null;
  private delayInput: GainNode | null = null;
  private delayNodes: AudioNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private textureFilterTarget = 3000;
  private textureFilterDirection = 1;

  private nextDroneTime = 0;
  private nextPadTime = 0;
  private nextMelodyTime = 0;
  private nextTextureSweepTime = 0;
  private lastMelodyIndex = 12;

  private activeNodes: Set<AudioNode> = new Set();

  private currentMood: MusicMood = MUSIC_MOODS[0]!;

  setMood(mood: MusicMood): void {
    this.currentMood = mood;
    if (this.ctx && this.dest) {
      const ctx = this.ctx;
      const dest = this.dest;
      this.stop();
      this.start(ctx, dest);
    }
  }

  start(ctx: AudioContext, dest: GainNode): void {
    this.stop();
    this.ctx = ctx;
    this.dest = dest;

    const now = ctx.currentTime;
    this.nextDroneTime = now;
    this.nextPadTime = now + 2;
    this.nextMelodyTime = now + 8;
    this.nextTextureSweepTime = now;

    const [melodyLow, melodyHigh] = this.currentMood.melodyRange;
    this.lastMelodyIndex = Math.floor((melodyLow + melodyHigh) / 2);

    const feedbackDelay = createFeedbackDelay(ctx, dest);
    this.delayInput = feedbackDelay.input;
    this.delayNodes = feedbackDelay.allNodes;

    this.startTexture(ctx, dest);

    this.schedulerHandle = setInterval(() => {
      this.scheduleAhead();
    }, 500);
  }

  stop(): void {
    if (this.schedulerHandle !== null) {
      clearInterval(this.schedulerHandle);
      this.schedulerHandle = null;
    }

    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch {
        // already stopped
      }
      this.noiseSource.disconnect();
      this.noiseSource = null;
    }

    if (this.noiseFilter) {
      this.noiseFilter.disconnect();
      this.noiseFilter = null;
    }

    if (this.noiseGain) {
      this.noiseGain.disconnect();
      this.noiseGain = null;
    }

    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // already disconnected
      }
    }
    this.activeNodes.clear();

    for (const node of this.delayNodes) {
      try {
        node.disconnect();
      } catch {
        // already disconnected
      }
    }
    this.delayNodes = [];
    this.delayInput = null;

    this.ctx = null;
    this.dest = null;
    this.noiseBuffer = null;
  }

  private scheduleAhead(): void {
    if (!this.ctx || !this.dest) return;

    const horizon = this.ctx.currentTime + 2;
    const { timing } = this.currentMood;

    while (this.nextDroneTime < horizon) {
      this.scheduleDrone(this.ctx, this.dest, this.nextDroneTime);
      const holdDuration = randomFloat(timing.droneHold[0], timing.droneHold[1]);
      this.nextDroneTime += timing.droneFade + holdDuration + timing.droneFade;
    }

    while (this.nextPadTime < horizon) {
      this.schedulePad(this.ctx, this.dest, this.nextPadTime);
      this.nextPadTime += randomFloat(timing.padInterval[0], timing.padInterval[1]);
    }

    while (this.nextMelodyTime < horizon) {
      this.scheduleMelodyPhrase(this.ctx, this.dest, this.nextMelodyTime);
      this.nextMelodyTime += randomFloat(timing.melodyPhraseGap[0], timing.melodyPhraseGap[1]);
    }

    while (this.nextTextureSweepTime < horizon) {
      this.scheduleTextureSweep(this.nextTextureSweepTime);
      const sweepDuration = randomFloat(10, 20);
      this.nextTextureSweepTime += sweepDuration;
    }
  }

  private scheduleDrone(ctx: AudioContext, dest: GainNode, startTime: number): void {
    const { scale, droneRoots, timing } = this.currentMood;
    const rootIndex = pickRandom(droneRoots);
    const rootFreq = scale[rootIndex]!;
    const detuneRatio = Math.pow(2, 3 / 1200);
    const holdDuration = randomFloat(timing.droneHold[0], timing.droneHold[1]);
    const fadeDuration = timing.droneFade;
    const totalDuration = fadeDuration + holdDuration + fadeDuration;
    const endTime = startTime + totalDuration;

    const createDroneOsc = (freq: number, peakGain: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + fadeDuration);
      gain.gain.setValueAtTime(peakGain, endTime - fadeDuration);
      gain.gain.linearRampToValueAtTime(0, endTime);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(startTime);
      osc.stop(endTime + 0.1);

      this.activeNodes.add(osc);
      this.activeNodes.add(gain);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.activeNodes.delete(osc);
        this.activeNodes.delete(gain);
      };
    };

    createDroneOsc(rootFreq, 0.1);
    createDroneOsc(rootFreq * detuneRatio, 0.1);
    createDroneOsc(rootFreq * 2, 0.04);
  }

  private schedulePad(ctx: AudioContext, dest: GainNode, startTime: number): void {
    if (!this.delayInput) return;

    const { scale, chords, timing } = this.currentMood;
    const chord = pickRandom(chords);
    const sustainEnd = startTime + randomFloat(timing.padInterval[0], timing.padInterval[1]) - timing.padRelease;
    const endTime = sustainEnd + timing.padRelease;

    for (const idx of chord) {
      const freq = scale[idx]!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = randomFloat(-3, 3);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + timing.padAttack);
      gain.gain.setValueAtTime(0.08, sustainEnd);
      gain.gain.linearRampToValueAtTime(0, endTime);

      osc.connect(gain);
      gain.connect(dest);
      gain.connect(this.delayInput);
      osc.start(startTime);
      osc.stop(endTime + 0.1);

      this.activeNodes.add(osc);
      this.activeNodes.add(gain);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.activeNodes.delete(osc);
        this.activeNodes.delete(gain);
      };
    }
  }

  private scheduleMelodyPhrase(ctx: AudioContext, dest: GainNode, startTime: number): void {
    if (!this.delayInput) return;

    const { scale, melodyRange, timing } = this.currentMood;
    const [melodyLow, melodyHigh] = melodyRange;
    const noteCount = randomInt(timing.melodyNoteCount[0], timing.melodyNoteCount[1]);
    let currentTime = startTime;
    let currentIndex = this.lastMelodyIndex;

    for (let i = 0; i < noteCount; i++) {
      const minIndex = Math.max(melodyLow, currentIndex - MELODY_MAX_JUMP);
      const maxIndex = Math.min(melodyHigh, currentIndex + MELODY_MAX_JUMP);
      const noteIndex = randomInt(minIndex, maxIndex);
      const freq = scale[noteIndex]!;
      const sustainDuration = randomFloat(0.3, 1.2);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const attackEnd = currentTime + 0.08;
      const sustainEnd = attackEnd + sustainDuration;
      const releaseEnd = sustainEnd + 0.5;

      gain.gain.setValueAtTime(0, currentTime);
      gain.gain.linearRampToValueAtTime(0.05, attackEnd);
      gain.gain.setValueAtTime(0.05, sustainEnd);
      gain.gain.linearRampToValueAtTime(0, releaseEnd);

      osc.connect(gain);
      gain.connect(dest);
      gain.connect(this.delayInput);
      osc.start(currentTime);
      osc.stop(releaseEnd + 0.1);

      this.activeNodes.add(osc);
      this.activeNodes.add(gain);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.activeNodes.delete(osc);
        this.activeNodes.delete(gain);
      };

      currentTime = releaseEnd + randomFloat(0.2, 0.5);
      currentIndex = noteIndex;
    }

    this.lastMelodyIndex = currentIndex;
  }

  private startTexture(ctx: AudioContext, dest: GainNode): void {
    const sampleRate = ctx.sampleRate;
    const bufferLength = sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.Q.value = 8;
    this.noiseFilter.frequency.value = 800;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.015;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(dest);

    this.noiseSource.start();
    this.textureFilterTarget = 3000;
    this.textureFilterDirection = 1;
  }

  private scheduleTextureSweep(startTime: number): void {
    if (!this.noiseFilter || !this.ctx) return;

    const sweepDuration = randomFloat(10, 20);
    const endTime = startTime + sweepDuration;

    if (this.textureFilterDirection > 0) {
      this.textureFilterTarget = randomFloat(2000, 3000);
    } else {
      this.textureFilterTarget = randomFloat(800, 1200);
    }
    this.textureFilterDirection *= -1;

    this.noiseFilter.frequency.setValueAtTime(
      this.noiseFilter.frequency.value,
      startTime,
    );
    this.noiseFilter.frequency.linearRampToValueAtTime(
      this.textureFilterTarget,
      endTime,
    );
  }
}
