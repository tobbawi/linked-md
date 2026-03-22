-- linked.md M1 schema
-- Core data model per architecture decisions

-- Profiles
create table profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,               -- URL-safe name: "wim", "sarah-chen"
  display_name text not null,
  bio text,
  avatar_url text,
  markdown_content text not null default '', -- stored as file at /profile/{slug}.md
  outbound_links text[] not null default '{}', -- parsed [[wikilinks]]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Posts
create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,                       -- unique per profile, not globally
  profile_id uuid not null references profiles(id) on delete cascade,
  title text,
  markdown_content text not null default '', -- stored at /profile/{slug}/post/{post-slug}.md
  outbound_links text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, slug)                  -- post slugs are unique per profile
);

-- Links (junction table for wikilink graph)
-- Bidirectional: source mentions [[target_slug]]
create table links (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('profile', 'post')),
  source_id uuid not null,
  target_slug text not null,               -- raw slug from [[wikilink]]
  target_type text not null check (target_type in ('profile', 'company')),
  created_at timestamptz not null default now(),
  unique(source_type, source_id, target_slug, target_type)
);

-- Index for fast inbound link lookups (backlinks)
create index links_target_slug_idx on links(target_slug);
create index links_source_id_idx on links(source_id);

-- RLS: profiles and posts are public reads
alter table profiles enable row level security;
alter table posts enable row level security;
alter table links enable row level security;

create policy "Public read access" on profiles for select using (true);
create policy "Public read access" on posts for select using (true);
create policy "Public read access" on links for select using (true);

-- Trigger: auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger posts_updated_at before update on posts
  for each row execute function update_updated_at();
