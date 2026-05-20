-- Body measurements: one entry per user per date, wide schema so a single
-- "measurement session" lives in one row. All metrics nullable — user fills
-- in only what they tracked that day.

create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 1) check (weight_kg > 0 and weight_kg < 500),
  body_fat_pct numeric(4, 1) check (body_fat_pct >= 0 and body_fat_pct <= 100),
  waist_cm numeric(5, 1) check (waist_cm > 0 and waist_cm < 300),
  chest_cm numeric(5, 1) check (chest_cm > 0 and chest_cm < 300),
  hips_cm numeric(5, 1) check (hips_cm > 0 and hips_cm < 300),
  biceps_cm numeric(5, 1) check (biceps_cm > 0 and biceps_cm < 100),
  thigh_cm numeric(5, 1) check (thigh_cm > 0 and thigh_cm < 200),
  calf_cm numeric(5, 1) check (calf_cm > 0 and calf_cm < 100),
  neck_cm numeric(5, 1) check (neck_cm > 0 and neck_cm < 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index body_measurements_user_date on body_measurements(user_id, date desc);

alter table body_measurements enable row level security;

create policy "Users can view own measurements"
  on body_measurements for select using (auth.uid() = user_id);
create policy "Users can insert own measurements"
  on body_measurements for insert with check (auth.uid() = user_id);
create policy "Users can update own measurements"
  on body_measurements for update using (auth.uid() = user_id);
create policy "Users can delete own measurements"
  on body_measurements for delete using (auth.uid() = user_id);

create or replace function set_body_measurements_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger body_measurements_updated_at
  before update on body_measurements
  for each row execute function set_body_measurements_updated_at();
