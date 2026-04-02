-- M10: GIN indexes for array containment queries
-- Impact: graph.json contains() and backlink queries go from seq scan to index scan
-- At 100K profiles: ~5000ms → ~50ms

-- Profiles outbound_links — used by graph.json for inbound link discovery
CREATE INDEX IF NOT EXISTS idx_profiles_outbound_links
  ON profiles USING GIN(outbound_links);

-- Posts outbound_links — used for post-level wikilink resolution
CREATE INDEX IF NOT EXISTS idx_posts_outbound_links
  ON posts USING GIN(outbound_links);

-- Profiles company_links — used for company graph queries
CREATE INDEX IF NOT EXISTS idx_profiles_company_links
  ON profiles USING GIN(company_links);
