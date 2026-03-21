# Changelog

All notable changes to linked.md will be documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

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
