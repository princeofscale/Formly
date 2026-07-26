-- Lets a background job spend an athlete's AI quota on their behalf.
--
-- `push_hook` has been a declared quota kind since the quota was hardened, and
-- nothing has ever consumed it. Not an oversight in the caller: consume_ai_quota
-- reads auth.uid(), and the reminder sweep runs as service_role with no user
-- context, so there was no way to charge the right person. The AI call in that
-- sweep therefore ran unmetered, once per eligible athlete per run, outside
-- every limit the quota exists to impose.
--
-- The accounting is the same as consume_ai_quota's, with the athlete named
-- rather than inferred. Access is service_role only: an authenticated caller
-- reaching this could spend somebody else's allowance.

begin;

create or replace function public.consume_ai_quota_for(p_user_id uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_count integer;
begin
  if p_user_id is null then
    raise exception 'User is required';
  end if;

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

  if v_limit is null then
    raise exception 'Invalid AI quota kind';
  end if;

  -- The conditional DO UPDATE is what makes this atomic: two sweeps racing
  -- cannot both see room under the limit, because only one update lands.
  insert into public.ai_call_log (user_id, kind, day, count)
  values (p_user_id, p_kind, current_date, 1)
  on conflict (user_id, kind, day) do update
    set count = public.ai_call_log.count + 1
    where public.ai_call_log.count < v_limit
  returning count into v_count;

  if v_count is null then
    select count into v_count
    from public.ai_call_log
    where user_id = p_user_id
      and kind = p_kind
      and day = current_date;

    return jsonb_build_object('allowed', false, 'count', v_count, 'limit', v_limit);
  end if;

  return jsonb_build_object('allowed', true, 'count', v_count, 'limit', v_limit);
end;
$$;

revoke all on function public.consume_ai_quota_for(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_ai_quota_for(uuid, text) to service_role;

commit;
