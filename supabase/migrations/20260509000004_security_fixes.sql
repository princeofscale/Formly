-- DM-01: Fix SECURITY DEFINER trigger missing search_path lock
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer
   set search_path = public, pg_temp;

-- DM-02: Fix set_entries INSERT to verify session belongs to same user
drop policy "Users can create sets in own sessions" on set_entries;
create policy "Users can create sets in own sessions"
  on set_entries for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from workout_sessions ws
      where ws.id = session_id
        and ws.user_id = auth.uid()
    )
  );

-- DM-03: Fix UPDATE policies missing WITH CHECK clause
drop policy "Users can update own sets" on set_entries;
create policy "Users can update own sets"
  on set_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy "Users can update own sessions" on workout_sessions;
create policy "Users can update own sessions"
  on workout_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DM-04: Add profile delete policy for account deletion
create policy "Users can delete own profile"
  on profiles for delete using (auth.uid() = id);

-- DM-06: Add missing index on set_entries(session_id)
create index if not exists set_entries_session_id on set_entries(session_id);

-- DM-07: Remove ambiguous 'shoulders' enum value
-- Rename old type, create new one without 'shoulders', migrate columns, drop old type
alter type muscle_group rename to muscle_group_old;
create type muscle_group as enum (
  'chest', 'back', 'biceps', 'triceps',
  'forearms', 'core', 'quads', 'hamstrings', 'glutes',
  'calves', 'traps', 'lats', 'rear_delts', 'front_delts', 'side_delts'
);
-- Drop the array default before altering type (Postgres cannot auto-cast defaults)
alter table exercises alter column secondary_muscles drop default;
alter table exercises
  alter column primary_muscle type muscle_group using primary_muscle::text::muscle_group,
  alter column secondary_muscles type muscle_group[] using secondary_muscles::text[]::muscle_group[];
-- Restore the default using the new type
alter table exercises alter column secondary_muscles set default '{}'::muscle_group[];
drop type muscle_group_old;
