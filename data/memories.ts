/** A single memory entry tied to a city, with optional multi-photo support. */
export interface Memory {
  /** Unique memory identifier. */
  id: string;
  /** URL-safe city identifier (matches cities.ts). */
  cityId: string;
  /** Chinese city display name. */
  city: string;
  /** English city display name. */
  cityEn: string;
  /** Memory date in "YYYY.MM.DD" format. */
  date: string;
  /** Primary cover image URL (data URL or path). */
  image: string;
  /** Optional additional photo URLs. */
  photos?: string[];
  /** User-written text for this memory. */
  text: string;
  /** ISO 8601 creation timestamp. */
  createdAt?: string;
  /** If `true`, this memory is a draft and excluded from display. */
  draft?: boolean;
}

/** In-memory seed memories (empty by default; populated at build time). */
export const memories: Memory[] = [];

/** The 3 most recent non-draft memories from the seed data. */
export const recentMemories: Memory[] = memories.filter((memory) => !memory.draft).slice(0, 3);

/** Compute a UTC timestamp from a memory's date or createdAt field for sorting. */
export const memoryTime = (memory: Pick<Memory, "date" | "createdAt">) => {
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(memory.date)) {
    const [year, month, day] = memory.date.split(".").map(Number);

    return Date.UTC(year, month - 1, day);
  }

  return memory.createdAt ? new Date(memory.createdAt).getTime() : 0;
};

/** Sort memories by their date/createdAt timestamp, newest first. */
export const sortMemoriesByTime = <T extends Pick<Memory, "date" | "createdAt">>(items: T[]) =>
  [...items].sort((a, b) => memoryTime(b) - memoryTime(a));

/** The 5 most recent non-draft memories for the timeline view. */
export const recentTimelineMemories: Memory[] = sortMemoriesByTime(
  memories.filter((memory) => !memory.draft),
).slice(0, 5);

/** Get the most recent non-draft memory for a specific city. */
export const getLatestMemory = (cityId: string): Memory | undefined =>
  sortMemoriesByTime(memories.filter((memory) => memory.cityId === cityId && !memory.draft))[0];
