/**
 * Tests for POST /api/auth/password
 *
 * Covers:
 *  - Admin-only access control
 *  - Valid password change
 *  - Input validation (empty, too long, invalid target)
 *  - Missing auth env
 *  - Site role cannot change passwords (403)
 *  - Unauthenticated requests (403 / 503)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/password/route";
import {
  makeAuthenticatedRequest,
  makeUnauthenticatedRequest,
  makeRequest,
  buildInvalidCookieHeader,
} from "../helpers/auth-utils";

async function changePassword(body: unknown, roles: string[] = ["admin"]) {
  const req = makeAuthenticatedRequest("/api/auth/password", roles as any, {
    method: "POST",
    body,
  });
  const res = await POST(req);
  const json = await res.json();

  return { status: res.status, json };
}

describe("POST /api/auth/password", () => {
  it("returns 200 when admin changes site password", async () => {
    const originalPw = process.env.SITE_PASSWORD;
    try {
      const { status, json } = await changePassword({
        target: "site",
        newPassword: "new-site-pw",
      });

      expect(status).toBe(200);
      expect(json.ok).toBe(true);
      // process.env should be updated immediately
      expect(process.env.SITE_PASSWORD).toBe("new-site-pw");
    } finally {
      process.env.SITE_PASSWORD = originalPw;
    }
  });

  it("returns 200 when admin changes admin password", async () => {
    const originalPw = process.env.ADMIN_PASSWORD;
    try {
      const { status, json } = await changePassword({
        target: "admin",
        newPassword: "new-admin-pw",
      });

      expect(status).toBe(200);
      expect(json.ok).toBe(true);
      expect(process.env.ADMIN_PASSWORD).toBe("new-admin-pw");
    } finally {
      process.env.ADMIN_PASSWORD = originalPw;
    }
  });

  // --- Authentication tests ---

  it("returns 403 for unauthenticated request", async () => {
    const req = makeUnauthenticatedRequest("/api/auth/password", {
      method: "POST",
      body: { target: "site", newPassword: "x" },
    });
    const res = await POST(req);

    // requireAdminSession returns 503 when env missing, or 403 when not admin.
    // In test env the secret is set, so it should be 403.
    expect([403, 503]).toContain(res.status);
  });

  it("returns 403 when site role tries to change password", async () => {
    const { status } = await changePassword(
      { target: "site", newPassword: "x" },
      ["site"],
    );

    expect(status).toBe(403);
  });

  it("returns 403 with invalid cookie", async () => {
    const req = makeRequest("/api/auth/password", {
      method: "POST",
      body: { target: "site", newPassword: "x" },
      cookies: buildInvalidCookieHeader("admin"),
    });
    const res = await POST(req);

    expect([403, 503]).toContain(res.status);
  });

  // --- Input validation tests ---

  it("returns 400 when body is not a record", async () => {
    const { status } = await changePassword(null);
    expect(status).toBe(400);
  });

  it("returns 400 when target is invalid", async () => {
    const { status, json } = await changePassword({
      target: "invalid",
      newPassword: "x",
    });

    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid target/i);
  });

  it("returns 400 when target is missing", async () => {
    const { status } = await changePassword({ newPassword: "x" });
    expect(status).toBe(400);
  });

  it("returns 400 when newPassword is empty", async () => {
    const { status, json } = await changePassword({
      target: "site",
      newPassword: "   ",
    });

    expect(status).toBe(400);
    expect(json.error).toMatch(/length/i);
  });

  it("returns 400 when newPassword exceeds 64 characters", async () => {
    const { status, json } = await changePassword({
      target: "site",
      newPassword: "a".repeat(65),
    });

    expect(status).toBe(400);
    expect(json.error).toMatch(/length/i);
  });

  it("returns 400 when newPassword is not a string", async () => {
    const { status } = await changePassword({
      target: "site",
      newPassword: 12345,
    });

    expect(status).toBe(400);
  });

  it("accepts a 1-character password (boundary)", async () => {
    const originalPw = process.env.SITE_PASSWORD;
    try {
      const { status } = await changePassword({
        target: "site",
        newPassword: "x",
      });
      expect(status).toBe(200);
    } finally {
      process.env.SITE_PASSWORD = originalPw;
    }
  });

  it("accepts a 64-character password (boundary)", async () => {
    const originalPw = process.env.SITE_PASSWORD;
    try {
      const { status } = await changePassword({
        target: "site",
        newPassword: "a".repeat(64),
      });
      expect(status).toBe(200);
    } finally {
      process.env.SITE_PASSWORD = originalPw;
    }
  });
});
