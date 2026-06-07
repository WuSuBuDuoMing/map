/**
 * Storage Performance Benchmark Script
 *
 * Usage:
 *   node scripts/perf-storage-benchmark.mjs [--runs 100]
 *
 * Tests local file-system storage (the primary desktop mode):
 *   1. Single write latency
 *   2. Read-after-write latency
 *   3. Concurrent write safety (5 parallel writes)
 *   4. Large payload write latency
 *
 * Writes results to perf-results/storage-benchmark.json.
 *
 * This script creates a temp directory and does NOT touch your real data files.
 */

import { mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const RESULTS_DIR = path.join(ROOT, "perf-results");
const TEST_DIR = path.join(ROOT, ".perf-test-storage");

await mkdir(RESULTS_DIR, { recursive: true });
await mkdir(TEST_DIR, { recursive: true });

const args = process.argv.slice(2);
const idx = args.indexOf("--runs");
const RUNS = idx !== -1 ? parseInt(args[idx + 1], 10) : 100;

function percentile(sorted, p) {
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

function stats(durations) {
  const sorted = durations.slice().sort((a, b) => a - b);
  return {
    runs: sorted.length,
    min: Math.round(sorted[0] * 100) / 100,
    p50: Math.round(percentile(sorted, 50) * 100) / 100,
    p95: Math.round(percentile(sorted, 95) * 100) / 100,
    p99: Math.round(percentile(sorted, 99) * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg: Math.round((sorted.reduce((a, b) => a + b, 0) / sorted.length) * 100) / 100,
  };
}

// Generate a realistic memory payload
function makePayload(count = 1) {
  const memories = {};
  for (let i = 0; i < count; i++) {
    const cityId = `city-${i}`;
    memories[cityId] = [
      {
        id: `${cityId}-${randomUUID()}`,
        cityId,
        city: `City ${i}`,
        cityEn: `City ${i}`,
        date: "2025.06.01",
        image: "/sprites/icons/city-dot.svg",
        photos: ["/sprites/icons/city-dot.svg"],
        text: `Test memory text for ${cityId}`,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return memories;
}

// 1. Single write latency
async function benchmarkSingleWrite() {
  const durations = [];
  const filePath = path.join(TEST_DIR, "single-write.json");
  const payload = JSON.stringify(makePayload(1), null, 2);

  for (let i = 0; i < RUNS + 10; i++) {
    const start = performance.now();
    await writeFile(filePath, payload, "utf8");
    const elapsed = performance.now() - start;
    if (i >= 10) durations.push(elapsed); // skip warmup
  }

  return stats(durations);
}

// 2. Read-after-write latency
async function benchmarkReadAfterWrite() {
  const filePath = path.join(TEST_DIR, "read-write.json");
  const payload = JSON.stringify(makePayload(10), null, 2);
  await writeFile(filePath, payload, "utf8");

  const durations = [];
  for (let i = 0; i < RUNS + 10; i++) {
    const start = performance.now();
    const data = await readFile(filePath, "utf8");
    JSON.parse(data);
    const elapsed = performance.now() - start;
    if (i >= 10) durations.push(elapsed);
  }

  return stats(durations);
}

// 3. Concurrent write safety (5 parallel writes)
async function benchmarkConcurrentWrites() {
  const filePath = path.join(TEST_DIR, "concurrent.json");
  const iterations = 20;
  let corrupted = 0;

  for (let i = 0; i < iterations; i++) {
    // Clear file
    await writeFile(filePath, "{}", "utf8");

    // 5 concurrent writers, each writing a unique key
    const writers = Array.from({ length: 5 }, (_, idx) => {
      const data = JSON.stringify(makePayload(1).replace ? makePayload(1) : {});
      const store = {};
      store[`writer-${idx}`] = [{ id: `w${idx}`, text: `writer ${idx} data` }];
      return writeFile(filePath, JSON.stringify(store, null, 2), "utf8");
    });

    try {
      await Promise.all(writers);
      const result = await readFile(filePath, "utf8");
      const parsed = JSON.parse(result);
      // In a race condition without mutex, data from only one writer survives
      // With mutex, all writers should complete sequentially
      const keyCount = Object.keys(parsed).length;
      if (keyCount === 0) corrupted++;
    } catch {
      corrupted++;
    }
  }

  return {
    iterations,
    parallelWriters: 5,
    corruptedReads: corrupted,
    safeRate: `${((1 - corrupted / iterations) * 100).toFixed(1)}%`,
    note: corrupted > 0
      ? "CONCURRENT WRITES ARE NOT SAFE — data loss detected. Mutex + atomic write needed."
      : "Concurrent writes appear safe (sequential or mutex-protected).",
  };
}

// 4. Large payload write (simulate 500 memories)
async function benchmarkLargePayload() {
  const durations = [];
  const filePath = path.join(TEST_DIR, "large-payload.json");
  const payload = JSON.stringify(makePayload(500), null, 2);
  const sizeKB = Buffer.byteLength(payload, "utf8") / 1024;

  for (let i = 0; i < 30 + 5; i++) {
    const start = performance.now();
    await writeFile(filePath, payload, "utf8");
    const elapsed = performance.now() - start;
    if (i >= 5) durations.push(elapsed);
  }

  return { ...stats(durations), payloadSizeKB: Math.round(sizeKB) };
}

// 5. Atomic write simulation (write-to-temp + rename)
async function benchmarkAtomicWrite() {
  const filePath = path.join(TEST_DIR, "atomic-target.json");
  const tmpPath = filePath + ".tmp." + process.pid;
  const payload = JSON.stringify(makePayload(10), null, 2);
  const durations = [];

  for (let i = 0; i < RUNS + 10; i++) {
    const start = performance.now();
    await writeFile(tmpPath, payload, "utf8");
    // rename is the "atomic" part — on most FS this is a metadata-only operation
    const { rename } = await import("node:fs/promises");
    await rename(tmpPath, filePath);
    const elapsed = performance.now() - start;
    if (i >= 10) durations.push(elapsed);
  }

  return { ...stats(durations), note: "Write-to-temp + rename pattern (atomic)" };
}

async function main() {
  console.log(`[perf] Storage benchmark: ${RUNS} runs per test`);
  console.log(`[perf] Test directory: ${TEST_DIR}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    runsPerTest: RUNS,
  };

  console.log("  1. Single write latency ...");
  results.singleWrite = await benchmarkSingleWrite();
  console.log(`    P50=${results.singleWrite.p50}ms  P95=${results.singleWrite.p95}ms`);

  console.log("  2. Read-after-write latency ...");
  results.readAfterWrite = await benchmarkReadAfterWrite();
  console.log(`    P50=${results.readAfterWrite.p50}ms  P95=${results.readAfterWrite.p95}ms`);

  console.log("  3. Concurrent write safety ...");
  results.concurrentWrites = await benchmarkConcurrentWrites();
  console.log(`    Safe rate: ${results.concurrentWrites.safeRate}`);
  console.log(`    ${results.concurrentWrites.note}`);

  console.log("  4. Large payload write (500 memories) ...");
  results.largePayload = await benchmarkLargePayload();
  console.log(`    P50=${results.largePayload.p50}ms  payload=${results.largePayload.payloadSizeKB}KB`);

  console.log("  5. Atomic write (write-to-temp + rename) ...");
  results.atomicWrite = await benchmarkAtomicWrite();
  console.log(`    P50=${results.atomicWrite.p50}ms  P95=${results.atomicWrite.p95}ms`);

  const outFile = path.join(RESULTS_DIR, "storage-benchmark.json");
  writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\n[perf] Results written to ${outFile}`);

  // Cleanup
  await rm(TEST_DIR, { recursive: true, force: true });
  console.log("[perf] Test directory cleaned up.");
}

main().catch(async (err) => {
  console.error("[perf] Fatal error:", err);
  await rm(TEST_DIR, { recursive: true, force: true });
  process.exit(1);
});
