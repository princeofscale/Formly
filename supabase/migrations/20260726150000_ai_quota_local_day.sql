begin;

create or replace function public.consume_ai_quota(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_count integer;
  v_day date;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  v_limit := case p_kind
    when 'exercise_swap' then 30
    when 'exercise_suggest' then 30
    when 'program_generation' then 8
    when 'session_debrief' then 10
    when 'push_hook' then 5
    when 'insights_refresh' then 6
    when 'coach_chat' then 20
    else null
  end;
  if v_limit is null then raise exception 'Invalid AI quota kind'; end if;

  select (now() at time zone time_zone)::date
  into v_day
  from public.profiles
  where id = v_user_id;

  insert into public.ai_call_log (user_id, kind, day, count)
  values (v_user_id, p_kind, v_day, 1)
  on conflict (user_id, kind, day) do update
    set count = public.ai_call_log.count + 1
    where public.ai_call_log.count < v_limit
  returning count into v_count;

  if v_count is null then
    select count into v_count
    from public.ai_call_log
    where user_id = v_user_id and kind = p_kind and day = v_day;
    return jsonb_build_object('allowed', false, 'count', v_count, 'limit', v_limit);
  end if;

  return jsonb_build_object('allowed', true, 'count', v_count, 'limit', v_limit);
end;
$$;

revoke all on function public.consume_ai_quota(text) from public, anon;
grant execute on function public.consume_ai_quota(text) to authenticated;

commit;
