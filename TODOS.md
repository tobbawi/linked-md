# TODOS — linked.md

---

## P0 — Must fix before public launch

### Rate limiting for `?format=llm` endpoint
**Priority:** P0
**What:** Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` to the search/LLM endpoint response.
**Why:** The endpoint fires a full-table ILIKE query on profiles with no auth. Trivial to abuse — a tight loop would hammer the Supabase free-tier connection pool.
**Pros:** `Cache-Control` is zero-dependency — one header line. Protects DB before any public post or HN submission.
**Cons:** In-memory rate limiter doesn't survive serverless cold-starts; `Cache-Control` is less precise but good enough.
**Context:** Acceptable at current traffic. Critical before any public announcement.
**Depends on:** Nothing — can ship standalone.

---

## Milestone 2 — Network Feed + Avatars + Company Following

### M2.1: Network feed on home page
**Priority:** P0
**What:** Replace "your own recent posts" on the home page with a chronological feed of posts from people you follow. Cursor-based pagination (`WHERE created_at < $cursor`).
**Why:** Without a network feed, linked.md is a blogging tool, not a social network. This is the single highest-impact missing feature.
**Pros:** Core social loop unlocked. Query-time approach (no materialized table) means zero new infra.
**Cons:** Empty state for new users who follow nobody — needs a good "Discover people" CTA.
**Context:** Use query-time JOIN on `follows` table. Add migration with composite index `posts(profile_id, created_at DESC)` and `follows(follower_id)`. Cursor pagination required — offset pagination causes duplicate posts as new ones arrive.
**Depends on:** Nothing.

### M2.2: Profile avatars
**Priority:** P1
**What:** `profiles.avatar_url` column + Supabase Storage bucket (`avatars`, public) + `POST /api/avatar/upload` route + avatar display across all surfaces (profile header, nav, comments, notifications).
**Why:** No profile photos makes the platform feel like a developer tool, not a social network.
**Pros:** Supabase Storage = zero new dependencies, CDN-cached public URLs.
**Cons:** Need server-side validation (2MB limit, image/jpeg|png|webp MIME only). Old avatar must be deleted on re-upload to avoid orphan files.
**Context:** Migration: `ALTER TABLE profiles ADD COLUMN avatar_url text`. Upload route validates, uploads to `avatars/{profile_id}.webp`, patches profile row. Avatar shows in profile header, nav bar, comment attribution, notification list.
**Depends on:** Nothing.

### M2.3: Company following
**Priority:** P1
**What:** New `company_follows(follower_id, company_id)` table + `CompanyFollowButton` component + company follower count on company page.
**Why:** Users follow companies on LinkedIn to see job posts and company updates in their feed.
**Pros:** Clean separation from profile follows. Company posts (if any) can be included in the network feed.
**Cons:** UI must distinguish "following" state for companies vs people.
**Context:** Use a dedicated `company_follows` table — do NOT extend the existing `follows` table with a nullable column. RLS mirrors `follows`. Notification sent to company owner on follow.
**Depends on:** M2.1 (feed should include company content).

### M2.4: Reposts / resharing
**Priority:** P2
**What:** `reposts(profile_id, original_post_id, comment, created_at)` table — rendered in the feed with "reshared by X" attribution.
**Why:** Reposts are the content virality mechanism — ideas spread through the network.
**Pros:** Simple UNION in the feed query. Original author gets a notification.
**Cons:** UNIQUE(profile_id, original_post_id) prevents double-reposting. Cannot repost own post.
**Context:** Repost button on each post. Optional "add a thought" comment text. Reposts appear in `llm-full.txt` under `## Reposts`.
**Depends on:** M2.1 (feed must exist first).

---

## Milestone 3 — Profile Completeness Layer ✓ Shipped v0.2.0.0

### Skill reorder UI
**Priority:** P3
**What:** Drag-to-reorder for skills in the editor. `sort_order` column exists in `profile_skills` but no UI to reorder.
**Why:** Users with many skills want to control which appear first.
**Pros:** Clean UX; `sort_order` already in schema.
**Cons:** Requires DnD library or custom drag logic.
**Context:** `sort_order` is re-indexed on every save (same as `experience` sort_order pattern). Add after M3.2 ships.
**Depends on:** M3.2.

### Education in buildLlmTxt summary
**Priority:** P3
**What:** Add a brief education section to `buildLlmTxt` (the short llm.txt file). Currently only shows current experience roles.
**Why:** AI agents reading the concise llm.txt would benefit from seeing highest degree or current school.
**Pros:** One additional `## Education` line in the summary — small diff.
**Context:** Currently education only appears in `llm-full.txt`. Consider showing only `is_current` or most recent entry in summary.
**Depends on:** M3.1.

---

## Milestone 4 — Career Layer + Messaging ✓ Shipped v0.2.0.0

### M4.3: Analytics dashboard
**Priority:** P2
**What:** Dedicated `/analytics` page (owner-only) showing: profile views over 30 days (chart), post impressions per post, top posts by views, follower growth over time.
**Why:** Creators want to know what's working. Analytics drive engagement.
**Pros:** All data already in `profile_views` and `post_views`. Pure query work + charting.
**Cons:** Need a chart library — recharts is the standard React choice (small, no build config).
**Context:** Group views by day: `date_trunc('day', created_at)`. 30-day window. Add follower count history table if growth chart is needed (or compute from `follows.created_at`).
**Depends on:** View tracking (shipped v0.1.3.0).

---

## Technical Debt

### Add composite DB indexes for feed query
**Priority:** P1 — must ship alongside M2.1
**What:** Migration adding: `CREATE INDEX posts_profile_created ON posts(profile_id, created_at DESC)` and `CREATE INDEX follows_follower_id ON follows(follower_id)`.
**Why:** Without these, the feed JOIN does sequential scans. Slow with >1000 posts.
**Context:** Ship as part of the M2.1 migration file.
**Depends on:** M2.1.

### Migrate file exports to Cloudflare R2
**Priority:** P2
**What:** Replace local filesystem writes with R2 object storage.
**Why:** Local filesystem doesn't persist on serverless deploys.
**Context:** M1 uses local filesystem (eng review decision 1C). Migrate when deploying to Vercel/Fly.
**Depends on:** Production deploy decision.

### Add integration tests for API routes
**Priority:** P2
**What:** Unit/integration tests for `/api/follow`, `/api/reaction`, `/api/comment`, `/api/views/*`, new M2–M4 routes.
**Why:** All API routes have 0 automated test coverage — bugs are invisible until production.
**Cons:** Requires Supabase mock or test DB strategy.
**Context:** Use `vi.mock` for Supabase client. Start with simplest routes (views, follow toggle).
**Depends on:** Decision on mock vs real test DB.

### Extend remark-wiki-link for disambiguation and backlinks
**Priority:** P3
**What:** Fork or extend remark-wiki-link for ambiguous name disambiguation, reverse link indexing, graph.json generation.
**Why:** Stock plugin only parses `[[links]]` without resolving slugs or tracking backlinks.
**Cons:** Maintaining a fork adds long-term burden.
**Context:** M1 uses basic exact-slug-match. Needed for M2+ backlink display.
**Depends on:** M1 links table proven stable.

---

## Completed

### v0.2.0.0 — 2026-03-23
- M3: Education entries, skills + endorsements, recommendations, profile completeness score
- M4: Job listings (company-owned, active flag), direct messaging (Supabase Realtime, advisory-locked dedup, read receipts)
- Message validation helper (`validateMessageBody`, `MESSAGE_MAX_LENGTH`)
- DB hardening: atomic `replace_skills` RPC, advisory-locked `create_conversation_with_members`, job field length guards, mark-read-before-fetch ordering

### v0.1.3.0 — 2026-03-22
- View tracking: profile_views + post_views, SHA-256 privacy, self-view suppression, live home page stats
- Experience entries: work history timeline on profiles
- Company llm-full: /api/llm-full/company/[slug]
- Shared editor component + /post/new shortcut route

### v0.1.2.1 — 2026-03-21
- Stored XSS fix: rehype-sanitize pipeline for user markdown
- Design polish: 5 design review fixes (touch targets, hierarchy, mobile nav)

### v0.1.2.0 — 2026-03-21
- Social layer: follows, likes/reactions, comments, notifications
- Dark mode, mobile responsive layout
- Company profiles + editor
- Connection graph (SVG)
- Search, explore, tags, people pages

### v0.1.1.0 — 2026-03-20
- Auth (Supabase magic link)
- Profile page + split-screen editor
- Post CRUD + markdown rendering
- LLM exports (llm.txt, llm-full.txt, graph.json)
