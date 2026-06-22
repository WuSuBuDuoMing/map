/**
 * Unit tests for data/provinceCityPlaces.ts
 *
 * Covers province-city lookups, total counts, and unvisited city filtering.
 */
import { describe, it, expect } from "vitest";
import {
  provinceCityPlaces,
  getProvinceCityPlaces,
  getProvinceCityTotal,
  getUnvisitedProvinceCityPlaces,
} from "@/data/provinceCityPlaces";

describe("data/provinceCityPlaces", () => {
  // =========================================================================
  // provinceCityPlaces (flat array)
  // =========================================================================
  describe("provinceCityPlaces", () => {
    it("is a non-empty array", () => {
      expect(provinceCityPlaces.length).toBeGreaterThan(0);
    });

    it("every entry has required fields", () => {
      for (const city of provinceCityPlaces) {
        expect(typeof city.id).toBe("string");
        expect(city.id.trim()).not.toBe("");
        expect(typeof city.provinceId).toBe("string");
        expect(city.provinceId.trim()).not.toBe("");
        expect(typeof city.name).toBe("string");
        expect(typeof city.nameEn).toBe("string");
        expect(typeof city.lng).toBe("number");
        expect(typeof city.lat).toBe("number");
      }
    });

    it("has unique ids", () => {
      const ids = provinceCityPlaces.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has valid longitude/latitude ranges", () => {
      for (const city of provinceCityPlaces) {
        expect(city.lng).toBeGreaterThan(70);
        expect(city.lng).toBeLessThan(140);
        expect(city.lat).toBeGreaterThan(0);
        expect(city.lat).toBeLessThan(60);
      }
    });
  });

  // =========================================================================
  // getProvinceCityPlaces
  // =========================================================================
  describe("getProvinceCityPlaces", () => {
    it("returns cities for a known province", () => {
      const beijingCities = getProvinceCityPlaces("beijing");
      expect(beijingCities.length).toBeGreaterThan(0);
      for (const city of beijingCities) {
        expect(city.provinceId).toBe("beijing");
      }
    });

    it("returns empty array for unknown province", () => {
      const result = getProvinceCityPlaces("nonexistent");
      expect(result).toEqual([]);
    });

    it("can return cities for all provinces", () => {
      const provinceIds = [...new Set(provinceCityPlaces.map((c) => c.provinceId))];
      for (const pid of provinceIds) {
        const cities = getProvinceCityPlaces(pid);
        expect(cities.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // =========================================================================
  // getProvinceCityTotal
  // =========================================================================
  describe("getProvinceCityTotal", () => {
    it("returns the correct count", () => {
      const total = getProvinceCityTotal("beijing");
      const cities = getProvinceCityPlaces("beijing");
      expect(total).toBe(cities.length);
    });

    it("returns 0 for unknown province", () => {
      expect(getProvinceCityTotal("nonexistent")).toBe(0);
    });
  });

  // =========================================================================
  // getUnvisitedProvinceCityPlaces
  // =========================================================================
  describe("getUnvisitedProvinceCityPlaces", () => {
    it("returns all cities when visitedCityIds is empty", () => {
      const all = getProvinceCityPlaces("beijing");
      const unvisited = getUnvisitedProvinceCityPlaces("beijing", new Set());
      expect(unvisited.length).toBe(all.length);
    });

    it("excludes visited cities", () => {
      const all = getProvinceCityPlaces("beijing");
      if (all.length > 0) {
        const visited = new Set([all[0].id]);
        const unvisited = getUnvisitedProvinceCityPlaces("beijing", visited);
        expect(unvisited.length).toBe(all.length - 1);
        expect(unvisited.find((c) => c.id === all[0].id)).toBeUndefined();
      }
    });

    it("returns empty when all cities are visited", () => {
      const all = getProvinceCityPlaces("beijing");
      const visited = new Set(all.map((c) => c.id));
      const unvisited = getUnvisitedProvinceCityPlaces("beijing", visited);
      expect(unvisited).toEqual([]);
    });
  });
});
