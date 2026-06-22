/**
 * Data directory path resolution for local file storage.
 *
 * Resolves writable and bundled data directories based on environment variables.
 * On desktop (Electron), `MAP_OF_US_DATA_DIR` points to the OS userData folder.
 * In web dev mode, defaults to the project's `data/` directory.
 *
 * @module lib/server/dataDir
 */

import path from "path";

/**
 * Return the directory where the application writes mutable data files
 * (memories, settings, auth config).
 * @returns Absolute path to the writable data directory.
 */
export function getWritableDataDir() {
  return process.env.MAP_OF_US_DATA_DIR || path.join(process.cwd(), "data");
}

/**
 * Return the directory where read-only bundled data lives (seed memories,
 * GeoJSON, sprite assets).
 * @returns Absolute path to the bundled data directory.
 */
export function getBundledDataDir() {
  return process.env.MAP_OF_US_BUNDLED_DATA_DIR || path.join(process.cwd(), "data");
}

/**
 * Resolve the full path for a private data file (e.g. `localMemories.private.json`).
 * @param fileName - Name of the data file (e.g. `"localMemories.private.json"`).
 * @returns Absolute file path.
 */
export function getPrivateDataFilePath(fileName: string) {
  return process.env.MAP_OF_US_DATA_DIR
    ? path.join(process.env.MAP_OF_US_DATA_DIR, fileName)
    : path.join(process.cwd(), "data", fileName);
}

/**
 * Resolve the full path for a bundled data file shipped with the installer.
 * @param fileName - Name of the bundled file.
 * @returns Absolute file path.
 */
export function getBundledDataFilePath(fileName: string) {
  return process.env.MAP_OF_US_BUNDLED_DATA_DIR
    ? path.join(process.env.MAP_OF_US_BUNDLED_DATA_DIR, fileName)
    : path.join(process.cwd(), "data", fileName);
}
