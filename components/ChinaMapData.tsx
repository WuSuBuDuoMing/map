import { getChinaMapPaths, type MapPathData } from "@/lib/geo-server";
import ChinaMap from "@/components/ChinaMap";

interface ChinaMapDataProps {
  width?: number;
  height?: number;
  className?: string;
}

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
