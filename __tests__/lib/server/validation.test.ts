/**
 * Unit tests for lib/server/validation.ts
 *
 * Covers:
 *   - isRecord type guard
 *   - createImageValidator factory
 *   - Pre-built validators (isMemoryImage, isCityAssetImage, isLoginPhotoImage)
 *   - assertContentLength
 *   - assertSameOrigin
 */
import { describe, it, expect } from "vitest";
import {
  isRecord,
  imageMaxLength,
  createImageValidator,
  isMemoryImage,
  isCityAssetImage,
  isLoginPhotoImage,
  assertContentLength,
  assertSameOrigin,
} from "@/lib/server/validation";

// ---------------------------------------------------------------------------
// Helpers: minimal NextRequest / NextResponse stubs
// ---------------------------------------------------------------------------

/** Minimal request-like object for assertSameOrigin / assertContentLength. */
function makeRequest(headers: Record<string, string>) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as import("next/server").NextRequest;
}

// ---------------------------------------------------------------------------
// 1. isRecord
// ---------------------------------------------------------------------------
describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isRecord(42)).toBe(false);
    expect(isRecord("string")).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(Symbol("s"))).toBe(false);
  });

  it("returns false for functions", () => {
    expect(isRecord(() => {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. createImageValidator
// ---------------------------------------------------------------------------
describe("createImageValidator", () => {
  const isAllowed = createImageValidator(["https://", "data:image/"]);

  it("accepts values matching a prefix", () => {
    expect(isAllowed("https://example.com/img.png")).toBe(true);
    expect(isAllowed("data:image/png;base64,abc")).toBe(true);
  });

  it("rejects values not matching any prefix", () => {
    expect(isAllowed("/local/path.png")).toBe(false);
    expect(isAllowed("ftp://example.com/img.png")).toBe(false);
  });

  it("rejects values exceeding imageMaxLength", () => {
    const oversized = "https://" + "a".repeat(imageMaxLength);
    expect(isAllowed(oversized)).toBe(false);
  });

  it("accepts values at exactly the length limit", () => {
    // "https://" is 8 chars; fill the rest up to imageMaxLength
    const padding = "a".repeat(imageMaxLength - "https://".length);
    const exact = "https://" + padding;
    expect(isAllowed(exact)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Pre-built validators
// ---------------------------------------------------------------------------
describe("isMemoryImage", () => {
  it("accepts /photos/ prefix", () => {
    expect(isMemoryImage("/photos/abc.jpg")).toBe(true);
  });

  it("accepts /sprites/ prefix", () => {
    expect(isMemoryImage("/sprites/icon.png")).toBe(true);
  });

  it("accepts https:// prefix", () => {
    expect(isMemoryImage("https://cdn.example.com/img.jpg")).toBe(true);
  });

  it("accepts data:image/ prefix", () => {
    expect(isMemoryImage("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
  });

  it("rejects unknown prefix", () => {
    expect(isMemoryImage("/uploads/file.png")).toBe(false);
  });
});

describe("isCityAssetImage", () => {
  it("accepts /sprites/ prefix", () => {
    expect(isCityAssetImage("/sprites/city.png")).toBe(true);
  });

  it("accepts https:// prefix", () => {
    expect(isCityAssetImage("https://example.com/asset.png")).toBe(true);
  });

  it("accepts data:image/ prefix", () => {
    expect(isCityAssetImage("data:image/svg+xml;base64,PHN2Zw==")).toBe(true);
  });

  it("rejects /photos/ prefix (not in allowed list)", () => {
    expect(isCityAssetImage("/photos/abc.jpg")).toBe(false);
  });
});

describe("isLoginPhotoImage", () => {
  it("accepts /photos/ prefix", () => {
    expect(isLoginPhotoImage("/photos/login.jpg")).toBe(true);
  });

  it("accepts /sprites/ prefix", () => {
    expect(isLoginPhotoImage("/sprites/bg.png")).toBe(true);
  });

  it("accepts https:// prefix", () => {
    expect(isLoginPhotoImage("https://example.com/photo.jpg")).toBe(true);
  });

  it("accepts data:image/ prefix", () => {
    expect(isLoginPhotoImage("data:image/webp;base64,UklGR")).toBe(true);
  });

  it("rejects unknown prefix", () => {
    expect(isLoginPhotoImage("/other/path.jpg")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. assertContentLength
// ---------------------------------------------------------------------------
describe("assertContentLength", () => {
  it("returns null when Content-Length is within limit", () => {
    const req = makeRequest({ "content-length": "500" });
    const result = assertContentLength(req, 1000);
    expect(result).toBeNull();
  });

  it("returns null when Content-Length header is absent (defaults to 0)", () => {
    const req = makeRequest({});
    const result = assertContentLength(req, 1000);
    expect(result).toBeNull();
  });

  it("returns 413 response when Content-Length exceeds limit", () => {
    const req = makeRequest({ "content-length": "2000" });
    const result = assertContentLength(req, 1000);
    expect(result).not.toBeNull();
    // NextResponse.json returns an object with status
    expect(result!.status).toBe(413);
  });

  it("returns null when Content-Length equals limit exactly", () => {
    const req = makeRequest({ "content-length": "1000" });
    const result = assertContentLength(req, 1000);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. assertSameOrigin
// ---------------------------------------------------------------------------
describe("assertSameOrigin", () => {
  it("returns null when origin header is absent (same-origin browser request)", () => {
    const req = makeRequest({ host: "example.com" });
    expect(assertSameOrigin(req)).toBeNull();
  });

  it("returns null when host header is absent", () => {
    const req = makeRequest({ origin: "https://example.com" });
    expect(assertSameOrigin(req)).toBeNull();
  });

  it("returns null when origin matches host", () => {
    const req = makeRequest({
      origin: "https://example.com",
      host: "example.com",
    });
    expect(assertSameOrigin(req)).toBeNull();
  });

  it("returns 403 when origin does not match host", () => {
    const req = makeRequest({
      origin: "https://evil.com",
      host: "example.com",
    });
    const result = assertSameOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns null when both headers are absent", () => {
    const req = makeRequest({});
    expect(assertSameOrigin(req)).toBeNull();
  });
});
