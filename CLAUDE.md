# linked.md

An open professional network where every profile, post, and company is a markdown file.
Open. Portable. AI-readable.

## Tech Stack
- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth)
- Local filesystem for .md exports (M1), Cloudflare R2 (M2)
- Middleware for .md URL routing

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Key Design Decisions
- Instrument Serif for headings, Instrument Sans for body, Geist Mono for .md URLs
- Emerald green (#0D9373) is the only accent color — used for primary actions, .md URLs, llm.txt badges, wikilinks
- Warm neutrals (not cool grays)
- The .md URL visible below each post is the brand differentiator — never hide it on desktop

## Testing
- Run tests: `npm test` (vitest)
- Test files: `src/test/`
- 100% coverage goal for pure functions; Supabase-dependent paths require integration tests
- When adding new pure functions, write a corresponding test
- When fixing a bug, write a regression test

## Architecture
- Profiles and posts stored as markdown in PostgreSQL + exported to filesystem
- Junction `links` table for bidirectional wikilink tracking
- Middleware rewrites .md/llm.txt/graph.json URLs to API routes
- Content writes trigger immediate export; social interactions (M2) batch every 60s
