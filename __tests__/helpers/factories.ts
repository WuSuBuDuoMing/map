/**
 * Test data factories: produce realistic in-memory objects for each entity.
 * All factories use valid city IDs from the real data/cities.ts so that
 * the route handlers' city-lookup logic succeeds.
 */
import type { Memory } from "@/data/memories";

let counter = 0;
const nextId = () => `${Date.now()}-${++counter}-${Math.random().toString(36).slice(2, 6)}`;

// A small set of well-known city IDs that appear in data/cities.ts
const KNOWN_CITY_IDS = ["beijing", "shanghai", "guangzhou", "chengdu", "hangzhou", "shenzhen", "nanjing"];

export function randomCityId(): string {
  return KNOWN_CITY_IDS[Math.floor(Math.random() * KNOWN_CITY_IDS.length)];
}

export function makeMemory(overrides: Partial<Memory> = {}): Memory {
  const id = nextId();
  return {
    id,
    cityId: randomCityId(),
    city: "TestCity",
    cityEn: "TestCity",
    date: "2024.06.15",
    image: "/photos/test.jpg",
    photos: ["/photos/test.jpg"],
    text: "A test memory text",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeMemoryPayload(overrides: Record<string, unknown> = {}) {
  return {
    memory: {
      cityId: randomCityId(),
      date: "2024.06.15",
      text: "A test memory",
      image: "/photos/test.jpg",
      ...overrides,
    },
  };
}

export function makeCityAssetPayload(overrides: Record<string, unknown> = {}) {
  return {
    cityId: randomCityId(),
    image: "/sprites/icons/city-dot.svg",
    ...overrides,
  };
}

export function makeLoginPhotoPayload(slotId = "slot1", overrides: Record<string, unknown> = {}) {
  return {
    slotId,
    image: "/photos/test.jpg",
    ...overrides,
  };
}

export function makeLoginPhotoTextPayload(slotId = "slot1", overrides: Record<string, unknown> = {}) {
  return {
    slotId,
    text: { city: "Test City", label: "Test Label" },
    ...overrides,
  };
}
