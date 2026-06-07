/**
 * Shutdown hook registry.
 *
 * Modules can register async teardown logic that runs once on process exit.
 * The Electron main process calls `drainShutdownHooks` via
 * `(globalThis as any).__MAP_OF_US_SHUTDOWN_DRAIN__`.
 */

type ShutdownHook = {
  name: string;
  fn: () => Promise<void>;
  timeoutMs: number;
};

const DEFAULT_HOOK_TIMEOUT_MS = 5_000;

let hooks: ShutdownHook[] = [];

/**
 * Register an async shutdown hook.
 *
 * @param name    - Human-readable identifier (used in timeout reports).
 * @param fn      - Async teardown function.
 * @param timeoutMs - Per-hook timeout in milliseconds (default 5 000).
 */
export function registerShutdownHook(
  name: string,
  fn: () => Promise<void>,
  timeoutMs = DEFAULT_HOOK_TIMEOUT_MS,
): void {
  hooks.push({ name, fn, timeoutMs });
}

/**
 * Execute every registered hook concurrently, respecting per-hook timeouts.
 *
 * Returns the names of hooks that exceeded their timeout (empty array === all
 * hooks completed cleanly).
 */
export async function drainShutdownHooks(opts?: {
  timeoutMs?: number;
}): Promise<string[]> {
  const globalTimeoutMs = opts?.timeoutMs;
  const timedOut: string[] = [];

  const settled = Promise.all(
    hooks.map(async (hook) => {
      const effectiveTimeout = globalTimeoutMs
        ? Math.min(hook.timeoutMs, globalTimeoutMs)
        : hook.timeoutMs;

      let timer: ReturnType<typeof setTimeout> | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`shutdown hook "${hook.name}" timed out`)),
          effectiveTimeout,
        );
      });

      try {
        await Promise.race([hook.fn(), timeoutPromise]);
      } catch {
        timedOut.push(hook.name);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    }),
  );

  await settled;
  return timedOut;
}

/**
 * Remove all registered hooks. Intended for test isolation only.
 */
export function resetShutdownHooks(): void {
  hooks = [];
}

// Expose drain on globalThis so the Electron main process can call it without
// importing this module (which would pull in Node-only code into the main
// process bundle).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__MAP_OF_US_SHUTDOWN_DRAIN__ = drainShutdownHooks;
