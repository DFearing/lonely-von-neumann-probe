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

    test("tick is deterministic with no actions", () => {
      const state = createInitialState(SEED);
      const a = tick(state, DT, []);
      const b = tick(state, DT, []);

      expect(a).toEqual(b);
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
      expect(sol.resources.materials).toBeGreaterThanOrEqual(rawDeductedMaterials - 1);
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
      const cost = totalProbeCost("cpu_t1", "prop_t1", "rct_t1");
      const state = stateWithResources(cost.materials + 100, cost.energy + 100);

      const action: PlayerAction = {
        type: "build_probe",
        systemId: "sol",
        cpu: "cpu_t1",
        propulsion: "prop_t1",
        reactor: "rct_t1",
        targetSystemId: "alpha_centauri",
      };

      const next = tick(state, DT, [action]);
      const sol = next.systems["sol"]!;

      expect(sol.constructionQueue.length).toBe(1);
      const project = sol.constructionQueue[0]!;
      expect(project.targetType).toBe("probe");
      expect(project.targetConfig).not.toBeNull();
      expect(project.targetConfig!.cpu).toBe("cpu_t1");
      expect(project.targetConfig!.propulsion).toBe("prop_t1");
      expect(project.targetConfig!.reactor).toBe("rct_t1");
      expect(project.targetConfig!.targetSystemId).toBe("alpha_centauri");
      expect(project.totalCost).toEqual(cost);
    });
  });

  describe("start_research action", () => {
    test("research project created with no material deduction", () => {
      const techId = "mining_efficiency_t1";
      const state = stateWithResources(100, 100);

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
      const tier2TechId = "mining_efficiency_t2";
      const state = stateWithResources(1000, 1000);

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

  describe("pause_research action", () => {
    test("sets paused to true on the target project", () => {
      const techId = "mining_efficiency_t1";
      const state = stateWithResources(100, 100);

      const startAction: PlayerAction = {
        type: "start_research",
        systemId: "sol",
        techId,
      };
      const afterStart = tick(state, DT, [startAction]);
      const project = afterStart.systems["sol"]!.researchQueue[0]!;
      expect(project.paused).toBe(false);

      const pauseAction: PlayerAction = {
        type: "pause_research",
        systemId: "sol",
        projectId: project.id,
      };
      const afterPause = tick(afterStart, DT, [pauseAction]);
      const pausedProject = afterPause.systems["sol"]!.researchQueue[0]!;

      expect(pausedProject.paused).toBe(true);
      expect(afterPause.systems["sol"]!.researchQueue).toHaveLength(1);
    });

    test("toggles paused back to false when called twice", () => {
      const techId = "mining_efficiency_t1";
      const state = stateWithResources(100, 100);

      const afterStart = tick(state, DT, [
        { type: "start_research", systemId: "sol", techId },
      ]);
      const projectId = afterStart.systems["sol"]!.researchQueue[0]!.id;

      const pauseAction: PlayerAction = {
        type: "pause_research",
        systemId: "sol",
        projectId,
      };
      const afterPause = tick(afterStart, DT, [pauseAction]);
      expect(afterPause.systems["sol"]!.researchQueue[0]!.paused).toBe(true);

      const afterUnpause = tick(afterPause, DT, [pauseAction]);
      expect(afterUnpause.systems["sol"]!.researchQueue[0]!.paused).toBe(false);
    });
  });

  describe("cancel_research action", () => {
    test("removes project from queue without changing materials", () => {
      const techId = "mining_efficiency_t1";
      const tech = TECH_TREE[techId]!;
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const project = {
        id: "research_test_cancel",
        techId,
        branchId: tech.branchId,
        tier: tech.tier,
        name: tech.name,
        continuousCost: tech.continuousCost,
        progress: 0,
        completed: false,
        paused: true,
      };

      const materialsBefore = 500;

      const stateWithProject = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            resources: {
              ...sol.resources,
              materials: materialsBefore,
              energy: 500,
            },
            researchQueue: [project],
          },
        },
      };

      const afterCancel = tick(stateWithProject, DT, [
        { type: "cancel_research", systemId: "sol", projectId: project.id },
      ]);

      const solAfter = afterCancel.systems["sol"]!;
      expect(solAfter.researchQueue).toHaveLength(0);
      const maxMaterials =
        materialsBefore + solAfter.resourceRates.materialsPerSecond * DT;
      expect(solAfter.resources.materials).toBeLessThanOrEqual(maxMaterials);
    });

    test("cancel with progress > 0 also does not refund", () => {
      const techId = "mining_efficiency_t1";
      const tech = TECH_TREE[techId]!;
      const state = createInitialState(SEED);
      const sol = state.systems["sol"]!;

      const project = {
        id: "research_test_cancel_noprogress",
        techId,
        branchId: tech.branchId,
        tier: tech.tier,
        name: tech.name,
        continuousCost: tech.continuousCost,
        progress: 0.5,
        completed: false,
        paused: true,
      };

      const materialsBeforeCancel = 200;

      const stateWithProject = {
        ...state,
        systems: {
          ...state.systems,
          sol: {
            ...sol,
            resources: {
              ...sol.resources,
              materials: materialsBeforeCancel,
              energy: 200,
            },
            researchQueue: [project],
          },
        },
      };

      const afterCancel = tick(stateWithProject, DT, [
        { type: "cancel_research", systemId: "sol", projectId: project.id },
      ]);

      const solAfter = afterCancel.systems["sol"]!;
      expect(solAfter.researchQueue).toHaveLength(0);

      const maxMaterials =
        materialsBeforeCancel +
        solAfter.resourceRates.materialsPerSecond * DT;
      expect(solAfter.resources.materials).toBeLessThanOrEqual(maxMaterials);
    });
  });

  describe("reorder_research action", () => {
    test("moves project from index 1 to index 0", () => {
      const state = stateWithResources(500, 500);

      let current = tick(state, DT, [
        { type: "start_research", systemId: "sol", techId: "mining_efficiency_t1" },
      ]);
      current = tick(current, DT, [
        { type: "start_research", systemId: "sol", techId: "energy_production_t1" },
      ]);

      const queue = current.systems["sol"]!.researchQueue;
      expect(queue).toHaveLength(2);
      expect(queue[0]!.techId).toBe("mining_efficiency_t1");
      expect(queue[1]!.techId).toBe("energy_production_t1");

      const secondProjectId = queue[1]!.id;
      const afterReorder = tick(current, DT, [
        {
          type: "reorder_research",
          systemId: "sol",
          projectId: secondProjectId,
          newIndex: 0,
        },
      ]);

      const reorderedQueue = afterReorder.systems["sol"]!.researchQueue;
      expect(reorderedQueue[0]!.techId).toBe("energy_production_t1");
      expect(reorderedQueue[1]!.techId).toBe("mining_efficiency_t1");
    });

    test("clamps out-of-bounds newIndex to valid range", () => {
      const state = stateWithResources(500, 500);

      const afterStart = tick(state, DT, [
        { type: "start_research", systemId: "sol", techId: "mining_efficiency_t1" },
      ]);
      const projectId = afterStart.systems["sol"]!.researchQueue[0]!.id;

      const afterReorder = tick(afterStart, DT, [
        {
          type: "reorder_research",
          systemId: "sol",
          projectId,
          newIndex: 999,
        },
      ]);

      expect(afterReorder.systems["sol"]!.researchQueue).toHaveLength(1);
      expect(afterReorder.systems["sol"]!.researchQueue[0]!.id).toBe(projectId);
    });
  });

  describe("set_speed action", () => {
    test("updates state.speed to the new value", () => {
      const state = createInitialState(SEED);
      expect(state.speed).toBe(1);

      const next = tick(state, DT, [{ type: "set_speed", speed: 10 }]);
      expect(next.speed).toBe(10);
    });

    test("speed persists across subsequent ticks", () => {
      const state = createInitialState(SEED);
      const fast = tick(state, DT, [{ type: "set_speed", speed: 10 }]);
      const next = tick(fast, DT, []);

      expect(next.speed).toBe(10);
    });
  });

  describe("switch_system with invalid systemId", () => {
    test("state is unchanged for a nonexistent system", () => {
      const state = createInitialState(SEED);
      expect(state.currentSystemId).toBe("sol");

      const next = tick(state, DT, [
        { type: "switch_system", systemId: "nonexistent_system" },
      ]);

      expect(next.currentSystemId).toBe("sol");
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
        maintenanceCost: 0,
        computeDemand: 0,
        active: true,
        constructionProgress: 1,
        health: 1,
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
