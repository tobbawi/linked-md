-- M4: Profile enrichment — title, location, website
alter table profiles
  add column if not exists title    text,
  add column if not exists location text,
  add column if not exists website  text;
