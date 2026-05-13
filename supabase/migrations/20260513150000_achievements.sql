-- Achievements unlocked per user
create table achievements (
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table achievements enable row level security;

create policy "users see own achievements"
  on achievements
  for all
  using (auth.uid() = user_id);
