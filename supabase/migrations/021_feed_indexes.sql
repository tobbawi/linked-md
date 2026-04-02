-- M10: Composite indexes for feed query optimization
-- These indexes cover the exact query patterns the feed uses

-- Follows: "who do I follow?" — used to build feed post list
-- Already have idx on follower_id from M2, but composite is better
CREATE INDEX IF NOT EXISTS idx_follows_follower_followee
  ON follows(follower_id, followee_id);

-- Company follows: composite for feed company content
CREATE INDEX IF NOT EXISTS idx_company_follows_composite
  ON company_follows(follower_id, company_id);

-- Job listings: active jobs sorted by date (partial index)
CREATE INDEX IF NOT EXISTS idx_job_listings_active_date
  ON job_listings(created_at DESC) WHERE active = true;

-- Reposts: for feed repost inclusion
CREATE INDEX IF NOT EXISTS idx_reposts_profile_date
  ON reposts(profile_id, created_at DESC);

-- Comments count: used in feed post cards
CREATE INDEX IF NOT EXISTS idx_comments_post
  ON comments(post_id);

-- Reactions count: used in feed post cards
CREATE INDEX IF NOT EXISTS idx_reactions_post
  ON reactions(post_id);
