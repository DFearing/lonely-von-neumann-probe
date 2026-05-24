import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import type { GameState } from "../src/simulation/state";
import type { PlayerAction } from "../src/simulation/actions";

const SEED = 12345;
const DT = 1;

function buildActionSequence(): { tick: number; action: PlayerAction }[] {
  return [
    {
      tick: 5,
      action: {
        type: "build_structure",
        systemId: "sol",
        structureType: "reactor",
        tier: 1,
      },
    },
    {
      tick: 20,
      action: {
        type: "build_structure",
        systemId: "sol",
        structureType: "miner",
        tier: 1,
      },
    },
    {
      tick: 50,
      action: {
        type: "start_research",
        systemId: "sol",
        techId: "mining_efficiency_t1",
      },
    },
    {
      tick: 100,
      action: {
        type: "switch_system",
        systemId: "alpha_centauri",
      },
    },
    {
      tick: 200,
      action: { type: "pause" },
    },
    {
      tick: 250,
      action: { type: "unpause" },
    },
    {
      tick: 400,
      action: {
        type: "build_structure",
        systemId: "sol",
        structureType: "printer",
        tier: 1,
      },
    },
    {
      tick: 600,
      action: {
        type: "build_structure",
        systemId: "sol",
        structureType: "reactor",
        tier: 1,
      },
    },
  ];
}

function runSimulation(
  initial: GameState,
  totalTicks: number,
  schedule: { tick: number; action: PlayerAction }[],
): GameState {
  let current = initial;
  for (let i = 0; i < totalTicks; i++) {
    const actions = schedule
      .filter((s) => s.tick === current.tickCount)
      .map((s) => s.action);
    current = tick(current, DT, actions);
  }
  return current;
}

describe("determinism", () => {
  test("1000 ticks with actions produce identical final states from same seed", () => {
    const schedule = buildActionSequence();

    const final1 = runSimulation(createInitialState(SEED), 1000, schedule);
    const final2 = runSimulation(createInitialState(SEED), 1000, schedule);

    expect(final1).toEqual(final2);
  });

  test("save at tick 500, continue to 1000 matches full run", () => {
    const schedule = buildActionSequence();

    const fullRun = runSimulation(createInitialState(SEED), 1000, schedule);

    const at500 = runSimulation(createInitialState(SEED), 500, schedule);
    const savedJson = JSON.stringify(at500);
    const restored: GameState = JSON.parse(savedJson);

    const lateSchedule = schedule.filter((s) => s.tick >= 500);
    const fromRestore = runSimulation(restored, 500, lateSchedule);

    expect(fromRestore).toEqual(fullRun);
  });

  test("JSON round-trip of state produces identical tick output", () => {
    const state = createInitialState(SEED);

    let current = state;
    for (let i = 0; i < 50; i++) {
      current = tick(current, DT, []);
    }

    const serialized = JSON.stringify(current);
    const deserialized: GameState = JSON.parse(serialized);

    const fromOriginal = tick(current, DT, []);
    const fromDeserialized = tick(deserialized, DT, []);

    expect(fromDeserialized).toEqual(fromOriginal);
  });

  test("JSON round-trip preserves deep equality of state", () => {
    const state = createInitialState(SEED);

    let current = state;
    for (let i = 0; i < 100; i++) {
      current = tick(current, DT, []);
    }

    const roundTripped: GameState = JSON.parse(JSON.stringify(current));
    expect(roundTripped).toEqual(current);
  });
});
