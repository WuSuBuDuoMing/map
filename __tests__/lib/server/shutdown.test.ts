/**
 * Unit tests for the shutdown hook registry.
 *
 * Each test resets the hook list so registrations do not leak across tests.
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  registerShutdownHook,
  drainShutdownHooks,
  resetShutdownHooks,
} from "@/lib/server/shutdown";

afterEach(() => {
  resetShutdownHooks();
});

// ---------------------------------------------------------------------------
// 1. drain waits for hooks to complete
// ---------------------------------------------------------------------------
describe("drainShutdownHooks", () => {
  it("waits for all registered hooks to finish", async () => {
    const order: number[] = [];

    registerShutdownHook("fast-a", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(1);
    });

    registerShutdownHook("fast-b", async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(2);
    });

    const timedOut = await drainShutdownHooks();

    expect(timedOut).toEqual([]);
    // Both hooks should have completed (order may vary but both must run).
    expect(order.sort()).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// 2. drain returns the name of timed-out hooks
// ---------------------------------------------------------------------------
describe("drainShutdownHooks - timeout", () => {
  it("returns the names of hooks that exceed their timeout", async () => {
    registerShutdownHook("slow-hook", async () => {
      // This hook intentionally takes much longer than its timeout.
      await new Promise((r) => setTimeout(r, 5_000));
    }, 50); // 50ms per-hook timeout

    registerShutdownHook("fast-hook", async () => {
      // This one completes immediately.
    }, 5_000);

    const timedOut = await drainShutdownHooks();

    expect(timedOut).toContain("slow-hook");
    expect(timedOut).not.toContain("fast-hook");
  });

  it("applies global timeout as a ceiling on per-hook timeout", async () => {
    // Hook has a long per-hook timeout but global timeout is tiny.
    registerShutdownHook("would-be-slow", async () => {
      await new Promise((r) => setTimeout(r, 5_000));
    }, 5_000);

    const timedOut = await drainShutdownHooks({ timeoutMs: 50 });

    expect(timedOut).toContain("would-be-slow");
  });
});

// ---------------------------------------------------------------------------
// 3. resetShutdownHooks clears the registry
// ---------------------------------------------------------------------------
describe("resetShutdownHooks", () => {
  it("clears all previously registered hooks", async () => {
    registerShutdownHook("to-be-cleared", async () => {
      throw new Error("should not run");
    });

    resetShutdownHooks();

    // drain should return an empty array with no hooks registered.
    const timedOut = await drainShutdownHooks();
    expect(timedOut).toEqual([]);
  });
});
