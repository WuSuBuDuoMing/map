/**
 * Unit tests for lib/imageUtils.ts
 *
 * Covers isBrowserImageUrl: data URLs, https URLs, server paths.
 */
import { describe, it, expect } from "vitest";
import { isBrowserImageUrl } from "@/lib/imageUtils";

describe("lib/imageUtils", () => {
  describe("isBrowserImageUrl", () => {
    it("returns true for data:image URLs", () => {
      expect(isBrowserImageUrl("data:image/png;base64,abc123")).toBe(true);
      expect(isBrowserImageUrl("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
      expect(isBrowserImageUrl("data:image/webp;base64,UklGR")).toBe(true);
      expect(isBrowserImageUrl("data:image/gif;base64,R0lGOD")).toBe(true);
    });

    it("returns true for https URLs", () => {
      expect(isBrowserImageUrl("https://example.com/photo.jpg")).toBe(true);
      expect(isBrowserImageUrl("https://cdn.example.com/path/to/image.png")).toBe(true);
    });

    it("returns false for server-relative paths", () => {
      expect(isBrowserImageUrl("/photos/test.jpg")).toBe(false);
      expect(isBrowserImageUrl("/sprites/icons/city-dot.svg")).toBe(false);
    });

    it("returns false for http URLs", () => {
      expect(isBrowserImageUrl("http://example.com/photo.jpg")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isBrowserImageUrl("")).toBe(false);
    });

    it("returns false for blob URLs", () => {
      expect(isBrowserImageUrl("blob:http://localhost:3000/abc-123")).toBe(false);
    });
  });
});
