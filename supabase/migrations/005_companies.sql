-- M3: Company profiles

create table if not exists companies (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) not null,
  slug             text unique not null,
  name             text not null,
  tagline          text,
  website          text,
  bio              text,
  markdown_content text not null default '',
  outbound_links   text[] not null default '{}', -- profile slugs linked from content
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

create index if not exists companies_user_idx on companies(user_id);

alter table companies enable row level security;

create policy "Anyone can view companies"
  on companies for select using (true);

create policy "Auth users can create companies"
  on companies for insert
  with check (auth.uid() = user_id);

create policy "Creator can update company"
  on companies for update
  using (auth.uid() = user_id);

create policy "Creator can delete company"
  on companies for delete
  using (auth.uid() = user_id);

-- Add company_links to profiles so we can look up "employees" efficiently
-- (profiles that use [[company:Name]] in their content)
alter table profiles
  add column if not exists company_links text[] not null default '{}';
