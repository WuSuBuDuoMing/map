/**
 * CSS Metrics Script
 *
 * Usage:
 *   node scripts/perf-css-metrics.mjs
 *
 * Measures:
 *   - globals.css raw line count and byte size
 *   - Total CSS files in the project (globals + modules)
 *   - Estimated CSS sent to browser (from .next/static after build)
 *
 * Writes results to perf-results/css-metrics.json.
 */

import { readFileSync, statSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RESULTS_DIR = path.join(ROOT, "perf-results");
mkdirSync(RESULTS_DIR, { recursive: true });

function countLines(content) {
  return content.split("\n").length;
}

function walkForCSS(dir, prefix = "") {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !["node_modules", ".next", ".git", "perf-results"].includes(entry.name)) {
      results.push(...walkForCSS(full, rel));
    } else if (entry.isFile() && (entry.name.endsWith(".css") || entry.name.endsWith(".module.css"))) {
      try {
        const content = readFileSync(full, "utf8");
        const stat = statSync(full);
        results.push({
          path: rel,
          lines: countLines(content),
          rawBytes: stat.size,
          gzipBytes: gzipSync(Buffer.from(content)).length,
        });
      } catch {
        // skip unreadable files
      }
    }
  }
  return results;
}

// Source CSS files
const sourceCSS = walkForCSS(ROOT);

// globals.css specifics
const globalsPath = path.join(ROOT, "app", "globals.css");
let globalsLines = 0;
let globalsRaw = 0;
let globalsGzip = 0;
try {
  const content = readFileSync(globalsPath, "utf8");
  globalsLines = countLines(content);
  globalsRaw = Buffer.byteLength(content, "utf8");
  globalsGzip = gzipSync(Buffer.from(content)).length;
} catch {
  console.warn("[perf] Could not read app/globals.css");
}

// Build output CSS
let buildCSS = [];
const buildStaticCSS = path.join(ROOT, ".next", "static", "css");
try {
  for (const entry of readdirSync(buildStaticCSS, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".css")) {
      const full = path.join(buildStaticCSS, entry.name);
      const content = readFileSync(full);
      const stat = statSync(full);
      buildCSS.push({
        file: entry.name,
        rawBytes: stat.size,
        gzipBytes: gzipSync(content).length,
      });
    }
  }
} catch {
  console.warn("[perf] Could not read .next/static/css — run `next build` first for build metrics.");
}

const buildCSSTotalRaw = buildCSS.reduce((s, c) => s + c.rawBytes, 0);
const buildCSSTotalGzip = buildCSS.reduce((s, c) => s + c.gzipBytes, 0);

const results = {
  timestamp: new Date().toISOString(),
  sourceGlobalsCSS: {
    path: "app/globals.css",
    lines: globalsLines,
    rawBytes: globalsRaw,
    gzipBytes: globalsGzip,
  },
  sourceCSSFiles: sourceCSS,
  sourceCSSTotalRawBytes: sourceCSS.reduce((s, c) => s + c.rawBytes, 0),
  buildCSSFiles: buildCSS,
  buildCSSTotalRawBytes: buildCSSTotalRaw,
  buildCSSTotalGzipBytes: buildCSSTotalGzip,
};

const outFile = path.join(RESULTS_DIR, "css-metrics.json");
writeFileSync(outFile, JSON.stringify(results, null, 2));

console.log("[perf] CSS Metrics:");
console.log(`  app/globals.css: ${globalsLines} lines, ${(globalsRaw / 1024).toFixed(1)} KB raw, ${(globalsGzip / 1024).toFixed(1)} KB gzip`);
console.log(`  Source CSS files: ${sourceCSS.length} files, ${(results.sourceCSSTotalRawBytes / 1024).toFixed(1)} KB total`);
if (buildCSS.length > 0) {
  console.log(`  Build CSS output: ${buildCSS.length} files, ${(buildCSSTotalRaw / 1024).toFixed(1)} KB raw, ${(buildCSSTotalGzip / 1024).toFixed(1)} KB gzip`);
} else {
  console.log("  Build CSS output: not available (run `next build` first)");
}
console.log(`[perf] Results written to ${outFile}`);
