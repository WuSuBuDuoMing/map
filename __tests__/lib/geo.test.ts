/**
 * Unit tests for lib/geo.ts and lib/geo-server.ts
 *
 * Validates GeoJSON processing, projection creation, and SVG path generation.
 */
import { describe, it, expect } from "vitest";
import {
  chinaFeatures,
  provinceIdOf,
  stableCoordinate,
  makeProjection,
  makeProjectionForFeature,
  makeProjectionForProvince,
  featureOfProvince,
  dashLineFeature,
  type GeoFeature,
} from "@/lib/geo";
import {
  getChinaMapPaths,
  getDashLinePath,
  getProvinceMapPaths,
  projectCitiesForProvince,
} from "@/lib/geo-server";
import { provinces } from "@/data/provinces";

describe("lib/geo", () => {
  // =========================================================================
  // chinaFeatures
  // =========================================================================
  describe("chinaFeatures", () => {
    it("contains all 34 provinces", () => {
      expect(chinaFeatures).toHaveLength(34);
    });

    it("every feature has a valid adcode", () => {
      for (const feature of chinaFeatures) {
        expect(feature.properties.adcode).toBeGreaterThanOrEqual(100000);
      }
    });

    it("every feature has Polygon or MultiPolygon geometry", () => {
      for (const feature of chinaFeatures) {
        expect(["Polygon", "MultiPolygon"]).toContain(feature.geometry.type);
      }
    });
  });

  // =========================================================================
  // provinceIdOf
  // =========================================================================
  describe("provinceIdOf", () => {
    it("returns correct province id for known adcodes", () => {
      const beijingFeature = chinaFeatures.find(
        (f) => f.properties.adcode === 110000,
      );
      expect(beijingFeature).toBeDefined();
      expect(provinceIdOf(beijingFeature!)).toBe("beijing");
    });

    it("returns empty string for unknown adcodes", () => {
      const unknown: GeoFeature = {
        type: "Feature",
        properties: { adcode: 999999, name: "Unknown" },
        geometry: { type: "Polygon", coordinates: [] },
      };
      expect(provinceIdOf(unknown)).toBe("");
    });
  });

  // =========================================================================
  // stableCoordinate
  // =========================================================================
  describe("stableCoordinate", () => {
    it("rounds to 3 decimal places", () => {
      expect(stableCoordinate(116.4074)).toBe(116.407);
      expect(stableCoordinate(39.9042)).toBe(39.904);
    });

    it("handles integers", () => {
      expect(stableCoordinate(100)).toBe(100);
    });

    it("handles zero", () => {
      expect(stableCoordinate(0)).toBe(0);
    });
  });

  // =========================================================================
  // featureOfProvince
  // =========================================================================
  describe("featureOfProvince", () => {
    it("returns the feature for a known province", () => {
      const feature = featureOfProvince("beijing");
      expect(feature).toBeDefined();
      expect(feature?.properties.adcode).toBe(110000);
    });

    it("returns undefined for unknown province", () => {
      expect(featureOfProvince("nonexistent")).toBeUndefined();
    });
  });

  // =========================================================================
  // dashLineFeature
  // =========================================================================
  describe("dashLineFeature", () => {
    it("is either null or a valid feature", () => {
      if (dashLineFeature !== null) {
        expect(dashLineFeature.type).toBe("Feature");
        expect(dashLineFeature.properties.adcode).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Projection functions
  // =========================================================================
  describe("makeProjection", () => {
    it("returns a valid projection", () => {
      const projection = makeProjection(1100, 860);
      expect(projection).toBeDefined();
      expect(typeof projection.translate()).toBe("object");
    });

    it("projection maps known coordinates within bounds", () => {
      const projection = makeProjection(1100, 860);
      // Beijing approximate coordinates [116.4, 39.9]
      const projected = projection([116.4, 39.9]);
      expect(projected).not.toBeNull();
      if (projected) {
        expect(projected[0]).toBeGreaterThan(0);
        expect(projected[0]).toBeLessThan(1100);
        expect(projected[1]).toBeGreaterThan(0);
        expect(projected[1]).toBeLessThan(860);
      }
    });
  });

  describe("makeProjectionForFeature", () => {
    it("fits a single province feature", () => {
      const feature = featureOfProvince("beijing");
      expect(feature).toBeDefined();
      const projection = makeProjectionForFeature(feature!, 400, 300);
      expect(projection).toBeDefined();
    });
  });

  describe("makeProjectionForProvince", () => {
    it("creates projection for a normal province", () => {
      const projection = makeProjectionForProvince("guangdong", 800, 600);
      expect(projection).toBeDefined();
    });

    it("creates projection for hainan (special case)", () => {
      const projection = makeProjectionForProvince("hainan", 800, 600);
      expect(projection).toBeDefined();
    });

    it("falls back to full map for unknown province", () => {
      const projection = makeProjectionForProvince("nonexistent", 800, 600);
      expect(projection).toBeDefined();
    });
  });
});

describe("lib/geo-server", () => {
  // =========================================================================
  // getChinaMapPaths
  // =========================================================================
  describe("getChinaMapPaths", () => {
    it("returns paths for all 34 provinces", () => {
      const paths = getChinaMapPaths();
      expect(paths).toHaveLength(34);
    });

    it("every path has id, d, cx, cy", () => {
      const paths = getChinaMapPaths();
      for (const p of paths) {
        expect(typeof p.id).toBe("string");
        expect(p.id.length).toBeGreaterThan(0);
        expect(typeof p.d).toBe("string");
        expect(p.d.length).toBeGreaterThan(0);
        expect(typeof p.cx).toBe("number");
        expect(typeof p.cy).toBe("number");
      }
    });

    it("all province IDs are valid", () => {
      const paths = getChinaMapPaths();
      const provinceIds = new Set(provinces.map((p) => p.id));
      for (const p of paths) {
        expect(provinceIds.has(p.id)).toBe(true);
      }
    });
  });

  // =========================================================================
  // getDashLinePath
  // =========================================================================
  describe("getDashLinePath", () => {
    it("returns null or a valid path object", () => {
      const result = getDashLinePath();
      if (result !== null) {
        expect(typeof result.d).toBe("string");
        expect(result.d.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // getProvinceMapPaths
  // =========================================================================
  describe("getProvinceMapPaths", () => {
    it("returns paths for all 34 provinces", () => {
      const paths = getProvinceMapPaths("beijing");
      expect(paths).toHaveLength(34);
    });

    it("marks the active province correctly", () => {
      const paths = getProvinceMapPaths("guangdong");
      const active = paths.filter((p) => p.active);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe("guangdong");
    });

    it("every path has non-empty d attribute", () => {
      const paths = getProvinceMapPaths("sichuan");
      for (const p of paths) {
        expect(p.d.length).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // projectCitiesForProvince
  // =========================================================================
  describe("projectCitiesForProvince", () => {
    it("projects city coordinates to SVG positions", () => {
      const cities = [
        { id: "beijing", lng: 116.4074, lat: 39.9042 },
        { id: "shanghai", lng: 121.4737, lat: 31.2304 },
      ];
      const projected = projectCitiesForProvince("beijing", cities);
      expect(projected).toHaveLength(2);
      for (const p of projected) {
        expect(typeof p.x).toBe("number");
        expect(typeof p.y).toBe("number");
        expect(p.id).toBeDefined();
      }
    });

    it("returns empty array for empty input", () => {
      const projected = projectCitiesForProvince("beijing", []);
      expect(projected).toHaveLength(0);
    });
  });
});
