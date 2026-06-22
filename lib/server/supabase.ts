/**
 * Supabase client and data/storage helpers for web deployment.
 *
 * Provides a lazily-initialised `SupabaseClient` singleton, key-value JSON
 * read/write helpers backed by the `map_of_us_store` table, and data-URL
 * image upload helpers for Supabase Storage.
 *
 * When `MAP_OF_US_STORAGE_MODE=local`, all functions return no-ops or fallbacks
 * so the local JSON file store is used instead.
 *
 * @module lib/server/supabase
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldUseLocalFileStorage = process.env.MAP_OF_US_STORAGE_MODE === "local";

/** The Supabase Storage bucket name for file uploads. */
export const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? "map-of-us";

/** `true` when both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and local mode is off. */
export const isSupabaseConfigured = !shouldUseLocalFileStorage && Boolean(supabaseUrl && supabaseServiceRoleKey);
/** `true` in production when local file storage is not forced. */
export const shouldRequirePersistentStorage = process.env.NODE_ENV === "production" && !shouldUseLocalFileStorage;

/**
 * Throw if production writes are attempted without a Supabase connection.
 * @throws {Error} When persistent storage is required but Supabase is not configured.
 */
export function assertWritableStorageConfigured() {
  if (shouldRequirePersistentStorage && !isSupabaseConfigured) {
    throw new Error("Supabase is required for write operations in production.");
  }
}

let cachedClient: SupabaseClient | null | undefined;

/**
 * Return the lazily-initialised Supabase admin client, or `null` if
 * Supabase is not configured or local mode is active.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  if (shouldUseLocalFileStorage) {
    cachedClient = null;
    return cachedClient;
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}

/**
 * Read a JSON value from the `map_of_us_store` key-value table.
 * @param key - Store key to look up.
 * @param fallback - Value to return if the key is missing.
 * @returns The stored value or `fallback`.
 */
export async function readJsonValue<T>(key: string, fallback: T): Promise<T> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("map_of_us_store")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;

  return (data?.value as T | null) ?? fallback;
}

/**
 * Upsert a JSON value into the `map_of_us_store` key-value table.
 * @param key - Store key.
 * @param value - JSON-serialisable value to store.
 * @returns The stored value.
 */
export async function writeJsonValue<T>(key: string, value: T): Promise<T> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return value;

  const { error } = await supabase
    .from("map_of_us_store")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw error;

  return value;
}

const dataUrlPattern = /^data:([^;]+);base64,(.+)$/;

const extensionByMime = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

/**
 * Check whether a string is a base64-encoded data URL for an image.
 * @param value - The string to test.
 * @returns `true` if the string starts with `"data:image/"`.
 */
export function isDataImageUrl(value: string) {
  return value.startsWith("data:image/");
}

export async function uploadDataImage(
  value: string,
  pathPrefix: string,
  fallbackFileName: string,
) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isDataImageUrl(value)) return value;

  const match = dataUrlPattern.exec(value);
  if (!match) return value;

  const [, mimeType, base64] = match;
  const extension = extensionByMime.get(mimeType) ?? "png";
  const filePath = `${pathPrefix}/${fallbackFileName}.${extension}`.replaceAll(/\/+/g, "/");
  const bytes = Buffer.from(base64, "base64");
  const { error } = await supabase.storage
    .from(supabaseStorageBucket)
    .upload(filePath, bytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(supabaseStorageBucket).getPublicUrl(filePath);

  return data.publicUrl;
}
