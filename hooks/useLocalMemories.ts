"use client";

import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import {
  memoryStoreUpdatedEvent,
  type LocalMemoryStore,
} from "@/data/progress";

/**
 * Module-level cache: ensures `/api/memories` is fetched at most once per page
 * load, regardless of how many components call `useLocalMemories`.
 */
let cachedMemories: LocalMemoryStore = {};
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cachedMemories;
}

// Server snapshot returns empty (same as initial client state).
// Required by useSyncExternalStore for SSR compatibility.
function getServerSnapshot() {
  return cachedMemories;
}

function notifyListeners() {
  for (const listener of listeners) listener();
}

async function ensureFetched() {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const response = await fetch("/api/memories", { cache: "no-store" }).catch(
      () => null,
    );
    if (!response?.ok) return;

    const data = (await response.json().catch(() => null)) as
      | { memories?: LocalMemoryStore }
      | null;

    if (data?.memories) {
      cachedMemories = data.memories;
      notifyListeners();
    }
  })();

  return fetchPromise;
}

/**
 * Fetches the local memory store once and keeps all consumers in sync via
 * `useSyncExternalStore` plus the `memoryStoreUpdatedEvent` custom event.
 */
export function useLocalMemories(): LocalMemoryStore {
  // Kick off a single fetch on first use (idempotent).
  useEffect(() => {
    ensureFetched();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<LocalMemoryStore>).detail;
      if (detail) {
        cachedMemories = detail;
        notifyListeners();
      }
    };

    window.addEventListener(memoryStoreUpdatedEvent, handleUpdate);
    return () => window.removeEventListener(memoryStoreUpdatedEvent, handleUpdate);
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
