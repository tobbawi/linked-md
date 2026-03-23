# Changelog

All notable changes to linked.md will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [0.2.0.0] - 2026-03-23

### Added
- **Direct messaging (M4):** Full conversation system — `conversations`, `conversation_members`, and `messages` tables with Supabase Realtime subscription for live message delivery. Includes `/messages` list page, `/messages/[id]` thread page with optimistic UI, `MessageButton` on profile pages, and `/api/messages/[id]/read` PATCH endpoint for marking messages read.
- **Job listings (M4):** `job_listings` table with company ownership, `active` flag for soft-delete, `/jobs` page listing active postings, and `/api/jobs/save` POST endpoint with company ownership verification.
- **Skills & endorsements (M3):** `profile_skills` table with per-profile skill list, `skill_endorsements` for peer endorsements (self-endorse blocked), and `/api/skills/endorse` POST/DELETE endpoint. Skills section rendered on profile pages.
- **Recommendations (M3):** `recommendations` table with 20–500 char body validation, self-recommendation blocked, `/api/recommendations` POST and `/api/recommendations/[id]/hide` PATCH for owner hiding. Recommendations rendered on profile pages.
- **Profile completeness score (M3):** Computed completeness percentage (avatar, bio, experience, education, skills, posts, followers) rendered as a progress bar with contextual hints on profile pages.
- **Education entries (M3):** `education_entries` table with school, degree, field, date range, and `replace_education` atomic RPC. Education section on profile pages.
- **Message validation helper:** `src/lib/messageValidation.ts` — pure `validateMessageBody` function with `MESSAGE_MAX_LENGTH = 2000` constant, shared between API route and test suite.
- **Supabase RPC helpers (migration 013):** `create_conversation_with_members` (advisory-locked, deduplication-safe), `last_messages_for_conversations`, `unread_counts_for_conversations`, `replace_skills` (transactional, matches `replace_education` pattern).

### Fixed
- **Message read-before-fetch ordering:** Mark messages read _before_ fetching to prevent a message arriving in the gap from being silently consumed without being shown to the user.
- **Job field length guards:** `title` capped at 200 chars, `description_md` at 20,000 chars in `/api/jobs/save` to prevent unbounded DB writes.
- **Skills save atomicity:** `/api/skills/save` now calls `replace_skills` RPC (delete + insert in one transaction) instead of a non-atomic two-step that could lose data on insertion failure.
- **Duplicate conversation prevention:** `create_conversation_with_members` RPC uses `pg_advisory_xact_lock` on the sorted member pair and returns the existing conversation ID if one already exists, preventing duplicate conversations under concurrent requests.

---

## [0.1.3.1] - 2026-03-22

### Changed
- **TODOS.md:** Full Social MVP roadmap — M2 (network feed, avatars, company following, reposts), M3 (education, skills + endorsements, recommendations, profile completeness score), M4 (job listings, direct messaging with Supabase Realtime, analytics dashboard), plus tech debt items and architectural constraints for each feature.

---

## [0.1.3.0] - 2026-03-22

### Added
- **View tracking:** Privacy-preserving view counts for profiles and posts — `profile_views` and `post_views` tables with SHA-256(IP+UserAgent) hashing (no raw IPs stored), self-view suppression, and 7-day distinct-viewer stats live on the home page dashboard.
- **Experience entries:** `experience` table with per-profile timeline entries — migration, `ExperienceSection` component, and profile page integration.
- **Company llm-full endpoint:** `/api/llm-full/company/[slug]` serving structured company profiles for LLM consumption, matching the profile llm-full pattern.
- **Post creation shortcut:** `/post/new` direct route for quick post creation.
- **Shared editor component:** `editor-shared.tsx` extracts common editor logic for reuse across profile and company editors.

### Changed
- **DESIGN.md:** Added Agent Gateway section with badge copy and AI-facing voice guidelines.
- **Home page stats:** Profile views and post impressions now show live 7-day counts instead of stub zeros.
- **Exports:** `buildLlmCompanyTxt` and `buildLlmCompanyFullTxt` builder functions added and tested (15 new tests, 44 → 59 total).

### Fixed
- **Build:** Resolved `tailwindcss` PostCSS plugin conflict and implicit `any` in `cookiesToSet` params.

---

## [0.1.2.1] - 2026-03-21

### Fixed
- **Stored XSS (security):** Your posts and company pages are now safe from stored XSS — user-authored markdown with raw HTML is sanitized before rendering via a `remark-rehype` + `rehype-sanitize` pipeline. Profile post previews also HTML-escape display text before wikilink injection.
- **Design polish:** 5 design review fixes — mobile nav collapse, dark mode toggle 44px touch target, post title hierarchy, hero dead zone spacing, Sign In button 44px touch target.

---

## [0.1.2.0] - 2026-03-21

### Added
- **Social layer (M2):** Follow/unfollow system, like/reaction on posts, comment threads with Supabase RLS policies
- **Notifications (M3):** Real-time notification bell with unread badge; follow, like, comment events
- **Search (M4):** Unified search page (`/search`) with tabbed results — People, Companies, Posts — 250ms debounced with result counts
- **Explore (M5):** Network feed at `/explore` showing 50 most recent posts across all profiles with wikilink resolution
- **Tag pages (M6):** Tag index at `/tag/[tag]` filtering posts by tag array with highlighted active-tag pills
- **Graph visualization (M7):** Profile connection graph at `/profile/[slug]/graph` — SVG circular layout with outbound (solid), inbound (dashed), and unresolved (gray) link types
- **Dark mode (M8):** Full dark/light toggle via CSS custom properties with `localStorage` persistence and flash-prevention inline script
- **Mobile responsive (M9):** Collapsible nav on ≤640px, sidebar layout stacks vertically, touch-friendly spacing
- **Companies (M-companies):** Company profiles at `/company/[slug]`, company editor, company search, `[[company:Name]]` wikilink syntax
- **Post routes:** Dedicated post pages at `/profile/[slug]/post/[slug]` with comment sections and like buttons
- **API routes:** `/api/graph/[slug]`, `/api/comment`, `/api/follow`, `/api/reaction`, `/api/notifications`, `/api/post/delete`, `/api/company`, `/api/llm/company/[slug]`
- **Supabase migrations:** Social layer (004), companies (005), profile fields (006), post tags (007)

### Changed
- Split Supabase client into server (`createServerClient`) and browser (`createBrowserClient`) to prevent `next/headers` in client components
- Auth callback route at `/auth/callback` exchanges confirmation code for session
- Middleware updated with Supabase session refresh
- `buildProfileMarkdown` and `buildLlmTxt` now include `title`, `location`, `website` meta fields
- Profile page layout receives `sidebar-layout` / `sidebar` CSS classes for mobile responsive targeting
- Nav updated with People, Companies, Explore, Search links and DarkModeToggle

### Fixed
- **XSS in `renderWikilinks`:** User-controlled display text in `[[target|display]]` syntax was inserted raw into HTML output used with `dangerouslySetInnerHTML`; fixed by adding `escapeHtml()` and applying it to all user-controlled insertions
- **PostgREST filter injection in `/api/search`:** Query string was directly interpolated into `.or()` filter strings; fixed by stripping `,().` characters via `safeQ` sanitization
- Removed `!important` from responsive CSS sidebar overrides (specificity was sufficient)
- Replaced `outline: none` on search input with proper `.search-input:focus-visible` CSS rule

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
