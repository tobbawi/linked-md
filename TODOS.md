# TODOS — linked.md

---

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

---

## Technical Debt

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

### v0.2.1.0 — 2026-03-24
- M2.1: Network feed (follows + own posts, `mergeFeedItems<T>()` dedup/sort, reaction/comment counts)
- M2.2: Profile avatars (Supabase Storage, `Avatar` component, magic number MIME validation)
- M2.3: Company following (`company_follows` table, `CompanyFollowButton`, feed integration)
- M2.4: Reposts (`reposts` table, `RepostButton`, `RepostCard` in feed, llm-full.txt section)
- M4.3: Analytics dashboard (30d sparklines, per-post table, deduplicated view counts)
- Nav search + notification bell (debounced SearchBox, NotificationBell with bell badge)
- P0: Search endpoint `Cache-Control: private, max-age=60` (rate limiting)
- Composite DB indexes: `posts(profile_id, created_at DESC)`, `follows(follower_id)` (migration 014)

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
