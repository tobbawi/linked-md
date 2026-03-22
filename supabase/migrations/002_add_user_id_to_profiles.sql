-- Add user_id column to profiles table
alter table profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Ensure one profile per user
create unique index if not exists profiles_user_id_unique on profiles(user_id);

-- Index for fast lookups by user
create index if not exists profiles_user_id_idx on profiles(user_id);
