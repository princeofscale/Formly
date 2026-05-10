-- Enums
create type muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'forearms', 'core', 'quads', 'hamstrings', 'glutes',
  'calves', 'traps', 'lats', 'rear_delts', 'front_delts', 'side_delts'
);

create type equipment_type as enum (
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'
);

create type training_location as enum ('gym', 'home', 'both');

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  weight_kg float,
  height_cm float,
  body_fat_pct float,
  age int check (age > 0 and age < 120),
  training_since date,
  training_location training_location,
  training_schedule int[] default '{}',
  created_at timestamptz not null default now()
);

-- Exercises (global library + custom)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  primary_muscle muscle_group not null,
  secondary_muscles muscle_group[] not null default '{}',
  mechanic text not null check (mechanic in ('compound', 'isolation')),
  equipment equipment_type not null,
  is_custom boolean not null default false,
  created_by uuid references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Workout sessions
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text,
  mood_score int check (mood_score >= 1 and mood_score <= 5),
  total_volume_kg float not null default 0,
  created_at timestamptz not null default now()
);

-- Set entries (user_id denormalized for index-friendly analytics queries)
create table set_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  set_number int not null check (set_number > 0),
  weight_kg float not null check (weight_kg >= 0),
  reps int not null check (reps > 0),
  rpe float check (rpe >= 1 and rpe <= 10),
  calculated_1rm float,
  rest_seconds int check (rest_seconds >= 0),
  created_at timestamptz not null default now()
);

-- Indexes
create index set_entries_user_exercise_date
  on set_entries(user_id, exercise_id, created_at desc);

create index workout_sessions_user_date
  on workout_sessions(user_id, started_at desc);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
