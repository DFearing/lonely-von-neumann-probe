import { describe, test, expect } from "bun:test";
import { tickConstruction } from "../src/simulation/systems/construction";
import { createInitialState } from "../src/simulation/state";
import type {
  GameState,
  ConstructionProject,
  StructureInstance,
} from "../src/simulation/state";
import { PROPULSIONS } from "../src/simulation/data/components";

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
  };
}

function makeProbeProject(
  targetSystemId: string,
  overrides?: Partial<ConstructionProject>,
): ConstructionProject {
  return {
    id: `build_probe_${targetSystemId}`,
    targetType: "probe",
    targetTier: 0,
    targetConfig: {
      cpu: "cpu_t1",
      propulsion: "prop_t1",
      reactor: "rct_t1",
      targetSystemId,
    },
    totalCost: { materials: 30, energy: 6 },
    remainingCost: { materials: 0, energy: 0 },
    progress: 0.99,
    assignedPrinterIds: ["printer_1"],
    ...overrides,
  };
}

describe("resolveDistance via probe construction", () => {
  test("probe targeting Alpha Centauri gets travel time based on real distance", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    const project = makeProbeProject("alpha_centauri");
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
    const probe = next.systems["sol"]!.sentProbes[0];

    expect(probe).toBeDefined();

    const expectedDistance = 4.37;
    const propulsion = PROPULSIONS["prop_t1"]!;
    const expectedTravelTime = expectedDistance / propulsion.travelSpeed;

    expect(probe!.travelTimeSeconds).toBeCloseTo(expectedTravelTime);
  });

  test("probe travel time reflects actual distance, not a hardcoded value", () => {
    const state = createInitialState(SEED);
    const sol = state.systems["sol"]!;

    const projectAC = makeProbeProject("alpha_centauri");
    const projectSirius = makeProbeProject("sirius", {
      id: "build_probe_sirius",
      assignedPrinterIds: ["printer_2"],
    });
    const printer1 = makePrinter("printer_1");
    const printer2 = makePrinter("printer_2");

    const modified: GameState = {
      ...state,
      systems: {
        ...state.systems,
        sol: {
          ...sol,
          structures: { ...sol.structures, printers: [printer1, printer2] },
          constructionQueue: [projectAC, projectSirius],
        },
      },
    };

    const next = tickConstruction(modified, DT);
    const probes = next.systems["sol"]!.sentProbes;

    expect(probes.length).toBe(2);

    const probeAC = probes.find((p) => p.destinationSystemId === "alpha_centauri")!;
    const probeSirius = probes.find((p) => p.destinationSystemId === "sirius")!;

    expect(probeAC.travelTimeSeconds).not.toBe(probeSirius.travelTimeSeconds);

    const propulsion = PROPULSIONS["prop_t1"]!;
    expect(probeAC.travelTimeSeconds).toBeCloseTo(4.37 / propulsion.travelSpeed);
    expect(probeSirius.travelTimeSeconds).toBeCloseTo(8.6 / propulsion.travelSpeed);
  });
});
