# Changelog

All notable changes to linked.md will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.1.1.0] - 2026-03-20

### Added
- Next.js 14 App Router scaffold with Instrument Sans/Serif (body/headings) + Geist Mono (`.md` URLs, badges)
- Middleware routing: rewrites `.md`, `llm.txt`, `llm-full.txt`, `graph.json` URL patterns to API handlers
- Supabase schema: `profiles`, `posts`, `links` junction table with RLS policies and backlink index
- Export system (`src/lib/exports.ts`): writes `.md`, `llm.txt`, `llm-full.txt`, `graph.json` on content writes
- `llm.txt` format: compact profile + recent posts + connections, designed to fit in an LLM context window
- Wikilink parser (`src/lib/wikilinks.ts`): `[[Name]]` → slug resolution → rendered link or plain fallback with tooltip
- API routes: `/api/raw/profile`, `/api/llm`, `/api/llm-full`, `/api/graph`
- Design tokens from `DESIGN.md` wired into `globals.css` (warm neutrals, emerald primary `#0D9373`) and Tailwind config
- Landing page with three differentiators and live `.md` URL examples
- `.env.local.example` with Supabase connection variables
- vitest + @testing-library bootstrap with 12 tests covering wikilink pure functions
- VERSION and CHANGELOG

---
