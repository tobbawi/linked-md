-- Write policies: authenticated users can manage their own profiles and posts

-- Profiles: owner can insert/update/delete
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = user_id);

create policy "Users can delete own profile" on profiles
  for delete using (auth.uid() = user_id);

-- Posts: owner can insert/update/delete (via profile ownership)
create policy "Users can insert own posts" on posts
  for insert with check (
    exists (
      select 1 from profiles where id = profile_id and user_id = auth.uid()
    )
  );

create policy "Users can update own posts" on posts
  for update using (
    exists (
      select 1 from profiles where id = profile_id and user_id = auth.uid()
    )
  );

create policy "Users can delete own posts" on posts
  for delete using (
    exists (
      select 1 from profiles where id = profile_id and user_id = auth.uid()
    )
  );
