import { NextResponse, type NextRequest } from "next/server";

/** Type guard: is this a plain object (not array, not null)? */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Maximum allowed inline image size (base64 data URL length) */
export const imageMaxLength = 12_000_000;

/**
 * Create an image URL validator with configurable allowed prefixes.
 *
 * Usage:
 *   const isMemoryImage = createImageValidator(
 *     ["/photos/", "/sprites/", "https://", "data:image/"]
 *   );
 */
export function createImageValidator(allowedPrefixes: readonly string[]) {
  return (value: string): boolean =>
    value.length <= imageMaxLength &&
    allowedPrefixes.some((prefix) => value.startsWith(prefix));
}

/** Pre-built validators matching current usage */
export const isMemoryImage = createImageValidator([
  "/photos/",
  "/sprites/",
  "https://",
  "data:image/",
]);

export const isCityAssetImage = createImageValidator([
  "/sprites/",
  "https://",
  "data:image/",
]);

export const isLoginPhotoImage = createImageValidator([
  "/photos/",
  "/sprites/",
  "https://",
  "data:image/",
]);

/** Validate a string field from a parsed JSON payload */
export function parseStringField(
  payload: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; maxLength?: number; pattern?: RegExp },
): string | null {
  const value = payload[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (options?.maxLength && trimmed.length > options.maxLength) return null;
  if (options?.pattern && !options.pattern.test(trimmed)) return null;
  if (options?.required && trimmed.length === 0) return null;
  return trimmed;
}

/** Check Content-Length header and reject oversized requests early */
export function assertContentLength(
  request: NextRequest,
  maxBytes: number,
): NextResponse | null {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxBytes) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 },
    );
  }
  return null;
}
