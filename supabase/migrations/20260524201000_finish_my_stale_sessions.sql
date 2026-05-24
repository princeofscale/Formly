-- Client-callable companion to auto_finish_stale_sessions. Same logic, but
-- scoped to the caller via auth.uid() so it's safe to grant to authenticated.
-- Dashboard calls this on every load so an abandoned session is closed by
-- the time the user sees the page — no waiting for the daily cron.

create or replace function finish_my_stale_sessions(p_idle_hours int default 4)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - (p_idle_hours || ' hours')::interval;
  my_id uuid := auth.uid();
  closed_count int;
begin
  if my_id is null then return 0; end if;

  with stale as (
    select
      ws.id,
      coalesce(
        (select max(se.created_at) from set_entries se where se.session_id = ws.id),
        ws.started_at
      ) as last_activity
    from workout_sessions ws
    where ws.user_id = my_id
      and ws.finished_at is null
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
    returning 1
  )
  select count(*)::int into closed_count from updated;

  return coalesce(closed_count, 0);
end;
$$;

grant execute on function finish_my_stale_sessions(int) to authenticated;
