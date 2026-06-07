/**
 * Unit tests for lib/dateUtils.ts
 *
 * Covers:
 *   - normalizeMemoryDate with valid dates
 *   - normalizeMemoryDate with invalid dates (Feb 30, month 13, etc.)
 *   - normalizeMemoryDate with malformed strings
 *   - DATE_PATTERN constant matching / non-matching
 */
import { describe, it, expect } from "vitest";
import { normalizeMemoryDate } from "@/lib/dateUtils";

/**
 * The regex pattern used inside normalizeMemoryDate to match "YYYY.MM.DD" /
 * "YYYY.M.D".  Kept in sync with lib/dateUtils.ts.
 */
const DATE_PATTERN = /^\d{4}\.\d{1,2}\.\d{1,2}$/;

// ---------------------------------------------------------------------------
// 1. normalizeMemoryDate -- valid dates
// ---------------------------------------------------------------------------
describe("normalizeMemoryDate", () => {
  it("zero-pads single-digit month and day", () => {
    expect(normalizeMemoryDate("2024.3.5")).toBe("2024.03.05");
  });

  it("returns already-padded date unchanged", () => {
    expect(normalizeMemoryDate("2024.03.05")).toBe("2024.03.05");
  });

  it("handles Jan 1", () => {
    expect(normalizeMemoryDate("2024.1.1")).toBe("2024.01.01");
  });

  it("handles Dec 31", () => {
    expect(normalizeMemoryDate("2024.12.31")).toBe("2024.12.31");
  });

  it("handles leap day (Feb 29 in leap year)", () => {
    expect(normalizeMemoryDate("2024.2.29")).toBe("2024.02.29");
  });

  it("handles a non-leap year Feb 28", () => {
    expect(normalizeMemoryDate("2023.2.28")).toBe("2023.02.28");
  });
});

// ---------------------------------------------------------------------------
// 2. normalizeMemoryDate -- invalid calendar dates
// ---------------------------------------------------------------------------
describe("normalizeMemoryDate - invalid dates", () => {
  it("rejects Feb 30", () => {
    expect(normalizeMemoryDate("2024.2.30")).toBeNull();
  });

  it("rejects Feb 29 in a non-leap year", () => {
    expect(normalizeMemoryDate("2023.2.29")).toBeNull();
  });

  it("rejects month 13", () => {
    expect(normalizeMemoryDate("2024.13.1")).toBeNull();
  });

  it("rejects month 0", () => {
    expect(normalizeMemoryDate("2024.0.1")).toBeNull();
  });

  it("rejects day 0", () => {
    expect(normalizeMemoryDate("2024.1.0")).toBeNull();
  });

  it("rejects day 32", () => {
    expect(normalizeMemoryDate("2024.1.32")).toBeNull();
  });

  it("rejects Apr 31 (30-day month)", () => {
    expect(normalizeMemoryDate("2024.4.31")).toBeNull();
  });

  it("rejects Jun 31 (30-day month)", () => {
    expect(normalizeMemoryDate("2024.6.31")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. normalizeMemoryDate -- format errors
// ---------------------------------------------------------------------------
describe("normalizeMemoryDate - format errors", () => {
  it("rejects empty string", () => {
    expect(normalizeMemoryDate("")).toBeNull();
  });

  it("rejects YYYY/MM/DD with slashes", () => {
    expect(normalizeMemoryDate("2024/03/05")).toBeNull();
  });

  it("rejects YYYY-MM-DD with dashes", () => {
    expect(normalizeMemoryDate("2024-03-05")).toBeNull();
  });

  it("rejects date with trailing whitespace", () => {
    expect(normalizeMemoryDate("2024.3.5 ")).toBeNull();
  });

  it("rejects date with leading whitespace", () => {
    expect(normalizeMemoryDate(" 2024.3.5")).toBeNull();
  });

  it("rejects partial date (year.month only)", () => {
    expect(normalizeMemoryDate("2024.3")).toBeNull();
  });

  it("rejects extra segments", () => {
    expect(normalizeMemoryDate("2024.3.5.6")).toBeNull();
  });

  it("rejects text", () => {
    expect(normalizeMemoryDate("not-a-date")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. DATE_PATTERN constant
// ---------------------------------------------------------------------------
describe("DATE_PATTERN", () => {
  const pattern = new RegExp(DATE_PATTERN);

  it("matches YYYY.M.D", () => {
    expect(pattern.test("2024.3.5")).toBe(true);
  });

  it("matches YYYY.MM.DD", () => {
    expect(pattern.test("2024.03.05")).toBe(true);
  });

  it("does not match YYYY/MM/DD", () => {
    expect(pattern.test("2024/03/05")).toBe(false);
  });

  it("does not match YYYY-MM-DD", () => {
    expect(pattern.test("2024-03-05")).toBe(false);
  });

  it("does not match short year (YY.M.D)", () => {
    expect(pattern.test("24.3.5")).toBe(false);
  });

  it("does not match empty string", () => {
    expect(pattern.test("")).toBe(false);
  });
});
