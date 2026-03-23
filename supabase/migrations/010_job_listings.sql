-- Migration 010: Job Listings
-- Company owners can post open roles; anyone can read active listings.

create table job_listings (
  id             uuid        primary key default gen_random_uuid(),
  company_id     uuid        not null references companies(id) on delete cascade,
  title          text        not null,
  location       text,
  type           text        not null default 'full-time', -- 'full-time' | 'part-time' | 'contract' | 'internship'
  description_md text        not null default '',
  active         boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index job_listings_company_id       on job_listings(company_id);
create index job_listings_active_created   on job_listings(active, created_at desc);

alter table job_listings enable row level security;

create policy "Public can read active job listings"
  on job_listings for select
  using (active = true);

create policy "Company owners can manage job listings"
  on job_listings for all
  using   (company_id in (select id from companies where user_id = auth.uid()))
  with check (company_id in (select id from companies where user_id = auth.uid()));

create trigger job_listings_updated_at before update on job_listings
  for each row execute function update_updated_at();
