type Recipe = (ctx: AudioContext, dest: AudioNode) => void;

function osc(
  ctx: AudioContext,
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  gain: number,
  freqEnd?: number,
): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, startTime);
  if (freqEnd !== undefined) {
    oscillator.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
  }

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.005);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(dest);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.01);
}

export const researchComplete: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sine", 523, now, 0.18, 0.3);
  osc(ctx, dest, "sine", 659, now + 0.08, 0.18, 0.3);
  osc(ctx, dest, "sine", 784, now + 0.16, 0.22, 0.3);
};

export const probeConstructed: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sine", 262, now, 0.3, 0.25);
  osc(ctx, dest, "sine", 392, now, 0.3, 0.2);
  osc(ctx, dest, "sine", 262, now + 0.3, 0.2, 0.25, 523);
};

export const minerConstructed: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "triangle", 220, now, 0.2, 0.15);
  osc(ctx, dest, "sine", 330, now + 0.15, 0.2, 0.2);
  osc(ctx, dest, "sine", 440, now + 0.3, 0.25, 0.22);
  osc(ctx, dest, "sine", 660, now + 0.5, 0.3, 0.25);
  osc(ctx, dest, "sine", 880, now + 0.75, 0.35, 0.18);
};

export const reactorConstructed: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sine", 110, now, 0.3, 0.18);
  osc(ctx, dest, "sine", 165, now + 0.2, 0.25, 0.2);
  osc(ctx, dest, "sine", 330, now + 0.4, 0.25, 0.22);
  osc(ctx, dest, "sine", 440, now + 0.6, 0.3, 0.25);
  osc(ctx, dest, "triangle", 660, now + 0.8, 0.35, 0.2);
};

export const printerConstructed: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "square", 262, now, 0.12, 0.12);
  osc(ctx, dest, "triangle", 392, now + 0.12, 0.18, 0.18);
  osc(ctx, dest, "sine", 523, now + 0.3, 0.22, 0.22);
  osc(ctx, dest, "sine", 784, now + 0.5, 0.28, 0.25);
  osc(ctx, dest, "sine", 1047, now + 0.72, 0.32, 0.18);
};

export const stationConstructed: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sine", 196, now, 0.25, 0.18);
  osc(ctx, dest, "sine", 262, now + 0.18, 0.22, 0.2);
  osc(ctx, dest, "sine", 392, now + 0.38, 0.25, 0.22);
  osc(ctx, dest, "sine", 523, now + 0.58, 0.3, 0.25);
  osc(ctx, dest, "triangle", 784, now + 0.8, 0.35, 0.2);
};

export const asteroidImpact: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(300, now);
  o.frequency.linearRampToValueAtTime(100, now + 0.3);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.25, now + 0.01);
  g.gain.linearRampToValueAtTime(0, now + 0.3);
  o.connect(g);
  g.connect(dest);
  o.start(now);
  o.stop(now + 0.31);
};

export const healthThreshold: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sawtooth", 220, now, 0.15, 0.2, 180);
  osc(ctx, dest, "square", 440, now + 0.1, 0.12, 0.25);
  osc(ctx, dest, "square", 440, now + 0.25, 0.12, 0.25);
  osc(ctx, dest, "square", 330, now + 0.4, 0.15, 0.22);
  osc(ctx, dest, "sawtooth", 180, now + 0.55, 0.25, 0.18, 110);
  osc(ctx, dest, "square", 440, now + 0.75, 0.12, 0.2);
  osc(ctx, dest, "square", 440, now + 0.9, 0.15, 0.22);
};

export const gameOver: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sawtooth", 440, now, 0.4, 0.25, 220);
  osc(ctx, dest, "square", 330, now + 0.2, 0.3, 0.2);
  osc(ctx, dest, "sawtooth", 220, now + 0.5, 0.5, 0.22, 110);
  osc(ctx, dest, "square", 165, now + 0.7, 0.4, 0.18);
  osc(ctx, dest, "sawtooth", 110, now + 1.0, 0.6, 0.2, 55);
  osc(ctx, dest, "sine", 82, now + 1.3, 0.8, 0.15, 41);
  osc(ctx, dest, "sine", 55, now + 1.8, 1.0, 0.12, 27);
};

export const tourStep: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sine", 880, now, 0.08, 0.15);
  osc(ctx, dest, "sine", 1100, now + 0.06, 0.1, 0.18);
};

export const uiClick: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sine", 660, now, 0.04, 0.12);
};

export const uiHover: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "sine", 440, now, 0.025, 0.06);
};

export const constructionQueued: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "triangle", 523, now, 0.06, 0.2);
  osc(ctx, dest, "triangle", 784, now + 0.05, 0.1, 0.22);
};
