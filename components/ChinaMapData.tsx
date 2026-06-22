/**
 * React Server Component that pre-computes SVG path data for the China map.
 *
 * Calls `getChinaMapPaths()` (server-side D3-geo) at render time and passes
 * the lightweight path data down to the interactive `ChinaMap` client component.
 * This avoids shipping D3-geo to the browser bundle.
 *
 * @module components/ChinaMapData
 */

import { getChinaMapPaths, type MapPathData } from "@/lib/geo-server";
import ChinaMap from "@/components/ChinaMap";

/** Props for the server-side map data wrapper. */
interface ChinaMapDataProps {
  /** SVG viewport width in pixels (default 1100). */
  width?: number;
  /** SVG viewport height in pixels (default 860). */
  height?: number;
  /** Additional CSS class names for the map container. */
  className?: string;
}

/**
 * Server-rendered wrapper that pre-computes province paths and delegates
 * interactive rendering to `ChinaMap`.
 */
export default function ChinaMapData({ width = 1100, height = 860, className }: ChinaMapDataProps) {
  const mapPaths: MapPathData[] = getChinaMapPaths(width, height);

  return (
    <>
      <ChinaMap
        width={width}
        height={height}
        className={className}
        mapPaths={mapPaths}
      />
    </>
  );
}
