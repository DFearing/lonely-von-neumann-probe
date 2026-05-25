import { describe, test, expect } from "bun:test";
import { tickConstruction } from "../src/simulation/systems/construction";
import { createInitialState } from "../src/simulation/state";
import type {
  GameState,
  ConstructionProject,
  StructureInstance,
} from "../src/simulation/state";
import { CPUS, PROPULSIONS } from "../src/simulation/data/components";

const SEED = 42;
const DT = 1;

function makePrinter(id: string): StructureInstance {
  return {
    id,
    type: "printer",
    tier: 1,
    productionRate: 1,
    operatingCost: 0,
    maintenanceCost: 0,
    computeDemand: 0,
    active: true,
    constructionProgress: 1,
    health: 1,
  };
}

function makeProbeProject(
  overrides?: Partial<ConstructionProject>,
): ConstructionProject {
  return {
    id: "build_probe",
    targetType: "probe",
    targetTier: 0,
    targetConfig: {
      cpu: "cpu_t1",
      propulsion: "prop_t1",
      reactor: "rct_t1",
    },
    totalCost: { materials: 30, energy: 6 },
    remainingCost: { materials: 0, energy: 0 },
    progress: 0.99,
    assignedPrinterIds: ["printer_1"],
    ...overrides,
  };
}

describe("probe construction produces availableProbes", () => {
  test("completed probe goes to availableProbes, not sentProbes", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    const project = makeProbeProject();
    const printer = makePrinter("printer_1");

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          structures: { ...sol.structures, printers: [printer] },
          constructionQueue: [project],
        },
      },
    };

    const next = tickConstruction(modified, DT);
    const solAfter = next.systems["sol"]!;

    expect(solAfter.availableProbes).toHaveLength(1);
    expect(solAfter.sentProbes).toHaveLength(0);
  });

  test("completed probe has correct components from targetConfig", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    const project = makeProbeProject();
    const printer = makePrinter("printer_1");

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          structures: { ...sol.structures, printers: [printer] },
          constructionQueue: [project],
        },
      },
    };

    const next = tickConstruction(modified, DT);
    const probe = next.systems["sol"]!.availableProbes[0]!;

    expect(probe.components.cpu).toBe("cpu_t1");
    expect(probe.components.propulsion).toBe("prop_t1");
    expect(probe.components.reactor).toBe("rct_t1");
  });

  test("completed probe has stats derived from cpu definition", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    const project = makeProbeProject();
    const printer = makePrinter("printer_1");

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          structures: { ...sol.structures, printers: [printer] },
          constructionQueue: [project],
        },
      },
    };

    const next = tickConstruction(modified, DT);
    const probe = next.systems["sol"]!.availableProbes[0]!;
    const cpuDef = CPUS["cpu_t1"]!;

    expect(probe.miningOutput).toBe(cpuDef.miningOutput);
    expect(probe.computingOutput).toBe(cpuDef.computingOutput);
    expect(probe.internalPrinterSpeed).toBe(cpuDef.printSpeed);
    expect(probe.health).toBe(1);
    expect(probe.mode).toBe("idle");
    expect(probe.autoReplicating).toBe(PROPULSIONS["prop_t1"]!.autoReplicate);
  });

  test("multiple probes can be built and accumulate in availableProbes", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    const project1 = makeProbeProject({ id: "build_probe_1", assignedPrinterIds: ["printer_1"] });
    const project2 = makeProbeProject({ id: "build_probe_2", assignedPrinterIds: ["printer_2"] });
    const printer1 = makePrinter("printer_1");
    const printer2 = makePrinter("printer_2");

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          structures: { ...sol.structures, printers: [printer1, printer2] },
          constructionQueue: [project1, project2],
        },
      },
    };

    const next = tickConstruction(modified, DT);
    const solAfter = next.systems["sol"]!;

    expect(solAfter.availableProbes).toHaveLength(2);
    expect(solAfter.sentProbes).toHaveLength(0);
    expect(solAfter.constructionQueue).toHaveLength(0);
  });

  test("construction log says ready for deployment", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    const project = makeProbeProject();
    const printer = makePrinter("printer_1");

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          structures: { ...sol.structures, printers: [printer] },
          constructionQueue: [project],
        },
      },
    };

    const next = tickConstruction(modified, DT);
    const logBefore = state.log.length;
    const newEntries = next.log.slice(logBefore);

    const entry = newEntries.find((e) => e.message.includes("ready for deployment"));
    expect(entry).toBeDefined();
    expect(entry!.category).toBe("milestone");
    expect(entry!.soundEvent).toBe("probe_constructed");
  });
});
