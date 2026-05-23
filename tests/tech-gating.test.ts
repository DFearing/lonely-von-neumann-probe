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
    test("reactor tier 2 blocked without fusion_efficiency", () => {
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

    test("reactor tier 2 succeeds with fusion_efficiency", () => {
      const cost = STRUCTURES["reactor_2"]!.cost;
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
        { fusion_efficiency: true },
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
    test("enhanced_cpu probe blocked without efficient_probes tech", () => {
      const cost = totalProbeCost("enhanced_cpu", "basic_ion_drive", "basic_reactor");
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
      );

      const action: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "enhanced_cpu",
        propulsion: "basic_ion_drive",
        reactor: "basic_reactor",
        targetSystemId: "alpha_centauri",
      };

      const next = tick(state, DT, [action]);
      expect(next.systems["sol"]!.constructionQueue.length).toBe(0);
    });

    test("enhanced_cpu probe succeeds with efficient_probes tech", () => {
      const cost = totalProbeCost("enhanced_cpu", "basic_ion_drive", "basic_reactor");
      const state = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
        { efficient_probes: true },
      );

      const action: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "enhanced_cpu",
        propulsion: "basic_ion_drive",
        reactor: "basic_reactor",
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
    test("probe with enhanced_cpu + efficient_drive + fusion_reactor requires all three gates", () => {
      const cost = totalProbeCost("enhanced_cpu", "efficient_drive", "fusion_reactor");

      const missingOne = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
        { efficient_probes: true },
      );

      const action: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "enhanced_cpu",
        propulsion: "efficient_drive",
        reactor: "fusion_reactor",
        targetSystemId: "alpha_centauri",
      };

      const nextMissing = tick(missingOne, DT, [action]);
      expect(nextMissing.systems["sol"]!.constructionQueue.length).toBe(0);

      const allGates = stateWithResourcesAndResearch(
        cost.materials + 500,
        cost.energy + 500,
        { efficient_probes: true, fusion_efficiency: true },
      );

      const nextAll = tick(allGates, DT, [action]);
      expect(nextAll.systems["sol"]!.constructionQueue.length).toBe(1);
    });
  });

  describe("resources not deducted on gated rejection", () => {
    test("failed tech gate does not deduct resources", () => {
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
      expect(sol.resources.materials).toBeGreaterThanOrEqual(materialsBefore);
    });
  });
});
