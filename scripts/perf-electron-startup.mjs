/**
 * Electron Startup Benchmark
 *
 * Usage:
 *   node scripts/perf-electron-startup.mjs [--runs 5]
 *
 * Measures Electron cold-start time by launching the packaged/standalone app
 * and timing from process spawn to first HTTP 200 from the embedded server.
 *
 * NOTE: This measures the standalone server startup, not the full Electron
 * BrowserWindow. For full Electron timing, add instrumentation to main.js
 * (see the TIMING MARKERS section below).
 *
 * Writes results to perf-results/electron-startup.json.
 */

import { spawn } from "node:child_process";
import http from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RESULTS_DIR = path.join(ROOT, "perf-results");
mkdirSync(RESULTS_DIR, { recursive: true });

const args = process.argv.slice(2);
const idx = args.indexOf("--runs");
const RUNS = idx !== -1 ? parseInt(args[idx + 1], 10) : 5;

function waitForHTTP(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    function poll() {
      if (Date.now() > deadline) {
        reject(new Error(`Server did not respond within ${timeoutMs}ms`));
        return;
      }

      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });

      req.on("error", () => {
        setTimeout(poll, 200);
      });

      req.setTimeout(500, () => {
        req.destroy();
        setTimeout(poll, 200);
      });
    }

    poll();
  });
}

function percentile(sorted, p) {
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

async function measureStartup() {
  const port = 13000 + Math.floor(Math.random() * 5000);
  const url = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: "production",
    MAP_OF_US_DESKTOP: "1",
    MAP_OF_US_STORAGE_MODE: "local",
    MAP_OF_US_DATA_DIR: path.join(ROOT, ".perf-test-data"),
  };

  const start = performance.now();

  const child = spawn("node", [path.join(ROOT, ".next", "standalone", "server.js")], {
    cwd: path.join(ROOT, ".next", "standalone"),
    env,
    stdio: "pipe",
  });

  try {
    await waitForHTTP(url, 30000);
    const elapsed = performance.now() - start;

    // Fetch the main page to measure time-to-first-byte
    const ttfbStart = performance.now();
    await new Promise((resolve, reject) => {
      http.get(url, (res) => {
        res.resume();
        res.on("end", resolve);
      }).on("error", reject);
    });
    const ttfb = performance.now() - ttfbStart;

    child.kill();
    return { startupMs: Math.round(elapsed * 100) / 100, ttfbMs: Math.round(ttfb * 100) / 100 };
  } catch (err) {
    child.kill();
    throw err;
  }
}

async function main() {
  console.log(`[perf] Electron startup benchmark: ${RUNS} runs`);
  console.log("[perf] Prerequisite: run `npm run build` first so .next/standalone exists.\n");

  // Check standalone exists
  const standaloneDir = path.join(ROOT, ".next", "standalone");
  const { existsSync } = await import("node:fs");
  if (!existsSync(standaloneDir)) {
    console.error("[perf] .next/standalone not found. Run `npm run build` first.");
    process.exit(1);
  }

  const results = [];
  for (let i = 0; i < RUNS; i++) {
    console.log(`  Run ${i + 1}/${RUNS} ...`);
    try {
      const result = await measureStartup();
      results.push(result);
      console.log(`    startup=${result.startupMs}ms  TTFB=${result.ttfbMs}ms`);
    } catch (err) {
      console.log(`    FAILED: ${err.message}`);
      results.push({ startupMs: null, ttfbMs: null, error: err.message });
    }
  }

  const successes = results.filter((r) => r.startupMs !== null);
  const startupTimes = successes.map((r) => r.startupMs).sort((a, b) => a - b);
  const ttfbTimes = successes.map((r) => r.ttfbMs).sort((a, b) => a - b);

  const output = {
    timestamp: new Date().toISOString(),
    runs: RUNS,
    successes: successes.length,
    failures: results.length - successes.length,
    startupMs: startupTimes.length > 0 ? {
      min: Math.round(startupTimes[0] * 100) / 100,
      p50: Math.round(percentile(startupTimes, 50) * 100) / 100,
      p95: Math.round(percentile(startupTimes, 95) * 100) / 100,
      max: Math.round(startupTimes[startupTimes.length - 1] * 100) / 100,
      avg: Math.round((startupTimes.reduce((a, b) => a + b, 0) / startupTimes.length) * 100) / 100,
    } : null,
    ttfbMs: ttfbTimes.length > 0 ? {
      min: Math.round(ttfbTimes[0] * 100) / 100,
      p50: Math.round(percentile(ttfbTimes, 50) * 100) / 100,
      p95: Math.round(percentile(ttfbTimes, 95) * 100) / 100,
      max: Math.round(ttfbTimes[ttfbTimes.length - 1] * 100) / 100,
    } : null,
    rawResults: results,
  };

  const outFile = path.join(RESULTS_DIR, "electron-startup.json");
  writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`\n[perf] Results written to ${outFile}`);

  if (output.startupMs) {
    console.log(`[perf] Startup: P50=${output.startupMs.p50}ms  P95=${output.startupMs.p95}ms`);
    console.log(`[perf] TTFB:    P50=${output.ttfbMs.p50}ms  P95=${output.ttfbMs.p95}ms`);
  }
}

main().catch((err) => {
  console.error("[perf] Fatal error:", err);
  process.exit(1);
});
