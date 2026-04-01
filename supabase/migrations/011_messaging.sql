-- Migration 011: Direct Messaging
-- Conversations (2-member for MVP), messages, RLS.
-- Critical: messages are only readable by conversation members.

create table conversations (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  primary key (conversation_id, profile_id)
);

create index conversation_members_profile_id on conversation_members(profile_id);

create table messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references conversations(id) on delete cascade,
  sender_id       uuid        not null references profiles(id) on delete cascade,
  body            text        not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index messages_conversation_id_created on messages(conversation_id, created_at);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;

-- conversations: auth users can create; members can read theirs
create policy "Auth users can create conversations"
  on conversations for insert
  with check (true);

create policy "Members can read their conversations"
  on conversations for select
  using (
    id in (
      select conversation_id from conversation_members
      where profile_id in (select id from profiles where user_id = auth.uid())
    )
  );

-- conversation_members: members can read; users can add themselves
create policy "Members can read conversation members"
  on conversation_members for select
  using (
    conversation_id in (
      select conversation_id from conversation_members
      where profile_id in (select id from profiles where user_id = auth.uid())
    )
  );

create policy "Users can join conversations"
  on conversation_members for insert
  with check (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

-- messages: only members can read/write; sender must be themselves
create policy "Members can read messages"
  on messages for select
  using (
    conversation_id in (
      select conversation_id from conversation_members
      where profile_id in (select id from profiles where user_id = auth.uid())
    )
  );

create policy "Members can send messages"
  on messages for insert
  with check (
    conversation_id in (
      select conversation_id from conversation_members
      where profile_id in (select id from profiles where user_id = auth.uid())
    )
    and
    sender_id in (select id from profiles where user_id = auth.uid())
  );

-- Mark read_at (only sender or recipient can update)
create policy "Members can mark messages read"
  on messages for update
  using (
    conversation_id in (
      select conversation_id from conversation_members
      where profile_id in (select id from profiles where user_id = auth.uid())
    )
  );
