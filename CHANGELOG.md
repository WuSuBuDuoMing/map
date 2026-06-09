# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.1.1] - 2026-06-09

### Highlights

Optimization round focused on security hardening, performance improvements, and expanded test coverage.

### Security

- Strengthened password protection flow and session handling
- Improved input validation across API routes
- Hardened backup/restore data integrity checks

### Performance

- Optimized SVG map rendering for smoother province interactions
- Reduced bundle size via code splitting and lazy loading
- Improved Electron startup time and memory usage

### Testing

- Expanded unit and integration test suite
- Added edge-case coverage for map interactions, auth flow, and backup/restore
- CI pipeline stability improvements

---

## [v0.1.0] - 2026-05-01

### Highlights

Initial release of **Map of Us** -- a local-first couple's memory map desktop application.

### Features

- **34 Province SVG Map** -- Interactive map of China with all 34 provincial-level divisions, each navigable to its detail page
- **City Memories** -- Record and browse memories tied to specific cities within each province, with photos and notes
- **Password Protection** -- Optional password lock to keep your shared memories private
- **Backup & Restore** -- Export and import all data (memories, settings, images) as a single archive for safekeeping
- **Electron Desktop App** -- Native desktop experience via Electron 42 with system tray integration and offline-first storage
- **Web Deployment** -- Also deployable as a Next.js web app with Supabase for cross-device sync and cloud backup
- **Responsive UI** -- Beautiful, responsive interface built with Tailwind CSS 4 and shadcn/ui components
- **Dark Mode** -- Full dark mode support across all views

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Desktop | Electron 42 |
| Database (local) | SQLite via better-sqlite3 |
| Database (cloud) | Supabase (optional) |
| Testing | Vitest, Testing Library |
| Language | TypeScript |
| Icons | Lucide React |

---

## Tags

- **[v0.1.1](https://github.com/anthropics/map-of-us-template/releases/tag/v0.1.1)** -- Optimization, security, and testing
- **[v0.1.0](https://github.com/anthropics/map-of-us-template/releases/tag/v0.1.0)** -- Initial release
