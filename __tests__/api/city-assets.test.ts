/**
 * Tests for /api/city-assets  (GET / PUT / PATCH / DELETE)
 *
 * Covers:
 *  - Authentication: site can read, admin can write
 *  - Input validation
 *  - CRUD lifecycle
 *  - Edge cases
 */
import { describe, it, expect } from "vitest";
import type { AuthRole } from "../helpers/auth-utils";
import { GET, PUT, PATCH, DELETE } from "@/app/api/city-assets/route";
import {
  makeAuthenticatedRequest,
  makeUnauthenticatedRequest,
  makeRequest,
  buildExpiredCookieHeader,
  buildInvalidCookieHeader,
} from "../helpers/auth-utils";
import { makeCityAssetPayload, randomCityId } from "../helpers/factories";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function assetsGet(roles?: AuthRole[]) {
  const req = roles
    ? makeAuthenticatedRequest("/api/city-assets", roles)
    : makeUnauthenticatedRequest("/api/city-assets");
  return GET(req);
}

function assetsPut(body: unknown, roles: AuthRole[] = ["admin"]) {
  const req = makeAuthenticatedRequest("/api/city-assets", roles, { method: "PUT", body });
  return PUT(req);
}

function assetsPatch(body: unknown) {
  const req = makeAuthenticatedRequest("/api/city-assets", ["admin"], { method: "PATCH", body });
  return PATCH(req);
}

function assetsDelete(body: unknown) {
  const req = makeAuthenticatedRequest("/api/city-assets", ["admin"], { method: "DELETE", body });
  return DELETE(req);
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------
describe("City Assets API - Authentication", () => {
  it("GET returns empty assets for unauthenticated request (no error)", async () => {
    const res = await assetsGet();
    const json = await res.json();

    // When auth env is configured but no session, returns { assets: {} }
    expect(res.status).toBe(200);
    expect(json.assets).toBeDefined();
  });

  it("GET returns assets for site role", async () => {
    const res = await assetsGet(["site"]);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets).toBeDefined();
  });

  it("PUT returns 403 for site role", async () => {
    const req = makeAuthenticatedRequest("/api/city-assets", ["site"], {
      method: "PUT",
      body: makeCityAssetPayload(),
    });
    const res = await PUT(req);

    expect(res.status).toBe(403);
  });

  it("PUT returns 403 for unauthenticated request", async () => {
    const req = makeUnauthenticatedRequest("/api/city-assets", {
      method: "PUT",
      body: makeCityAssetPayload(),
    });
    const res = await PUT(req);

    expect([403, 503]).toContain(res.status);
  });

  it("PUT returns 403 with expired cookie", async () => {
    const req = makeRequest("/api/city-assets", {
      method: "PUT",
      body: makeCityAssetPayload(),
      cookies: buildExpiredCookieHeader("admin"),
    });
    const res = await PUT(req);

    expect(res.status).toBe(403);
  });

  it("PUT returns 403 with invalid cookie", async () => {
    const req = makeRequest("/api/city-assets", {
      method: "PUT",
      body: makeCityAssetPayload(),
      cookies: buildInvalidCookieHeader("admin"),
    });
    const res = await PUT(req);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------
describe("City Assets API - Input Validation", () => {
  it("PUT returns 400 for non-JSON body", async () => {
    const req = makeAuthenticatedRequest("/api/city-assets", ["admin"], { method: "PUT" });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when cityId is missing", async () => {
    const res = await assetsPut({ image: "/sprites/icons/city-dot.svg" });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when cityId is unknown", async () => {
    const res = await assetsPut({ cityId: "nonexistent-city", image: "/sprites/icons/city-dot.svg" });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when image is missing", async () => {
    const res = await assetsPut({ cityId: randomCityId() });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when image has a disallowed prefix", async () => {
    const res = await assetsPut({
      cityId: randomCityId(),
      image: "/photos/not-allowed.jpg",
    });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 for path traversal image", async () => {
    const res = await assetsPut({
      cityId: randomCityId(),
      image: "../../../etc/passwd",
    });
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 when assets field is missing", async () => {
    const res = await assetsPatch({ notAssets: {} });
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 for non-record payload", async () => {
    const res = await assetsPatch("invalid");
    expect(res.status).toBe(400);
  });

  it("DELETE returns 400 when cityId is missing", async () => {
    const res = await assetsDelete({});
    expect(res.status).toBe(400);
  });

  it("DELETE returns 400 when cityId is unknown", async () => {
    const res = await assetsDelete({ cityId: "nonexistent-city" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// CRUD Lifecycle
// ---------------------------------------------------------------------------
describe("City Assets API - CRUD Lifecycle", () => {
  let testCityId: string;

  it("PUT creates a city asset", async () => {
    testCityId = randomCityId();
    const payload = makeCityAssetPayload({ cityId: testCityId });

    const res = await assetsPut(payload);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets).toBeDefined();
    expect(json.assets[testCityId]).toBeDefined();
  });

  it("GET returns the created asset", async () => {
    const res = await assetsGet(["admin"]);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets[testCityId]).toBeDefined();
  });

  it("PUT updates the asset for the same city", async () => {
    const res = await assetsPut({
      cityId: testCityId,
      image: "/sprites/icons/city-dot.svg",
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets[testCityId]).toBeDefined();
  });

  it("DELETE removes the asset", async () => {
    const res = await assetsDelete({ cityId: testCityId });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets[testCityId]).toBeUndefined();
  });

  it("GET returns empty after deletion", async () => {
    const res = await assetsGet(["admin"]);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets[testCityId]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PATCH (bulk import)
// ---------------------------------------------------------------------------
describe("City Assets API - PATCH (bulk import)", () => {
  it("imports multiple city assets at once", async () => {
    const city1 = randomCityId();
    const city2 = randomCityId();

    const res = await assetsPatch({
      assets: {
        [city1]: "/sprites/icons/city-dot.svg",
        [city2]: "/sprites/icons/city-dot.svg",
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.assets).toBeDefined();
  });
});
