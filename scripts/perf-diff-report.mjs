/**
 * Performance Diff Report Generator
 *
 * Usage:
 *   node scripts/perf-diff-report.mjs [--before perf-results-before/] [--after perf-results/]
 *
 * Reads benchmark JSON files from two directories and generates a comparison report.
 * If no --before is specified, it reads from perf-results/baseline/ (your pre-optimization snapshot).
 *
 * Outputs:
 *   - Console summary table
 *   - perf-results/perf-diff-report.md (markdown report)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RESULTS_DIR = path.join(ROOT, "perf-results");
mkdirSync(RESULTS_DIR, { recursive: true });

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};
const BEFORE_DIR = getArg("--before", path.join(RESULTS_DIR, "baseline"));
const AFTER_DIR = getArg("--after", RESULTS_DIR);

function safeReadJSON(dir, filename) {
  const filepath = path.join(dir, filename);
  if (!existsSync(filepath)) return null;
  try {
    return JSON.parse(readFileSync(filepath, "utf8"));
  } catch {
    return null;
  }
}

function delta(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return "N/A";
  const diff = b - a;
  const pct = a !== 0 ? ((diff / a) * 100).toFixed(1) : "inf";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

function deltaKB(a, b) {
  if (!a || !b) return "N/A";
  const diff = (b - a) / 1024;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)} KB`;
}

function deltaMs(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return "N/A";
  const diff = b - a;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}ms`;
}

// Load data
const beforeBundle = safeReadJSON(BEFORE_DIR, "bundle-sizes.json");
const afterBundle = safeReadJSON(AFTER_DIR, "bundle-sizes.json");
const beforeAPI = safeReadJSON(BEFORE_DIR, "api-benchmark.json");
const afterAPI = safeReadJSON(AFTER_DIR, "api-benchmark.json");
const beforeCSS = safeReadJSON(BEFORE_DIR, "css-metrics.json");
const afterCSS = safeReadJSON(AFTER_DIR, "css-metrics.json");
const beforeStorage = safeReadJSON(BEFORE_DIR, "storage-benchmark.json");
const afterStorage = safeReadJSON(AFTER_DIR, "storage-benchmark.json");

const lines = [];
const log = (s) => { lines.push(s); console.log(s); };

log("# Performance Diff Report");
log(`\n- **Before**: ${BEFORE_DIR}`);
log(`- **After**: ${AFTER_DIR}`);
log(`- **Generated**: ${new Date().toISOString()}`);
log("");

// --- Bundle Size ---
log("## 1. Bundle Size");
log("");
if (beforeBundle && afterBundle) {
  log("| Metric | Before | After | Change |");
  log("|--------|--------|-------|--------|");
  log(`| Total JS (gzip) | ${(beforeBundle.jsGzipBytes / 1024).toFixed(1)} KB | ${(afterBundle.jsGzipBytes / 1024).toFixed(1)} KB | ${deltaKB(beforeBundle.jsGzipBytes, afterBundle.jsGzipBytes)} |`);
  log(`| Total JS (raw) | ${(beforeBundle.jsRawBytes / 1024).toFixed(1)} KB | ${(afterBundle.jsRawBytes / 1024).toFixed(1)} KB | ${deltaKB(beforeBundle.jsRawBytes, afterBundle.jsRawBytes)} |`);
  log(`| Total CSS (gzip) | ${(beforeBundle.cssGzipBytes / 1024).toFixed(1)} KB | ${(afterBundle.cssGzipBytes / 1024).toFixed(1)} KB | ${deltaKB(beforeBundle.cssGzipBytes, afterBundle.cssGzipBytes)} |`);
  log(`| Total (gzip) | ${(beforeBundle.totalGzipBytes / 1024).toFixed(1)} KB | ${(afterBundle.totalGzipBytes / 1024).toFixed(1)} KB | ${deltaKB(beforeBundle.totalGzipBytes, afterBundle.totalGzipBytes)} |`);
  log(`| GeoJSON in client | ${beforeBundle.geoJsonInClientBundle} | ${afterBundle.geoJsonInClientBundle} | ${beforeBundle.geoJsonInClientBundle && !afterBundle.geoJsonInClientBundle ? "FIXED" : afterBundle.geoJsonInClientBundle ? "STILL PRESENT" : "OK"} |`);
  log(`| Full cities in client | ${beforeBundle.fullCitiesInClientBundle} | ${afterBundle.fullCitiesInClientBundle} | ${beforeBundle.fullCitiesInClientBundle && !afterBundle.fullCitiesInClientBundle ? "FIXED" : afterBundle.fullCitiesInClientBundle ? "STILL PRESENT" : "OK"} |`);
} else {
  log("_Bundle size data missing from one or both directories. Run `node scripts/perf-bundle-analyze.mjs` in both states._");
}
log("");

// --- CSS ---
log("## 2. CSS Metrics");
log("");
if (beforeCSS && afterCSS) {
  log("| Metric | Before | After | Change |");
  log("|--------|--------|-------|--------|");
  log(`| globals.css lines | ${beforeCSS.sourceGlobalsCSS.lines} | ${afterCSS.sourceGlobalsCSS.lines} | ${delta(beforeCSS.sourceGlobalsCSS.lines, afterCSS.sourceGlobalsCSS.lines)} |`);
  log(`| globals.css raw | ${(beforeCSS.sourceGlobalsCSS.rawBytes / 1024).toFixed(1)} KB | ${(afterCSS.sourceGlobalsCSS.rawBytes / 1024).toFixed(1)} KB | ${deltaKB(beforeCSS.sourceGlobalsCSS.rawBytes, afterCSS.sourceGlobalsCSS.rawBytes)} |`);
  if (beforeCSS.buildCSSTotalGzipBytes && afterCSS.buildCSSTotalGzipBytes) {
    log(`| Build CSS (gzip) | ${(beforeCSS.buildCSSTotalGzipBytes / 1024).toFixed(1)} KB | ${(afterCSS.buildCSSTotalGzipBytes / 1024).toFixed(1)} KB | ${deltaKB(beforeCSS.buildCSSTotalGzipBytes, afterCSS.buildCSSTotalGzipBytes)} |`);
  }
} else {
  log("_CSS metrics missing from one or both directories. Run `node scripts/perf-css-metrics.mjs` in both states._");
}
log("");

// --- API Latency ---
log("## 3. API Latency");
log("");
if (beforeAPI && afterAPI) {
  log("| Endpoint | Metric | Before | After | Change |");
  log("|----------|--------|--------|-------|--------|");
  for (const afterEp of afterAPI.endpoints) {
    const beforeEp = beforeAPI.endpoints.find((e) => e.url === afterEp.url && e.method === afterEp.method);
    if (!beforeEp) continue;
    for (const metric of ["p50", "p95", "p99"]) {
      const bVal = beforeEp.latency[metric];
      const aVal = afterEp.latency[metric];
      log(`| ${afterEp.method} ${afterEp.url} | ${metric} | ${bVal ?? "N/A"}ms | ${aVal ?? "N/A"}ms | ${deltaMs(bVal, aVal)} |`);
    }
  }
} else {
  log("_API benchmark data missing. Run `node scripts/perf-api-benchmark.mjs` in both states._");
}
log("");

// --- Storage ---
log("## 4. Storage Performance");
log("");
if (beforeStorage && afterStorage) {
  log("| Operation | Metric | Before | After | Change |");
  log("|-----------|--------|--------|-------|--------|");
  for (const metric of ["p50", "p95", "p99"]) {
    const bVal = beforeStorage.singleWrite?.[metric];
    const aVal = afterStorage.singleWrite?.[metric];
    log(`| Single write | ${metric} | ${bVal ?? "N/A"}ms | ${aVal ?? "N/A"}ms | ${deltaMs(bVal, aVal)} |`);
  }
  for (const metric of ["p50", "p95", "p99"]) {
    const bVal = beforeStorage.atomicWrite?.[metric];
    const aVal = afterStorage.atomicWrite?.[metric];
    log(`| Atomic write | ${metric} | ${bVal ?? "N/A"}ms | ${aVal ?? "N/A"}ms | ${deltaMs(bVal, aVal)} |`);
  }
  const bSafe = beforeStorage.concurrentWrites?.safeRate;
  const aSafe = afterStorage.concurrentWrites?.safeRate;
  log(`| Concurrent safety | safe rate | ${bSafe ?? "N/A"} | ${aSafe ?? "N/A"} | ${bSafe === aSafe ? "same" : "CHANGED"} |`);
} else {
  log("_Storage benchmark data missing. Run `node scripts/perf-storage-benchmark.mjs` in both states._");
}

const outFile = path.join(RESULTS_DIR, "perf-diff-report.md");
writeFileSync(outFile, lines.join("\n") + "\n");
console.log(`\n[perf] Diff report written to ${outFile}`);
