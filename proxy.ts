import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  hasSiteSession,
  hasAdminSession,
  getMissingAuthEnv,
} from "@/lib/server/auth";

// ─── Route classification ───────────────────────────────────────────
// Public:      /, /api/auth/login, /api/login-photos GET, /demo, static
// Site-auth:   /map, /memories, /settings, /province/*, /favorites, /anniversaries,
//              /time-capsule, /api/memories GET, /api/city-assets GET
// Admin-only:  /api/memories POST|PUT|PATCH|DELETE, /api/city-assets PUT|PATCH|DELETE,
//              /api/login-photos PUT|PATCH|DELETE, /api/auth/password

// ─── Rate limiter (in-memory sliding window) ────────────────────────
interface RateLimitEntry {
  timestamps: number[];
}

const loginAttempts = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10; // 10 attempts per window

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return false;

  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );

  if (entry.timestamps.length === 0) {
    loginAttempts.delete(key);
    return false;
  }

  return entry.timestamps.length >= RATE_LIMIT_MAX_ATTEMPTS;
}

function recordAttempt(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry) {
    entry.timestamps.push(now);
    entry.timestamps = entry.timestamps.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
    );
  } else {
    loginAttempts.set(key, { timestamps: [now] });
  }
}

// Periodic cleanup to prevent memory leaks
let lastCleanup = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function cleanupRateLimits(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of loginAttempts) {
    entry.timestamps = entry.timestamps.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
    );
    if (entry.timestamps.length === 0) loginAttempts.delete(key);
  }
}

// ─── Proxy function ─────────────────────────────────────────────────

export function proxy(request: NextRequest) {
  cleanupRateLimits();

  const { pathname } = request.nextUrl;
  const method = request.method;

  // ── 1. Public paths: no auth check ──
  if (
    pathname === "/" ||
    pathname === "/demo" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/photos/") ||
    pathname.startsWith("/sprites/") ||
    pathname.startsWith("/logo/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ── 2. Login endpoint: rate-limit only, no auth required ──
  if (pathname === "/api/auth/login" && method === "POST") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateKey = `login:${ip}`;

    if (isRateLimited(rateKey)) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429 },
      );
    }

    recordAttempt(rateKey);
    return NextResponse.next();
  }

  // Login-photos GET is public (pre-auth unlock screen needs it)
  if (pathname === "/api/login-photos" && method === "GET") {
    return NextResponse.next();
  }

  // ── 3. Admin-only API routes ──
  if (
    (pathname === "/api/memories" &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(method)) ||
    (pathname === "/api/city-assets" &&
      ["PUT", "PATCH", "DELETE"].includes(method)) ||
    (pathname === "/api/login-photos" &&
      ["PUT", "PATCH", "DELETE"].includes(method)) ||
    pathname === "/api/auth/password"
  ) {
    if (getMissingAuthEnv().length > 0) {
      return NextResponse.json(
        { error: "Authentication is not configured" },
        { status: 503 },
      );
    }
    if (!hasAdminSession(request)) {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  // ── 4. Site-auth API routes (GET only) ──
  if (
    (pathname === "/api/memories" && method === "GET") ||
    (pathname === "/api/city-assets" && method === "GET")
  ) {
    if (getMissingAuthEnv().length > 0) {
      return NextResponse.json(
        { error: "Authentication is not configured" },
        { status: 503 },
      );
    }
    if (!hasSiteSession(request)) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // ── 5. Protected page routes: redirect to / if no site session ──
  if (
    pathname === "/map" ||
    pathname === "/memories" ||
    pathname === "/settings" ||
    pathname === "/favorites" ||
    pathname === "/anniversaries" ||
    pathname === "/time-capsule" ||
    pathname.startsWith("/province/")
  ) {
    if (getMissingAuthEnv().length > 0) {
      // Auth not configured — let through (dev mode)
      return NextResponse.next();
    }
    if (!hasSiteSession(request)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // ── 6. Catch-all: pass through ──
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude static files and image optimization
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
