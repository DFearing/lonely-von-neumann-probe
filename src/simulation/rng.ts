export type RngState = readonly [number, number, number, number];

export interface Rng {
  nextFloat(): number;
  nextInt(min: number, max: number): number;
  chance(p?: number): boolean;
  pick<T>(array: readonly T[]): T;
  shuffle<T>(array: readonly T[]): T[];
  weightedPick<T>(options: readonly { value: T; weight: number }[]): T;
  snapshot(): RngState;
  restore(state: RngState): void;
}

function splitmix32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x9e3779b9) | 0;
    let t = seed ^ (seed >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

function xoshiro128ss(s: [number, number, number, number]): number {
  const result = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
  const t = s[1] << 9;
  s[2] ^= s[0];
  s[3] ^= s[1];
  s[1] ^= s[2];
  s[0] ^= s[3];
  s[2] ^= t;
  s[3] = rotl(s[3], 11);
  return result;
}

function createRngFromMutableState(s: [number, number, number, number]): Rng {
  function nextFloat(): number {
    return xoshiro128ss(s) / 0x100000000;
  }

  function nextInt(min: number, max: number): number {
    return min + Math.floor(nextFloat() * (max - min + 1));
  }

  function chance(p = 0.5): boolean {
    return nextFloat() < p;
  }

  function pick<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot pick from an empty array");
    }
    return array[nextInt(0, array.length - 1)]!;
  }

  function shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }

  function weightedPick<T>(
    options: readonly { value: T; weight: number }[],
  ): T {
    if (options.length === 0) {
      throw new Error("Cannot pick from empty options");
    }
    let totalWeight = 0;
    for (const option of options) {
      totalWeight += option.weight;
    }
    let remaining = nextFloat() * totalWeight;
    for (const option of options) {
      remaining -= option.weight;
      if (remaining < 0) {
        return option.value;
      }
    }
    return options[options.length - 1]!.value;
  }

  function snapshot(): RngState {
    return [s[0], s[1], s[2], s[3]];
  }

  function restore(state: RngState): void {
    s[0] = state[0];
    s[1] = state[1];
    s[2] = state[2];
    s[3] = state[3];
  }

  return { nextFloat, nextInt, chance, pick, shuffle, weightedPick, snapshot, restore };
}

export function createRng(seed: number): Rng {
  const next = splitmix32(seed);
  return createRngFromMutableState([next(), next(), next(), next()]);
}

export function createRngFromState(state: RngState): Rng {
  return createRngFromMutableState([state[0], state[1], state[2], state[3]]);
}
