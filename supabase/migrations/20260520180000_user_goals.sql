-- User-defined strength goals: target estimated 1RM for a specific exercise
-- by an optional date. The starting_e1rm snapshot is captured at creation so
-- progress is measured from where the user actually was, not from zero.

create table user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  target_e1rm numeric(6, 1) not null check (target_e1rm > 0 and target_e1rm < 1000),
  target_date date,
  starting_e1rm numeric(6, 1) not null default 0,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create index user_goals_user_id on user_goals(user_id, created_at desc);

alter table user_goals enable row level security;

create policy "Users can view own goals"
  on user_goals for select using (auth.uid() = user_id);
create policy "Users can insert own goals"
  on user_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals"
  on user_goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals"
  on user_goals for delete using (auth.uid() = user_id);
