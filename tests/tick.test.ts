import { describe, test, expect } from "bun:test";
import { tick } from "../src/simulation/tick";
import { createInitialState } from "../src/simulation/state";
import type { PlayerAction } from "../src/simulation/actions";
import { STRUCTURES } from "../src/simulation/data/structures";
import { totalProbeCost } from "../src/simulation/data/components";
import { TECH_TREE } from "../src/simulation/data/tech-tree";

const SEED = 42;
const DT = 1;

function stateWithResources(materials: number, energy: number, systemId = "sol") {
  const state = createInitialState(SEED);
  const system = state.systems[systemId]!;
  return {
    ...state,
    systems: {
      ...state.systems,
      [systemId]: {
        ...system,
        resources: { ...system.resources, materials, energy },
      },
    },
  };
}

describe("tick", () => {
  describe("basic tick mechanics", () => {
    test("tick with no actions advances tickCount by 1", () => {
      const state = createInitialState(SEED);
      const next = tick(state, DT, []);

      expect(next.tickCount).toBe(state.tickCount + 1);
    });

    test("tick with no actions advances elapsedSeconds by dt", () => {
      const state = createInitialState(SEED);
      const dt = 0.5;
      const next = tick(state, dt, []);

      expect(next.elapsedSeconds).toBe(state.elapsedSeconds + dt);
    });

    test("tick updates rngState even with no actions", () => {
      const state = createInitialState(SEED);
      const next = tick(state, DT, []);

      expect(next.rngState).not.toEqual(state.rngState);
    });
  });

  describe("determinism", () => {
    test("100 ticks from the same initial state produce identical final states", () => {
      const state1 = createInitialState(SEED);
      const state2 = createInitialState(SEED);

      let a = state1;
      let b = state2;
      for (let i = 0; i < 100; i++) {
        a = tick(a, DT, []);
        b = tick(b, DT, []);
      }

      expect(a).toEqual(b);
    });
  });

  describe("build_structure action", () => {
    test("resources deducted and project added to queue", () => {
      const minerCost = STRUCTURES["miner_1"]!.cost;
      const state = stateWithResources(
        minerCost.materials + 100,
        minerCost.energy + 100,
      );
      const materialsBefore = state.systems["sol"]!.resources.materials;
      const energyBefore = state.systems["sol"]!.resources.energy;

      const action: PlayerAction = {
        type: "build_structure",
        systemId: "sol",
        structureType: "miner",
        tier: 1,
      };

      const next = tick(state, DT, [action]);
      const sol = next.systems["sol"]!;

      expect(sol.constructionQueue.length).toBe(1);
      expect(sol.constructionQueue[0]!.targetType).toBe("miner");
      expect(sol.constructionQueue[0]!.targetTier).toBe(1);

      const rawDeductedMaterials = materialsBefore - minerCost.materials;
      expect(sol.resources.materials).toBeGreaterThanOrEqual(rawDeductedMaterials);
      expect(sol.resources.energy).not.toBe(energyBefore);
    });

    test("insufficient resources leaves state unchanged (no project added)", () => {
      const state = stateWithResources(0, 0);
      const queueBefore = state.systems["sol"]!.constructionQueue.length;

      const action: PlayerAction = {
        type: "build_structure",
        systemId: "sol",
        structureType: "miner",
        tier: 1,
      };

      const next = tick(state, DT, [action]);
      expect(next.systems["sol"]!.constructionQueue.length).toBe(queueBefore);
    });
  });

  describe("cancel_construction action", () => {
    test("project removed and remaining resources refunded", () => {
      const minerCost = STRUCTURES["miner_1"]!.cost;
      const state = stateWithResources(
        minerCost.materials + 100,
        minerCost.energy + 100,
      );

      const buildAction: PlayerAction = {
        type: "build_structure",
        systemId: "sol",
        structureType: "miner",
        tier: 1,
      };
      const afterBuild = tick(state, DT, [buildAction]);
      const project = afterBuild.systems["sol"]!.constructionQueue[0]!;

      const cancelAction: PlayerAction = {
        type: "cancel_construction",
        systemId: "sol",
        projectId: project.id,
      };
      const afterCancel = tick(afterBuild, DT, [cancelAction]);
      const sol = afterCancel.systems["sol"]!;

      expect(sol.constructionQueue.length).toBe(0);
    });
  });

  describe("build_probe action", () => {
    test("cost deducted and construction project created with probe config", () => {
      const cost = totalProbeCost("basic_cpu", "basic_ion_drive", "basic_reactor");
      const state = stateWithResources(cost.materials + 100, cost.energy + 100);

      const action: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "basic_cpu",
        propulsion: "basic_ion_drive",
        reactor: "basic_reactor",
        targetSystemId: "alpha_centauri",
      };

      const next = tick(state, DT, [action]);
      const sol = next.systems["sol"]!;

      expect(sol.constructionQueue.length).toBe(1);
      const project = sol.constructionQueue[0]!;
      expect(project.targetType).toBe("probe");
      expect(project.targetConfig).not.toBeNull();
      expect(project.targetConfig!.cpu).toBe("basic_cpu");
      expect(project.targetConfig!.propulsion).toBe("basic_ion_drive");
      expect(project.targetConfig!.reactor).toBe("basic_reactor");
      expect(project.targetConfig!.targetSystemId).toBe("alpha_centauri");
      expect(project.totalCost).toEqual(cost);
    });
  });

  describe("start_research action", () => {
    test("initial cost deducted and research project created", () => {
      const techId = "basic_mining_techniques";
      const tech = TECH_TREE[techId]!;
      const state = stateWithResources(
        tech.initialCost.materials + 100,
        tech.initialCost.energy + 100,
      );

      const action: PlayerAction = {
        type: "start_research",
        systemId: "sol",
        techId,
      };

      const next = tick(state, DT, [action]);
      const sol = next.systems["sol"]!;

      expect(sol.researchQueue.length).toBe(1);
      expect(sol.researchQueue[0]!.techId).toBe(techId);
      expect(sol.researchQueue[0]!.progress).toBeGreaterThanOrEqual(0);
    });

    test("missing prerequisite prevents research from starting", () => {
      const tier2TechId = "mineral_separation";
      const tech = TECH_TREE[tier2TechId]!;
      const state = stateWithResources(
        tech.initialCost.materials + 1000,
        tech.initialCost.energy + 1000,
      );

      const action: PlayerAction = {
        type: "start_research",
        systemId: "sol",
        techId: tier2TechId,
      };

      const next = tick(state, DT, [action]);
      const sol = next.systems["sol"]!;

      expect(sol.researchQueue.length).toBe(0);
    });
  });

  describe("switch_system action", () => {
    test("currentSystemId changes to target system", () => {
      const state = createInitialState(SEED);
      expect(state.currentSystemId).toBe("sol");

      const action: PlayerAction = {
        type: "switch_system",
        systemId: "alpha_centauri",
      };

      const next = tick(state, DT, [action]);
      expect(next.currentSystemId).toBe("alpha_centauri");
    });
  });

  describe("pause/unpause actions", () => {
    test("pause sets paused to true", () => {
      const state = createInitialState(SEED);
      expect(state.paused).toBe(false);

      const next = tick(state, DT, [{ type: "pause" }]);
      expect(next.paused).toBe(true);
    });

    test("unpause sets paused to false", () => {
      const state = createInitialState(SEED);
      const paused = tick(state, DT, [{ type: "pause" }]);
      expect(paused.paused).toBe(true);

      const unpaused = tick(paused, DT, [{ type: "unpause" }]);
      expect(unpaused.paused).toBe(false);
    });
  });

  describe("construction completion over multiple ticks", () => {
    test("running enough ticks completes a structure build", () => {
      const printerCost = STRUCTURES["printer_1"]!.cost;
      const minerCost = STRUCTURES["miner_1"]!.cost;
      const state = stateWithResources(
        printerCost.materials + minerCost.materials + 5000,
        printerCost.energy + minerCost.energy + 5000,
      );

      const sol = state.systems["sol"]!;
      const printerInstance = {
        id: "existing_printer_1",
        type: "printer" as const,
        tier: 1,
        productionRate: 1,
        operatingCost: 0,
        active: true,
        constructionProgress: 1,
      };
      const stateWithPrinter = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            structures: {
              ...sol.structures,
              printers: [printerInstance],
            },
          },
        },
      };

      const buildAction: PlayerAction = {
        type: "build_structure",
        systemId: "sol",
        structureType: "miner",
        tier: 1,
      };
      let current = tick(stateWithPrinter, DT, [buildAction]);

      const maxTicks = 100;
      for (let i = 0; i < maxTicks; i++) {
        if (current.systems["sol"]!.structures.miners.length > 0) break;
        current = tick(current, DT, []);
      }

      expect(current.systems["sol"]!.structures.miners.length).toBeGreaterThan(0);
      expect(current.systems["sol"]!.constructionQueue.length).toBe(0);
    });
  });
});
