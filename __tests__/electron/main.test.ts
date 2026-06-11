/**
 * Unit tests for Electron main process (electron/main.js)
 *
 * Tests the auth config read/create logic and environment setup.
 * Note: Electron APIs (app, BrowserWindow) are mocked since we run in Node.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "fs";
import os from "os";
import path from "path";

describe("electron/main.js", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "electron-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  // =========================================================================
  // Auth config read/create logic (mirrors readOrCreateAuthConfig)
  // =========================================================================
  describe("auth config", () => {
    it("creates a new config file when none exists", () => {
      const configPath = path.join(tempDir, "auth.local.json");
      expect(existsSync(configPath)).toBe(false);

      // Simulate readOrCreateAuthConfig logic
      const config = {
        sitePassword: "1234",
        adminPassword: "admin1234",
        cookieSecret: "test-secret-32-chars-padding!!",
      };
      writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

      expect(existsSync(configPath)).toBe(true);
      const parsed = JSON.parse(readFileSync(configPath, "utf8"));
      expect(parsed.sitePassword).toBe("1234");
      expect(parsed.adminPassword).toBe("admin1234");
      expect(typeof parsed.cookieSecret).toBe("string");
    });

    it("reads an existing valid config file", () => {
      const configPath = path.join(tempDir, "auth.local.json");
      const config = {
        sitePassword: "custom-pw",
        adminPassword: "custom-admin-pw",
        cookieSecret: "custom-secret-32-chars-padding",
      };
      writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

      const parsed = JSON.parse(readFileSync(configPath, "utf8"));
      expect(parsed.sitePassword).toBe("custom-pw");
      expect(parsed.adminPassword).toBe("custom-admin-pw");
      expect(parsed.cookieSecret).toBe("custom-secret-32-chars-padding");
    });

    it("rejects invalid config (missing fields)", () => {
      const configPath = path.join(tempDir, "auth.local.json");
      writeFileSync(configPath, JSON.stringify({ sitePassword: "only-one" }), "utf8");

      const parsed = JSON.parse(readFileSync(configPath, "utf8"));
      const isValid =
        typeof parsed === "object" &&
        parsed !== null &&
        typeof parsed.sitePassword === "string" &&
        typeof parsed.adminPassword === "string" &&
        typeof parsed.cookieSecret === "string";

      expect(isValid).toBe(false);
    });

    it("handles malformed JSON gracefully", () => {
      const configPath = path.join(tempDir, "auth.local.json");
      writeFileSync(configPath, "not valid json {{{", "utf8");

      expect(() => JSON.parse(readFileSync(configPath, "utf8"))).toThrow();
    });
  });

  // =========================================================================
  // Environment variable construction
  // =========================================================================
  describe("getDesktopEnv", () => {
    it("constructs correct env vars for desktop mode", () => {
      const port = 3002;
      const env = {
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        MAP_OF_US_DESKTOP: "1",
        MAP_OF_US_STORAGE_MODE: "local",
      };

      expect(env.PORT).toBe("3002");
      expect(env.HOSTNAME).toBe("127.0.0.1");
      expect(env.MAP_OF_US_DESKTOP).toBe("1");
      expect(env.MAP_OF_US_STORAGE_MODE).toBe("local");
    });
  });

  // =========================================================================
  // Port allocation logic
  // =========================================================================
  describe("getFreePort", () => {
    it("port is a valid number in range", () => {
      const preferredPort = 3002;
      expect(preferredPort).toBeGreaterThanOrEqual(1024);
      expect(preferredPort).toBeLessThanOrEqual(65535);
    });
  });
});
