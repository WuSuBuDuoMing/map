import { cities } from "@/data/cities";

export type CityIndex = {
  id: string;
  provinceId: string;
  name: string;
  nameEn: string;
};

export const cityIndex: CityIndex[] = cities.map(({ id, provinceId, name, nameEn }) => ({
  id,
  provinceId,
  name,
  nameEn,
}));
