import { cityFallbackSprite, type City } from "@/data/cities";

export interface MarkerLayout {
  width: number;
  height: number;
  iconSize: number;
  iconX: number;
  iconY: number;
  labelX: number;
  labelY: number;
}

export const markerLayoutByCity: Record<string, MarkerLayout> = {
  zhengzhou: {
    width: 214,
    height: 156,
    iconSize: 112,
    iconX: -56,
    iconY: -116,
    labelX: -34,
    labelY: -22,
  },
  jinan: {
    width: 208,
    height: 142,
    iconSize: 102,
    iconX: -52,
    iconY: -106,
    labelX: -28,
    labelY: -18,
  },
  qingdao: {
    width: 208,
    height: 142,
    iconSize: 102,
    iconX: -52,
    iconY: -106,
    labelX: -28,
    labelY: -18,
  },
  shanghai: {
    width: 214,
    height: 156,
    iconSize: 114,
    iconX: -57,
    iconY: -116,
    labelX: -34,
    labelY: -22,
  },
  hangzhou: {
    width: 208,
    height: 144,
    iconSize: 104,
    iconX: -52,
    iconY: -108,
    labelX: -30,
    labelY: -18,
  },
  guangzhou: {
    width: 214,
    height: 150,
    iconSize: 106,
    iconX: -42,
    iconY: -104,
    labelX: -16,
    labelY: -34,
  },
  zhuhai: {
    width: 214,
    height: 142,
    iconSize: 110,
    iconX: -48,
    iconY: -76,
    labelX: -6,
    labelY: 4,
  },
  hongkong: {
    width: 236,
    height: 142,
    iconSize: 124,
    iconX: -62,
    iconY: -94,
    labelX: -28,
    labelY: -10,
  },
  macau: {
    width: 214,
    height: 146,
    iconSize: 102,
    iconX: -51,
    iconY: -98,
    labelX: -26,
    labelY: -10,
  },
};

export const defaultMarkerLayout: MarkerLayout = {
  width: 192,
  height: 140,
  iconSize: 96,
  iconX: -48,
  iconY: -104,
  labelX: -50,
  labelY: -18,
};

export const compactMarkerLayout: MarkerLayout = {
  width: 86,
  height: 54,
  iconSize: 18,
  iconX: -9,
  iconY: -9,
  labelX: 8,
  labelY: -15,
};

export const previewMarkerLayout: MarkerLayout = {
  width: 92,
  height: 86,
  iconSize: 46,
  iconX: -23,
  iconY: -43,
  labelX: -30,
  labelY: 12,
};

export const getMarkerLayout = (city: City, selected: boolean): MarkerLayout => {
  if (city.sprite === cityFallbackSprite) return compactMarkerLayout;
  if (!selected) return previewMarkerLayout;

  return markerLayoutByCity[city.id] ?? defaultMarkerLayout;
};
