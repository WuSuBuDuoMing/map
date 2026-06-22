/**
 * Unit tests for data/memories.ts
 *
 * Covers Memory interface usage, memoryTime, sortMemoriesByTime, getLatestMemory.
 */
import { describe, it, expect } from "vitest";
import {
  memories,
  recentMemories,
  memoryTime,
  sortMemoriesByTime,
  recentTimelineMemories,
  getLatestMemory,
} from "@/data/memories";
import type { Memory } from "@/data/memories";

describe("data/memories", () => {
  // =========================================================================
  // Seed data constants
  // =========================================================================
  describe("seed data", () => {
    it("memories is an empty array by default", () => {
      expect(Array.isArray(memories)).toBe(true);
      expect(memories.length).toBe(0);
    });

    it("recentMemories is empty when memories are empty", () => {
      expect(recentMemories.length).toBe(0);
    });

    it("recentTimelineMemories is empty when memories are empty", () => {
      expect(recentTimelineMemories.length).toBe(0);
    });
  });

  // =========================================================================
  // memoryTime
  // =========================================================================
  describe("memoryTime", () => {
    it("parses a YYYY.MM.DD date string", () => {
      const timestamp = memoryTime({ date: "2024.06.15" });
      expect(timestamp).toBe(Date.UTC(2024, 5, 15));
    });

    it("falls back to createdAt when date is not YYYY.MM.DD", () => {
      const ts = new Date("2024-07-20T10:00:00Z").getTime();
      const timestamp = memoryTime({ date: "2024/07/20", createdAt: "2024-07-20T10:00:00Z" });
      expect(timestamp).toBe(ts);
    });

    it("returns 0 when neither date nor createdAt is available", () => {
      expect(memoryTime({ date: "invalid", createdAt: undefined })).toBe(0);
    });

    it("returns 0 when createdAt is not a valid ISO string", () => {
      expect(memoryTime({ date: "invalid", createdAt: "not-a-date" })).toBeNaN();
    });

    it("handles zero-padded dates", () => {
      const timestamp = memoryTime({ date: "2024.01.01" });
      expect(timestamp).toBe(Date.UTC(2024, 0, 1));
    });
  });

  // =========================================================================
  // sortMemoriesByTime
  // =========================================================================
  describe("sortMemoriesByTime", () => {
    it("sorts memories newest first", () => {
      const items = [
        { date: "2024.01.01", createdAt: undefined },
        { date: "2024.06.15", createdAt: undefined },
        { date: "2024.03.10", createdAt: undefined },
      ];
      const sorted = sortMemoriesByTime(items);
      expect(sorted[0].date).toBe("2024.06.15");
      expect(sorted[1].date).toBe("2024.03.10");
      expect(sorted[2].date).toBe("2024.01.01");
    });

    it("does not mutate the original array", () => {
      const items = [
        { date: "2024.01.01", createdAt: undefined },
        { date: "2024.06.15", createdAt: undefined },
      ];
      const original = [...items];
      sortMemoriesByTime(items);
      expect(items[0].date).toBe(original[0].date);
      expect(items[1].date).toBe(original[1].date);
    });

    it("handles empty array", () => {
      const sorted = sortMemoriesByTime([]);
      expect(sorted).toEqual([]);
    });

    it("handles single element", () => {
      const sorted = sortMemoriesByTime([{ date: "2024.06.15", createdAt: undefined }]);
      expect(sorted).toHaveLength(1);
    });
  });

  // =========================================================================
  // getLatestMemory
  // =========================================================================
  describe("getLatestMemory", () => {
    it("returns undefined when memories is empty", () => {
      expect(getLatestMemory("beijing")).toBeUndefined();
    });

    it("returns undefined for unknown cityId when memories is empty", () => {
      expect(getLatestMemory("nonexistent")).toBeUndefined();
    });
  });
});
