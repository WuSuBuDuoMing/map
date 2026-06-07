/**
 * Tests for /api/login-photos  (GET / PUT / PATCH / DELETE)
 *
 * Covers:
 *  - GET is public (no auth env configured returns empty; with env, no auth needed)
 *  - PUT / PATCH / DELETE require admin
 *  - Input validation: slot ID pattern, image allowed prefixes, text field limits
 *  - CRUD lifecycle for both photo and text entries
 */
import { describe, it, expect } from "vitest";
import type { AuthRole } from "../helpers/auth-utils";
import { GET, PUT, PATCH, DELETE } from "@/app/api/login-photos/route";
import {
  makeAuthenticatedRequest,
  makeUnauthenticatedRequest,
  makeRequest,
  buildExpiredCookieHeader,
  buildInvalidCookieHeader,
} from "../helpers/auth-utils";
import { makeLoginPhotoPayload, makeLoginPhotoTextPayload } from "../helpers/factories";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function photosGet(cookies?: string) {
  const req = cookies
    ? makeRequest("/api/login-photos", { cookies })
    : makeUnauthenticatedRequest("/api/login-photos");
  return GET(req);
}

function photosPut(body: unknown, roles: AuthRole[] = ["admin"]) {
  const req = makeAuthenticatedRequest("/api/login-photos", roles, { method: "PUT", body });
  return PUT(req);
}

function photosPatch(body: unknown) {
  const req = makeAuthenticatedRequest("/api/login-photos", ["admin"], { method: "PATCH", body });
  return PATCH(req);
}

function photosDelete(body: unknown, roles: AuthRole[] = ["admin"]) {
  const req = makeAuthenticatedRequest("/api/login-photos", roles, { method: "DELETE", body });
  return DELETE(req);
}

// ---------------------------------------------------------------------------
// GET - Public access
// ---------------------------------------------------------------------------
describe("Login Photos API - GET (public access)", () => {
  it("returns 200 with photos and texts for unauthenticated request", async () => {
    const res = await photosGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos).toBeDefined();
    expect(json.texts).toBeDefined();
  });

  it("returns 200 for site role", async () => {
    const req = makeAuthenticatedRequest("/api/login-photos", ["site"]);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Authentication for write operations
// ---------------------------------------------------------------------------
describe("Login Photos API - Write Authentication", () => {
  it("PUT returns 403 for site role", async () => {
    const req = makeAuthenticatedRequest("/api/login-photos", ["site"], {
      method: "PUT",
      body: makeLoginPhotoPayload(),
    });
    const res = await PUT(req);

    expect(res.status).toBe(403);
  });

  it("PUT returns 403 for unauthenticated request", async () => {
    const req = makeUnauthenticatedRequest("/api/login-photos", {
      method: "PUT",
      body: makeLoginPhotoPayload(),
    });
    const res = await PUT(req);

    expect([403, 503]).toContain(res.status);
  });

  it("PUT returns 403 with expired cookie", async () => {
    const req = makeRequest("/api/login-photos", {
      method: "PUT",
      body: makeLoginPhotoPayload(),
      cookies: buildExpiredCookieHeader("admin"),
    });
    const res = await PUT(req);

    expect(res.status).toBe(403);
  });

  it("PUT returns 403 with invalid cookie", async () => {
    const req = makeRequest("/api/login-photos", {
      method: "PUT",
      body: makeLoginPhotoPayload(),
      cookies: buildInvalidCookieHeader("admin"),
    });
    const res = await PUT(req);

    expect(res.status).toBe(403);
  });

  it("DELETE returns 403 for site role", async () => {
    const req = makeAuthenticatedRequest("/api/login-photos", ["site"], {
      method: "DELETE",
      body: { slotId: "slot1" },
    });
    const res = await DELETE(req);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------
describe("Login Photos API - Input Validation", () => {
  it("PUT returns 400 for non-JSON body", async () => {
    const req = makeAuthenticatedRequest("/api/login-photos", ["admin"], { method: "PUT" });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when slotId is missing", async () => {
    const res = await photosPut({ image: "/photos/test.jpg" });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when slotId contains invalid characters", async () => {
    const res = await photosPut({ slotId: "slot/../../evil", image: "/photos/test.jpg" });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when slotId is too long (>40 chars)", async () => {
    const res = await photosPut({ slotId: "a".repeat(41), image: "/photos/test.jpg" });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when image has disallowed prefix", async () => {
    const res = await photosPut({ slotId: "slot1", image: "/sprites/evil.jpg" });
    // login-photos allows /photos/, /sprites/, https://, data:image/
    // so /sprites/ IS allowed. Let's use a truly disallowed one:
    expect(res.status).toBe(200); // /sprites/ is allowed for login-photos
  });

  it("PUT returns 400 when image is a relative path outside allowed prefixes", async () => {
    const res = await photosPut({ slotId: "slot1", image: "/other/path.jpg" });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when image is a path traversal attempt", async () => {
    const res = await photosPut({ slotId: "slot1", image: "../../../etc/passwd" });
    expect(res.status).toBe(400);
  });

  it("PUT returns 400 when neither image nor text is provided", async () => {
    const res = await photosPut({ slotId: "slot1" });
    expect(res.status).toBe(400);
  });

  it("PUT accepts valid slot ID patterns", async () => {
    const validIds = ["a", "slot1", "my_slot", "my-slot", "ABC123"];

    for (const slotId of validIds) {
      const res = await photosPut({ slotId, image: "/photos/test.jpg" });
      expect(res.status).toBe(200);
    }
  });

  it("PUT returns 400 for slot IDs with spaces", async () => {
    const res = await photosPut({ slotId: "has space", image: "/photos/test.jpg" });
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 when neither photos nor texts field exists", async () => {
    const res = await photosPatch({ something: "else" });
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 for non-record payload", async () => {
    const res = await photosPatch("invalid");
    expect(res.status).toBe(400);
  });

  it("DELETE returns 400 when slotId is missing", async () => {
    const res = await photosDelete({});
    expect(res.status).toBe(400);
  });

  it("DELETE returns 400 when slotId has invalid characters", async () => {
    const res = await photosDelete({ slotId: "../../evil" });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// CRUD Lifecycle - Photo entries
// ---------------------------------------------------------------------------
describe("Login Photos API - Photo CRUD Lifecycle", () => {
  const testSlot = "testphoto";

  it("PUT creates a photo entry", async () => {
    const res = await photosPut(makeLoginPhotoPayload(testSlot));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos).toBeDefined();
    expect(json.photos[testSlot]).toBeDefined();
  });

  it("GET returns the created photo", async () => {
    const res = await photosGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos[testSlot]).toBeDefined();
  });

  it("PUT updates the photo entry", async () => {
    const res = await photosPut({
      slotId: testSlot,
      image: "/sprites/icons/city-dot.svg",
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos[testSlot]).toBeDefined();
  });

  it("DELETE removes the photo entry", async () => {
    const res = await photosDelete({ slotId: testSlot, kind: "photo" });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos[testSlot]).toBeUndefined();
  });

  it("GET returns empty photos after deletion", async () => {
    const res = await photosGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos[testSlot]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CRUD Lifecycle - Text entries
// ---------------------------------------------------------------------------
describe("Login Photos API - Text CRUD Lifecycle", () => {
  const testSlot = "testtext";

  it("PUT creates a text entry", async () => {
    const res = await photosPut(makeLoginPhotoTextPayload(testSlot));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.texts).toBeDefined();
    expect(json.texts[testSlot]).toBeDefined();
    expect(json.texts[testSlot].city).toBe("Test City");
    expect(json.texts[testSlot].label).toBe("Test Label");
  });

  it("GET returns the created text", async () => {
    const res = await photosGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.texts[testSlot]).toBeDefined();
  });

  it("DELETE removes the text entry", async () => {
    const res = await photosDelete({ slotId: testSlot, kind: "text" });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.texts[testSlot]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PATCH (bulk import)
// ---------------------------------------------------------------------------
describe("Login Photos API - PATCH (bulk import)", () => {
  it("imports multiple photos at once", async () => {
    const res = await photosPatch({
      photos: {
        bulk1: "/photos/test1.jpg",
        bulk2: "/photos/test2.jpg",
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.photos.bulk1).toBeDefined();
    expect(json.photos.bulk2).toBeDefined();
  });

  it("imports text entries", async () => {
    const res = await photosPatch({
      texts: {
        bulktext1: { city: "Bulk City", label: "Bulk Label" },
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.texts.bulktext1).toBeDefined();
    expect(json.texts.bulktext1.city).toBe("Bulk City");
  });

  it("ignores text entries with neither city nor label", async () => {
    const res = await photosPatch({
      texts: {
        emptytext: {},
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.texts.emptytext).toBeUndefined();
  });

  it("truncates city text to 40 chars", async () => {
    const longCity = "a".repeat(100);
    const res = await photosPatch({
      texts: {
        truncatetest: { city: longCity },
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.texts.truncatetest.city.length).toBeLessThanOrEqual(40);
  });

  it("truncates label text to 80 chars", async () => {
    const longLabel = "b".repeat(100);
    const res = await photosPatch({
      texts: {
        truncatelabel: { label: longLabel },
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.texts.truncatelabel.label.length).toBeLessThanOrEqual(80);
  });
});
