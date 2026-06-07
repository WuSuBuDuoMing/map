import { getChinaMapPaths, getDashLinePath, type MapPathData, type DashLinePathData } from "@/lib/geo-server";
import ChinaMap from "@/components/ChinaMap";
import { SouthChinaSeaInset } from "@/components/ChinaMap";

interface ChinaMapDataProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function ChinaMapData({ width = 1100, height = 860, className }: ChinaMapDataProps) {
  const mapPaths: MapPathData[] = getChinaMapPaths(width, height);
  const dashLinePath: DashLinePathData = getDashLinePath();

  return (
    <>
      <ChinaMap
        width={width}
        height={height}
        className={className}
        mapPaths={mapPaths}
        dashLinePath={dashLinePath}
      />
    </>
  );
}
