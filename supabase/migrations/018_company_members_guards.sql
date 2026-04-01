-- Migration 018: Company Members Guard Hardening
-- Fixes two race conditions in the company_members guards:
-- 1. Last-admin TOCTOU: add advisory lock so concurrent DELETEs serialize.
-- 2. Owner removal: add DB-level trigger to block removing the original company creator.

-- ─── 1. Harden last-admin guard with advisory lock ───────────────────────────
-- The original trigger counted rows without locking, allowing two concurrent
-- DELETEs to both see count=2 and both proceed, emptying company_members.
-- pg_advisory_xact_lock serializes all concurrent last-admin checks per company.

create or replace function prevent_last_admin_removal()
returns trigger language plpgsql as $$
declare
  remaining_count integer;
begin
  -- Acquire a transaction-level advisory lock keyed by company_id to serialize
  -- concurrent last-admin checks for the same company.
  perform pg_advisory_xact_lock(('x' || left(OLD.company_id::text, 15))::bit(64)::bigint);

  select count(*) into remaining_count
  from company_members
  where company_id = OLD.company_id and role = 'admin';

  if remaining_count = 1 then
    raise exception 'Cannot remove the last admin of a company';
  end if;
  return OLD;
end;
$$;

-- ─── 2. Owner removal guard trigger ─────────────────────────────────────────
-- The API route blocks removal of the original company creator in app code,
-- but a direct SQL call (service role) could bypass it. Add a DB-level guard.

create or replace function prevent_owner_removal()
returns trigger language plpgsql as $$
begin
  if OLD.profile_id = (
    select p.id from profiles p
    join companies c on c.user_id = p.user_id
    where c.id = OLD.company_id
    limit 1
  ) then
    raise exception 'Cannot remove the company owner from admins';
  end if;
  return OLD;
end;
$$;

create trigger company_members_owner_guard
before delete on company_members
for each row execute function prevent_owner_removal();
