# linked.md

An open professional network where every profile, post, and company is a markdown file.
Open. Portable. AI-readable.

## Tech Stack
- Next.js 14 (App Router)
- Supabase (PostgreSQL + Auth + RLS)
- Local filesystem for .md exports (R2 migration in TODOS)
- Middleware for .md URL routing

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Key Design Decisions
- Fraunces (variable serif) for headings, Outfit for body, Geist Mono for .md URLs
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
- Profiles, posts, companies stored as markdown in PostgreSQL + exported to filesystem
- Junction `links` table for bidirectional wikilink tracking
- Middleware rewrites .md/llm.txt/graph.json URLs to API routes
- Content writes trigger immediate export; social interactions batch every 60s
- Social layer: follows, likes/reactions, comments — all with Supabase RLS
- Notifications: follow, like, comment events — real-time badge in nav
- View tracking: `profile_views` + `post_views` tables with SHA-256(IP+UA) hashing, self-view suppression, RLS
- Experience entries: per-profile work history with company, title, date range, is_current flag
- Education entries: `education_entries` table with school, degree, field, date range; atomic `replace_education` RPC
- Skills & endorsements: `profile_skills` + `skill_endorsements` tables; atomic `replace_skills` RPC; self-endorse blocked
- Recommendations: `recommendations` table with 20–500 char validation; owner can hide; self-recommendation blocked
- Profile completeness score: `src/lib/completeness.ts` — computed percentage (avatar, bio, experience, education, skills, posts, followers); rendered as progress bar with hints on profile pages
- Direct messaging: `conversations`, `conversation_members`, `messages` tables; Supabase Realtime subscription; advisory-locked `create_conversation_with_members` RPC prevents duplicate conversations under concurrent requests; `/messages` list + `/messages/[id]` thread pages; `MessageButton` on profiles
- Message validation: `src/lib/messageValidation.ts` — pure `validateMessageBody` + `MESSAGE_MAX_LENGTH = 2000` constant, shared between API and tests
- Job listings: `job_listings` table with company ownership + `active` flag for soft-delete; `/jobs` listing page; `/api/jobs/save` with company ownership verification
- Company llm-full: `/api/llm-full/company/[slug]` mirrors profile llm-full for AI agents
- `createServerClient` (server components/routes) vs `createBrowserClient` (client components)
- Dark mode via CSS custom properties `[data-theme="dark"]` with localStorage persistence
- Flash-prevention: inline `<script>` in `<head>` sets `data-theme` before first paint
- Client beacons: tiny `'use client'` components rendering `null` + `useEffect` for side effects in server pages
- Avatar uploads: Supabase Storage bucket `avatars` (public CDN). **Cannot be created via SQL migration** — run `npx tsx scripts/setup-storage.ts` once after deploying. Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- Avatar component: `src/components/Avatar.tsx` — initials always as base layer, photo overlays. Pure functions in `src/lib/avatar.ts` (getInitials, getAvatarColor, validateAvatarFile).
- Network feed: `POST /api/avatar/upload` — MIME + size validation, ownership check, jimp resize (skipped if unavailable), path stored in `profiles.avatar_url`.
