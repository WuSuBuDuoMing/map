/**
 * Unit tests for lib/localPrivacy.ts
 *
 * Covers isLocalPrivacyRequest and localPrivacyImagePlaceholder.
 */
import { describe, it, expect } from "vitest";
import { isLocalPrivacyRequest, localPrivacyImagePlaceholder } from "@/lib/localPrivacy";

describe("lib/localPrivacy", () => {
  describe("localPrivacyImagePlaceholder", () => {
    it("is a non-empty string", () => {
      expect(typeof localPrivacyImagePlaceholder).toBe("string");
      expect(localPrivacyImagePlaceholder.trim()).not.toBe("");
    });

    it("is an SVG sprite path", () => {
      expect(localPrivacyImagePlaceholder).toContain(".svg");
    });
  });

  describe("isLocalPrivacyRequest", () => {
    it("returns false for localhost requests (hostname not in set)", () => {
      const request = new Request("http://localhost:3002/test");
      expect(isLocalPrivacyRequest(request)).toBe(false);
    });

    it("returns false for any public hostname", () => {
      const request = new Request("https://example.com/test");
      expect(isLocalPrivacyRequest(request)).toBe(false);
    });

    it("returns false for a request with invalid URL (catch branch)", () => {
      // Request with a non-URL string triggers the catch block
      const request = { url: "not-a-valid-url" } as unknown as Request;
      expect(isLocalPrivacyRequest(request)).toBe(false);
    });
  });
});
