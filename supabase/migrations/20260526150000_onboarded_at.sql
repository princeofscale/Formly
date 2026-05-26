-- Single source of truth for "has the user been through onboarding".
-- Previously the (app) layout used `!weight_kg && !height_cm`, which
-- (a) couldn't distinguish "finished onboarding" from "skipped" and
-- (b) didn't apply to the new wizard at all, leaving the old modal as
-- the de-facto onboarding for fresh sign-ups.
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- Backfill: anyone who already has training_location set (i.e. has
-- been through the wizard's finish flow) or has weight/height (the
-- old modal) is considered onboarded.
update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
where
  onboarded_at is null
  and (
    training_location is not null
    or weight_kg is not null
    or height_cm is not null
  );
