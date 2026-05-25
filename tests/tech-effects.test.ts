import { describe, test, expect } from "bun:test";
import { getTechMultipliers } from "../src/simulation/tech-effects";

describe("getTechMultipliers", () => {
  describe("no research completed", () => {
    test("all multipliers at baseline", () => {
      const m = getTechMultipliers({});
      expect(m.miningMultiplier).toBe(1.0);
      expect(m.energyMultiplier).toBe(1.0);
      expect(m.computingMultiplier).toBe(1.0);
      expect(m.manufacturingSpeedMultiplier).toBe(1.0);
      expect(m.maxConcurrentResearch).toBe(1);
      expect(m.printerNetworking).toBe(false);
      expect(m.distributedIntelligence).toBe(false);
      expect(m.zeroLatencyCommunication).toBe(false);
    });
  });

  describe("mining multiplier", () => {
    test("mining_efficiency_t1 adds 0.10", () => {
      const m = getTechMultipliers({ mining_efficiency_t1: true });
      expect(m.miningMultiplier).toBeCloseTo(1.1);
    });

    test("all four mining efficiency techs (t1-t4) stack", () => {
      const m = getTechMultipliers({
        mining_efficiency_t1: true,
        mining_efficiency_t2: true,
        mining_efficiency_t3: true,
        mining_efficiency_t4: true,
      });
      expect(m.miningMultiplier).toBeCloseTo(1.0 + 0.100 + 0.105 + 0.110 + 0.115);
    });
  });

  describe("energy multiplier", () => {
    test("energy_production_t1 adds 0.08", () => {
      const m = getTechMultipliers({ energy_production_t1: true });
      expect(m.energyMultiplier).toBeCloseTo(1.08);
    });

    test("energy_production t1-t3 stack", () => {
      const m = getTechMultipliers({
        energy_production_t1: true,
        energy_production_t2: true,
        energy_production_t3: true,
      });
      expect(m.energyMultiplier).toBeCloseTo(1.0 + 0.080 + 0.084 + 0.088);
    });
  });

  describe("computing multiplier", () => {
    test("computing_speed_t1 adds 0.05", () => {
      const m = getTechMultipliers({ computing_speed_t1: true });
      expect(m.computingMultiplier).toBeCloseTo(1.05);
    });

    test("computing_speed_t1 + computing_speed_t3 stack", () => {
      const m = getTechMultipliers({
        computing_speed_t1: true,
        computing_speed_t3: true,
      });
      expect(m.computingMultiplier).toBeCloseTo(1.0 + 0.05 + 0.05);
    });
  });

  describe("concurrent research", () => {
    test("computing_architecture_t4 sets max to 2", () => {
      const m = getTechMultipliers({ computing_architecture_t4: true });
      expect(m.maxConcurrentResearch).toBe(2);
    });

    test("computing_architecture_t10 sets max to 3", () => {
      const m = getTechMultipliers({
        computing_architecture_t4: true,
        computing_architecture_t10: true,
      });
      expect(m.maxConcurrentResearch).toBe(3);
    });
  });

  describe("boolean flags", () => {
    test("manufacturing_efficiency_t8 enables printer networking", () => {
      const m = getTechMultipliers({ manufacturing_efficiency_t8: true });
      expect(m.printerNetworking).toBe(true);
    });

    test("computing_architecture_t14 enables distributed intelligence", () => {
      const m = getTechMultipliers({ computing_architecture_t14: true });
      expect(m.distributedIntelligence).toBe(true);
    });

    test("communication_speed_t20 enables zero latency communication", () => {
      const m = getTechMultipliers({ communication_speed_t20: true });
      expect(m.zeroLatencyCommunication).toBe(true);
    });
  });

  describe("manufacturing speed multiplier", () => {
    test("manufacturing_efficiency_t1 adds 0.05", () => {
      const m = getTechMultipliers({ manufacturing_efficiency_t1: true });
      expect(m.manufacturingSpeedMultiplier).toBeCloseTo(1.05);
    });
  });

  describe("types paths have no multiplier effects", () => {
    test("mining_types tiers do not affect any multipliers", () => {
      const m = getTechMultipliers({ mining_types_t1: true, mining_types_t2: true });
      expect(m.miningMultiplier).toBe(1.0);
    });
  });
});
