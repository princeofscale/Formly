-- Per-user video URL overrides for exercises (YouTube links etc.)
create table user_exercise_videos (
  user_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  url text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table user_exercise_videos enable row level security;

create policy "users manage own exercise videos"
  on user_exercise_videos
  for all
  using (auth.uid() = user_id);
