/**
 * Client-safe type guard. The server-only version lives in
 * `lib/server/validation.ts` (it imports Next.js request/response types).
 * This file provides the pure runtime check so client-side modules
 * (appSettings, loginPhotoStore, etc.) can use `isRecord` without pulling
 * in server-only dependencies.
 */

/** Type guard: is this a plain object (not array, not null)? */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
