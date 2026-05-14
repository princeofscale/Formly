create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  weight_kg float check (weight_kg is null or weight_kg > 0),
  chest_cm float check (chest_cm is null or chest_cm > 0),
  waist_cm float check (waist_cm is null or waist_cm > 0),
  hips_cm float check (hips_cm is null or hips_cm > 0),
  biceps_cm float check (biceps_cm is null or biceps_cm > 0),
  body_fat_pct float check (body_fat_pct is null or (body_fat_pct >= 0 and body_fat_pct <= 100)),
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table body_measurements enable row level security;

create policy "users see own measurements"
  on body_measurements
  for all
  using (auth.uid() = user_id);

create index body_measurements_user_date on body_measurements(user_id, date desc);
