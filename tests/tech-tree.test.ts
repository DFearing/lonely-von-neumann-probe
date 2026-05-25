import { describe, test, expect } from "bun:test";
import { TECH_TREE, BRANCH_COMPUTING_PARAMS, TECH_BRANCHES } from "../src/simulation/data/tech-tree";
import { MAX_TIER } from "../src/simulation/constants";

describe("per-branch computing costs", () => {
  describe("tier-1 costs vary by branch", () => {
    test("mining_efficiency_t1 has low cost (software optimization)", () => {
      expect(TECH_TREE["mining_efficiency_t1"]!.continuousCost).toBe(2);
    });

    test("energy_types_t1 has high cost (reactor design)", () => {
      expect(TECH_TREE["energy_types_t1"]!.continuousCost).toBe(5);
    });

    test("computing_architecture_t1 has highest cost (fundamental CS)", () => {
      expect(TECH_TREE["computing_architecture_t1"]!.continuousCost).toBe(6);
    });

    test("not all branches share the same tier-1 cost", () => {
      const tier1Costs = TECH_BRANCHES.map(
        (b) => TECH_TREE[`${b}_t1`]!.continuousCost,
      );
      const unique = new Set(tier1Costs);
      expect(unique.size).toBeGreaterThan(1);
    });
  });

  describe("costs scale up with tier", () => {
    test.each([...TECH_BRANCHES])("%s: each tier costs more than the previous", (branchId) => {
      for (let tier = 2; tier <= MAX_TIER; tier++) {
        const prev = TECH_TREE[`${branchId}_t${tier - 1}`]!.continuousCost;
        const curr = TECH_TREE[`${branchId}_t${tier}`]!.continuousCost;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });

  describe("formula: Math.round(baseCost * scalingFactor^(tier-1))", () => {
    test.each([...TECH_BRANCHES])("%s: generated costs match the formula", (branchId) => {
      const params = BRANCH_COMPUTING_PARAMS[branchId];
      for (let tier = 1; tier <= MAX_TIER; tier++) {
        const expected = Math.round(params.baseCost * params.scalingFactor ** (tier - 1));
        const actual = TECH_TREE[`${branchId}_t${tier}`]!.continuousCost;
        expect(actual).toBe(expected);
      }
    });
  });

  describe("BRANCH_COMPUTING_PARAMS completeness", () => {
    test("every branch in TECH_BRANCHES has params", () => {
      for (const branchId of TECH_BRANCHES) {
        const params = BRANCH_COMPUTING_PARAMS[branchId];
        expect(params).toBeDefined();
        expect(params.baseCost).toBeGreaterThan(0);
        expect(params.scalingFactor).toBeGreaterThan(1);
      }
    });
  });
});
