/**
 * Source Code Metrics (Architecture Validation)
 *
 * Usage:
 *   node scripts/perf-source-metrics.mjs
 *
 * Measures the "before" architecture claims:
 *   - ProvinceMap.tsx line count (claimed 1860 -> 3 files)
 *   - MemoryTools.tsx line count (claimed 1188 -> 4 files)
 *   - cities.ts file size (claimed 62KB -> 15KB index)
 *   - china-geo.json file size (claimed 582KB moved to RSC)
 *   - globals.css line count (claimed 810 -> ~30)
 *   - Shared module detection (claimed 10 shared modules)
 *
 * Writes results to perf-results/source-metrics.json.
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RESULTS_DIR = path.join(ROOT, "perf-results");
mkdirSync(RESULTS_DIR, { recursive: true });

function countLines(filepath) {
  try {
    return readFileSync(filepath, "utf8").split("\n").length;
  } catch {
    return null;
  }
}

function fileSize(filepath) {
  try {
    return statSync(filepath).size;
  } catch {
    return null;
  }
}

function walkTS(dir, prefix = "") {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !["node_modules", ".next", "__tests__"].includes(entry.name)) {
      results.push(...walkTS(full, rel));
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      results.push({ path: rel, lines: countLines(full), bytes: statSync(full).size });
    }
  }
  return results;
}

// Component file metrics
const componentFiles = walkTS(path.join(ROOT, "components"));
const dataFiles = walkTS(path.join(ROOT, "data"));
const libFiles = walkTS(path.join(ROOT, "lib"));
const appFiles = walkTS(path.join(ROOT, "app"));

// Specific files
const provinceMapFiles = componentFiles.filter((f) => f.path.includes("ProvinceMap"));
const memoryToolsFiles = componentFiles.filter((f) => f.path.includes("MemoryTools"));

const results = {
  timestamp: new Date().toISOString(),
  globalsCSS: {
    lines: countLines(path.join(ROOT, "app", "globals.css")),
  },
  chinaGeoJSON: {
    bytes: fileSize(path.join(ROOT, "data", "china-geo.json")),
    KB: Math.round((fileSize(path.join(ROOT, "data", "china-geo.json")) || 0) / 1024),
  },
  citiesTS: {
    bytes: fileSize(path.join(ROOT, "data", "cities.ts")),
    KB: Math.round((fileSize(path.join(ROOT, "data", "cities.ts")) || 0) / 1024),
  },
  citiesIndexTS: {
    bytes: fileSize(path.join(ROOT, "data", "cities-index.ts")),
    exists: !!fileSize(path.join(ROOT, "data", "cities-index.ts")),
  },
  provinceMap: {
    files: provinceMapFiles,
    totalLines: provinceMapFiles.reduce((s, f) => s + (f.lines || 0), 0),
    fileCount: provinceMapFiles.length,
  },
  memoryTools: {
    files: memoryToolsFiles,
    totalLines: memoryToolsFiles.reduce((s, f) => s + (f.lines || 0), 0),
    fileCount: memoryToolsFiles.length,
  },
  cssModuleFiles: (() => {
    const results = [];
    function walkForModules(dir, prefix = "") {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !["node_modules", ".next"].includes(entry.name)) {
          walkForModules(full, rel);
        } else if (entry.isFile() && entry.name.endsWith(".module.css")) {
          results.push(rel);
        }
      }
    }
    walkForModules(ROOT);
    return results;
  })(),
  componentSummary: {
    count: componentFiles.length,
    totalLines: componentFiles.reduce((s, f) => s + (f.lines || 0), 0),
    files: componentFiles,
  },
};

const outFile = path.join(RESULTS_DIR, "source-metrics.json");
writeFileSync(outFile, JSON.stringify(results, null, 2));

console.log("[perf] Source Code Metrics:");
console.log(`  globals.css: ${results.globalsCSS.lines} lines`);
console.log(`  china-geo.json: ${results.chinaGeoJSON.KB} KB`);
console.log(`  cities.ts: ${results.citiesTS.KB} KB`);
console.log(`  cities-index.ts: ${results.citiesIndexTS.exists ? "EXISTS" : "NOT FOUND"}`);
console.log(`  ProvinceMap: ${results.provinceMap.fileCount} file(s), ${results.provinceMap.totalLines} total lines`);
console.log(`  MemoryTools: ${results.memoryTools.fileCount} file(s), ${results.memoryTools.totalLines} total lines`);
console.log(`  CSS modules: ${results.cssModuleFiles.length} files`);
console.log(`  Components: ${results.componentSummary.count} files, ${results.componentSummary.totalLines} total lines`);
console.log(`[perf] Results written to ${outFile}`);
