import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import type { GameState, StructureInstance, ConstructionProject } from "../src/simulation/state";
import type { PlayerAction } from "../src/simulation/actions";
import { STRUCTURES } from "../src/simulation/data/structures";

const SEED = 42;
const DT = 1;

function stateWithStructure(
  structure: StructureInstance,
  arrayKey: "miners" | "reactors" | "printers" | "stations",
  materials = 1000,
): GameState {
  const state = createInitialState(SEED);
  const sol = state.systems["sol"]!;
  return {
    ...state,
    systems: {
      ...state.systems,
      sol: {
        ...sol,
        resources: { ...sol.resources, materials },
        structures: {
          ...sol.structures,
          [arrayKey]: [structure],
        },
      },
    },
  };
}

function makeMiner(id = "miner_inst_1", tier = 1): StructureInstance {
  return {
    id,
    type: "miner",
    tier,
    productionRate: 1.5,
    operatingCost: 0.5,
    maintenanceCost: 0.15,
    computeDemand: 0.2,
    active: true,
    constructionProgress: 1,
    health: 1,
  };
}

describe("destroy_structure action", () => {
  test("destroying a miner refunds 50% of materials cost", () => {
    const miner = makeMiner();
    const def = STRUCTURES["miner_1"]!;
    const expectedRefund = Math.floor(def.cost.materials * 0.5);
    const startingMaterials = 100;

    const state = stateWithStructure(miner, "miners", startingMaterials);
    const materialsBefore = state.systems["sol"]!.resources.materials;

    const action: PlayerAction = {
      type: "destroy_structure",
      systemId: "sol",
      structureId: miner.id,
    };

    const next = tick(state, DT, [action]);
    const sol = next.systems["sol"]!;

    expect(sol.structures.miners).toHaveLength(0);

    const materialsAfterAction = materialsBefore + expectedRefund;
    expect(sol.resources.materials).toBeGreaterThanOrEqual(materialsAfterAction - 2);
    expect(sol.resources.materials).toBeLessThanOrEqual(materialsAfterAction + 2);
  });

  test("destroying a printer removes its ID from construction queue", () => {
    const printer: StructureInstance = {
      id: "printer_inst_1",
      type: "printer",
      tier: 1,
      productionRate: 0.8,
      operatingCost: 0.5,
      maintenanceCost: 0.2,
      computeDemand: 0.3,
      active: true,
      constructionProgress: 1,
      health: 1,
    };

    const project: ConstructionProject = {
      id: "proj_test_miner",
      targetType: "miner",
      targetTier: 1,
      targetConfig: null,
      totalCost: { materials: 50, energy: 10 },
      remainingCost: { materials: 25, energy: 5 },
      progress: 0.5,
      assignedPrinterIds: ["printer_inst_1", "printer_inst_2"],
    };

    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;
    const stateWithPrinter: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          resources: { ...sol.resources, materials: 1000 },
          structures: { ...sol.structures, printers: [printer] },
          constructionQueue: [project],
        },
      },
    };

    const action: PlayerAction = {
      type: "destroy_structure",
      systemId: "sol",
      structureId: "printer_inst_1",
    };

    const next = tick(stateWithPrinter, DT, [action]);
    const solAfter = next.systems["sol"]!;

    expect(solAfter.structures.printers).toHaveLength(0);

    const updatedProject = solAfter.constructionQueue[0];
    expect(updatedProject).toBeDefined();
    expect(updatedProject!.assignedPrinterIds).not.toContain("printer_inst_1");
    expect(updatedProject!.assignedPrinterIds).toContain("printer_inst_2");
  });

  test("attempting to destroy a nonexistent structure is a no-op", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;
    const minersBefore = sol.structures.miners.length;

    const action: PlayerAction = {
      type: "destroy_structure",
      systemId: "sol",
      structureId: "nonexistent_structure_id",
    };

    const next = tick(state, DT, [action]);
    const solAfter = next.systems["sol"]!;

    expect(solAfter.structures.miners.length).toBe(minersBefore);
  });

  test("structures are removed from their respective arrays", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    const smelter: StructureInstance = {
      id: "reactor_inst_1",
      type: "reactor",
      tier: 1,
      productionRate: 1.5,
      operatingCost: 0,
      maintenanceCost: 0.08,
      computeDemand: 0.1,
      active: true,
      constructionProgress: 1,
      health: 1,
    };

    const miner = makeMiner("miner_inst_1");

    const stateWithBoth: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          resources: { ...sol.resources, materials: 1000 },
          structures: {
            ...sol.structures,
            miners: [miner],
            reactors: [smelter],
          },
        },
      },
    };

    const destroyReactor: PlayerAction = {
      type: "destroy_structure",
      systemId: "sol",
      structureId: "reactor_inst_1",
    };

    const afterDestroyReactor = tick(stateWithBoth, DT, [destroyReactor]);
    const solAfter = afterDestroyReactor.systems["sol"]!;

    expect(solAfter.structures.reactors).toHaveLength(0);
    expect(solAfter.structures.miners).toHaveLength(1);
  });
});
