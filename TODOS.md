# TODOS — linked.md

## Milestone 2

### Migrate file exports to Cloudflare R2
**What:** Replace local filesystem writes with R2 object storage when social interactions are added.
**Why:** Local filesystem doesn't persist on serverless deploys and won't scale for batch exports of social data (60s intervals for likes/follows/comments).
**Pros:** CDN-served .md files, infinite storage, no disk management.
**Cons:** Adds cloud dependency, R2 SDK integration, cross-provider setup.
**Context:** M1 uses local filesystem (eng review decision 1C). When M2 adds social interactions with batch re-exports, local disk becomes a bottleneck. Migrate at start of M2.
**Depends on:** M1 complete, social interaction schema designed.

### Extend remark-wiki-link for disambiguation and backlinks
**What:** Fork or extend remark-wiki-link for: (a) ambiguous name disambiguation, (b) reverse link indexing (backlinks), (c) graph.json generation from link tree.
**Why:** Stock plugin only parses `[[links]]` into hrefs — doesn't resolve slugs, handle ambiguity, or track backlinks.
**Pros:** Custom plugin becomes the core of the bidirectional linking system. Publishable as open-source `remark-wiki-link-bidirectional`.
**Cons:** Maintaining a fork adds long-term burden.
**Context:** M1 uses basic exact-slug-match resolution. M2 needs disambiguation UI and backlink display. Consider publishing as standalone package.
**Depends on:** M1 links table working, basic wikilink resolution proven.

## Test Coverage

### Add integration tests for API routes
**Priority:** P2
**What:** Unit/integration tests for `/api/search`, `/api/graph/[slug]`, `/api/comment`, `/api/follow`, `/api/reaction`, `/api/notifications` routes.
**Why:** Core API routes have 0 automated test coverage — bugs here are invisible until production.
**Pros:** Catch injection and logic bugs automatically; enables safe refactoring of API layer.
**Cons:** Requires Supabase mock or test database setup (non-trivial).
**Context:** Current test suite covers only `lib/exports` and `lib/wikilinks` (utility libs). API routes added in v0.1.2.0 are untested. The `/api/search` filter injection fix was caught manually during code review — a test would have caught it earlier.
**Depends on:** Decision on test database strategy (vitest + @supabase/supabase-js mock vs real Supabase test project).
