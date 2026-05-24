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
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(1200, now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.35, now + 0.005);
  g.gain.linearRampToValueAtTime(0, now + 0.08);
  o.connect(g);
  g.connect(dest);
  o.start(now);
  o.stop(now + 0.09);
};

export const reactorConstructed: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(80, now);
  o.frequency.linearRampToValueAtTime(200, now + 0.4);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.3, now + 0.2);
  g.gain.linearRampToValueAtTime(0, now + 0.6);
  o.connect(g);
  g.connect(dest);
  o.start(now);
  o.stop(now + 0.61);
};

export const printerConstructed: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  osc(ctx, dest, "square", 800, now, 0.03, 0.2);
  osc(ctx, dest, "triangle", 1000, now + 0.04, 0.15, 0.25);
};

export const stationConstructed: Recipe = (ctx, dest) => {
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(600, now);
  o.frequency.linearRampToValueAtTime(1200, now + 0.2);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.2, now + 0.01);
  g.gain.linearRampToValueAtTime(0, now + 0.2);
  o.connect(g);
  g.connect(dest);
  o.start(now);
  o.stop(now + 0.21);
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
  osc(ctx, dest, "square", 440, now, 0.06, 0.25);
  osc(ctx, dest, "square", 440, now + 0.08, 0.06, 0.25);
  osc(ctx, dest, "square", 440, now + 0.16, 0.06, 0.25);
};
