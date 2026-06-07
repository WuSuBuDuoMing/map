/**
 * Unit tests for data/progress.ts
 *
 * Exercises getLitCityIds, getLitProvinceIds, and totalProvinceCount.
 *
 * Note: cities.ts is imported as a live module.  Because initialVisitedCityIds
 * is always empty in test mode,  cities come exclusively from the
 * localMemories store parameter.
 */
import { describe, it, expect } from "vitest";
import {
  getLitCityIds,
  getLitProvinceIds,
  initialLitCityIds,
  totalProvinceCount,
} from "@/data/progress";
import type { LocalMemoryStore } from "@/data/progress";
import { cities } from "@/data/cities";
import { provinces } from "@/data/provinces";

describe("data/progress", () => {
  // =========================================================================
  // getLitCityIds
  // =========================================================================
  describe("getLitCityIds", () => {
    it("returns an empty set when store is empty", () => {
      const result = getLitCityIds({});
      expect(result.size).toBe(0);
    });

    it("returns an empty set when called with no argument (defaults to {})", () => {
      const result = getLitCityIds();
      expect(result.size).toBe(0);
    });

    it("marks cities that have at least one memory", () => {
      const store: LocalMemoryStore = {
        beijing: [
          {
            id: "m1",
            cityId: "beijing",
            city: "北京",
            cityEn: "Beijing",
            date: "2024.06.01",
            image: "/photos/test.jpg",
            text: "A test memory",
          },
        ],
        shanghai: [], // empty array should be excluded
        guangzhou: [
          {
            id: "m2",
            cityId: "guangzhou",
            city: "广州",
            cityEn: "Guangzhou",
            date: "2024.07.01",
            image: "/photos/test2.jpg",
            text: "Another memory",
          },
        ],
      };

      const result = getLitCityIds(store);
      expect(result.has("beijing")).toBe(true);
      expect(result.has("guangzhou")).toBe(true);
      expect(result.has("shanghai")).toBe(false); // empty memories
    });
  });

  // =========================================================================
  // getLitProvinceIds
  // =========================================================================
  describe("getLitProvinceIds", () => {
    it("returns an empty set when given an empty city set", () => {
      const result = getLitProvinceIds(new Set());
      expect(result.size).toBe(0);
    });

    it("maps cities to their parent provinces", () => {
      // beijing -> provinceId "beijing", guangzhou -> "guangdong"
      const litCities = new Set(["beijing", "guangzhou"]);
      const result = getLitProvinceIds(litCities);

      expect(result.has("beijing")).toBe(true);
      expect(result.has("guangdong")).toBe(true);
      expect(result.size).toBe(2);
    });

    it("deduplicates multiple cities in the same province", () => {
      // shenzhen and guangzhou are both in guangdong
      const litCities = new Set(["shenzhen", "guangzhou"]);
      const result = getLitProvinceIds(litCities);

      expect(result.has("guangdong")).toBe(true);
      expect(result.size).toBe(1);
    });
  });

  // =========================================================================
  // getLitProvinceCount (derived via getLitProvinceIds + totalProvinceCount)
  // =========================================================================
  describe("getLitProvinceCount", () => {
    it("returns 0 when no cities are lit", () => {
      const litCities = getLitCityIds({});
      const litProvinces = getLitProvinceIds(litCities);
      expect(litProvinces.size).toBe(0);
    });

    it("counts correctly when all provinces have lit cities", () => {
      const allCityIds: string[] = cities.map((c: { id: string }) => c.id);
      const allCities = new Set(allCityIds);

      const provinceIds = getLitProvinceIds(allCities);
      expect(provinceIds.size).toBe(totalProvinceCount);
    });
  });

  // =========================================================================
  // getLitCityCount (derived via getLitCityIds)
  // =========================================================================
  describe("getLitCityCount", () => {
    it("returns 0 when no cities are lit", () => {
      const count = getLitCityIds({}).size;
      expect(count).toBe(0);
    });

    it("matches the size of getLitCityIds with default store", () => {
      const ids = getLitCityIds();
      // initial state has no visited cities
      expect(ids.size).toBe(0);
      expect(ids.size).toBe(initialLitCityIds.size);
    });
  });

  // =========================================================================
  // totalProvinceCount
  // =========================================================================
  describe("totalProvinceCount", () => {
    it("reflects the number of provinces in the data module", () => {
      expect(totalProvinceCount).toBe(provinces.length);
    });
  });
});
