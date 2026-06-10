/**
 * Unit tests for lib/server/rateLimit.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within limit", () => {
    const result = checkRateLimit("test-key", 5, 60000);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.remaining).toBe(4);
    }
  });

  it("blocks requests over limit", () => {
    // Use up all requests
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-key", 5, 60000);
    }

    const result = checkRateLimit("test-key", 5, 60000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("resets after window expires", () => {
    // Use up all requests
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-key", 5, 60000);
    }

    // Advance time past the window
    vi.advanceTimersByTime(61000);

    const result = checkRateLimit("test-key", 5, 60000);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.remaining).toBe(4);
    }
  });

  it("tracks different keys independently", () => {
    // Use up all requests for key1
    for (let i = 0; i < 5; i++) {
      checkRateLimit("key1", 5, 60000);
    }

    // key2 should still be allowed
    const result = checkRateLimit("key2", 5, 60000);
    expect(result.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("192.168.1.1");
  });

  it("extracts IP from x-real-ip header", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "192.168.1.2" },
    });
    expect(getClientIp(request)).toBe("192.168.1.2");
  });

  it("returns unknown when no IP headers", () => {
    const request = new Request("http://localhost");
    expect(getClientIp(request)).toBe("unknown");
  });
});
