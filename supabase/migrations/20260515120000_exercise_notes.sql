-- Per-user notes per exercise (e.g. form cues, personal observations)
create table exercise_notes (
  user_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  note text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table exercise_notes enable row level security;

create policy "users manage own exercise notes"
  on exercise_notes
  for all
  using (auth.uid() = user_id);
