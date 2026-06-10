# Changelog

All notable changes to **Map of Us** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-06-10

### Added
- English README with comprehensive documentation
- Chinese README (README.zh-CN.md) renamed from original
- Issue templates (Bug Report, Feature Request)
- Pull Request template
- CHANGELOG.md (this file)
- CONTRIBUTING.md (bilingual English/Chinese)
- MIT LICENSE file
- GitHub Actions CI workflow
- Multi-platform installation guide in Release notes

### Changed
- Repository made public for open-source community

---

## [0.1.1] - 2026-06-09

### Fixed
- Rate limit test type narrowing (TS2339 errors)
- Added type guards for discriminated union types in test files

### Changed
- CI workflow simplified (removed Electron release build on tag push)

---

## [0.1.0] - 2026-06-08

### Features

#### Map System
- Interactive China SVG Map — 34 provinces with D3-geo projection
- Province Highlighting — Visited provinces automatically light up
- Zoom and Pan — Smooth zoom and drag navigation
- City Markers — Click provinces to view city details

#### Memory System
- City Memories — Add multiple memories per city with photos, text, and dates
- Multi-Photo Covers — Each memory supports multiple cover images
- Memory Editing — Full CRUD operations for memories
- Memory Archive — Browse all memories in a unified view

#### Security
- Dual-Layer Password — Site password + admin password
- HMAC-SHA256 Cookies — Cryptographically signed authentication
- Rate Limiting — Protection against brute-force attacks
- CSRF Protection — Cross-site request forgery prevention

#### Settings
- Anniversaries — Track important dates with countdown
- Weather Cities — Up to 3 cities for weather display
- Couple Logo — Customizable corner logo
- Login Page Photos — 9-grid photo customization

#### Data Management
- Full Backup/Restore — Export and import complete data
- Local Storage — JSON file-based persistence (desktop)
- Supabase Support — Cloud storage option for web deployment

#### Desktop App
- Electron 42 — Cross-platform desktop application
- macOS DMG — Native macOS installer
- Windows NSIS — Windows installer package

#### Web Deployment
- Next.js 16 — App Router with React Server Components
- Supabase Integration — Database and storage backend
- Docker Support — Containerized deployment

#### Testing
- Vitest — Unit testing framework
- V8 Coverage — Code coverage reporting
- 24+ Test Cases — Auth, API, data module tests

### Tech Stack
- Next.js 16 (App Router, RSC)
- React 19 + Tailwind CSS 4 + Framer Motion
- D3-geo projection + custom SVG rendering
- Electron 42 + Next.js standalone
- HMAC-SHA256 authentication
- Vitest + V8 Coverage

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 1.2.0 | 2026-06-10 | Open-source release: English docs, CI, templates, LICENSE |
| 0.1.1 | 2026-06-09 | Bug fixes: rate limit test types, CI simplification |
| 0.1.0 | 2026-06-08 | Initial release: 34-province map, memories, Electron, testing |
