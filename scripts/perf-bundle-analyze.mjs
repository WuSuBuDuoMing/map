/**
 * Bundle Analysis Script
 *
 * Usage:
 *   node scripts/perf-bundle-analyze.mjs
 *
 * Runs `next build` with ANALYZE=true to produce three browser-usable
 * treemap reports under .next/analyze/:
 *   - client.html  (browser JS bundles)
 *   - nodejs.html  (RSC / server component bundles)
 *   - edge.html    (edge-runtime bundles)
 *
 * Also outputs raw size data to perf-results/bundle-sizes.json for diffing.
 */

import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RESULTS_DIR = path.join(ROOT, "perf-results");
const NEXT_BUILD_DIR = path.join(ROOT, ".next");

mkdirSync(RESULTS_DIR, { recursive: true });

// Run the build with analyzer enabled
console.log("[perf] Running next build with ANALYZE=true ...");
try {
  execSync("npx next build", {
    cwd: ROOT,
    env: { ...process.env, ANALYZE: "true" },
    stdio: "inherit",
  });
} catch {
  console.error("[perf] Build failed. Fix build errors before running bundle analysis.");
  process.exit(1);
}

// Collect .next/static chunk sizes
function walkDir(dir, prefix = "") {
  const entries = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...walkDir(full, rel));
    } else if (entry.isFile()) {
      const stat = statSync(full);
      const raw = readFileSync(full);
      const gzipped = gzipSync(raw).length;
      entries.push({ path: rel, raw: stat.size, gzip: gzipped });
    }
  }
  return entries;
}

const staticDir = path.join(NEXT_BUILD_DIR, "static");
let chunks = [];
try {
  chunks = walkDir(staticDir, "static");
} catch {
  console.warn("[perf] Could not read .next/static — build may have used a different output mode.");
}

// Summarize
const totalRaw = chunks.reduce((sum, c) => sum + c.raw, 0);
const totalGzip = chunks.reduce((sum, c) => sum + c.gzip, 0);
const jsChunks = chunks.filter((c) => c.path.endsWith(".js"));
const cssChunks = chunks.filter((c) => c.path.endsWith(".css"));

const summary = {
  timestamp: new Date().toISOString(),
  totalRawBytes: totalRaw,
  totalGzipBytes: totalGzip,
  jsChunks: jsChunks.length,
  jsRawBytes: jsChunks.reduce((s, c) => s + c.raw, 0),
  jsGzipBytes: jsChunks.reduce((s, c) => s + c.gzip, 0),
  cssChunks: cssChunks.length,
  cssRawBytes: cssChunks.reduce((s, c) => s + c.raw, 0),
  cssGzipBytes: cssChunks.reduce((s, c) => s + c.gzip, 0),
  allChunks: chunks.sort((a, b) => b.gzip - a.gzip),
};

// Check for china-geo.json in client bundles
const geoInClient = jsChunks.some((c) => {
  const content = readFileSync(path.join(NEXT_BUILD_DIR, c.path), "utf8");
  return content.includes("china-geo") || content.includes('"features"');
});
summary.geoJsonInClientBundle = geoInClient;

// Check for full cities.ts data in client bundles
const citiesFullInClient = jsChunks.some((c) => {
  const content = readFileSync(path.join(NEXT_BUILD_DIR, c.path), "utf8");
  const spriteMatches = content.match(/sprite/g);
  return spriteMatches && spriteMatches.length > 50;
});
summary.fullCitiesInClientBundle = citiesFullInClient;

const outFile = path.join(RESULTS_DIR, "bundle-sizes.json");
writeFileSync(outFile, JSON.stringify(summary, null, 2));
console.log(`[perf] Bundle analysis written to ${outFile}`);

// Print top 15 largest chunks
console.log("\n[perf] Top 15 largest chunks (by gzip size):");
for (const chunk of summary.allChunks.slice(0, 15)) {
  console.log(
    `  ${(chunk.gzip / 1024).toFixed(1)} KB gzip  |  ${(chunk.raw / 1024).toFixed(1)} KB raw  |  ${chunk.path}`
  );
}

console.log(`\n[perf] Total: ${(totalGzip / 1024).toFixed(1)} KB gzip / ${(totalRaw / 1024).toFixed(1)} KB raw`);
console.log(`[perf] JS: ${(summary.jsGzipBytes / 1024).toFixed(1)} KB gzip (${summary.jsChunks} chunks)`);
console.log(`[perf] CSS: ${(summary.cssGzipBytes / 1024).toFixed(1)} KB gzip (${summary.cssChunks} chunks)`);
console.log(`[perf] GeoJSON in client bundle: ${geoInClient ? "YES (BAD)" : "NO (GOOD)"}`);
console.log(`[perf] Full cities data in client: ${citiesFullInClient ? "YES (BAD)" : "NO (GOOD)"}`);
