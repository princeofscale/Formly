-- Progress photos: stored in Supabase Storage bucket `progress-photos`,
-- metadata kept in a table for sortable date + caption + body weight at the time.

create table progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz not null default now(),
  weight_kg numeric(5, 1),
  caption text,
  created_at timestamptz not null default now()
);

create index progress_photos_user_date on progress_photos(user_id, taken_at desc);

alter table progress_photos enable row level security;

create policy "Users can view own progress photos"
  on progress_photos for select using (auth.uid() = user_id);
create policy "Users can insert own progress photos"
  on progress_photos for insert with check (auth.uid() = user_id);
create policy "Users can update own progress photos"
  on progress_photos for update using (auth.uid() = user_id);
create policy "Users can delete own progress photos"
  on progress_photos for delete using (auth.uid() = user_id);

-- Storage bucket (private, accessed via signed URLs from the server).
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Storage RLS policies: files are stored under <user_id>/<filename>.
-- Each user can only access their own folder.

create policy "Users can read own progress photos"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can upload own progress photos"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own progress photos"
  on storage.objects for update
  using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own progress photos"
  on storage.objects for delete
  using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
