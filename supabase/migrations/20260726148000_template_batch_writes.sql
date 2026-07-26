begin;

create or replace function public.get_last_weights_for_exercises(p_exercise_ids uuid[])
returns table(exercise_id uuid, weight_kg double precision)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select distinct on (se.exercise_id) se.exercise_id, se.weight_kg
  from public.set_entries se
  where se.user_id = auth.uid()
    and se.exercise_id = any(p_exercise_ids[1:100])
    and se.weight_kg > 0
  order by se.exercise_id, se.created_at desc;
$$;

create or replace function public.save_workout_templates(p_templates jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_saved integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_templates) <> 'array' or jsonb_array_length(p_templates) > 7 then
    raise exception 'Invalid templates';
  end if;

  with saved as (
    insert into public.workout_templates (user_id, name, exercises)
    select v_user_id, btrim(template.name), template.exercises
    from jsonb_to_recordset(p_templates) as template(name text, exercises jsonb)
    where char_length(btrim(template.name)) between 1 and 100
      and jsonb_typeof(template.exercises) = 'array'
    on conflict (user_id, name) do update set exercises = excluded.exercises
    returning 1
  )
  select count(*)::integer into v_saved from saved;

  return coalesce(v_saved, 0);
end;
$$;

revoke all on function public.get_last_weights_for_exercises(uuid[]) from public, anon;
revoke all on function public.save_workout_templates(jsonb) from public, anon;
grant execute on function public.get_last_weights_for_exercises(uuid[]) to authenticated;
grant execute on function public.save_workout_templates(jsonb) to authenticated;

commit;
