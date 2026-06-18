/**
 * HMAC-SHA256 cookie-based authentication for Map of Us.
 *
 * Provides dual-layer auth (site password + admin password) with:
 * - Timing-safe password comparison to prevent timing attacks
 * - HMAC-SHA256 signed cookies with configurable expiration
 * - Automatic cookie rotation on authentication
 *
 * @module lib/server/auth
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

/** The two authentication roles supported by the application. */
export type AuthRole = "site" | "admin";

const siteCookieName = "mapofus_session";
const adminCookieName = "mapofus_admin";
const siteMaxAgeSeconds = 60 * 60 * 24 * 30;
const adminMaxAgeSeconds = 60 * 60 * 8;

type AuthPayload = {
  role: AuthRole;
  exp: number;
};

const secureCookie = process.env.NODE_ENV === "production" && process.env.MAP_OF_US_DESKTOP !== "1";

const getSecret = () => process.env.AUTH_COOKIE_SECRET;

const getPassword = (role: AuthRole) =>
  role === "admin" ? process.env.ADMIN_PASSWORD : process.env.SITE_PASSWORD;

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const sign = (value: string) => {
  const secret = getSecret();
  if (!secret) return null;

  return createHmac("sha256", secret).update(value).digest("base64url");
};

const encodePayload = (payload: AuthPayload) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const decodePayload = (value: string): AuthPayload | null => {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const payload = parsed as Partial<AuthPayload>;

    if ((payload.role !== "site" && payload.role !== "admin") || typeof payload.exp !== "number") {
      return null;
    }

    return { role: payload.role, exp: payload.exp };
  } catch {
    return null;
  }
};

const createToken = (role: AuthRole) => {
  const payload = encodePayload({
    role,
    exp: Date.now() + (role === "admin" ? adminMaxAgeSeconds : siteMaxAgeSeconds) * 1000,
  });
  const signature = sign(payload);

  return signature ? `${payload}.${signature}` : null;
};

const verifyToken = (token?: string): AuthRole | null => {
  if (!token) return null;

  const [payloadValue, signature, extra] = token.split(".");
  if (!payloadValue || !signature || extra) return null;

  const expectedSignature = sign(payloadValue);
  if (!expectedSignature || !safeEqual(signature, expectedSignature)) return null;

  const payload = decodePayload(payloadValue);
  if (!payload || payload.exp < Date.now()) return null;

  return payload.role;
};

/**
 * Returns a list of missing auth-related environment variables.
 *
 * @param includePasswords - Whether to also check for `SITE_PASSWORD` and `ADMIN_PASSWORD`.
 * @returns Array of missing variable names (empty if all present).
 */
export const getMissingAuthEnv = (includePasswords = false) => {
  const missing: string[] = [];

  if (!process.env.AUTH_COOKIE_SECRET) missing.push("AUTH_COOKIE_SECRET");
  if (includePasswords && !process.env.SITE_PASSWORD) missing.push("SITE_PASSWORD");
  if (includePasswords && !process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");

  return missing;
};

/**
 * Verify a plaintext password against the stored value for the given role.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param role - The authentication role (`"site"` or `"admin"`).
 * @param password - The plaintext password to verify.
 * @returns `true` if the password matches, `false` otherwise.
 */
export const verifyPassword = (role: AuthRole, password: string) => {
  const expected = getPassword(role);
  if (!expected) return false;

  return safeEqual(password, expected);
};

/**
 * Extract the authenticated role from the request cookies.
 * Returns `"admin"` if an admin cookie is valid, `"site"` if a site cookie
 * is valid, or `null` if no valid session exists.
 *
 * @param request - The incoming Next.js request.
 * @returns The authenticated role or `null`.
 */
export const getAuthRole = (request: NextRequest): AuthRole | null => {
  const adminRole = verifyToken(request.cookies.get(adminCookieName)?.value);
  if (adminRole === "admin") return "admin";

  return verifyToken(request.cookies.get(siteCookieName)?.value);
};

/** Check if the request carries a valid site-level session. */
export const hasSiteSession = (request: NextRequest) => {
  const role = getAuthRole(request);

  return role === "site" || role === "admin";
};

/** Check if the request carries a valid admin-level session. */
export const hasAdminSession = (request: NextRequest) => getAuthRole(request) === "admin";

/**
 * Middleware guard that returns a 401/503 response if no valid site session exists.
 * Returns `null` if the request is authorized.
 */
export const requireSiteSession = (request: NextRequest) => {
  if (getMissingAuthEnv().length > 0) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  if (!hasSiteSession(request)) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return null;
};

/**
 * Middleware guard that returns a 403/503 response if no valid admin session exists.
 * Returns `null` if the request is authorized.
 */
export const requireAdminSession = (request: NextRequest) => {
  if (getMissingAuthEnv().length > 0) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }

  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 403 });
  }

  return null;
};

/**
 * Set authentication cookies on the response.
 * Always sets a site cookie; additionally sets an admin cookie when `role` is `"admin"`.
 *
 * @param response - The Next.js response to attach cookies to.
 * @param role - The authentication role granted.
 */
export const setAuthCookies = (response: NextResponse, role: AuthRole) => {
  const siteToken = createToken("site");
  if (siteToken) {
    response.cookies.set(siteCookieName, siteToken, {
      httpOnly: true,
      maxAge: siteMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: secureCookie,
    });
  }

  if (role !== "admin") return;

  const adminToken = createToken("admin");
  if (!adminToken) return;

  response.cookies.set(adminCookieName, adminToken, {
    httpOnly: true,
    maxAge: adminMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: secureCookie,
  });
};

/**
 * Clear authentication cookies on the response.
 *
 * @param response - The Next.js response to clear cookies from.
 * @param role - Which cookies to clear: `"site"`, `"admin"`, or `"all"` (default).
 */
export const clearAuthCookies = (response: NextResponse, role: AuthRole | "all" = "all") => {
  if (role === "site" || role === "all") response.cookies.delete(siteCookieName);
  if (role === "admin" || role === "all") response.cookies.delete(adminCookieName);
};
