begin;

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
    (plan.value ->> 'weight_kg')::numeric,
    (plan.value ->> 'reps')::integer,
    null,
    true
  from jsonb_array_elements(p_sets) with ordinality as plan(value, ordinality)
  where (plan.value ->> 'weight_kg')::numeric between 0 and 1000
    and (plan.value ->> 'reps')::integer between 1 and 100
  order by plan.ordinality
  returning *;
end;
$$;

create or replace function public.ensure_friend_code()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  code text;
  attempts integer := 0;
begin
  if uid is null then return null; end if;
  select friend_code into code from public.profiles where id = uid;
  if code is not null then return code; end if;

  loop
    attempts := attempts + 1;
    code := upper(translate(
      substring(md5(random()::text || clock_timestamp()::text), 1, 6),
      '0Oo1Il',
      'XYZWQR'
    ));
    begin
      update public.profiles set friend_code = code where id = uid;
      return code;
    exception when unique_violation then
      if attempts > 8 then raise; end if;
    end;
  end loop;

  return null;
end;
$$;

revoke all on function public.add_warmup_sets(uuid, uuid, integer, jsonb) from public, anon;
revoke all on function public.ensure_friend_code() from public, anon;
grant execute on function public.add_warmup_sets(uuid, uuid, integer, jsonb) to authenticated;
grant execute on function public.ensure_friend_code() to authenticated;

commit;
