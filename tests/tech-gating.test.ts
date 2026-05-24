import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import type { GameState } from "../src/simulation/state";
import type { PlayerAction } from "../src/simulation/actions";
import { STRUCTURES } from "../src/simulation/data/structures";
import { totalProbeCost } from "../src/simulation/data/components";

const SEED = 42;
const DT = 1;

function stateWithResourcesAndResearch(
  materials: number,
  energy: number,
  completedResearch: Record<string, boolean> = {},
  systemId = "sol",
): GameState {
  const state = createInitialState(SEED);
  const system = state.systems[systemId]!;
  return {
    ...state,
    systems: {
      ...state.systems,
      [systemId]: {
        ...system,
        resources: { ...system.resources, materials, energy },
        completedResearch: { ...system.completedResearch, ...completedResearch },
      },
    },
  };
}

describe("tech gating", () => {
  describe("structure gating", () => {
    test("reactor tier 2 blocked without energy_types_t4", () => {
      const cost = STRUCTURES["reactor_2"]!.cost;
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
      );

      const action: PlayerAction = {
        type: "build_structure",
        systemId: "sol",
        structureType: "reactor",
        tier: 2,
      };

      const next = tick(state, DT, [action]);
      expect(next.systems["sol"]!.constructionQueue.length).toBe(0);
    });

    test("reactor tier 2 succeeds with energy_types_t4", () => {
      const cost = STRUCTURES["reactor_2"]!.cost;
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
        { energy_types_t4: true },
      );

      const action: PlayerAction = {
        type: "build_structure",
        systemId: "sol",
        structureType: "reactor",
        tier: 2,
      };

      const next = tick(state, DT, [action]);
      expect(next.systems["sol"]!.constructionQueue.length).toBe(1);
      expect(next.systems["sol"]!.constructionQueue[0]!.targetType).toBe("reactor");
      expect(next.systems["sol"]!.constructionQueue[0]!.targetTier).toBe(2);
    });
  });

  describe("probe component gating", () => {
    test("cpu_t2 probe blocked without probe_cpu_t2 tech", () => {
      const cost = totalProbeCost("cpu_t2", "prop_t1", "rct_t1");
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
      );

      const action: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t2",
        propulsion: "prop_t1",
        reactor: "rct_t1",
        targetSystemId: "alpha_centauri",
      };

      const next = tick(state, DT, [action]);
      expect(next.systems["sol"]!.constructionQueue.length).toBe(0);
    });

    test("cpu_t2 probe succeeds with probe_cpu_t4 tech", () => {
      const cost = totalProbeCost("cpu_t2", "prop_t1", "rct_t1");
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
        { probe_cpu_t4: true },
      );

      const action: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t2",
        propulsion: "prop_t1",
        reactor: "rct_t1",
        targetSystemId: "alpha_centauri",
      };

      const next = tick(state, DT, [action]);
      expect(next.systems["sol"]!.constructionQueue.length).toBe(1);
      expect(next.systems["sol"]!.constructionQueue[0]!.targetConfig).not.toBeNull();
    });
  });

  describe("ungated structures", () => {
    test("miner tier 1 has no tech gate and always works", () => {
      const cost = STRUCTURES["miner_1"]!.cost;
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
      );

      const action: PlayerAction = {
        type: "build_structure",
        systemId: "sol",
        structureType: "miner",
        tier: 1,
      };

      const next = tick(state, DT, [action]);
      expect(next.systems["sol"]!.constructionQueue.length).toBe(1);
    });
  });

  describe("multiple component gates", () => {
    test("probe with cpu_t2 + prop_t2 + rct_t2 requires all gates", () => {
      const cost = totalProbeCost("cpu_t2", "prop_t2", "rct_t2");

      const missingPropAndReactor = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
        { probe_cpu_t4: true },
      );

      const action: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t2",
        propulsion: "prop_t2",
        reactor: "rct_t2",
        targetSystemId: "alpha_centauri",
      };

      const nextMissing = tick(missingPropAndReactor, DT, [action]);
      expect(nextMissing.systems["sol"]!.constructionQueue.length).toBe(0);

      const allGates = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
        { probe_cpu_t4: true, probe_propulsion_t4: true, probe_reactors_t4: true },
      );

      const nextAll = tick(allGates, DT, [action]);
      expect(nextAll.systems["sol"]!.constructionQueue.length).toBe(1);
    });
  });

  describe("resources not deducted on gated rejection", () => {
    test("failed tech gate does not deduct resources (reactor_2 requires energy_types_t4)", () => {
      const cost = STRUCTURES["reactor_2"]!.cost;
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
      );
      const materialsBefore = state.systems["sol"]!.resources.materials;

      const action: PlayerAction = {
        type: "build_structure",
        systemId: "sol",
        structureType: "reactor",
        tier: 2,
      };

      const next = tick(state, DT, [action]);
      const sol = next.systems["sol"]!;
      expect(sol.resources.materials).toBeGreaterThanOrEqual(materialsBefore - 1);
    });
  });
});
