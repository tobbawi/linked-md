-- Migration 017: Company Admin & Employee Roster (M5)
-- Adds multi-admin support to companies via company_members join table.
-- Employee roster is derived from experience.company_slug (no new table).

-- ─── 1. company_members table ───────────────────────────────────────────────

create table company_members (
  company_id  uuid not null references companies(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  role        text not null default 'admin',
  created_at  timestamptz not null default now(),
  primary key (company_id, profile_id),
  constraint company_members_role_check check (role in ('admin'))
);

create index company_members_profile_idx on company_members(profile_id);

alter table company_members enable row level security;

-- Public read: Team tab (client component) needs this without auth
create policy "Public read" on company_members for select using (true);

-- Only existing admins of a company can add new admins
create policy "Admin insert" on company_members for insert
  with check (
    company_id in (
      select cm.company_id from company_members cm
      join profiles p on p.id = cm.profile_id
      where p.user_id = auth.uid() and cm.role = 'admin'
    )
  );

-- Only existing admins can remove admins (DB trigger enforces last-admin rule)
create policy "Admin delete" on company_members for delete
  using (
    company_id in (
      select cm.company_id from company_members cm
      join profiles p on p.id = cm.profile_id
      where p.user_id = auth.uid() and cm.role = 'admin'
    )
  );

-- ─── 2. Last-admin guard trigger ────────────────────────────────────────────

create or replace function prevent_last_admin_removal()
returns trigger language plpgsql as $$
begin
  if (
    select count(*) from company_members
    where company_id = OLD.company_id and role = 'admin'
  ) = 1 then
    raise exception 'Cannot remove the last admin of a company';
  end if;
  return OLD;
end;
$$;

create trigger company_members_last_admin_guard
before delete on company_members
for each row execute function prevent_last_admin_removal();

-- ─── 3. Backfill existing companies → seed creator as admin ─────────────────
-- Runs as postgres superuser (bypasses RLS) so the insert policy
-- doesn't block it before any rows exist.

insert into company_members (company_id, profile_id, role)
select c.id, p.id, 'admin'
from companies c
join profiles p on p.user_id = c.user_id
on conflict do nothing;

-- ─── 4. Update companies RLS: owner → any admin ─────────────────────────────

drop policy if exists "Creator can update company" on companies;
drop policy if exists "Creator can delete company" on companies;

create policy "Admin can update company" on companies for update
  using (id in (
    select cm.company_id from company_members cm
    join profiles p on p.id = cm.profile_id
    where p.user_id = auth.uid() and cm.role = 'admin'
  ));

create policy "Admin can delete company" on companies for delete
  using (id in (
    select cm.company_id from company_members cm
    join profiles p on p.id = cm.profile_id
    where p.user_id = auth.uid() and cm.role = 'admin'
  ));

-- ─── 5. Update job_listings RLS: owner → any admin ──────────────────────────

drop policy if exists "Company owners can manage job listings" on job_listings;

create policy "Company admins can manage job listings" on job_listings for all
  using (company_id in (
    select cm.company_id from company_members cm
    join profiles p on p.id = cm.profile_id
    where p.user_id = auth.uid() and cm.role = 'admin'
  ))
  with check (company_id in (
    select cm.company_id from company_members cm
    join profiles p on p.id = cm.profile_id
    where p.user_id = auth.uid() and cm.role = 'admin'
  ));
