-- Migration 012: Profile Completeness Layer
-- Adds: education_entries, profile_skills, skill_endorsements, recommendations
-- Also adds avatar_url to profiles (upload UI comes in M2.2).

-- ── avatar_url column ───────────────────────────────────────────────────────

alter table profiles add column if not exists avatar_url text;

-- ── education_entries ───────────────────────────────────────────────────────
-- Mirrors the experience table pattern exactly.

create table education_entries (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  school       text not null,
  degree       text,               -- e.g. "B.S.", "M.S.", "Ph.D."
  field_of_study text,
  start_year   int  not null,
  start_month  int,                -- 1–12; null = month not specified
  end_year     int,                -- null if is_current = true
  end_month    int,
  is_current   bool not null default false,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint education_current_no_end check (not (is_current = true and end_year is not null)),
  constraint education_month_range check (
    (start_month is null or (start_month >= 1 and start_month <= 12)) and
    (end_month   is null or (end_month   >= 1 and end_month   <= 12))
  ),
  constraint education_year_range check (
    start_year >= 1900 and start_year <= 2100 and
    (end_year is null or (end_year >= 1900 and end_year <= 2100))
  )
);

create index education_profile_id_idx on education_entries(profile_id);

alter table education_entries enable row level security;

create policy "Public read" on education_entries for select using (true);

create policy "Owner insert" on education_entries for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Owner update" on education_entries for update
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Owner delete" on education_entries for delete
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create trigger education_updated_at before update on education_entries
  for each row execute function update_updated_at();

-- Atomic replace function — same pattern as replace_experience.
create or replace function replace_education(
  p_profile_id uuid,
  p_entries    jsonb
) returns void
language plpgsql
security invoker
as $$
begin
  if not exists (
    select 1 from profiles where id = p_profile_id and user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  delete from education_entries where profile_id = p_profile_id;

  insert into education_entries (
    profile_id, school, degree, field_of_study,
    start_year, start_month, end_year, end_month,
    is_current, sort_order
  )
  select
    p_profile_id,
    (e->>'school'),
    nullif(e->>'degree', ''),
    nullif(e->>'field_of_study', ''),
    (e->>'start_year')::int,
    nullif(e->>'start_month', '')::int,
    nullif(e->>'end_year', '')::int,
    nullif(e->>'end_month', '')::int,
    (e->>'is_current')::bool,
    (e->>'sort_order')::int
  from jsonb_array_elements(p_entries) as e;
end;
$$;

-- ── profile_skills ──────────────────────────────────────────────────────────

create table profile_skills (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create index profile_skills_profile_id_idx on profile_skills(profile_id);

alter table profile_skills enable row level security;

create policy "Public read" on profile_skills for select using (true);

create policy "Owner insert" on profile_skills for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Owner update" on profile_skills for update
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Owner delete" on profile_skills for delete
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

-- ── skill_endorsements ──────────────────────────────────────────────────────

create table skill_endorsements (
  id          uuid primary key default gen_random_uuid(),
  skill_id    uuid not null references profile_skills(id) on delete cascade,
  endorser_id uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (skill_id, endorser_id)
);

create index skill_endorsements_skill_id_idx on skill_endorsements(skill_id);
create index skill_endorsements_endorser_id_idx on skill_endorsements(endorser_id);

alter table skill_endorsements enable row level security;

create policy "Public read" on skill_endorsements for select using (true);

create policy "Logged-in insert" on skill_endorsements for insert
  with check (
    endorser_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Own delete" on skill_endorsements for delete
  using (
    endorser_id in (select id from profiles where user_id = auth.uid())
  );

-- ── recommendations ─────────────────────────────────────────────────────────

create table recommendations (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body         text not null,
  visible      bool not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint recommendations_no_self check (author_id != recipient_id),
  constraint recommendations_body_length check (char_length(body) between 20 and 500)
);

create index recommendations_recipient_id_idx on recommendations(recipient_id);
create index recommendations_author_id_idx on recommendations(author_id);

alter table recommendations enable row level security;

-- Public can read visible recommendations only
create policy "Public read visible" on recommendations for select
  using (visible = true);

-- Recipient can also read hidden ones (to show toggle in their editor)
create policy "Recipient read own" on recommendations for select
  using (
    recipient_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Author insert" on recommendations for insert
  with check (
    author_id in (select id from profiles where user_id = auth.uid())
  );

-- Recipient can hide/unhide (toggle visible); author cannot edit body
create policy "Recipient update visible" on recommendations for update
  using (
    recipient_id in (select id from profiles where user_id = auth.uid())
  )
  with check (
    recipient_id in (select id from profiles where user_id = auth.uid())
  );

create trigger recommendations_updated_at before update on recommendations
  for each row execute function update_updated_at();

-- ── notification type extension ─────────────────────────────────────────────
-- Add skill_id and skill_name columns to notifications for endorse type.

alter table notifications add column if not exists skill_id uuid references profile_skills(id) on delete set null;
alter table notifications add column if not exists skill_name text;
