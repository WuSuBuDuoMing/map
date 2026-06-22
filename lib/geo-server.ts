/**
 * Server-side geographic projection and SVG path pre-computation.
 *
 * This module runs exclusively on the server (SSR / RSC) to pre-compute SVG
 * path data for the China map and province detail maps. By computing projections
 * and paths at build/request time, the client receives lightweight SVG attributes
 * (`d`, `cx`, `cy`) instead of bundling D3-geo.
 *
 * @module lib/geo-server
 */

import { geoArea, geoMercator, geoPath } from "d3-geo";
import rawChina from "@/data/china-geo.json";
import { provinces } from "@/data/provinces";
import { stableCoordinate } from "@/lib/geo";

type Position = [number, number];
type Ring = Position[];

/** GeoJSON Feature representation matching the china-geo.json structure. */
export interface GeoFeature {
  type: "Feature";
  properties: { adcode: number; name: string };
  geometry:
    | { type: "Polygon"; coordinates: Ring[] }
    | { type: "MultiPolygon"; coordinates: Ring[][] }
    | { type: string; coordinates: unknown };
}

const adcodeToProvinceId = new Map(provinces.map((province) => [province.adcode, province.id]));

/**
 * Correct the winding order of a GeoJSON feature's coordinates.
 * Required because D3-geo assumes exterior rings are counter-clockwise.
 */
function fixWinding(feature: GeoFeature): GeoFeature {
  if (geoArea(feature as never) <= 2 * Math.PI) return feature;

  if (feature.geometry.type === "Polygon") {
    const coordinates = feature.geometry.coordinates as Ring[];

    return {
      ...feature,
      geometry: {
        type: "Polygon",
        coordinates: coordinates.map((ring) => ring.slice().reverse()),
      },
    };
  }

  if (feature.geometry.type === "MultiPolygon") {
    const coordinates = feature.geometry.coordinates as Ring[][];

    return {
      ...feature,
      geometry: {
        type: "MultiPolygon",
        coordinates: coordinates.map((polygon) => polygon.map((ring) => ring.slice().reverse())),
      },
    };
  }

  return feature;
}

// Process all features at build time (server side only)
const chinaFeatures: GeoFeature[] = (rawChina.features as GeoFeature[])
  .filter(
    (feature) =>
      adcodeToProvinceId.has(feature.properties.adcode) &&
      (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon"),
  )
  .map(fixWinding);

/** Map a province adcode to its URL-safe identifier. */
const provinceIdOf = (feature: GeoFeature): string =>
  adcodeToProvinceId.get(feature.properties.adcode) ?? "";

/** A precomputed SVG path with its province ID and centroid coordinates. */
export type MapPathData = {
  /** URL-safe province identifier. */
  id: string;
  /** SVG path `d` attribute for the province shape. */
  d: string;
  /** X coordinate of the province centroid (3 decimal places). */
  cx: number;
  /** Y coordinate of the province centroid (3 decimal places). */
  cy: number;
};

/**
 * Generate precomputed SVG paths for the full China map (server-side only).
 * @param width - SVG viewport width (default 1100)
 * @param height - SVG viewport height (default 860)
 * @param padding - inset padding in pixels (default 24)
 * @returns Array of province paths with centroids
 */
export function getChinaMapPaths(width = 1100, height = 860, padding = 24): MapPathData[] {
  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding],
    ],
    { type: "FeatureCollection", features: chinaFeatures } as never,
  );
  const path = geoPath(projection);

  return chinaFeatures.map((feature) => {
    const id = provinceIdOf(feature);
    const [cx, cy] = path.centroid(feature as never);

    return {
      id,
      d: path(feature as never) ?? "",
      cx: stableCoordinate(cx),
      cy: stableCoordinate(cy),
    };
  });
}

/** Precomputed dash-line path for the South China Sea inset box. */
export type DashLinePathData = { d: string } | null;

/**
 * Generate the SVG path for the South China Sea ten-dash line inset.
 * Returns `null` if the feature is missing from the GeoJSON source.
 */
export function getDashLinePath(): DashLinePathData {
  const rawDashLine = (rawChina.features as GeoFeature[]).find(
    (feature) => String(feature.properties.adcode) === "100000_JD",
  );

  if (!rawDashLine) return null;

  const feature = fixWinding(rawDashLine);

  const insetWidth = 116;
  const insetHeight = 162;
  const projection = geoMercator().fitExtent(
    [
      [12, 12],
      [insetWidth - 12, insetHeight - 12],
    ],
    feature as never,
  );
  const path = geoPath(projection);
  const d = path(feature as never) ?? "";

  return d ? { d } : null;
}

/** Province map path data with active state for the focused province. */
export type ProvinceMapPathData = {
  /** URL-safe province identifier. */
  id: string;
  /** SVG path `d` attribute. */
  d: string;
  /** `true` if this province is the one currently focused. */
  active: boolean;
};

/**
 * Generate SVG paths for the province detail map view (server-side only).
 * @param provinceId - The province to highlight as active
 * @param width - SVG viewport width (default 1120)
 * @param height - SVG viewport height (default 760)
 * @param padding - inset padding in pixels (default 88)
 */
export function getProvinceMapPaths(provinceId: string, width = 1120, height = 760, padding = 88): ProvinceMapPathData[] {
  // For hainan, use custom projection settings
  const projection = provinceId === "hainan"
    ? geoMercator()
        .center([110.1, 19.15])
        .scale(Math.min(width, height) * 16)
        .translate([width * 0.44, height * 0.52])
    : (() => {
        const feature = chinaFeatures.find((f) => provinceIdOf(f) === provinceId);
        return geoMercator().fitExtent(
          [
            [padding, padding],
            [width - padding, height - padding],
          ],
          (feature ?? { type: "FeatureCollection", features: chinaFeatures }) as never,
        );
      })();

  const path = geoPath(projection);

  return chinaFeatures.map((feature) => ({
    id: provinceIdOf(feature),
    d: path(feature as never) ?? "",
    active: provinceIdOf(feature) === provinceId,
  }));
}

/**
 * Project city coordinates (lng/lat) to SVG pixel positions for a province map.
 * @param provinceId - The province whose projection to use
 * @param cities - Array of cities with `id`, `lng`, and `lat`
 * @param width - SVG viewport width (default 1120)
 * @param height - SVG viewport height (default 760)
 * @param padding - inset padding in pixels (default 88)
 * @returns Projected positions with `id`, `x`, `y`
 */
export function projectCitiesForProvince(
  provinceId: string,
  cities: Array<{ id: string; lng: number; lat: number }>,
  width = 1120,
  height = 760,
  padding = 88,
): Array<{ id: string; x: number; y: number }> {
  const projection = provinceId === "hainan"
    ? geoMercator()
        .center([110.1, 19.15])
        .scale(Math.min(width, height) * 16)
        .translate([width * 0.44, height * 0.52])
    : (() => {
        const feature = chinaFeatures.find((f) => provinceIdOf(f) === provinceId);
        return geoMercator().fitExtent(
          [
            [padding, padding],
            [width - padding, height - padding],
          ],
          (feature ?? { type: "FeatureCollection", features: chinaFeatures }) as never,
        );
      })();

  return cities.map((city) => {
    const [x, y] = projection([city.lng, city.lat]) ?? [width / 2, height / 2];
    return { id: city.id, x: stableCoordinate(x), y: stableCoordinate(y) };
  });
}
