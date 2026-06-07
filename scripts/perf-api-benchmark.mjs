/**
 * API Performance Benchmark Script
 *
 * Usage:
 *   node scripts/perf-api-benchmark.mjs [--url http://localhost:3002] [--runs 50]
 *
 * Measures latency of every API endpoint in this project:
 *   GET  /api/memories
 *   GET  /api/city-assets
 *   GET  /api/login-photos
 *   POST /api/auth/login
 *
 * Outputs P50/P95/P99 per endpoint and writes results to perf-results/api-benchmark.json.
 */

import http from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RESULTS_DIR = path.join(ROOT, "perf-results");
mkdirSync(RESULTS_DIR, { recursive: true });

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};
const BASE_URL = getArg("--url", "http://localhost:3002");
const RUNS = parseInt(getArg("--runs", "50"), 10);
const WARMUP = parseInt(getArg("--warmup", "5"), 10);

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { "Content-Type": "application/json" },
    };

    const start = performance.now();
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const duration = performance.now() - start;
        resolve({ status: res.statusCode, duration, body: data });
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function benchmarkEndpoint(name, method, urlPath, body) {
  const durations = [];
  const errors = [];

  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    try {
      await request(method, urlPath, body);
    } catch {
      // ignore warmup errors
    }
  }

  // Actual measurement
  for (let i = 0; i < RUNS; i++) {
    try {
      const result = await request(method, urlPath, body);
      durations.push(result.duration);
      if (result.status >= 400) {
        errors.push({ run: i, status: result.status });
      }
    } catch (err) {
      errors.push({ run: i, error: err.message });
    }
  }

  durations.sort((a, b) => a - b);

  return {
    name,
    method,
    url: urlPath,
    runs: RUNS,
    warmup: WARMUP,
    successCount: durations.length,
    errorCount: errors.length,
    errors: errors.slice(0, 5), // keep first 5 for debugging
    latency: {
      min: durations.length > 0 ? Math.round(durations[0] * 100) / 100 : null,
      p50: durations.length > 0 ? Math.round(percentile(durations, 50) * 100) / 100 : null,
      p95: durations.length > 0 ? Math.round(percentile(durations, 95) * 100) / 100 : null,
      p99: durations.length > 0 ? Math.round(percentile(durations, 99) * 100) / 100 : null,
      max: durations.length > 0 ? Math.round(durations[durations.length - 1] * 100) / 100 : null,
      avg: durations.length > 0 ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100 : null,
    },
  };
}

async function main() {
  console.log(`[perf] API benchmark: ${BASE_URL}, ${RUNS} runs per endpoint, ${WARMUP} warmup`);
  console.log("[perf] Make sure the dev server is running before starting this script.\n");

  const endpoints = [
    { name: "GET /api/memories", method: "GET", path: "/api/memories" },
    { name: "GET /api/city-assets", method: "GET", path: "/api/city-assets" },
    { name: "GET /api/login-photos", method: "GET", path: "/api/login-photos" },
    {
      name: "POST /api/auth/login",
      method: "POST",
      path: "/api/auth/login",
      body: { password: "1234", mode: "site" },
    },
  ];

  const results = [];
  for (const ep of endpoints) {
    console.log(`  Measuring ${ep.name} ...`);
    const result = await benchmarkEndpoint(ep.name, ep.method, ep.path, ep.body);
    results.push(result);

    const lat = result.latency;
    if (lat.p50 !== null) {
      console.log(`    P50=${lat.p50}ms  P95=${lat.p95}ms  P99=${lat.p99}ms  max=${lat.max}ms  errors=${result.errorCount}`);
    } else {
      console.log(`    FAILED — no successful responses (${result.errorCount} errors)`);
    }
  }

  const output = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    runsPerEndpoint: RUNS,
    warmupRuns: WARMUP,
    endpoints: results,
  };

  const outFile = path.join(RESULTS_DIR, "api-benchmark.json");
  writeFileSync(outFile, JSON.stringify(output, null, 2));
  console.log(`\n[perf] Results written to ${outFile}`);
}

main().catch((err) => {
  console.error("[perf] Fatal error:", err);
  process.exit(1);
});
