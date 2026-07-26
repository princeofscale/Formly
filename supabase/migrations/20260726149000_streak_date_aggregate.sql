begin;

create or replace function public.get_finished_session_dates(p_user_id uuid)
returns table(date text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ((ws.started_at at time zone profile.time_zone)::date)::text as date
  from public.workout_sessions ws
  join public.profiles profile on profile.id = ws.user_id
  where ws.user_id = p_user_id
    and ws.finished_at is not null
    and (
      p_user_id = auth.uid()
      or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    )
  group by ((ws.started_at at time zone profile.time_zone)::date)
  order by date desc;
$$;

revoke all on function public.get_finished_session_dates(uuid) from public, anon;
grant execute on function public.get_finished_session_dates(uuid) to authenticated, service_role;

commit;
