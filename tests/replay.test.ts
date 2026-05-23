import { describe, test, expect } from "bun:test";
import {
  createInputRecorder,
  createReplayController,
} from "../src/persistence/replay";
import type { PlayerAction } from "../src/simulation/actions";
import { createInitialState } from "../src/simulation/state";
import { tick } from "../src/simulation/tick";
import { TICK_MS } from "../src/loop/game-loop";

const SEED = 42;
const DT = TICK_MS / 1000;

describe("createInputRecorder", () => {
  test("getLog returns recorded actions in insertion order", () => {
    const recorder = createInputRecorder();

    const action1: PlayerAction = { type: "pause" };
    const action2: PlayerAction = { type: "set_speed", speed: 5 };
    recorder.record(1, action1);
    recorder.record(3, action2);

    const log = recorder.getLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toEqual({ tick: 1, action: action1 });
    expect(log[1]).toEqual({ tick: 3, action: action2 });
  });

  test("clear empties the log", () => {
    const recorder = createInputRecorder();
    recorder.record(1, { type: "pause" });
    recorder.record(2, { type: "unpause" });
    expect(recorder.getLog()).toHaveLength(2);

    recorder.clear();
    expect(recorder.getLog()).toHaveLength(0);
  });

  test("getLog returns empty array when nothing recorded", () => {
    const recorder = createInputRecorder();
    expect(recorder.getLog()).toHaveLength(0);
  });
});

describe("createReplayController", () => {
  test("replay with no actions matches manual ticks from same seed", () => {
    const numTicks = 10;

    let manual = createInitialState(SEED);
    for (let i = 0; i < numTicks; i++) {
      manual = tick(manual, DT, []);
    }

    const controller = createReplayController(SEED, []);
    controller.runToTick(numTicks);

    expect(controller.getState().tickCount).toBe(manual.tickCount);
    expect(controller.getState()).toEqual(manual);
  });

  test("replay with actions produces same final state as manual play", () => {
    const actions: PlayerAction[] = [
      { type: "set_speed", speed: 2 },
      { type: "switch_system", systemId: "alpha_centauri" },
    ];

    let manual = createInitialState(SEED);
    manual = tick(manual, DT, []);
    manual = tick(manual, DT, []);
    manual = tick(manual, DT, actions);
    manual = tick(manual, DT, []);
    manual = tick(manual, DT, []);

    const inputLog = actions.map((action) => ({ tick: 3, action }));
    const controller = createReplayController(SEED, inputLog);
    controller.runToTick(5);

    expect(controller.getState()).toEqual(manual);
  });

  test("stepForward advances currentTick by 1", () => {
    const controller = createReplayController(SEED, []);
    expect(controller.currentTick).toBe(0);

    controller.stepForward();
    expect(controller.currentTick).toBe(1);

    controller.stepForward();
    expect(controller.currentTick).toBe(2);
  });

  test("runToTick advances to the target tick", () => {
    const controller = createReplayController(SEED, []);
    controller.runToTick(15);
    expect(controller.currentTick).toBe(15);
  });

  test("runToTick with target at or below current tick is a no-op", () => {
    const controller = createReplayController(SEED, []);
    controller.runToTick(5);
    const stateAt5 = controller.getState();

    controller.runToTick(3);
    expect(controller.currentTick).toBe(5);
    expect(controller.getState()).toBe(stateAt5);
  });

  test("isComplete returns true when past the last action tick", () => {
    const inputLog = [
      { tick: 5, action: { type: "pause" as const } },
    ];
    const controller = createReplayController(SEED, inputLog);

    expect(controller.isComplete()).toBe(false);

    controller.runToTick(5);
    expect(controller.isComplete()).toBe(false);

    controller.stepForward();
    expect(controller.isComplete()).toBe(true);
  });

  test("isComplete returns true immediately for empty log", () => {
    const controller = createReplayController(SEED, []);
    controller.stepForward();
    expect(controller.isComplete()).toBe(true);
  });
});
