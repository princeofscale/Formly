create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  exercises jsonb not null default '[]',
  created_at timestamptz default now()
);

alter table workout_templates enable row level security;

create policy "users manage own templates"
  on workout_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
