/**
 * Unit tests for lib/server/apiResponse.ts
 */
import { describe, it, expect } from "vitest";
import { apiError, apiSuccess, Errors } from "@/lib/server/apiResponse";

describe("apiError", () => {
  it("returns correct status code for each error code", () => {
    const badRequest = apiError("BAD_REQUEST", "test");
    expect(badRequest.status).toBe(400);

    const unauthorized = apiError("UNAUTHORIZED", "test");
    expect(unauthorized.status).toBe(401);

    const forbidden = apiError("FORBIDDEN", "test");
    expect(forbidden.status).toBe(403);

    const notFound = apiError("NOT_FOUND", "test");
    expect(notFound.status).toBe(404);

    const tooLarge = apiError("PAYLOAD_TOO_LARGE", "test");
    expect(tooLarge.status).toBe(413);

    const rateLimited = apiError("RATE_LIMITED", "test");
    expect(rateLimited.status).toBe(429);

    const config = apiError("CONFIGURATION_ERROR", "test");
    expect(config.status).toBe(503);

    const internal = apiError("INTERNAL_ERROR", "test");
    expect(internal.status).toBe(500);
  });

  it("includes message in response body", async () => {
    const response = apiError("BAD_REQUEST", "Something went wrong");
    const body = await response.json();
    expect(body.error).toBe("Something went wrong");
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("includes custom headers", () => {
    const response = apiError("RATE_LIMITED", "test", { "Retry-After": "60" });
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});

describe("apiSuccess", () => {
  it("returns 200 by default", () => {
    const response = apiSuccess({ ok: true });
    expect(response.status).toBe(200);
  });

  it("returns custom status code", () => {
    const response = apiSuccess({ created: true }, 201);
    expect(response.status).toBe(201);
  });

  it("includes data in response body", async () => {
    const response = apiSuccess({ name: "test" });
    const body = await response.json();
    expect(body.name).toBe("test");
  });
});

describe("Errors", () => {
  it("invalidPayload returns 400", () => {
    const response = Errors.invalidPayload();
    expect(response.status).toBe(400);
  });

  it("unauthorized returns 401", () => {
    const response = Errors.unauthorized();
    expect(response.status).toBe(401);
  });

  it("adminRequired returns 403", () => {
    const response = Errors.adminRequired();
    expect(response.status).toBe(403);
  });

  it("notConfigured returns 503", () => {
    const response = Errors.notConfigured();
    expect(response.status).toBe(503);
  });

  it("storageRequired includes action in message", async () => {
    const response = Errors.storageRequired("save memories");
    const body = await response.json();
    expect(body.error).toContain("save memories");
  });

  it("tooLarge includes max size in message", async () => {
    const response = Errors.tooLarge(15);
    const body = await response.json();
    expect(body.error).toContain("15");
  });

  it("rateLimited includes Retry-After header", () => {
    const response = Errors.rateLimited(30000);
    expect(response.headers.get("Retry-After")).toBe("30");
  });

  it("internal returns 500", () => {
    const response = Errors.internal();
    expect(response.status).toBe(500);
  });
});
