-- M2: Social layer — follows, reactions, comments, notifications

-- ── Follows ──────────────────────────────────────────────────────────────────

create table if not exists follows (
  id          uuid primary key default gen_random_uuid(),
  follower_id uuid references profiles(id) on delete cascade not null,
  followee_id uuid references profiles(id) on delete cascade not null,
  created_at  timestamptz default now() not null,
  unique (follower_id, followee_id)
);

create index if not exists follows_follower_idx on follows(follower_id);
create index if not exists follows_followee_idx on follows(followee_id);

alter table follows enable row level security;

create policy "Anyone can view follows"
  on follows for select using (true);

create policy "Auth users can follow"
  on follows for insert
  with check (follower_id in (select id from profiles where user_id = auth.uid()));

create policy "Auth users can unfollow"
  on follows for delete
  using (follower_id in (select id from profiles where user_id = auth.uid()));

-- ── Reactions (likes on posts) ───────────────────────────────────────────────

create table if not exists reactions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade not null,
  post_id    uuid references posts(id) on delete cascade not null,
  type       text not null default 'like',
  created_at timestamptz default now() not null,
  unique (profile_id, post_id, type)
);

create index if not exists reactions_post_idx on reactions(post_id);

alter table reactions enable row level security;

create policy "Anyone can view reactions"
  on reactions for select using (true);

create policy "Auth users can react"
  on reactions for insert
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "Auth users can unreact"
  on reactions for delete
  using (profile_id in (select id from profiles where user_id = auth.uid()));

-- ── Comments ─────────────────────────────────────────────────────────────────

create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references posts(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  body       text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists comments_post_idx on comments(post_id);

alter table comments enable row level security;

create policy "Anyone can view comments"
  on comments for select using (true);

create policy "Auth users can comment"
  on comments for insert
  with check (profile_id in (select id from profiles where user_id = auth.uid()));

create policy "Authors can delete own comments"
  on comments for delete
  using (profile_id in (select id from profiles where user_id = auth.uid()));

-- ── Notifications ─────────────────────────────────────────────────────────────

create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid references profiles(id) on delete cascade not null,
  type         text not null, -- 'follow' | 'like' | 'comment'
  actor_id     uuid references profiles(id) on delete cascade,
  post_id      uuid references posts(id) on delete cascade,
  comment_id   uuid references comments(id) on delete cascade,
  read         boolean default false not null,
  created_at   timestamptz default now() not null
);

create index if not exists notifications_recipient_idx on notifications(recipient_id, read, created_at desc);

alter table notifications enable row level security;

create policy "Owner can view notifications"
  on notifications for select
  using (recipient_id in (select id from profiles where user_id = auth.uid()));

create policy "Owner can mark read"
  on notifications for update
  using (recipient_id in (select id from profiles where user_id = auth.uid()));

-- Service role can insert notifications (triggered from API routes using service key)
create policy "Service role can insert notifications"
  on notifications for insert
  with check (true);
