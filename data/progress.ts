import { cities } from "@/data/cities";
import { cityIndex } from "@/data/cities-index";
import type { Memory } from "@/data/memories";
import { provinces } from "@/data/provinces";

/** A record mapping city IDs to their memory arrays. */
export type LocalMemoryStore = Record<string, Memory[]>;
/** Custom event name dispatched when the local memory store is updated. */
export const memoryStoreUpdatedEvent = "mapofus:memories-updated";

/**
 * Compute the set of city IDs that should be highlighted ("lit") on the map.
 * Includes seed-visited cities and any city with at least one memory in the store.
 */
export const getLitCityIds = (localMemories: LocalMemoryStore = {}) =>
  new Set([
    ...cities.filter((city) => city.visited).map((city) => city.id),
    ...Object.entries(localMemories)
      .filter(([, memories]) => memories.length > 0)
      .map(([cityId]) => cityId),
  ]);

/**
 * Map a set of lit city IDs to their parent province IDs.
 * Multiple cities in the same province are deduplicated.
 */
export const getLitProvinceIds = (litCityIds: Set<string>) =>
  new Set(
    cityIndex
      .filter((city) => litCityIds.has(city.id))
      .map((city) => city.provinceId),
  );

/** Lit city IDs at module load time (seed data only). */
export const initialLitCityIds = getLitCityIds();
/** Lit province IDs at module load time (seed data only). */
export const initialLitProvinceIds = getLitProvinceIds(initialLitCityIds);
/** Total number of provinces in the dataset. */
export const totalProvinceCount = provinces.length;
