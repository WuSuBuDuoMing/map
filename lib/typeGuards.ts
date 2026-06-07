/**
 * Shared type guard for plain-object detection. This file is the single source
 * of truth for `isRecord`. Server-only modules re-export it from
 * `lib/server/validation.ts` (which adds Next.js request/response helpers);
 * client-side modules (appSettings, loginPhotoStore, etc.) import directly here
 * to avoid pulling in server-only dependencies.
 */

/** Type guard: is this a plain object (not array, not null)? */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
