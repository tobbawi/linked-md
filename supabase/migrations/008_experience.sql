-- Migration 008: Work Experience
-- Adds structured work history to profiles.
-- Each entry is a graph edge (profile → company) when company_slug is set.

create table experience (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  company_name text not null,
  company_slug text,            -- soft ref to companies.slug; nullable
  title        text not null,
  start_year   int  not null,
  start_month  int,             -- 1–12; null = month not specified
  end_year     int,             -- null if is_current = true
  end_month    int,             -- 1–12; null if is_current or month not specified
  is_current   bool not null default false,
  description  text,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint experience_current_no_end check (not (is_current = true and end_year is not null)),
  constraint experience_month_range check (
    (start_month is null or (start_month >= 1 and start_month <= 12)) and
    (end_month   is null or (end_month   >= 1 and end_month   <= 12))
  ),
  constraint experience_year_range check (
    start_year >= 1900 and start_year <= 2100 and
    (end_year is null or (end_year >= 1900 and end_year <= 2100))
  ),
  constraint experience_end_after_start check (
    end_year is null or
    end_year > start_year or
    (end_year = start_year and (start_month is null or end_month is null or end_month >= start_month))
  )
);

create index experience_profile_id_idx on experience(profile_id);
create index experience_company_slug_idx on experience(company_slug);

alter table experience enable row level security;

create policy "Public read" on experience for select using (true);

create policy "Owner insert" on experience for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Owner update" on experience for update
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Owner delete" on experience for delete
  using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create trigger experience_updated_at before update on experience
  for each row execute function update_updated_at();

-- Atomic replace function.
-- Called via supabase.rpc('replace_experience', { p_profile_id, p_entries }).
-- The save route MUST use createAuthServerClient (not service role) so auth.uid() resolves.
create or replace function replace_experience(
  p_profile_id uuid,
  p_entries    jsonb
) returns void
language plpgsql
security invoker  -- runs as calling user; auth.uid() resolves correctly
as $$
begin
  -- Belt-and-suspenders ownership check (RLS already enforces this)
  if not exists (
    select 1 from profiles where id = p_profile_id and user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  delete from experience where profile_id = p_profile_id;

  insert into experience (
    profile_id, company_name, company_slug, title,
    start_year, start_month, end_year, end_month,
    is_current, description, sort_order
  )
  select
    p_profile_id,
    (e->>'company_name'),
    nullif(e->>'company_slug', ''),
    (e->>'title'),
    (e->>'start_year')::int,
    nullif(e->>'start_month', '')::int,
    nullif(e->>'end_year', '')::int,
    nullif(e->>'end_month', '')::int,
    (e->>'is_current')::bool,
    nullif(e->>'description', ''),
    (e->>'sort_order')::int
  from jsonb_array_elements(p_entries) as e;
end;
$$;
