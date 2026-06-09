# Map of Us

> A local-first couple's memory map desktop app -- mark every city you have visited together on an interactive map.

[English](./README.md) | [中文](./README.zh-CN.md)

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![Electron](https://img.shields.io/badge/Electron-42-47848f)](https://www.electronjs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-Coverage-6e9b1f)](https://vitest.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-WuSuBuDuoMing%2Fmap-blue)](https://github.com/WuSuBuDuoMing/map)

## Why Map of Us?

Map applications let you drop pins, but they cannot hold your memories. **Map of Us** transforms an interactive China SVG map (34 provinces) into a personal memory canvas -- every visited province lights up, and every city can hold photos, text, and dates. All data is stored locally on your device: no accounts, no internet required.

## Features

- **Password Protection** -- Dual-layer authentication (site password + admin password) with HMAC-SHA256 signed cookies and rate limiting
- **Interactive China Map** -- 34-province SVG map with zoom, pan, and D3-geo projection; visited provinces automatically light up
- **Province Detail Pages** -- Tap a province to see all its cities and memories
- **City Memories** -- Add multiple memories per city with multi-photo covers, editing, and deletion
- **Settings Management** -- Anniversaries with countdown, en-route weather for up to 3 cities, couple logo, login page 3x3 grid photos
- **Full Backup & Restore** -- Export/import a single backup file to restore all data (memories, landmarks, photos, settings)
- **Desktop App** -- Electron 42 packaging; data written to the OS `userData` directory, installer is read-only
- **Web Deployment** -- The same codebase deploys to a server with Supabase for storage

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router (RSC) |
| UI | React 19, Tailwind CSS 4, Framer Motion |
| Map Engine | D3-geo projection + custom SVG rendering |
| Desktop Shell | Electron 42 + Next.js standalone output |
| Storage | Local JSON files (desktop) / Supabase (web) |
| Auth | HMAC-SHA256 cookie signing + rate limiting |
| Testing | Vitest + V8 Coverage (24+ test cases) |
| CI/CD | GitHub Actions (lint, type-check, test, build on push; release artifacts on `v*` tags) |

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Web Development Mode

```bash
# Clone the repository
git clone https://github.com/WuSuBuDuoMing/map.git
cd map

# Install dependencies
npm install

# Copy environment variables (optional for local dev)
cp .env.example .env.local

# Start the development server
npm run dev
```

Open `http://localhost:3002` in your browser and enter the site password to get started.

### Electron Desktop Mode

```bash
# Start desktop dev mode (launches Next.js dev server + Electron window)
npm run desktop
```

### Default Passwords

The default passwords for a fresh installation:

```text
Site Password:    1234
Admin Password:   admin1234
```

After logging in, change them immediately under **Settings > Password Settings** (admin mode must be enabled with the admin password first).

**Technical note:** On desktop, the first launch creates `auth.local.json` inside the `userData` directory, storing passwords and a randomly generated `AUTH_COOKIE_SECRET`. Explicitly set environment variables always take precedence.

## Installation & First Launch (End Users)

This app is not code-signed or notarized on macOS. You need to manually allow it to run on the first launch -- this is a one-time step.

### macOS

1. Double-click the `.dmg` file and drag **Map of Us** into Applications
2. **Right-click > Open**, then click **Open** in the dialog
3. If there is no Open option: go to **System Settings > Privacy & Security**, find the Map of Us prompt, and click **Open Anyway**
4. If you see "App is damaged": run `xattr -cr "/Applications/Map of Us.app"` in Terminal

### Windows

1. Run the `-Setup.exe` installer
2. If a SmartScreen warning appears: click **More info > Run anyway**

## Project Structure

```text
app/                        App Router pages and API routes
  api/
    auth/login/             Login / logout API
    auth/password/          Password change API
    memories/               Memory CRUD API
    city-assets/            City landmark images API
    login-photos/           Login page photos API
  map/                      Main map page
  province/[id]/            Province detail page
  settings/                 Settings page
  anniversaries/            Anniversaries page
  favorites/                Favorites page
  time-capsule/             Time capsule page
  demo/                     Demo experience page

components/                 UI components
  ChinaMap.tsx              China map (SVG + zoom/pan)
  ChinaMapData.tsx          China map SSR wrapper (RSC calls geo-server)
  HomeProgress.tsx          Home progress component (re-exports home-progress/ submodule)
  ProvinceMap.tsx           Province detail map (legacy entry, re-exports to subdirectory)
  MemoryTools.tsx           Settings page entry (re-exports to subdirectory)
  MemoryNav.tsx             Navigation bar shell
  EntryExperience.tsx       Onboarding / entry experience
  MemoryArchive.tsx         Memory archive page
  RandomPhotoCard.tsx       Random photo card
  RecentMemories.tsx        Recent memories list
  LocalPrivacyImage.tsx     Privacy-mode image placeholder
  BackToLoginButton.tsx     Back-to-login button
  province-map/             Province map submodule
    ProvinceMap.tsx           Province detail page core component
    markerLayouts.ts          City marker layout configuration
    imageCompression.ts       Image compression utilities
    utils.ts                  Shared constants and helpers
    index.ts                  Barrel export
  home-progress/            Home progress submodule
    WeatherCard.tsx           Weather card component
    StatsCards.tsx            Stats cards (anniversary countdown, days together, photo progress, logo)
    index.ts                  Barrel export
  settings/                 Settings page submodule
    SettingsPage.tsx          Settings page main component
    PasswordSection.tsx       Password management section
    BackupSection.tsx         Backup import/export section
    LoginPhotoSection.tsx     Login page photo management section
    shared.ts                 Shared types and utility functions
    index.ts                  Barrel export

data/                       Data definitions and client-side utilities
  provinces.ts              34 province definitions
  cities.ts                 City data (landmarks, coordinates)
  cities-index.ts           Lightweight city index (id, province, name in CN/EN)
  memories.ts               Memory type definitions
  memoryUtils.ts            Memory merge & dedup utilities (seed + local data)
  progress.ts               Visited city/province calculation + LocalMemoryStore type
  appSettings.ts            App settings read/write
  adminMode.ts              Admin mode state
  loginPhotoStore.ts        Login page photo client-side storage
  loginPhotoSlots.ts        Login page 3x3 grid slot definitions
  provinceCityPlaces.ts     Province-city index

hooks/                      Custom React Hooks
  useLocalMemories.ts       Memory data fetching + useSyncExternalStore sync
  useAdminMode.ts           Admin mode state hook

lib/                        Core libraries
  geo.ts                    D3 geographic projection and path calculation (client)
  geo-server.ts             D3 geographic projection server-side calculation (SSR)
  mapColors.ts              Map shared color palette
  imageUtils.ts             Image URL type detection
  typeGuards.ts             Shared type guards (isRecord)
  dateUtils.ts              Date normalization utilities
  localPrivacy.ts           Privacy-mode image replacement
  server/
    auth.ts                 HMAC Cookie authentication
    supabase.ts             Supabase client + read/write
    dataDir.ts              Data directory path resolution
    createJsonStore.ts      Atomic JSON file store (mutex lock + COW backup)
    shutdown.ts             Process exit hook registry
    validation.ts           Request validation (image check, CSRF, Content-Length)

electron/                   Electron main process
  main.js                   Window management, Next.js server startup, auth config

scripts/                    Build scripts
  prepare-standalone.mjs    Prepare standalone output
  dev-keepalive.sh          Dev server keep-alive
  start-dev-daemon.sh       Dev daemon process

__tests__/                  Vitest test suite
  api/                      API endpoint tests
  lib/server/               Server module tests (auth, createJsonStore, shutdown, validation)
  data/                     Data module tests (progress)
  helpers/                  Test utilities (request builders, data factories)
  setup.ts                  Global test configuration
```

## Architecture Overview

```text
                    +------------------+
                    |  Electron Shell  |
                    |    (main.js)     |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Next.js Server  |
                    |   (standalone)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     |   App Router    |          |   API Routes    |
     |   (RSC Pages)   |          |   (REST API)    |
     +--------+--------+          +--------+--------+
              |                             |
     +--------v--------+          +--------v--------+
     |  React Components|          |  Auth Middleware|
     |  ChinaMap        |          |  Rate Limiting  |
     |  ProvinceMap     |          |  Input Validation|
     |  MemoryTools     |          +--------+--------+
     +--------+--------+                    |
              |                    +--------v--------+
     +--------v--------+          |  Storage Layer   |
     |  hooks/          |          |  createJsonStore |
     |  useLocalMemories|          |  (atomic + mutex)|
     |  useAdminMode    |          +--------+--------+
     +--------+--------+                    |
              |                    +--------v--------+
     +--------v--------+          |  Local JSON /    |
     |  data/           |          |  Supabase DB     |
     |  progress        |          +-----------------+
     |  memoryUtils     |
     |  appSettings     |
     +------------------+
              |
     +--------v--------+
     |  lib/            |
     |  geo-server.ts   |
     |  mapColors.ts    |
     |  shutdown.ts     |
     +------------------+
```

## Data Storage Architecture

The app uses a dual-mode storage system that switches automatically based on the environment:

```text
Request -> API Route -> Determine Storage Mode
                        |
                        +-> MAP_OF_US_STORAGE_MODE=local  -> Local JSON files
                        |
                        +-> Supabase configured           -> Supabase DB + Storage
```

Local file storage paths:

```text
Development:     data/localMemories.private.json
Desktop (packaged): [userData]/data/localMemories.private.json
```

## Authentication Flow

```text
User enters password
    |
    v
POST /api/auth/login
    |
    +-> verifyPassword() -- timing-safe comparison
    +-> setAuthCookies() -- HMAC-SHA256 signed cookies
    |
    v
Subsequent requests carry cookies
    |
    +-> getAuthRole() -- verify signature and expiration
    +-> requireSiteSession() / requireAdminSession()
```

## Shared Module Reference

- **`data/provinces.ts`** -- 34 province IDs, adcodes, Chinese/English names, visited state
- **`data/cities.ts`** -- City data: coordinates, province membership, landmarks, sprites
- **`data/cities-index.ts`** -- Lightweight city index (id, province, name in CN/EN) for progress calculation
- **`data/memories.ts`** -- `Memory` interface and chronological sorting utilities
- **`data/memoryUtils.ts`** -- Seed memory and local memory merge/dedup (`collectMemories`)
- **`data/progress.ts`** -- Computes visited cities and provinces from memory data; exports `LocalMemoryStore` type
- **`data/appSettings.ts`** -- App settings localStorage read/write and validation
- **`data/adminMode.ts`** -- Admin mode sessionStorage read/write
- **`data/loginPhotoStore.ts`** -- Login page photo API read/write + legacy migration
- **`data/loginPhotoSlots.ts`** -- Login page 3x3 grid slot definitions
- **`data/provinceCityPlaces.ts`** -- Province-city index for province detail pages
- **`hooks/useLocalMemories.ts`** -- Single-fetch memory data + `useSyncExternalStore` global sync
- **`hooks/useAdminMode.ts`** -- Admin mode state hook, listens to CustomEvent for auto-update
- **`lib/geo.ts`** -- GeoJSON loading, D3 projection, path generation (client)
- **`lib/geo-server.ts`** -- D3 projection server-side computation for SSR pre-computed map paths
- **`lib/mapColors.ts`** -- Shared map color palette (used by both China map and province map)
- **`lib/imageUtils.ts`** -- Image URL type detection (data URL vs https URL)
- **`lib/typeGuards.ts`** -- `isRecord` type guard, shared between client and server
- **`lib/dateUtils.ts`** -- Date string normalization (`YYYY.M.D` -> `YYYY.MM.DD`)
- **`lib/server/auth.ts`** -- HMAC-SHA256 cookie signing and verification
- **`lib/server/createJsonStore.ts`** -- Atomic JSON store (mutex lock, COW backup, crash recovery)
- **`lib/server/shutdown.ts`** -- Process exit hook registry, flushed before Electron quits
- **`lib/server/validation.ts`** -- Request validation (image URL check, CSRF protection, Content-Length)

## Testing Guide

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Test suite coverage:

- **Auth API** -- Login, logout, password change
- **Memories API** -- Full CRUD lifecycle + input validation
- **City Assets API** -- Read/write/delete + permission checks
- **Login Photos API** -- Photo and text management + migration logic
- **Server Modules** -- `createJsonStore` atomic writes, `shutdown` hook flushing, `validation` checks, `auth` logic
- **Data Modules** -- `progress` visited city/province calculation

Tests use isolated temporary directories and never touch project data files. All tests force local file storage mode and do not connect to Supabase.

> **Windows Note:** Vitest may not work correctly on paths containing non-ASCII characters (e.g., CJK). If `npm test` fails, move the project to a pure ASCII path (e.g., `C:\dev\map-of-us`) or run from the project root directory (the working directory is already configured). Test timeout defaults to 10 seconds (`testTimeout` in `vitest.config.ts`), suitable for the Windows filesystem.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SITE_PASSWORD` | Site entry password | No (default: `1234`) |
| `ADMIN_PASSWORD` | Admin password | No (default: `admin1234`) |
| `AUTH_COOKIE_SECRET` | Cookie signing secret | No (auto-generated on desktop) |
| `SUPABASE_URL` | Supabase project URL | Yes (web deployment) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Yes (web deployment) |
| `SUPABASE_STORAGE_BUCKET` | Supabase Storage bucket name | No (default: `map-of-us`) |
| `MAP_OF_US_STORAGE_MODE` | Set to `local` to force local file storage | No |
| `MAP_OF_US_DATA_DIR` | Custom data file directory | No |
| `MAP_OF_US_DESKTOP` | Set to `1` to identify Electron desktop environment | No |

Desktop auth environment variables are read automatically from `auth.local.json` -- no manual `.env.local` configuration needed.

## Deployment Guide

### Web Deployment

1. **Configure Supabase:** Run `docs/supabase-schema.sql` in the Supabase SQL Editor
2. **Set environment variables:** Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
3. **Build and start:**

```bash
npm run build
npm start
```

### Desktop Packaging

```bash
# 1. Generate Next.js standalone output
npm run desktop:prepare

# 2. Build installers
npm run dist:mac    # macOS DMG
npm run dist:win    # Windows NSIS installer

# Quick verification (no DMG/EXE packaging)
npm run dist:dir
```

Output artifacts are placed in the `dist/` directory. Cross-compilation (building Windows installers on macOS) is possible, but it is recommended to verify on the target platform before publishing.

Currently, the packaging does not include a production application icon or developer signing. Certificates and notarization are required before public distribution.

### CI/CD

The project uses GitHub Actions for continuous integration and release automation.

**On every push / PR to `main`:**

```text
checkout -> Node 20 -> npm ci -> tsc --noEmit -> lint -> test -> build
```

**On pushing a `v*` tag:** The release workflow builds macOS and Windows installers and creates a GitHub Release (draft).

```bash
# Trigger a release
git tag v0.2.0
git push origin v0.2.0
```

## Data Storage Locations

| Environment | Path |
|-------------|------|
| Browser (dev) | `data/localMemories.private.json` (project root) |
| Desktop (macOS) | `~/Library/Application Support/Map of Us/data` |
| Desktop (Windows) | `%APPDATA%/Map of Us/data` |

## Backup & Restore

1. Go to Settings and enable admin mode with the admin password
2. Click **Export Backup** to save a complete backup file
3. On a new device or after reinstalling, click **Import Backup** in Settings to restore

Import restores all data: memories, city landmarks, login photos, anniversaries, weather cities, logo, and more.

## Customization

With admin mode enabled in Settings, you can customize:

- Anniversary names and dates
- Home page "en-route weather" cities (up to 3)
- Bottom-right couple logo
- Login page 3x3 grid photos and captions
- City landmark images

## License

[MIT](LICENSE)
