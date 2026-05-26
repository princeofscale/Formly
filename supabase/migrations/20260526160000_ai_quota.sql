-- Per-user-per-day call counter for paid AI features. Prevents one
-- runaway client from burning through the Mistral free tier (1 req/sec
-- soft, 500k tokens/min, etc) and silently degrading service for others.
create table if not exists public.ai_call_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, kind, day)
);

-- Index for the "find old rows to prune" cron we might run later.
create index if not exists ai_call_log_day_idx on public.ai_call_log (day);
