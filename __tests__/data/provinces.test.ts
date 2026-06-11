/**
 * Unit tests for data/provinces.ts
 *
 * Validates the 34-province dataset integrity, lookups, and constants.
 */
import { describe, it, expect } from "vitest";
import {
  provinces,
  TOTAL_PROVINCES,
  litProvinceCount,
  getProvince,
} from "@/data/provinces";

describe("data/provinces", () => {
  // =========================================================================
  // Dataset integrity
  // =========================================================================
  describe("dataset integrity", () => {
    it("contains exactly 34 provinces", () => {
      expect(provinces).toHaveLength(34);
      expect(TOTAL_PROVINCES).toBe(34);
    });

    it("every province has a unique id", () => {
      const ids = provinces.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("every province has a unique adcode", () => {
      const adcodes = provinces.map((p) => p.adcode);
      expect(new Set(adcodes).size).toBe(adcodes.length);
    });

    it("every province has non-empty name and nameEn", () => {
      for (const province of provinces) {
        expect(province.name.trim()).not.toBe("");
        expect(province.nameEn.trim()).not.toBe("");
      }
    });

    it("all adcodes are 6-digit numbers", () => {
      for (const province of provinces) {
        expect(province.adcode).toBeGreaterThanOrEqual(100000);
        expect(province.adcode).toBeLessThan(1000000);
      }
    });
  });

  // =========================================================================
  // getProvince
  // =========================================================================
  describe("getProvince", () => {
    it("returns a province by id", () => {
      const beijing = getProvince("beijing");
      expect(beijing).toBeDefined();
      expect(beijing?.name).toBe("北京");
      expect(beijing?.nameEn).toBe("Beijing");
      expect(beijing?.adcode).toBe(110000);
    });

    it("returns undefined for unknown ids", () => {
      expect(getProvince("nonexistent")).toBeUndefined();
      expect(getProvince("")).toBeUndefined();
    });

    it("can look up all 34 provinces", () => {
      for (const province of provinces) {
        const result = getProvince(province.id);
        expect(result).toBe(province);
      }
    });
  });

  // =========================================================================
  // litProvinceCount
  // =========================================================================
  describe("litProvinceCount", () => {
    it("is a non-negative integer", () => {
      expect(litProvinceCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(litProvinceCount)).toBe(true);
    });

    it("does not exceed total provinces", () => {
      expect(litProvinceCount).toBeLessThanOrEqual(TOTAL_PROVINCES);
    });

    it("matches the count of provinces where lit is true", () => {
      const expected = provinces.filter((p) => p.lit).length;
      expect(litProvinceCount).toBe(expected);
    });
  });
});
