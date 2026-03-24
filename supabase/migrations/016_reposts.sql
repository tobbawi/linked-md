-- M2.4: Reposts / resharing

CREATE TABLE IF NOT EXISTS reposts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  original_post_id  uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  comment           text        CHECK (char_length(comment) <= 500),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, original_post_id)
);

CREATE INDEX IF NOT EXISTS reposts_profile_id       ON reposts(profile_id);
CREATE INDEX IF NOT EXISTS reposts_original_post_id ON reposts(original_post_id);

ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reposts: select public"
  ON reposts FOR SELECT USING (true);

CREATE POLICY "reposts: insert own"
  ON reposts FOR INSERT
  WITH CHECK (
    profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "reposts: delete own"
  ON reposts FOR DELETE
  USING (
    profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
