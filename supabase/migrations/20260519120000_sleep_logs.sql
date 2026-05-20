-- Sleep tracking: one log per user per calendar date.
create table sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  hours numeric(3, 1) not null check (hours > 0 and hours <= 24),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index sleep_logs_user_date on sleep_logs(user_id, date desc);

alter table sleep_logs enable row level security;

create policy "Users can view own sleep logs"
  on sleep_logs for select using (auth.uid() = user_id);
create policy "Users can insert own sleep logs"
  on sleep_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own sleep logs"
  on sleep_logs for update using (auth.uid() = user_id);
create policy "Users can delete own sleep logs"
  on sleep_logs for delete using (auth.uid() = user_id);

create or replace function set_sleep_logs_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger sleep_logs_updated_at
  before update on sleep_logs
  for each row execute function set_sleep_logs_updated_at();
