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
    test("basic_mining_techniques adds 0.2", () => {
      const m = getTechMultipliers({ basic_mining_techniques: true });
      expect(m.miningMultiplier).toBe(1.2);
    });

    test("all four mining techs stack to 3.2", () => {
      const m = getTechMultipliers({
        basic_mining_techniques: true,
        mineral_separation: true,
        advanced_extraction: true,
        automated_deep_mining: true,
      });
      expect(m.miningMultiplier).toBe(3.2);
    });
  });

  describe("research speed multiplier", () => {
    test("basic_computing adds 0.25", () => {
      const m = getTechMultipliers({ basic_computing: true });
      expect(m.researchSpeedMultiplier).toBe(1.25);
    });

    test("basic_computing + quantum_computing stack to 2.25", () => {
      const m = getTechMultipliers({
        basic_computing: true,
        quantum_computing: true,
      });
      expect(m.researchSpeedMultiplier).toBe(2.25);
    });
  });

  describe("concurrent research", () => {
    test("parallel_processing sets max to 2", () => {
      const m = getTechMultipliers({ parallel_processing: true });
      expect(m.maxConcurrentResearch).toBe(2);
    });
  });

  describe("boolean flags", () => {
    test("printer_networking", () => {
      const m = getTechMultipliers({ printer_networking: true });
      expect(m.printerNetworking).toBe(true);
    });

    test("distributed_intelligence", () => {
      const m = getTechMultipliers({ distributed_intelligence: true });
      expect(m.distributedIntelligence).toBe(true);
    });

    test("zero_latency_communication", () => {
      const m = getTechMultipliers({ zero_latency_communication: true });
      expect(m.zeroLatencyCommunication).toBe(true);
    });
  });

  describe("manufacturing speed multiplier", () => {
    test("faster_printing adds 0.25", () => {
      const m = getTechMultipliers({ faster_printing: true });
      expect(m.manufacturingSpeedMultiplier).toBe(1.25);
    });
  });
});
