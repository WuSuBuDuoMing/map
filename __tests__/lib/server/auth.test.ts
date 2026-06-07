/**
 * Unit tests for lib/server/auth.ts
 *
 * Exercises getMissingAuthEnv, verifyPassword, setAuthCookies,
 * clearAuthCookies, hasSiteSession, and hasAdminSession.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getMissingAuthEnv,
  verifyPassword,
  setAuthCookies,
  clearAuthCookies,
  hasSiteSession,
  hasAdminSession,
} from "@/lib/server/auth";
import {
  makeRequest,
  makeAuthenticatedRequest,
} from "../../helpers/auth-utils";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Test-scoped env values (the setup.ts already sets baseline values; we
// override here to test getMissingAuthEnv's sensitivity to specific vars).
// ---------------------------------------------------------------------------
const SECRET = "test-secret-key-for-testing-32chars!!";
const SITE_PW = "test1234";
const ADMIN_PW = "admin1234";

describe("lib/server/auth", () => {
  // Save originals so we can restore after each test that mutates env.
  const origSecret = process.env.AUTH_COOKIE_SECRET;
  const origSitePw = process.env.SITE_PASSWORD;
  const origAdminPw = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    // Restore environment between tests.
    if (origSecret !== undefined) process.env.AUTH_COOKIE_SECRET = origSecret;
    else delete process.env.AUTH_COOKIE_SECRET;
    if (origSitePw !== undefined) process.env.SITE_PASSWORD = origSitePw;
    else delete process.env.SITE_PASSWORD;
    if (origAdminPw !== undefined) process.env.ADMIN_PASSWORD = origAdminPw;
    else delete process.env.ADMIN_PASSWORD;
  });

  // =========================================================================
  // getMissingAuthEnv
  // =========================================================================
  describe("getMissingAuthEnv", () => {
    it("returns missing list when AUTH_COOKIE_SECRET is absent", () => {
      delete process.env.AUTH_COOKIE_SECRET;
      const missing = getMissingAuthEnv();
      expect(missing).toContain("AUTH_COOKIE_SECRET");
    });

    it("returns empty array when all required env vars are present", () => {
      process.env.AUTH_COOKIE_SECRET = SECRET;
      const missing = getMissingAuthEnv();
      expect(missing).toEqual([]);
    });

    it("returns empty array when includePasswords is false (default)", () => {
      process.env.AUTH_COOKIE_SECRET = SECRET;
      delete process.env.SITE_PASSWORD;
      delete process.env.ADMIN_PASSWORD;
      const missing = getMissingAuthEnv();
      expect(missing).toEqual([]);
    });

    it("includes SITE_PASSWORD and ADMIN_PASSWORD when includePasswords=true", () => {
      process.env.AUTH_COOKIE_SECRET = SECRET;
      delete process.env.SITE_PASSWORD;
      delete process.env.ADMIN_PASSWORD;
      const missing = getMissingAuthEnv(true);
      expect(missing).toContain("SITE_PASSWORD");
      expect(missing).toContain("ADMIN_PASSWORD");
    });
  });

  // =========================================================================
  // verifyPassword
  // =========================================================================
  describe("verifyPassword", () => {
    beforeEach(() => {
      process.env.AUTH_COOKIE_SECRET = SECRET;
      process.env.SITE_PASSWORD = SITE_PW;
      process.env.ADMIN_PASSWORD = ADMIN_PW;
    });

    it("returns true for correct site password", () => {
      expect(verifyPassword("site", SITE_PW)).toBe(true);
    });

    it("returns true for correct admin password", () => {
      expect(verifyPassword("admin", ADMIN_PW)).toBe(true);
    });

    it("returns false for wrong password", () => {
      expect(verifyPassword("site", "wrong-password")).toBe(false);
    });

    it("returns false for empty password", () => {
      expect(verifyPassword("site", "")).toBe(false);
    });

    it("returns false when env password is unset", () => {
      delete process.env.SITE_PASSWORD;
      expect(verifyPassword("site", "anything")).toBe(false);
    });
  });

  // =========================================================================
  // setAuthCookies
  // =========================================================================
  describe("setAuthCookies", () => {
    it("sets site cookie when role is site", () => {
      const response = new NextResponse();

      setAuthCookies(response, "site");

      const cookieHeader = response.headers.get("set-cookie") ?? "";
      expect(cookieHeader).toContain("mapofus_session=");
      // site-only role should NOT set admin cookie
      expect(cookieHeader).not.toContain("mapofus_admin=");
    });

    it("sets both site and admin cookies when role is admin", () => {
      const response = new NextResponse();

      setAuthCookies(response, "admin");

      const cookieHeader = response.headers.get("set-cookie") ?? "";
      expect(cookieHeader).toContain("mapofus_session=");
      expect(cookieHeader).toContain("mapofus_admin=");
    });
  });

  // =========================================================================
  // clearAuthCookies
  // =========================================================================
  describe("clearAuthCookies", () => {
    it("clears both cookies when role is 'all'", () => {
      const response = new NextResponse();

      clearAuthCookies(response, "all");

      const cookieHeader = response.headers.get("set-cookie") ?? "";
      // Deleting a cookie sets Max-Age=0 or expires in the past.
      expect(cookieHeader).toContain("mapofus_session=");
      expect(cookieHeader).toContain("mapofus_admin=");
    });

    it("clears only site cookie when role is 'site'", () => {
      const response = new NextResponse();

      clearAuthCookies(response, "site");

      const cookieHeader = response.headers.get("set-cookie") ?? "";
      expect(cookieHeader).toContain("mapofus_session=");
      expect(cookieHeader).not.toContain("mapofus_admin=");
    });
  });

  // =========================================================================
  // hasSiteSession
  // =========================================================================
  describe("hasSiteSession", () => {
    it("returns true for a valid site token", () => {
      const request = makeAuthenticatedRequest("http://localhost/api/test", ["site"]);
      expect(hasSiteSession(request)).toBe(true);
    });

    it("returns true for a valid admin token (admin implies site)", () => {
      const request = makeAuthenticatedRequest("http://localhost/api/test", ["admin"]);
      expect(hasSiteSession(request)).toBe(true);
    });

    it("returns false when no cookies are present", () => {
      const request = makeRequest("http://localhost/api/test");
      expect(hasSiteSession(request)).toBe(false);
    });

    it("returns false for an invalid token", () => {
      const request = makeRequest("http://localhost/api/test", {
        cookies: "mapofus_session=invalid.token.value",
      });
      expect(hasSiteSession(request)).toBe(false);
    });
  });

  // =========================================================================
  // hasAdminSession
  // =========================================================================
  describe("hasAdminSession", () => {
    it("returns true for a valid admin token", () => {
      const request = makeAuthenticatedRequest("http://localhost/api/test", ["admin"]);
      expect(hasAdminSession(request)).toBe(true);
    });

    it("returns false for a site-only token", () => {
      const request = makeAuthenticatedRequest("http://localhost/api/test", ["site"]);
      expect(hasAdminSession(request)).toBe(false);
    });

    it("returns false when no cookies are present", () => {
      const request = makeRequest("http://localhost/api/test");
      expect(hasAdminSession(request)).toBe(false);
    });

    it("returns false for an invalid admin token", () => {
      const request = makeRequest("http://localhost/api/test", {
        cookies: "mapofus_admin=invalid.token.value",
      });
      expect(hasAdminSession(request)).toBe(false);
    });
  });
});
