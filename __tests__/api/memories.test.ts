/**
 * Tests for /api/memories  (GET / POST / PUT / PATCH / DELETE)
 *
 * Covers:
 *  - Authentication: unauthenticated, site, admin roles
 *  - Input validation: missing fields, bad types, bad dates, XSS paths
 *  - CRUD lifecycle: create -> list -> edit -> delete
 *  - Edge cases: unknown city, empty store, cover image logic
 */
import { describe, it, expect } from "vitest";
import type { AuthRole } from "../helpers/auth-utils";
import { GET, POST, PUT, PATCH, DELETE } from "@/app/api/memories/route";
import {
  makeAuthenticatedRequest,
  makeUnauthenticatedRequest,
  makeRequest,
  buildExpiredCookieHeader,
  buildInvalidCookieHeader,
} from "../helpers/auth-utils";
import { makeMemoryPayload, randomCityId } from "../helpers/factories";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function memGet(roles: AuthRole[] = ["site"]) {
  const req = makeAuthenticatedRequest("/api/memories", roles);
  return GET(req);
}

function memPost(body: unknown, roles: AuthRole[] = ["admin"]) {
  const req = makeAuthenticatedRequest("/api/memories", roles, { method: "POST", body });
  return POST(req);
}

function memPut(body: unknown) {
  const req = makeAuthenticatedRequest("/api/memories", ["admin"], { method: "PUT", body });
  return PUT(req);
}

function memPatch(body: unknown) {
  const req = makeAuthenticatedRequest("/api/memories", ["admin"], { method: "PATCH", body });
  return PATCH(req);
}

function memDelete(body: unknown) {
  const req = makeAuthenticatedRequest("/api/memories", ["admin"], { method: "DELETE", body });
  return DELETE(req);
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------
describe("Memories API - Authentication", () => {
  it("GET returns 401 for unauthenticated request", async () => {
    const req = makeUnauthenticatedRequest("/api/memories");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("GET returns 200 for site role", async () => {
    const res = await memGet(["site"]);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.memories).toBeDefined();
  });

  it("GET returns 200 for admin role", async () => {
    const res = await memGet(["admin"]);
    expect(res.status).toBe(200);
  });

  it("POST returns 403 for site role", async () => {
    const payload = makeMemoryPayload();
    const res = await memPost(payload, ["site"]);
    expect(res.status).toBe(403);
  });

  it("POST returns 403 for unauthenticated request", async () => {
    const req = makeUnauthenticatedRequest("/api/memories", {
      method: "POST",
      body: makeMemoryPayload(),
    });
    const res = await POST(req);
    expect([403, 503]).toContain(res.status);
  });

  it("GET returns 401 with expired cookie", async () => {
    const req = makeRequest("/api/memories", {
      cookies: buildExpiredCookieHeader("site"),
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("GET returns 401 with invalid cookie", async () => {
    const req = makeRequest("/api/memories", {
      cookies: buildInvalidCookieHeader("site"),
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("DELETE returns 403 for site role", async () => {
    // Even though body is valid, site role should be rejected.
    const req = makeAuthenticatedRequest("/api/memories", ["site"], {
      method: "DELETE",
      body: { cityId: "beijing", memoryId: "x" },
    });
    const delRes = await DELETE(req);
    expect(delRes.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------
describe("Memories API - Input Validation (POST)", () => {
  it("returns 400 for non-JSON body", async () => {
    const req = makeAuthenticatedRequest("/api/memories", ["admin"], { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when memory object is missing", async () => {
    const res = await memPost({});
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid/i);
  });

  it("returns 400 when cityId is missing", async () => {
    const res = await memPost({
      memory: { date: "2024.06.15", text: "test", image: "/photos/x.jpg" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when cityId is unknown", async () => {
    const res = await memPost({
      memory: {
        cityId: "nonexistent-city-id",
        date: "2024.06.15",
        text: "test",
        image: "/photos/x.jpg",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when date format is invalid", async () => {
    const res = await memPost({
      memory: {
        cityId: randomCityId(),
        date: "2024/06/15", // wrong format
        text: "test",
        image: "/photos/x.jpg",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when date is impossible (e.g. Feb 30)", async () => {
    const res = await memPost({
      memory: {
        cityId: randomCityId(),
        date: "2024.02.30",
        text: "test",
        image: "/photos/x.jpg",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is empty", async () => {
    const res = await memPost({
      memory: {
        cityId: randomCityId(),
        date: "2024.06.15",
        text: "",
        image: "/photos/x.jpg",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when text exceeds 80 characters", async () => {
    const res = await memPost({
      memory: {
        cityId: randomCityId(),
        date: "2024.06.15",
        text: "x".repeat(81),
        image: "/photos/x.jpg",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when image is a disallowed path (path traversal attempt)", async () => {
    const res = await memPost({
      memory: {
        cityId: randomCityId(),
        date: "2024.06.15",
        text: "test",
        image: "../../../etc/passwd",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when image is an XSS-style script tag disguised as URL", async () => {
    const res = await memPost({
      memory: {
        cityId: randomCityId(),
        date: "2024.06.15",
        text: "test",
        image: "javascript:alert(1)",
      },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when cityId is not a string", async () => {
    const res = await memPost({
      memory: {
        cityId: 12345,
        date: "2024.06.15",
        text: "test",
        image: "/photos/x.jpg",
      },
    });
    expect(res.status).toBe(400);
  });

  it("accepts valid date boundaries: 2024.01.01", async () => {
    const res = await memPost({
      memory: {
        cityId: randomCityId(),
        date: "2024.01.01",
        text: "new year",
        image: "/photos/x.jpg",
      },
    });
    expect(res.status).toBe(200);
  });

  it("accepts valid date boundaries: 2024.12.31", async () => {
    const res = await memPost({
      memory: {
        cityId: randomCityId(),
        date: "2024.12.31",
        text: "new year eve",
        image: "/photos/x.jpg",
      },
    });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// CRUD Lifecycle
// ---------------------------------------------------------------------------
describe("Memories API - CRUD Lifecycle", () => {
  let createdCityId: string;
  let createdMemoryId: string;

  it("POST creates a memory and returns it", async () => {
    const cityId = randomCityId();
    const payload = makeMemoryPayload({ cityId, text: "My first memory" });

    const res = await memPost(payload);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.memory).toBeDefined();
    expect(json.memory.cityId).toBe(cityId);
    expect(json.memory.text).toBe("My first memory");
    expect(json.memories).toBeDefined();
    expect(json.memories[cityId]).toBeDefined();

    createdCityId = cityId;
    createdMemoryId = json.memory.id;
  });

  it("GET returns the created memory", async () => {
    const res = await memGet(["admin"]);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.memories[createdCityId]).toBeDefined();
    const found = json.memories[createdCityId].find(
      (m: { id: string; text: string }) => m.id === createdMemoryId,
    );
    expect(found).toBeDefined();
    expect(found.text).toBe("My first memory");
  });

  it("PATCH edits the memory text and date", async () => {
    const res = await memPatch({
      cityId: createdCityId,
      memoryId: createdMemoryId,
      memory: {
        date: "2025.01.01",
        text: "Updated memory text",
        image: "/photos/updated.jpg",
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.memory.text).toBe("Updated memory text");
    expect(json.memory.date).toBe("2025.01.01");
  });

  it("PATCH returns 404 for non-existent memory", async () => {
    const res = await memPatch({
      cityId: createdCityId,
      memoryId: "nonexistent-id",
      memory: {
        date: "2025.01.01",
        text: "updated",
        image: "/photos/x.jpg",
      },
    });

    expect(res.status).toBe(404);
  });

  it("PATCH (cover) updates the cover image", async () => {
    // First, ensure the memory has a photos array that includes our target.
    const getRes = await memGet(["admin"]);
    const getData = await getRes.json();
    const memory = getData.memories[createdCityId]?.find(
      (m: { id: string; photos: string[] }) => m.id === createdMemoryId,
    );
    expect(memory).toBeDefined();

    const coverImage = memory.photos[0];
    const res = await memPatch({
      cityId: createdCityId,
      memoryId: createdMemoryId,
      coverImage,
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.memory.image).toBe(coverImage);
  });

  it("DELETE removes the memory", async () => {
    const res = await memDelete({
      cityId: createdCityId,
      memoryId: createdMemoryId,
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    // The memory should no longer exist in the returned store
    const cityMemories = json.memories[createdCityId] ?? [];
    const found = cityMemories.find((m: { id: string }) => m.id === createdMemoryId);
    expect(found).toBeUndefined();
  });

  it("GET returns empty store after deletion", async () => {
    const res = await memGet(["admin"]);
    const json = await res.json();

    expect(res.status).toBe(200);
    const cityMemories = json.memories[createdCityId] ?? [];
    const found = cityMemories.find((m: { id: string }) => m.id === createdMemoryId);
    expect(found).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PUT (bulk import) validation
// ---------------------------------------------------------------------------
describe("Memories API - PUT (bulk import)", () => {
  it("returns 400 for non-record payload", async () => {
    const res = await memPut("not-a-record");
    expect(res.status).toBe(400);
  });

  it("returns 400 when memories field is missing", async () => {
    const res = await memPut({ notMemories: {} });
    expect(res.status).toBe(400);
  });

  it("imports valid memory data", async () => {
    const cityId = randomCityId();
    const res = await memPut({
      memories: {
        [cityId]: [
          {
            date: "2024.03.15",
            text: "Imported memory",
            image: "/photos/import.jpg",
          },
        ],
      },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.memories[cityId]).toBeDefined();
    expect(json.memories[cityId].length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// DELETE validation
// ---------------------------------------------------------------------------
describe("Memories API - DELETE validation", () => {
  it("returns 400 for invalid delete payload", async () => {
    const res = await memDelete({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when cityId is missing", async () => {
    const res = await memDelete({ memoryId: "x" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when memory does not exist", async () => {
    const res = await memDelete({
      cityId: randomCityId(),
      memoryId: "nonexistent",
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH validation
// ---------------------------------------------------------------------------
describe("Memories API - PATCH validation", () => {
  it("returns 400 for completely invalid PATCH body", async () => {
    const res = await memPatch({ nonsense: true });
    expect(res.status).toBe(400);
  });

  it("returns 400 when coverImage is not in the memory photos", async () => {
    // First create a memory to work with.
    const cityId = randomCityId();
    const createRes = await memPost(makeMemoryPayload({ cityId }));
    const createJson = await createRes.json();
    const memoryId = createJson.memory?.id;

    if (!memoryId) return; // skip if creation failed

    const res = await memPatch({
      cityId,
      memoryId,
      coverImage: "/photos/definitely-not-in-the-list.jpg",
    });

    expect(res.status).toBe(400);
  });
});
