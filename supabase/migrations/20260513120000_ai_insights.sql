-- AI insights cache: one row per user per day
create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  content jsonb not null,
  generated_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table ai_insights enable row level security;

create policy "users see own insights"
  on ai_insights
  for all
  using (auth.uid() = user_id);

create index ai_insights_user_date on ai_insights(user_id, date desc);
