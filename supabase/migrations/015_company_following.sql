-- M2.3: Company following
-- Separate table from profile follows — companies are not profiles.

CREATE TABLE IF NOT EXISTS company_follows (
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, company_id)
);

-- Index for feed query: "which companies does this profile follow?"
CREATE INDEX IF NOT EXISTS company_follows_follower_id ON company_follows(follower_id);

-- RLS: users can only insert/delete their own follows; anyone can read
ALTER TABLE company_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_follows: select public"
  ON company_follows FOR SELECT USING (true);

CREATE POLICY "company_follows: insert own"
  ON company_follows FOR INSERT
  WITH CHECK (
    follower_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "company_follows: delete own"
  ON company_follows FOR DELETE
  USING (
    follower_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Follower count helper view (avoids per-request COUNT(*))
CREATE OR REPLACE VIEW company_follower_counts AS
  SELECT company_id, COUNT(*) AS follower_count
  FROM company_follows
  GROUP BY company_id;
