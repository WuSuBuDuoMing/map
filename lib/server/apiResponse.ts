/**
 * Standardized API error response helpers.
 * Ensures consistent error format across all API routes.
 */
import { NextResponse } from "next/server";

type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

const ERROR_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  CONFIGURATION_ERROR: 503,
  INTERNAL_ERROR: 500,
};

export function apiError(code: ErrorCode, message: string, headers?: Record<string, string>): NextResponse {
  return NextResponse.json(
    { error: message, code },
    { status: ERROR_STATUS[code], headers },
  );
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** Shorthand for common error responses */
export const Errors = {
  invalidPayload: () => apiError("BAD_REQUEST", "Invalid request payload"),
  unauthorized: () => apiError("UNAUTHORIZED", "Authentication required"),
  adminRequired: () => apiError("FORBIDDEN", "Admin authentication required"),
  notConfigured: () => apiError("CONFIGURATION_ERROR", "Authentication is not configured"),
  storageRequired: (action: string) =>
    apiError("CONFIGURATION_ERROR", `Supabase is required to ${action} in production`),
  tooLarge: (maxMb: number) => apiError("PAYLOAD_TOO_LARGE", `Request body too large (max ${maxMb}MB)`),
  rateLimited: (retryAfterMs: number) =>
    apiError("RATE_LIMITED", "Too many requests", {
      "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
    }),
  internal: () => apiError("INTERNAL_ERROR", "Internal server error"),
} as const;
