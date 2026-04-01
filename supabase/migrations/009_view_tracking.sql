-- Migration 009: View Tracking
-- Tracks profile and post views with privacy-preserving hashing.
-- viewer_hash = SHA-256(IP + User-Agent) — no raw IPs stored.
-- Dedup: count DISTINCT viewer_hash at query time (no write-time dedup needed).

create table profile_views (
  id                 uuid        primary key default gen_random_uuid(),
  profile_id         uuid        not null references profiles(id) on delete cascade,
  viewer_profile_id  uuid        references profiles(id) on delete set null,  -- null for anonymous
  viewer_hash        text        not null,  -- SHA-256(IP + UA)
  created_at         timestamptz not null default now()
);

create index profile_views_profile_id_created_at on profile_views (profile_id, created_at);
create index profile_views_viewer_hash on profile_views (viewer_hash);

create table post_views (
  id                 uuid        primary key default gen_random_uuid(),
  post_id            uuid        not null references posts(id) on delete cascade,
  viewer_profile_id  uuid        references profiles(id) on delete set null,  -- null for anonymous
  viewer_hash        text        not null,  -- SHA-256(IP + UA)
  created_at         timestamptz not null default now()
);

create index post_views_post_id_created_at on post_views (post_id, created_at);
create index post_views_viewer_hash on post_views (viewer_hash);

-- RLS: anyone can insert (tracking), profile owners can read their own data
alter table profile_views enable row level security;

create policy "Anyone can track profile views"
  on profile_views for insert
  with check (true);

create policy "Profile owners can read their own view stats"
  on profile_views for select
  using (
    profile_id in (
      select id from profiles where user_id = auth.uid()
    )
  );

alter table post_views enable row level security;

create policy "Anyone can track post views"
  on post_views for insert
  with check (true);

create policy "Post owners can read their own post view stats"
  on post_views for select
  using (
    post_id in (
      select p.id from posts p
      join profiles pr on pr.id = p.profile_id
      where pr.user_id = auth.uid()
    )
  );
