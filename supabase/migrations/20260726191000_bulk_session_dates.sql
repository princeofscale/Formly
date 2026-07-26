-- Reads finished-session dates for many athletes in one round trip.
--
-- The daily sweep calls the single-athlete version once per recipient, so the
-- cost of an hourly run grows with the number of accounts rather than with the
-- number of people actually due a reminder. At a few dozen athletes that is
-- invisible; it is also the shape that stops being invisible without anything
-- else changing.
--
-- service_role only. This answers for arbitrary athletes at once, which is
-- exactly what an ordinary session must never be able to ask.

begin;

create or replace function public.get_finished_session_dates_bulk(p_user_ids uuid[])
returns table(user_id uuid, date text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    ws.user_id,
    ((ws.started_at at time zone profile.time_zone)::date)::text as date
  from public.workout_sessions ws
  join public.profiles profile on profile.id = ws.user_id
  where ws.user_id = any(p_user_ids)
    and ws.finished_at is not null
    and coalesce(auth.jwt() ->> 'role', '') = 'service_role'
  group by ws.user_id, ((ws.started_at at time zone profile.time_zone)::date)
  order by ws.user_id, date desc;
$$;

revoke all on function public.get_finished_session_dates_bulk(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_finished_session_dates_bulk(uuid[]) to service_role;

commit;
