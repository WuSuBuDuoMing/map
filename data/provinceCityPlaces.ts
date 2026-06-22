/**
 * Province-to-city lookup utilities for province detail pages.
 *
 * Provides filtered views of the city dataset by province, including
 * visited/unvisited city subsets for the province detail map and sidebar.
 *
 * @module data/provinceCityPlaces
 */

import { cities } from "@/data/cities";

/** A city record with geographic coordinates, used for province detail views. */
export interface ProvinceCityPlace {
  id: string;
  provinceId: string;
  name: string;
  nameEn: string;
  lng: number;
  lat: number;
}

/** Flat array of all cities with their province membership and coordinates. */
export const provinceCityPlaces: ProvinceCityPlace[] = cities.map(
  ({ id, provinceId, name, nameEn, lng, lat }) => ({
    id,
    provinceId,
    name,
    nameEn,
    lng,
    lat,
  }),
);

/**
 * Get all cities belonging to a province.
 * @param provinceId - URL-safe province identifier.
 * @returns Array of cities in the province.
 */
export const getProvinceCityPlaces = (provinceId: string): ProvinceCityPlace[] =>
  provinceCityPlaces.filter((city) => city.provinceId === provinceId);

/**
 * Count total cities in a province.
 * @param provinceId - URL-safe province identifier.
 */
export const getProvinceCityTotal = (provinceId: string): number =>
  getProvinceCityPlaces(provinceId).length;

/**
 * Get unvisited cities in a province (those without memories).
 * @param provinceId - URL-safe province identifier.
 * @param visitedCityIds - Set of city IDs that already have memories.
 */
export const getUnvisitedProvinceCityPlaces = (
  provinceId: string,
  visitedCityIds: Set<string>,
): ProvinceCityPlace[] =>
  getProvinceCityPlaces(provinceId).filter((city) => !visitedCityIds.has(city.id));
