-- Auto-close stale workout_sessions left open by the user (closed tab mid-set,
-- forgot to tap Finish, etc.). Cron calls this every hour.
--
-- "Stale" = session started > p_idle_hours ago AND either has no sets OR the
-- most recent set is also older than p_idle_hours. Real "I'm just resting"
-- breaks rarely cross 3 hours; the default 4h leaves headroom and still
-- protects against the user_who_left_session_open_for_16_hours case that
-- triggered this feature.
--
-- finished_at is set to the *last set's timestamp* (or started_at if no sets
-- were logged) so duration analytics show the real workout length, not the
-- gap until the cron noticed.

create or replace function auto_finish_stale_sessions(p_idle_hours int default 4)
returns table (
  session_id uuid,
  user_id uuid,
  duration_minutes int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - (p_idle_hours || ' hours')::interval;
begin
  return query
  with stale as (
    select
      ws.id,
      ws.user_id,
      ws.started_at,
      coalesce(
        (select max(se.created_at) from set_entries se where se.session_id = ws.id),
        ws.started_at
      ) as last_activity
    from workout_sessions ws
    where ws.finished_at is null
      and ws.started_at < cutoff
  ),
  to_finish as (
    select * from stale where last_activity < cutoff
  ),
  updated as (
    update workout_sessions ws
    set finished_at = tf.last_activity,
        total_volume_kg = coalesce(
          (select sum(se.weight_kg * se.reps) from set_entries se
           where se.session_id = ws.id and se.is_warmup = false),
          0
        )
    from to_finish tf
    where ws.id = tf.id
    returning ws.id, ws.user_id, ws.started_at, ws.finished_at
  )
  select
    u.id as session_id,
    u.user_id,
    (extract(epoch from (u.finished_at - u.started_at)) / 60)::int as duration_minutes
  from updated u;
end;
$$;

-- Only the service role (cron) can call this. Authenticated users have no
-- business auto-finishing arbitrary sessions.
revoke all on function auto_finish_stale_sessions(int) from public, authenticated;
grant execute on function auto_finish_stale_sessions(int) to service_role;
