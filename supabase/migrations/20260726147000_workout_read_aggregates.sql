begin;

create or replace function public.get_performed_exercise_ids()
returns table(exercise_id uuid, last_performed_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select se.exercise_id, max(se.created_at) as last_performed_at
  from public.set_entries se
  where se.user_id = auth.uid()
  group by se.exercise_id
  order by last_performed_at desc;
$$;

create or replace function public.get_last_sets_for_exercises(
  p_current_session uuid,
  p_exercise_ids uuid[]
)
returns setof public.set_entries
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with latest as (
    select distinct on (se.exercise_id)
      se.exercise_id,
      se.session_id
    from public.set_entries se
    join public.workout_sessions ws on ws.id = se.session_id
    where se.user_id = auth.uid()
      and se.exercise_id = any(p_exercise_ids[1:100])
      and se.session_id <> p_current_session
      and ws.finished_at is not null
    order by se.exercise_id, se.created_at desc
  )
  select se.*
  from public.set_entries se
  join latest on latest.exercise_id = se.exercise_id and latest.session_id = se.session_id
  where se.user_id = auth.uid()
  order by se.exercise_id, se.set_number, se.created_at;
$$;

revoke all on function public.get_performed_exercise_ids() from public, anon;
revoke all on function public.get_last_sets_for_exercises(uuid, uuid[]) from public, anon;
grant execute on function public.get_performed_exercise_ids() to authenticated;
grant execute on function public.get_last_sets_for_exercises(uuid, uuid[]) to authenticated;

commit;
