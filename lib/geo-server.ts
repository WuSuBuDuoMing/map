import { geoArea, geoMercator, geoPath } from "d3-geo";
import rawChina from "@/data/china-geo.json";
import { provinces } from "@/data/provinces";
import { stableCoordinate } from "@/lib/geo";

type Position = [number, number];
type Ring = Position[];

export interface GeoFeature {
  type: "Feature";
  properties: { adcode: number; name: string };
  geometry:
    | { type: "Polygon"; coordinates: Ring[] }
    | { type: "MultiPolygon"; coordinates: Ring[][] }
    | { type: string; coordinates: unknown };
}

const adcodeToProvinceId = new Map(provinces.map((province) => [province.adcode, province.id]));

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

const provinceIdOf = (feature: GeoFeature): string =>
  adcodeToProvinceId.get(feature.properties.adcode) ?? "";

export type MapPathData = {
  id: string;
  d: string;
  cx: number;
  cy: number;
};

// Precomputed China map SVG paths (default width/height match ChinaMap defaults)
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

// Precomputed dash-line path for South China Sea inset
export type DashLinePathData = { d: string } | null;

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

// Province map paths -- all provinces rendered, with active highlight info
export type ProvinceMapPathData = {
  id: string;
  d: string;
  active: boolean;
};

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

// City projection for province map -- converts lng/lat to SVG coordinates
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
