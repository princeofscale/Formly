-- Extend get_friends_with_stats to include is_in_gym — true when the friend
-- currently has an unfinished workout_session started within the last 6 hours.
-- Six-hour cap filters out stale "forgot to finish" sessions (real bug we hit
-- with the rest-timer desync before).

drop function if exists get_friends_with_stats(int);

create or replace function get_friends_with_stats(p_days int default 7)
returns table (
  friend_id uuid,
  friend_code text,
  total_sessions int,
  week_sessions int,
  week_tonnage_kg numeric,
  last_workout_at timestamptz,
  best_e1rm numeric,
  is_in_gym boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as id),
  friend_ids as (
    select case when f.user_a = me.id then f.user_b else f.user_a end as id
    from friendships f, me
    where f.user_a = me.id or f.user_b = me.id
  ),
  cutoff as (select (now() - (p_days || ' days')::interval) as ts)
  select
    fi.id as friend_id,
    p.friend_code,
    (select count(*) from workout_sessions ws
       where ws.user_id = fi.id and ws.finished_at is not null
       and (ws.session_type is null or ws.session_type != 'cardio'))::int as total_sessions,
    (select count(*) from workout_sessions ws, cutoff c
       where ws.user_id = fi.id and ws.finished_at is not null
       and (ws.session_type is null or ws.session_type != 'cardio')
       and ws.started_at >= c.ts)::int as week_sessions,
    (select coalesce(sum(ws.total_volume_kg), 0) from workout_sessions ws, cutoff c
       where ws.user_id = fi.id and ws.finished_at is not null
       and (ws.session_type is null or ws.session_type != 'cardio')
       and ws.started_at >= c.ts) as week_tonnage_kg,
    (select max(ws.started_at) from workout_sessions ws
       where ws.user_id = fi.id and ws.finished_at is not null) as last_workout_at,
    (select max(se.calculated_1rm) from set_entries se
       where se.user_id = fi.id and se.calculated_1rm is not null) as best_e1rm,
    exists(
      select 1 from workout_sessions ws
      where ws.user_id = fi.id
        and ws.finished_at is null
        and ws.started_at >= now() - interval '6 hours'
    ) as is_in_gym
  from friend_ids fi
  left join profiles p on p.id = fi.id;
$$;

grant execute on function get_friends_with_stats(int) to authenticated;
