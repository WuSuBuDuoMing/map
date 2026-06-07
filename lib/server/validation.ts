import { NextResponse, type NextRequest } from "next/server";

/** Re-export the client-safe type guard so server modules can import it here */
export { isRecord } from "@/lib/typeGuards";

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

/** Verify request is same-origin (CSRF defense) */
export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Allow requests without origin (same-origin browser requests)
  // or requests with matching origin
  if (origin && host && !origin.endsWith(host)) {
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 },
    );
  }
  return null;
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
