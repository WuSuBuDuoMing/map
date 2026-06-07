"use client";

import { useEffect, useState } from "react";
import { memoryStoreUpdatedEvent, type LocalMemoryStore } from "@/data/progress";

/**
 * Fetches the local memory store from `/api/memories` on mount and stays in
 * sync via the `memoryStoreUpdatedEvent` custom event (fired when other
 * components mutate memories in the same tab).
 */
export function useLocalMemories(): LocalMemoryStore {
  const [localMemories, setLocalMemories] = useState<LocalMemoryStore>({});

  useEffect(() => {
    let cancelled = false;
    const handleMemoryUpdate = (event: Event) => {
      const detail = (event as CustomEvent<LocalMemoryStore>).detail;
      if (detail) setLocalMemories(detail);
    };

    async function loadLocalMemories() {
      const response = await fetch("/api/memories", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;

      const data = (await response.json().catch(() => null)) as
        | { memories?: LocalMemoryStore }
        | null;

      if (!cancelled && data?.memories) setLocalMemories(data.memories);
    }

    window.addEventListener(memoryStoreUpdatedEvent, handleMemoryUpdate);
    loadLocalMemories();

    return () => {
      cancelled = true;
      window.removeEventListener(memoryStoreUpdatedEvent, handleMemoryUpdate);
    };
  }, []);

  return localMemories;
}
