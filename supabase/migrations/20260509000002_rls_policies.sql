alter table profiles enable row level security;
alter table exercises enable row level security;
alter table workout_sessions enable row level security;
alter table set_entries enable row level security;

-- Profiles
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Exercises: global readable by all authenticated; custom only by creator
create policy "Authenticated users can view exercises"
  on exercises for select
  using (auth.role() = 'authenticated' and (is_custom = false or created_by = auth.uid()));
create policy "Users can create custom exercises"
  on exercises for insert
  with check (auth.uid() = created_by and is_custom = true);
create policy "Users can update own custom exercises"
  on exercises for update
  using (auth.uid() = created_by and is_custom = true);
create policy "Users can delete own custom exercises"
  on exercises for delete
  using (auth.uid() = created_by and is_custom = true);

-- Workout sessions
create policy "Users can view own sessions"
  on workout_sessions for select using (auth.uid() = user_id);
create policy "Users can create sessions"
  on workout_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on workout_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions"
  on workout_sessions for delete using (auth.uid() = user_id);

-- Set entries
create policy "Users can view own sets"
  on set_entries for select using (auth.uid() = user_id);
create policy "Users can create sets in own sessions"
  on set_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own sets"
  on set_entries for update using (auth.uid() = user_id);
create policy "Users can delete own sets"
  on set_entries for delete using (auth.uid() = user_id);
