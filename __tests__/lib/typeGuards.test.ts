/**
 * Unit tests for lib/typeGuards.ts
 *
 * Covers isRecord type guard for plain-object detection.
 */
import { describe, it, expect } from "vitest";
import { isRecord } from "@/lib/typeGuards";

describe("lib/typeGuards", () => {
  describe("isRecord", () => {
    it("returns true for a plain object", () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: "value" })).toBe(true);
      expect(isRecord({ a: 1, b: 2 })).toBe(true);
    });

    it("returns false for null", () => {
      expect(isRecord(null)).toBe(false);
    });

    it("returns false for an array", () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it("returns false for a string", () => {
      expect(isRecord("hello")).toBe(false);
      expect(isRecord("")).toBe(false);
    });

    it("returns false for a number", () => {
      expect(isRecord(0)).toBe(false);
      expect(isRecord(42)).toBe(false);
      expect(isRecord(NaN)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isRecord(undefined)).toBe(false);
    });

    it("returns false for a boolean", () => {
      expect(isRecord(true)).toBe(false);
      expect(isRecord(false)).toBe(false);
    });

    it("returns true for objects with prototype chains", () => {
      class Custom {}
      expect(isRecord(new Custom())).toBe(true);
    });
  });
});
