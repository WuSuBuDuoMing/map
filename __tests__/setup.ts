/**
 * Global test setup -- runs before every test file.
 *
 * 1. Sets environment variables that the auth module reads at import-time.
 * 2. Forces local-file storage mode so tests never touch Supabase.
 * 3. Points data files to a temp directory so tests are hermetic.
 */
import { beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";

let tempDir: string;

beforeAll(() => {
  // Create an isolated temp directory for all file-based stores.
  tempDir = mkdtempSync(path.join(os.tmpdir(), "map-of-us-test-"));

  // Auth env
  process.env.AUTH_COOKIE_SECRET = "test-cookie-secret-32chars!!!!!!";
  process.env.SITE_PASSWORD = "test-site-pw";
  process.env.ADMIN_PASSWORD = "test-admin-pw";

  // Force local file storage (skip Supabase entirely).
  process.env.MAP_OF_US_STORAGE_MODE = "local";
  (process.env as Record<string, string>).NODE_ENV = "test";

  // Redirect data files to the temp directory.
  process.env.MAP_OF_US_DATA_DIR = tempDir;
  process.env.MAP_OF_US_BUNDLED_DATA_DIR = tempDir;
});

afterAll(() => {
  // Clean up temp directory.
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});
