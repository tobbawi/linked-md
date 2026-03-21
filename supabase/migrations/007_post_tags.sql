-- M6: Post tags
alter table posts
  add column if not exists tags text[] not null default '{}';
