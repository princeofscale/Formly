-- Cleanup a real 1.1.0 → current upgrade requires before the migrations run.
--
-- Two migrations create a unique index over data that was not unique until
-- they existed, and neither removes the duplicates first:
--
--   20260726145000  progress_photos_storage_path_uniq
--   20260726146000  workout_templates_user_name_uniq
--
-- Production survived both by happening to hold no duplicates. Any other
-- database — a restored backup, a second environment, a fork — will stop the
-- deployment at `create unique index`.
--
-- The honest fix is to put this cleanup inside those migrations, which cannot
-- be done: they are already applied, and the repository rules forbid editing
-- an applied migration. So the requirement lives here instead, executable and
-- named, and the upgrade job runs it the way an operator would have to.
--
-- Anything added here is a defect being documented, not a step being
-- normalised. A new migration must clean up before it constrains.

begin;

-- Keep the oldest template per (user_id, name); the rest are re-runs of
-- onboarding rather than anything the athlete built separately.
delete from public.workout_templates duplicate
using public.workout_templates keeper
where duplicate.user_id = keeper.user_id
  and duplicate.name = keeper.name
  and (keeper.created_at, keeper.id) < (duplicate.created_at, duplicate.id);

-- Keep the oldest row per storage_path: they address one object in storage,
-- so the later rows are retries of the same upload.
delete from public.progress_photos duplicate
using public.progress_photos keeper
where duplicate.storage_path = keeper.storage_path
  and (keeper.created_at, keeper.id) < (duplicate.created_at, duplicate.id);

commit;
