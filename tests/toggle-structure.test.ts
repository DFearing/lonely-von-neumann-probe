import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import type { GameState, StructureInstance } from "../src/simulation/state";
import type { PlayerAction } from "../src/simulation/actions";

const SEED = 42;
const DT = 1;

function stateWithMiner(active: boolean): GameState {
  const state = createInitialState(SEED);
  const sol = state.systems["sol"]!;

  const miner: StructureInstance = {
    id: "miner_toggle_1",
    type: "miner",
    tier: 1,
    productionRate: 1.5,
    operatingCost: 0.5,
    maintenanceCost: 0.15,
    computeDemand: 0.2,
    active,
    constructionProgress: 1,
    health: 1,
  };

  return {
    ...state,
    systems: {
      ...state.systems,
      sol: {
        ...sol,
        resources: { ...sol.resources, materials: 500 },
        structures: { ...sol.structures, miners: [miner] },
      },
    },
  };
}

describe("toggle_structure action", () => {
  test("toggle active structure to inactive", () => {
    const state = stateWithMiner(true);

    const action: PlayerAction = {
      type: "toggle_structure",
      systemId: "sol",
      structureId: "miner_toggle_1",
    };

    const next = tick(state, DT, [action]);
    const miner = next.systems["sol"]!.structures.miners[0]!;

    expect(miner.active).toBe(false);
  });

  test("toggle inactive structure back to active", () => {
    const state = stateWithMiner(false);

    const action: PlayerAction = {
      type: "toggle_structure",
      systemId: "sol",
      structureId: "miner_toggle_1",
    };

    const next = tick(state, DT, [action]);
    const miner = next.systems["sol"]!.structures.miners[0]!;

    expect(miner.active).toBe(true);
  });

  test("toggle on nonexistent system is a no-op", () => {
    const state = stateWithMiner(true);

    const action: PlayerAction = {
      type: "toggle_structure",
      systemId: "nonexistent_system",
      structureId: "miner_toggle_1",
    };

    const next = tick(state, DT, [action]);
    const miner = next.systems["sol"]!.structures.miners[0]!;

    expect(miner.active).toBe(true);
  });

  test("toggle on nonexistent structure leaves all structures unchanged", () => {
    const state = stateWithMiner(true);

    const action: PlayerAction = {
      type: "toggle_structure",
      systemId: "sol",
      structureId: "nonexistent_structure_id",
    };

    const next = tick(state, DT, [action]);
    const miner = next.systems["sol"]!.structures.miners[0]!;

    expect(miner.active).toBe(true);
  });
});
