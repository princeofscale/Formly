-- Rows the 1.1.0 schema allowed, seeded before the newer migrations run.
--
-- The point is not coverage of the data model. It is the specific shapes that
-- a later migration turns into an error: duplicates that a unique index was
-- added over without first removing them. A clean database can never surface
-- those, which is why the clean-apply job passes while a real upgrade might
-- not.

begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'legacy-one@example.test', '',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'legacy-two@example.test', '',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
  )
on conflict (id) do nothing;

-- A trigger may already have created these.
insert into public.profiles (id)
values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- Repeating onboarding produced templates sharing a name, which nothing
-- forbade until 20260726146000 added a unique index over (user_id, name)
-- without removing the duplicates first. The same shape follows for
-- progress_photos.storage_path in 20260726145000, from a retried upload.
--
-- Both are attempted rather than asserted. The baseline this job upgrades from
-- is the newest release, so as releases move forward a baseline eventually
-- already carries the constraint and the duplicate simply cannot be created.
-- That is the defect ageing out of the supported upgrade path, not the seed
-- failing, and the run should say so rather than stop.
do $$
begin
  insert into public.workout_templates (user_id, name, exercises)
  values
    ('11111111-1111-1111-1111-111111111111', 'Push A', '[]'::jsonb),
    ('11111111-1111-1111-1111-111111111111', 'Push A', '[]'::jsonb);
  raise notice 'seeded duplicate template names';
exception when unique_violation then
  raise notice 'baseline already forbids duplicate template names; nothing to seed';
end;
$$;

do $$
begin
  insert into public.progress_photos (user_id, storage_path, taken_at)
  values
    ('11111111-1111-1111-1111-111111111111', 'photos/legacy-duplicate.jpg', now()),
    ('11111111-1111-1111-1111-111111111111', 'photos/legacy-duplicate.jpg', now());
  raise notice 'seeded duplicate photo storage paths';
exception when unique_violation then
  raise notice 'baseline already forbids duplicate storage paths; nothing to seed';
end;
$$;

-- One template that is always legal, so the table is not empty either way.
insert into public.workout_templates (user_id, name, exercises)
values ('22222222-2222-2222-2222-222222222222', 'Push A', '[]'::jsonb);

-- An ordinary finished workout, so the later RPCs and aggregate reads have
-- something real to touch rather than only empty tables.
insert into public.workout_sessions (id, user_id, started_at, finished_at, total_volume_kg)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  now() - interval '2 hours', now() - interval '1 hour', 4200
);

commit;
