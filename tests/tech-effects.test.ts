import { describe, test, expect } from "bun:test";
import { getTechMultipliers } from "../src/simulation/tech-effects";

describe("getTechMultipliers", () => {
  describe("no research completed", () => {
    test("all multipliers at baseline", () => {
      const m = getTechMultipliers({});
      expect(m.miningMultiplier).toBe(1.0);
      expect(m.researchSpeedMultiplier).toBe(1.0);
      expect(m.manufacturingSpeedMultiplier).toBe(1.0);
      expect(m.maxConcurrentResearch).toBe(1);
      expect(m.printerNetworking).toBe(false);
      expect(m.distributedIntelligence).toBe(false);
      expect(m.zeroLatencyCommunication).toBe(false);
    });
  });

  describe("mining multiplier", () => {
    test("mining_t1 adds 0.10", () => {
      const m = getTechMultipliers({ mining_t1: true });
      expect(m.miningMultiplier).toBeCloseTo(1.1);
    });

    test("all four mining techs (t1-t4) stack", () => {
      const m = getTechMultipliers({
        mining_t1: true,
        mining_t2: true,
        mining_t3: true,
        mining_t4: true,
      });
      expect(m.miningMultiplier).toBeCloseTo(1.0 + 0.100 + 0.105 + 0.110 + 0.115);
    });
  });

  describe("research speed multiplier", () => {
    test("computing_t1 adds 0.06", () => {
      const m = getTechMultipliers({ computing_t1: true });
      expect(m.researchSpeedMultiplier).toBeCloseTo(1.06);
    });

    test("computing_t1 + computing_t3 stack", () => {
      const m = getTechMultipliers({
        computing_t1: true,
        computing_t3: true,
      });
      expect(m.researchSpeedMultiplier).toBeCloseTo(1.0 + 0.060 + 0.068);
    });
  });

  describe("concurrent research", () => {
    test("computing_t4 sets max to 2", () => {
      const m = getTechMultipliers({ computing_t4: true });
      expect(m.maxConcurrentResearch).toBe(2);
    });
  });

  describe("boolean flags", () => {
    test("manufacturing_t8 enables printer networking", () => {
      const m = getTechMultipliers({ manufacturing_t8: true });
      expect(m.printerNetworking).toBe(true);
    });

    test("computing_t14 enables distributed intelligence", () => {
      const m = getTechMultipliers({ computing_t14: true });
      expect(m.distributedIntelligence).toBe(true);
    });

    test("communication_t18 enables zero latency communication", () => {
      const m = getTechMultipliers({ communication_t18: true });
      expect(m.zeroLatencyCommunication).toBe(true);
    });
  });

  describe("manufacturing speed multiplier", () => {
    test("manufacturing_t1 adds 0.05", () => {
      const m = getTechMultipliers({ manufacturing_t1: true });
      expect(m.manufacturingSpeedMultiplier).toBeCloseTo(1.05);
    });
  });
});
