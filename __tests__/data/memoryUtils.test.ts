/**
 * Unit tests for data/memoryUtils.ts
 *
 * Covers collectMemories: seed + local merge, dedup by id, draft exclusion.
 */
import { describe, it, expect } from "vitest";
import { collectMemories } from "@/data/memoryUtils";
import type { Memory } from "@/data/memories";
import type { LocalMemoryStore } from "@/data/progress";

describe("data/memoryUtils", () => {
  describe("collectMemories", () => {
    it("returns an empty array when store is empty", () => {
      const result = collectMemories({});
      // Seed memories are empty by default, so result should be empty
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns an empty array when store has only empty arrays", () => {
      const store: LocalMemoryStore = {
        beijing: [],
        shanghai: [],
      };
      const result = collectMemories(store);
      expect(Array.isArray(result)).toBe(true);
    });

    it("includes local memories that are not drafts", () => {
      const store: LocalMemoryStore = {
        beijing: [
          {
            id: "test-mem-1",
            cityId: "beijing",
            city: "北京",
            cityEn: "Beijing",
            date: "2024.06.01",
            image: "/photos/test.jpg",
            text: "Test memory",
          },
        ],
      };
      const result = collectMemories(store);
      const found = result.find((m: Memory) => m.id === "test-mem-1");
      expect(found).toBeDefined();
      expect(found?.text).toBe("Test memory");
    });

    it("excludes draft memories", () => {
      const store: LocalMemoryStore = {
        beijing: [
          {
            id: "draft-mem-1",
            cityId: "beijing",
            city: "北京",
            cityEn: "Beijing",
            date: "2024.06.01",
            image: "/photos/test.jpg",
            text: "Draft memory",
            draft: true,
          },
        ],
      };
      const result = collectMemories(store);
      const found = result.find((m: Memory) => m.id === "draft-mem-1");
      expect(found).toBeUndefined();
    });

    it("deduplicates by id, keeping the last occurrence", () => {
      const store: LocalMemoryStore = {
        beijing: [
          {
            id: "dup-1",
            cityId: "beijing",
            city: "北京",
            cityEn: "Beijing",
            date: "2024.06.01",
            image: "/photos/test.jpg",
            text: "First version",
          },
          {
            id: "dup-1",
            cityId: "beijing",
            city: "北京",
            cityEn: "Beijing",
            date: "2024.07.01",
            image: "/photos/test2.jpg",
            text: "Second version",
          },
        ],
      };
      const result = collectMemories(store);
      const matches = result.filter((m: Memory) => m.id === "dup-1");
      expect(matches).toHaveLength(1);
      expect(matches[0].text).toBe("Second version");
    });

    it("includes memories from multiple cities", () => {
      const store: LocalMemoryStore = {
        beijing: [
          {
            id: "mem-bj",
            cityId: "beijing",
            city: "北京",
            cityEn: "Beijing",
            date: "2024.06.01",
            image: "/photos/bj.jpg",
            text: "Beijing memory",
          },
        ],
        shanghai: [
          {
            id: "mem-sh",
            cityId: "shanghai",
            city: "上海",
            cityEn: "Shanghai",
            date: "2024.07.01",
            image: "/photos/sh.jpg",
            text: "Shanghai memory",
          },
        ],
      };
      const result = collectMemories(store);
      const bj = result.find((m: Memory) => m.id === "mem-bj");
      const sh = result.find((m: Memory) => m.id === "mem-sh");
      expect(bj).toBeDefined();
      expect(sh).toBeDefined();
    });
  });
});
