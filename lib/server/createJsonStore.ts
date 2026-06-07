/**
 * Atomic JSON file store with mutex serialisation.
 *
 * Design goals:
 *   - All writes are serialised via a Promise-chain mutex so concurrent callers
 *     never interleave their disk operations.
 *   - Writes are atomic: data is first flushed to a PID-scoped `.tmp` file, then
 *     renamed over the target.  On Windows, where `rename` cannot overwrite an
 *     existing file atomically, we fall back to a direct `writeFile`.
 *   - A COW `.bak` backup is taken before every write and deleted on success.
 *   - A `recoverDataFiles` helper repairs any leftover `.tmp` / `.bak` artefacts
 *     left behind by a crash or unclean exit.
 */

import fs from "fs/promises";
import path from "path";
import { registerShutdownHook } from "./shutdown";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JsonStoreOptions<T> = {
  filePath: string;
  fallback: T;
  validate?: (value: unknown) => value is T;
  name?: string;
};

type JsonStore<T> = {
  read(): Promise<T>;
  write(data: T): Promise<void>;
  update(updater: (current: T) => T | Promise<T>): Promise<T>;
  drain(timeoutMs?: number): Promise<boolean>;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const isWindows = process.platform === "win32";

/** PID-scoped temp path next to the target file. */
const tmpPath = (filePath: string) => `${filePath}.tmp.${process.pid}`;
const bakPath = (filePath: string) => `${filePath}.bak`;

/**
 * Atomically write `data` to `filePath`.
 *
 * 1. Write to `.tmp.{pid}` with `writeFile` + flush.
 * 2. Copy the existing target to `.bak` (COW backup).
 * 3. Rename `.tmp` over the target (Windows fallback: direct writeFile).
 * 4. Remove `.bak` on success.
 */
async function atomicWrite(filePath: string, json: string): Promise<void> {
  const tmp = tmpPath(filePath);
  const bak = bakPath(filePath);

  // 1. Write tmp file and flush to disk.
  await fs.writeFile(tmp, json, "utf-8");

  // 2. COW backup of the current file (if it exists).
  try {
    await fs.copyFile(filePath, bak);
  } catch (err: unknown) {
    // ENOENT is fine -- the file may not exist yet.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  try {
    // 3. Atomic rename (or Windows fallback).
    if (isWindows) {
      try {
        await fs.rename(tmp, filePath);
      } catch {
        // On Windows `rename` can fail with EPERM / EBUSY when the target
        // already exists.  Fall back to a plain overwrite.
        await fs.writeFile(filePath, json, "utf-8");
        await fs.unlink(tmp).catch(() => {});
      }
    } else {
      await fs.rename(tmp, filePath);
    }

    // 4. Success -- remove backup.
    await fs.unlink(bak).catch(() => {});
  } catch (err) {
    // Rename failed entirely -- try to restore from backup.
    try {
      await fs.rename(bak, filePath);
    } catch {
      // Backup may not exist either; nothing more we can do.
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Store factory
// ---------------------------------------------------------------------------

/**
 * Create a mutex-serialised, atomically-writing JSON file store.
 */
export function createJsonStore<T>(opts: JsonStoreOptions<T>): JsonStore<T> {
  const { filePath, fallback, validate, name } = opts;
  const label = name ?? path.basename(filePath, ".json");

  // Promise-chain mutex: each write chains onto the previous one so they
  // execute strictly in order.
  let writeChain: Promise<void> = Promise.resolve();

  // Cache the last-read value so that concurrent readers don't all hit disk.
  let cached: T | undefined;
  let cacheValid = false;

  async function readFromDisk(): Promise<T> {
    let raw: string;

    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
      throw err;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return fallback;
    }

    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  }

  // Ensure the directory exists once at construction time.
  const ensureDir = fs.mkdir(path.dirname(filePath), { recursive: true });

  // --- Register shutdown hook ------------------------------------------
  registerShutdownHook(`json-store:${label}`, async () => {
    // Wait for any in-flight write to finish.
    await writeChain;
  });

  return {
    /**
     * Read the current value from disk (or fallback).
     */
    async read(): Promise<T> {
      await ensureDir;

      if (cacheValid && cached !== undefined) return cached;

      const value = await readFromDisk();
      cached = value;
      cacheValid = true;
      return value;
    },

    /**
     * Write a new value atomically.  Serialised with other writes via the
     * mutex chain.
     */
    async write(data: T): Promise<void> {
      await ensureDir;

      const json = JSON.stringify(data, null, 2) + "\n";

      const nextLink = writeChain.then(async () => {
        await atomicWrite(filePath, json);
        cached = data;
        cacheValid = true;
      });

      // Swallow the error from the chain link so it doesn't poison the next
      // write -- the caller's `await` will still see it.
      writeChain = nextLink.catch(() => {});

      await nextLink;
    },

    /**
     * Read-modify-write in a single serialised step.  The updater receives
     * the current value and returns the next one (may be async).
     */
    async update(updater: (current: T) => T | Promise<T>): Promise<T> {
      await ensureDir;

      let result: T;

      const nextLink = writeChain.then(async () => {
        const current = await readFromDisk();
        const next = await updater(current);
        const json = JSON.stringify(next, null, 2) + "\n";

        await atomicWrite(filePath, json);
        cached = next;
        cacheValid = true;
        result = next;
      });

      writeChain = nextLink.catch(() => {});
      await nextLink;
      return result!;
    },

    /**
     * Wait for all pending writes to drain.  Returns `true` if everything
     * completed within the timeout, `false` otherwise.
     */
    async drain(timeoutMs = 5_000): Promise<boolean> {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const timeout = new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      });

      try {
        const winner = await Promise.race([writeChain.then(() => true as const), timeout]);
        return winner;
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Startup recovery
// ---------------------------------------------------------------------------

/**
 * Scan `dataDir` for leftover `.tmp.*` and `.bak` files created by a previous
 * unclean exit and restore them to a consistent state.
 *
 * Recovery rules:
 *   - `.tmp.*` file with a matching target  -> delete the `.tmp` (the target
 *     is the last known-good version).
 *   - `.tmp.*` file WITHOUT a matching target -> rename `.tmp` to the target
 *     (the write was interrupted before rename).
 *   - `.bak` file with a matching target     -> delete the `.bak` (the write
 *     completed successfully).
 *   - `.bak` file WITHOUT a matching target  -> rename `.bak` to the target
 *     (the write completed but the rename-back-on-failure path didn't run).
 */
export async function recoverDataFiles(dataDir: string): Promise<void> {
  let entries: string[];

  try {
    const dirents = await fs.readdir(dataDir, { withFileTypes: true });
    entries = dirents.filter((d) => d.isFile()).map((d) => d.name);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }

  // Build a Set of "real" filenames (no .tmp / .bak suffixes) for lookups.
  const realNames = new Set<string>();

  for (const name of entries) {
    if (!name.endsWith(".bak") && !name.includes(".tmp.")) {
      realNames.add(name);
    }
  }

  for (const name of entries) {
    const fullPath = path.join(dataDir, name);

    // --- .tmp.* files ---------------------------------------------------
    const tmpMatch = name.match(/^(.+)\.tmp\.\d+$/);
    if (tmpMatch) {
      const targetName = tmpMatch[1];
      const targetPath = path.join(dataDir, targetName);

      if (realNames.has(targetName)) {
        // Target exists -- the tmp is stale.  Remove it.
        await fs.unlink(fullPath).catch(() => {});
      } else {
        // Target missing -- the write was interrupted mid-rename.
        await fs.rename(fullPath, targetPath).catch(() => {});
      }
      continue;
    }

    // --- .bak files -----------------------------------------------------
    if (name.endsWith(".bak")) {
      const targetName = name.slice(0, -4); // strip ".bak"
      const targetPath = path.join(dataDir, targetName);

      if (realNames.has(targetName)) {
        // Target exists -- backup is stale.  Remove it.
        await fs.unlink(fullPath).catch(() => {});
      } else {
        // Target missing -- restore from backup.
        await fs.rename(fullPath, targetPath).catch(() => {});
      }
    }
  }
}
