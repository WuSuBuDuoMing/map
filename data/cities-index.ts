/**
 * Lightweight city index for progress calculation and province lookups.
 *
 * Extracts only the fields needed for map highlighting (id, provinceId, name
 * in CN/EN) from the full city dataset, avoiding the heavier `cities.ts` import
 * when only names are required.
 *
 * @module data/cities-index
 */

import { cities } from "@/data/cities";

/** A slimmed-down city record used for province-to-city resolution. */
export type CityIndex = {
  id: string;
  provinceId: string;
  name: string;
  nameEn: string;
};

/** Extracted city index: `id`, `provinceId`, `name`, and `nameEn` from each city. */
export const cityIndex: CityIndex[] = cities.map(({ id, provinceId, name, nameEn }) => ({
  id,
  provinceId,
  name,
  nameEn,
}));
