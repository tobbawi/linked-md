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
- Notifications: follow, company_follow, like, comment, endorse, recommendation, repost events — real-time badge in nav with `NotificationBell` component; mark-all-read on bell open via `POST /api/notifications/read`
- View tracking: `profile_views` + `post_views` tables with SHA-256(IP+UA) hashing, self-view suppression, RLS
- Experience entries: per-profile work history with company, title, date range, is_current flag
- Education entries: `education_entries` table with school, degree, field, date range; atomic `replace_education` RPC
- Skills & endorsements: `profile_skills` + `skill_endorsements` tables; atomic `replace_skills` RPC; self-endorse blocked
- Recommendations: `recommendations` table with 20–500 char validation; owner can hide; self-recommendation blocked
- Profile completeness score: `src/lib/completeness.ts` — computed percentage (avatar, bio, experience, education, skills, posts, followers); rendered as progress bar with hints on profile pages
- Direct messaging: `conversations`, `conversation_members`, `messages` tables; Supabase Realtime subscription; advisory-locked `create_conversation_with_members` RPC prevents duplicate conversations under concurrent requests; `/messages` list + `/messages/[id]` thread pages; `MessageButton` on profiles
- Message validation: `src/lib/messageValidation.ts` — pure `validateMessageBody` + `MESSAGE_MAX_LENGTH = 2000` constant, shared between API and tests
- Job listings: `job_listings` table with company admin ownership + `active` flag for soft-delete; `/jobs` listing page; `/api/jobs/save`; any company admin can manage listings (RLS updated in migration 017)
- Company llm-full: `/api/llm-full/company/[slug]` mirrors profile llm-full for AI agents; includes `## Admins` section listing all admins with owner/admin roles.
- Company admin management: `company_members` table (multi-admin); `POST`/`DELETE /api/company/member` to invite/remove admins; creator auto-seeded as first admin on company creation. Last-admin guard enforced at both app level and DB trigger (with advisory lock for TOCTOU safety); owner removal blocked at DB level too. `createServerClient` = service-role client (bypasses RLS) — all `company_members` writes use it.
- `createServerClient` (server components/routes) vs `createBrowserClient` (client components)
- Dark mode via CSS custom properties `[data-theme="dark"]` with localStorage persistence
- Flash-prevention: inline `<script>` in `<head>` sets `data-theme` before first paint
- Client beacons: tiny `'use client'` components rendering `null` + `useEffect` for side effects in server pages
- Avatar uploads: Supabase Storage bucket `avatars` (public CDN). **Cannot be created via SQL migration** — run `npx tsx scripts/setup-storage.ts` once after deploying. Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Upload route uses plain `createClient` from `@supabase/supabase-js` (not `createServerClient`) for Storage — avoids cookie-auth RLS override that rejects writes even with service role key.
- Avatar component: `src/components/Avatar.tsx` — initials always as base layer, photo overlays. Pure functions in `src/lib/avatar.ts` (getInitials, getAvatarColor, validateAvatarFile). Magic number MIME validation prevents spoofing.
- Network feed: `src/lib/feed.ts` — `mergeFeedItems<T>()` deduplicates by id and sorts `(created_at DESC, id DESC)`. Feed includes posts, reposts, and job listings from followed profiles/companies.
- Company following: `company_follows` table; `CompanyFollowButton` component; `POST`/`DELETE /api/company/follow`; sends `company_follow` notification to company owner.
- Reposts: `reposts` table with `UNIQUE(profile_id, original_post_id)`; `RepostButton`; `RepostCard` in feed; `## Reposts` section in llm-full.txt; `POST`/`DELETE /api/repost` (409 on duplicate, 403 on own post).
- Analytics: `/analytics` owner-only page with 30-day inline SVG sparklines and per-post stats table. All view counts deduplicated by `viewer_hash`.
- Nav: `SearchBox` (debounced 300ms, grouped results) + `NotificationBell` both in `src/components/Nav.tsx`.
- AI Agent Gateway (M6): `/robots.txt` (AI crawler permissions + `X-Llms-Txt` header), `/llms.txt` (platform root discovery), `/network/profiles/llm.txt` and `/network/companies/llm.txt` (cursor-based paginated directories, 100/page, `Link` header for next page), `/api/search?format=llm` (markdown search results). Graph endpoint uses `outbound_links` arrays + `contains` filter for inbound (no O(n) scan).

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
