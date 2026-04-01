-- M2.1: Composite indexes for network feed query
-- Without these, the feed JOIN does sequential scans at >1000 posts.

-- Speeds up: posts by profile ordered by date (feed + profile page)
CREATE INDEX IF NOT EXISTS posts_profile_created
  ON posts(profile_id, created_at DESC);

-- Speeds up: fetching who a profile follows
CREATE INDEX IF NOT EXISTS follows_follower_id
  ON follows(follower_id);

-- M2.2: companies.avatar_url column for future logo upload (M2 uses initials-only)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS avatar_url text;
