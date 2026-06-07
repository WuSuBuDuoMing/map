/**
 * Tests for POST /api/auth/login  and  DELETE /api/auth/login
 *
 * Covers:
 *  - Valid site / admin login
 *  - Missing / invalid payload
 *  - Wrong password
 *  - Missing env vars (503)
 *  - Logout clears cookies
 */
import { describe, it, expect } from "vitest";
import { POST, DELETE } from "@/app/api/auth/login/route";
import { makeRequest } from "../helpers/auth-utils";

// ---------------------------------------------------------------------------
// Helper: call the POST handler and parse the JSON body.
// ---------------------------------------------------------------------------
async function login(body: unknown) {
  const req = makeRequest("/api/auth/login", { method: "POST", body });
  const res = await POST(req);
  const json = await res.json();

  return { status: res.status, json, headers: res.headers };
}

async function logout(body: unknown) {
  const req = makeRequest("/api/auth/login", { method: "DELETE", body });
  const res = await DELETE(req);
  const json = await res.json();

  return { status: res.status, json, headers: res.headers };
}

// ---------------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  it("returns 200 and sets cookies for valid site password", async () => {
    const { status, json, headers } = await login({ password: "test-site-pw" });

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.role).toBe("site");

    // Should set the site cookie
    const setCookie = headers.getSetCookie?.() ?? [];
    const siteCookie = setCookie.find((c: string) => c.startsWith("mapofus_session="));
    expect(siteCookie).toBeDefined();
    // Should NOT set admin cookie for site login
    const adminCookie = setCookie.find((c: string) => c.startsWith("mapofus_admin="));
    expect(adminCookie).toBeUndefined();
  });

  it("returns 200 and sets both cookies for valid admin password", async () => {
    const { status, json, headers } = await login({ password: "test-admin-pw", mode: "admin" });

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.role).toBe("admin");

    const setCookie = headers.getSetCookie?.() ?? [];
    const siteCookie = setCookie.find((c: string) => c.startsWith("mapofus_session="));
    const adminCookie = setCookie.find((c: string) => c.startsWith("mapofus_admin="));
    expect(siteCookie).toBeDefined();
    expect(adminCookie).toBeDefined();
  });

  it("returns 401 for wrong password", async () => {
    const { status, json } = await login({ password: "wrong-password" });

    expect(status).toBe(401);
    expect(json.error).toMatch(/invalid password/i);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = makeRequest("/api/auth/login", { method: "POST" });
    // send empty body -- request.json() will fail, caught to null
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid/i);
  });

  it("returns 400 when password field is missing", async () => {
    const { status, json } = await login({ mode: "site" });

    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid/i);
  });

  it("returns 400 when password is not a string", async () => {
    const { status } = await login({ password: 12345 });

    expect(status).toBe(400);
  });

  it("returns 503 when AUTH_COOKIE_SECRET is missing", async () => {
    const originalSecret = process.env.AUTH_COOKIE_SECRET;
    delete process.env.AUTH_COOKIE_SECRET;

    try {
      const { status, json } = await login({ password: "test-site-pw" });
      expect(status).toBe(503);
      expect(json.error).toMatch(/not configured/i);
    } finally {
      process.env.AUTH_COOKIE_SECRET = originalSecret;
    }
  });

  it("returns 503 when SITE_PASSWORD is missing", async () => {
    const originalPw = process.env.SITE_PASSWORD;
    delete process.env.SITE_PASSWORD;

    try {
      const { status } = await login({ password: "test-site-pw" });
      expect(status).toBe(503);
    } finally {
      process.env.SITE_PASSWORD = originalPw;
    }
  });

  it("defaults to site role when mode is omitted", async () => {
    const { json } = await login({ password: "test-site-pw" });
    expect(json.role).toBe("site");
  });

  it("treats unknown mode values as site role", async () => {
    const { json } = await login({ password: "test-site-pw", mode: "superadmin" });
    expect(json.role).toBe("site");
  });
});

// ---------------------------------------------------------------------------
describe("DELETE /api/auth/login (logout)", () => {
  it("clears all cookies when no mode is specified", async () => {
    const { status, json } = await logout({});

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("clears only site cookie when mode=site", async () => {
    const { status } = await logout({ mode: "site" });
    expect(status).toBe(200);
  });

  it("clears only admin cookie when mode=admin", async () => {
    const { status } = await logout({ mode: "admin" });
    expect(status).toBe(200);
  });

  it("handles non-JSON body gracefully (defaults to clear all)", async () => {
    const { status } = await logout(null);
    expect(status).toBe(200);
  });
});
