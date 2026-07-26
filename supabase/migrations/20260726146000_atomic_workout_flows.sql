begin;

create unique index if not exists workout_templates_user_name_uniq
  on public.workout_templates (user_id, name);

create unique index if not exists activity_events_volume_uniq
  on public.activity_events (session_id)
  where type = 'volume_pr';

create or replace function public.complete_onboarding(
  p_schedule integer[],
  p_location public.training_location,
  p_templates jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if coalesce(array_length(p_schedule, 1), 0) > 7
     or exists (select 1 from unnest(coalesce(p_schedule, '{}'::integer[])) day where day not between 1 and 7)
  then
    raise exception 'Invalid training schedule';
  end if;
  if jsonb_typeof(coalesce(p_templates, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_templates, '[]'::jsonb)) > 7
  then
    raise exception 'Invalid templates';
  end if;

  update public.profiles
  set training_schedule = coalesce(p_schedule, '{}'::integer[]),
      training_location = coalesce(p_location, training_location),
      onboarded_at = now()
  where id = v_user_id;

  insert into public.workout_templates (user_id, name, exercises)
  select v_user_id, btrim(template.name), template.exercises
  from jsonb_to_recordset(coalesce(p_templates, '[]'::jsonb))
    as template(name text, exercises jsonb)
  where char_length(btrim(template.name)) between 1 and 100
    and jsonb_typeof(template.exercises) = 'array'
  on conflict (user_id, name) do update
  set exercises = excluded.exercises;
end;
$$;

create or replace function public.add_warmup_sets(
  p_session_id uuid,
  p_exercise_id uuid,
  p_starting_set_number integer,
  p_sets jsonb
)
returns setof public.set_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.workout_sessions
    where id = p_session_id and user_id = v_user_id and finished_at is null
  ) then
    raise exception 'Active workout not found';
  end if;
  if p_starting_set_number < 1
     or jsonb_typeof(p_sets) <> 'array'
     or jsonb_array_length(p_sets) not between 1 and 10
  then
    raise exception 'Invalid warm-up plan';
  end if;

  return query
  insert into public.set_entries (
    session_id,
    user_id,
    exercise_id,
    set_number,
    weight_kg,
    reps,
    calculated_1rm,
    is_warmup
  )
  select
    p_session_id,
    v_user_id,
    p_exercise_id,
    p_starting_set_number + plan.ordinality::integer - 1,
    plan.weight_kg,
    plan.reps,
    null,
    true
  from jsonb_to_recordset(p_sets) with ordinality
    as plan(weight_kg numeric, reps integer, ordinality bigint)
  where plan.weight_kg between 0 and 1000 and plan.reps between 1 and 100
  order by plan.ordinality
  returning *;
end;
$$;

create or replace function public.finish_workout(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_started_at timestamptz;
  v_finished_at timestamptz;
  v_total numeric;
  v_prior_best numeric;
  v_set_count integer;
  v_exercise_count integer;
  v_duration integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select started_at, coalesce(finished_at, now())
  into v_started_at, v_finished_at
  from public.workout_sessions
  where id = p_session_id and user_id = v_user_id
  for update;
  if v_started_at is null then raise exception 'Workout not found'; end if;

  select
    coalesce(sum(weight_kg * reps) filter (where is_warmup = false), 0),
    count(*) filter (where is_warmup = false)::integer,
    count(distinct exercise_id) filter (where is_warmup = false)::integer
  into v_total, v_set_count, v_exercise_count
  from public.set_entries
  where session_id = p_session_id and user_id = v_user_id;

  select coalesce(max(total_volume_kg), 0)
  into v_prior_best
  from public.workout_sessions
  where user_id = v_user_id
    and id <> p_session_id
    and finished_at is not null
    and coalesce(session_type, 'strength') <> 'cardio';

  update public.workout_sessions
  set finished_at = v_finished_at, total_volume_kg = v_total
  where id = p_session_id and user_id = v_user_id;

  v_duration := greatest(0, round(extract(epoch from (v_finished_at - v_started_at)) / 60));

  insert into public.activity_events (user_id, type, session_id, payload)
  values (
    v_user_id,
    'workout_finished',
    p_session_id,
    jsonb_build_object(
      'tonnage_kg', round(v_total),
      'duration_min', v_duration,
      'set_count', v_set_count,
      'exercise_count', v_exercise_count
    )
  )
  on conflict do nothing;

  if v_total > 0 and v_total > v_prior_best then
    insert into public.activity_events (user_id, type, session_id, payload)
    values (
      v_user_id,
      'volume_pr',
      p_session_id,
      jsonb_build_object('tonnage_kg', round(v_total))
    )
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'total_volume_kg', v_total,
    'set_count', v_set_count,
    'exercise_count', v_exercise_count,
    'duration_min', v_duration
  );
end;
$$;

revoke all on function public.complete_onboarding(
  integer[], public.training_location, jsonb
) from public, anon;
revoke all on function public.add_warmup_sets(uuid, uuid, integer, jsonb) from public, anon;
revoke all on function public.finish_workout(uuid) from public, anon;

grant execute on function public.complete_onboarding(
  integer[], public.training_location, jsonb
) to authenticated;
grant execute on function public.add_warmup_sets(uuid, uuid, integer, jsonb) to authenticated;
grant execute on function public.finish_workout(uuid) to authenticated;

commit;
