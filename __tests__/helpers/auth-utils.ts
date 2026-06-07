/**
 * Shared test helper: generates valid HMAC-signed auth cookies and
 * constructs NextRequest objects with the right headers.
 *
 * This module does NOT import the real auth module at test time.
 * Instead it re-implements the minimal HMAC signing logic so tests
 * stay isolated from the production code under test.
 */
import { createHmac } from "crypto";

export type AuthRole = "site" | "admin";

const SECRET = "test-cookie-secret-32chars!!!!!!";

// Wire the secret into process.env before any route module loads.
process.env.AUTH_COOKIE_SECRET = SECRET;
process.env.SITE_PASSWORD = "test-site-pw";
process.env.ADMIN_PASSWORD = "test-admin-pw";

const SITE_COOKIE = "mapofus_session";
const ADMIN_COOKIE = "mapofus_admin";

const siteMaxAge = 60 * 60 * 24 * 30;
const adminMaxAge = 60 * 60 * 8;

function encodePayload(role: AuthRole, exp: number): string {
  return Buffer.from(JSON.stringify({ role, exp }), "utf8").toString("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

/**
 * Create a token that the real `verifyToken` will accept.
 */
export function createTestToken(role: AuthRole, expired = false): string {
  const exp = expired
    ? Date.now() - 60_000 // 1 minute in the past
    : Date.now() + (role === "admin" ? adminMaxAge : siteMaxAge) * 1000;

  const payload = encodePayload(role, exp);
  return `${payload}.${sign(payload)}`;
}

/**
 * Build a cookie header string with the requested roles.
 */
export function buildCookieHeader(roles: AuthRole[] = []): string {
  const parts: string[] = [];

  if (roles.includes("site") || roles.includes("admin")) {
    parts.push(`${SITE_COOKIE}=${createTestToken("site")}`);
  }
  if (roles.includes("admin")) {
    parts.push(`${ADMIN_COOKIE}=${createTestToken("admin")}`);
  }

  return parts.join("; ");
}

/**
 * Build a cookie header with an expired token for the given role.
 */
export function buildExpiredCookieHeader(role: AuthRole): string {
  const cookieName = role === "admin" ? ADMIN_COOKIE : SITE_COOKIE;
  return `${cookieName}=${createTestToken(role, true)}`;
}

/**
 * Build a cookie header with a tampered / invalid token.
 */
export function buildInvalidCookieHeader(role: AuthRole = "site"): string {
  const cookieName = role === "admin" ? ADMIN_COOKIE : SITE_COOKIE;
  return `${cookieName}=invalid.token.value`;
}

/**
 * Construct a NextRequest-compatible object for testing route handlers.
 *
 * The `NextRequest` constructor accepts `(input, init)` where `input`
 * is a URL string. Cookies are injected via the `cookie` header.
 */
import { NextRequest } from "next/server";

type RequestOptions = {
  method?: string;
  body?: unknown;
  cookies?: string; // raw Cookie header value
  headers?: Record<string, string>;
};

export function makeRequest(
  url: string,
  options: RequestOptions = {},
): NextRequest {
  const { method = "GET", body, cookies, headers = {} } = options;

  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(cookies ? { cookie: cookies } : {}),
    },
  } as const;

  const finalInit: ReturnType<typeof Object.assign> = body !== undefined
    ? { ...init, body: JSON.stringify(body) }
    : init;

  return new NextRequest(new URL(url, "http://localhost:3002"), finalInit);
}

/**
 * Convenience: make a request with the given auth roles.
 */
export function makeAuthenticatedRequest(
  url: string,
  roles: AuthRole[],
  options: Omit<RequestOptions, "cookies"> = {},
): NextRequest {
  return makeRequest(url, { ...options, cookies: buildCookieHeader(roles) });
}

/**
 * Convenience: make a request with no auth at all.
 */
export function makeUnauthenticatedRequest(
  url: string,
  options: Omit<RequestOptions, "cookies"> = {},
): NextRequest {
  return makeRequest(url, options);
}
