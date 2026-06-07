/**
 * Unit tests for createJsonStore and recoverDataFiles.
 *
 * Every test uses its own mkdtemp directory so tests are fully isolated
 * and can run in parallel without interference.
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  createJsonStore,
  recoverDataFiles,
} from "@/lib/server/createJsonStore";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jsonstore-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

// ---------------------------------------------------------------------------
// 1. read returns fallback when file does not exist
// ---------------------------------------------------------------------------
describe("createJsonStore - read", () => {
  it("returns fallback when the data file does not exist", async () => {
    const filePath = path.join(tmpDir, "missing.json");
    const fallback = { count: 0, items: [] as string[] };

    const store = createJsonStore({ filePath, fallback });
    const result = await store.read();

    expect(result).toEqual(fallback);
  });

  it("returns parsed data when the file exists", async () => {
    const filePath = path.join(tmpDir, "existing.json");
    const data = { count: 42, items: ["a", "b"] };
    await fs.writeFile(filePath, JSON.stringify(data), "utf-8");

    const store = createJsonStore({ filePath, fallback: { count: 0, items: [] } });
    const result = await store.read();

    expect(result).toEqual(data);
  });

  it("returns fallback when file contains invalid JSON", async () => {
    const filePath = path.join(tmpDir, "corrupt.json");
    await fs.writeFile(filePath, "NOT VALID JSON {{{", "utf-8");

    const fallback = { ok: true };
    const store = createJsonStore({ filePath, fallback });
    const result = await store.read();

    expect(result).toEqual(fallback);
  });
});

// ---------------------------------------------------------------------------
// 2. write creates file with correct content
// ---------------------------------------------------------------------------
describe("createJsonStore - write", () => {
  it("creates the file with the correct JSON content", async () => {
    const filePath = path.join(tmpDir, "created.json");
    const fallback = { value: 0 };
    const store = createJsonStore({ filePath, fallback });

    const payload = { value: 99, label: "hello" };
    await store.write(payload);

    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual(payload);
  });

  it("overwrites previous content with new data", async () => {
    const filePath = path.join(tmpDir, "overwrite.json");
    const store = createJsonStore({
      filePath,
      fallback: { v: 0 },
    });

    await store.write({ v: 1 });
    await store.write({ v: 2 });

    const parsed = JSON.parse(await fs.readFile(filePath, "utf-8"));
    expect(parsed).toEqual({ v: 2 });
  });
});

// ---------------------------------------------------------------------------
// 3. 10 concurrent updates do not lose data
// ---------------------------------------------------------------------------
describe("createJsonStore - concurrent update", () => {
  it("does not lose data when 10 updates run concurrently", async () => {
    const filePath = path.join(tmpDir, "counter.json");
    const store = createJsonStore({
      filePath,
      fallback: { count: 0 },
    });

    // Kick off 10 concurrent increments.
    const promises = Array.from({ length: 10 }, () =>
      store.update((current) => ({ count: current.count + 1 })),
    );

    await Promise.all(promises);

    const final = JSON.parse(await fs.readFile(filePath, "utf-8"));
    expect(final.count).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 4. no .tmp / .bak artefacts after normal writes
// ---------------------------------------------------------------------------
describe("createJsonStore - cleanup", () => {
  it("leaves no .tmp or .bak residual files after writes", async () => {
    const filePath = path.join(tmpDir, "clean.json");
    const store = createJsonStore({ filePath, fallback: {} });

    await store.write({ a: 1 });
    await store.write({ b: 2 });

    // Wait a moment for any deferred unlink to settle.
    await new Promise((r) => setTimeout(r, 100));

    const entries = await fs.readdir(tmpDir);
    const artefacts = entries.filter(
      (f) => f.endsWith(".bak") || f.includes(".tmp."),
    );

    expect(artefacts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. recoverDataFiles restores from .tmp when target is missing
// ---------------------------------------------------------------------------
describe("recoverDataFiles", () => {
  it("renames a .tmp file to its target when target is missing", async () => {
    const data = { recovered: true };
    const tmpFile = path.join(tmpDir, `data.json.tmp.${process.pid}`);
    await fs.writeFile(tmpFile, JSON.stringify(data), "utf-8");

    await recoverDataFiles(tmpDir);

    const target = path.join(tmpDir, "data.json");
    const parsed = JSON.parse(await fs.readFile(target, "utf-8"));
    expect(parsed).toEqual(data);

    // The .tmp file should be gone.
    await expect(fs.access(tmpFile)).rejects.toThrow();
  });

  it("deletes a .tmp file when its target already exists", async () => {
    const target = path.join(tmpDir, "data.json");
    const tmpFile = path.join(tmpDir, `data.json.tmp.${process.pid}`);

    await fs.writeFile(target, JSON.stringify({ original: true }), "utf-8");
    await fs.writeFile(tmpFile, JSON.stringify({ stale: true }), "utf-8");

    await recoverDataFiles(tmpDir);

    // Target should be untouched.
    const parsed = JSON.parse(await fs.readFile(target, "utf-8"));
    expect(parsed).toEqual({ original: true });

    // .tmp should be removed.
    await expect(fs.access(tmpFile)).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // 6. recoverDataFiles restores from .bak when target is missing
  // -----------------------------------------------------------------------
  it("renames a .bak file to its target when target is missing", async () => {
    const data = { fromBackup: true };
    const bakFile = path.join(tmpDir, "important.json.bak");
    await fs.writeFile(bakFile, JSON.stringify(data), "utf-8");

    await recoverDataFiles(tmpDir);

    const target = path.join(tmpDir, "important.json");
    const parsed = JSON.parse(await fs.readFile(target, "utf-8"));
    expect(parsed).toEqual(data);

    // The .bak file should be gone.
    await expect(fs.access(bakFile)).rejects.toThrow();
  });

  it("deletes a .bak file when its target already exists", async () => {
    const target = path.join(tmpDir, "keep.json");
    const bakFile = path.join(tmpDir, "keep.json.bak");

    await fs.writeFile(target, JSON.stringify({ current: true }), "utf-8");
    await fs.writeFile(bakFile, JSON.stringify({ old: true }), "utf-8");

    await recoverDataFiles(tmpDir);

    const parsed = JSON.parse(await fs.readFile(target, "utf-8"));
    expect(parsed).toEqual({ current: true });

    await expect(fs.access(bakFile)).rejects.toThrow();
  });

  it("is a no-op when the directory does not exist", async () => {
    const missingDir = path.join(tmpDir, "no-such-dir");
    // Should not throw.
    await expect(recoverDataFiles(missingDir)).resolves.toBeUndefined();
  });
});
