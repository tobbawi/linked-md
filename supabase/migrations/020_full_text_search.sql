-- M10: Full-text search with tsvector + GIN indexes
-- Replaces ilike sequential scans with indexed full-text search
-- At 100K profiles: search goes from ~500ms to <100ms

-- Add search_vector columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_search ON profiles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_companies_search ON companies USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(search_vector);

-- Trigger: rebuild search_vector on profile changes
CREATE OR REPLACE FUNCTION profiles_search_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.slug, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_search_update ON profiles;
CREATE TRIGGER profiles_search_update
  BEFORE INSERT OR UPDATE OF display_name, title, bio, slug ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_search_trigger();

-- Trigger: rebuild search_vector on company changes
CREATE OR REPLACE FUNCTION companies_search_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.tagline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.slug, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_search_update ON companies;
CREATE TRIGGER companies_search_update
  BEFORE INSERT OR UPDATE OF name, tagline, bio, slug ON companies
  FOR EACH ROW EXECUTE FUNCTION companies_search_trigger();

-- Trigger: rebuild search_vector on post changes
CREATE OR REPLACE FUNCTION posts_search_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.markdown_content, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_search_update ON posts;
CREATE TRIGGER posts_search_update
  BEFORE INSERT OR UPDATE OF title, markdown_content ON posts
  FOR EACH ROW EXECUTE FUNCTION posts_search_trigger();

-- Backfill existing data
UPDATE profiles SET search_vector =
  setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(title, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(slug, '')), 'D');

UPDATE companies SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(slug, '')), 'D');

UPDATE posts SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(markdown_content, '')), 'B');
