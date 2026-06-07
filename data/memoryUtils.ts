import { memories, type Memory } from "@/data/memories";
import type { LocalMemoryStore } from "@/data/progress";

/**
 * Merge seeded + local memories into a single list, deduplicating by id and
 * excluding draft entries.
 */
export function collectMemories(localMemories: LocalMemoryStore): Memory[] {
  const localItems = Object.values(localMemories).flat();
  const byId = new Map<string, Memory>();

  [...memories, ...localItems].forEach((memory) => {
    if (!memory.draft) byId.set(memory.id, memory);
  });

  return [...byId.values()];
}
