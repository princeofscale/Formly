-- Human-friendly athlete names and aggregated reads for the pages that used
-- to download an entire workout history just to calculate two totals.
alter table profiles
  add column if not exists display_name text
  check (display_name is null or char_length(display_name) between 2 and 40);

create or replace function get_workout_lifetime_stats()
returns table (total_sessions int, total_tonnage_kg numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::int,
    coalesce(sum(ws.total_volume_kg), 0)::numeric
  from workout_sessions ws
  where ws.user_id = auth.uid()
    and ws.finished_at is not null;
$$;

grant execute on function get_workout_lifetime_stats() to authenticated;

-- Add names and aggregate each source table once instead of running six
-- correlated subqueries per friend.
drop function if exists get_friends_with_stats(int);

create function get_friends_with_stats(p_days int default 7)
returns table (
  friend_id uuid,
  friend_code text,
  display_name text,
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
  with friend_ids as (
    select case when f.user_a = auth.uid() then f.user_b else f.user_a end as id
    from friendships f
    where (f.user_a = auth.uid() or f.user_b = auth.uid())
      and f.status = 'accepted'
  ),
  session_stats as (
    select
      ws.user_id,
      count(*) filter (
        where ws.finished_at is not null
          and (ws.session_type is null or ws.session_type != 'cardio')
      )::int as total_sessions,
      count(*) filter (
        where ws.finished_at is not null
          and (ws.session_type is null or ws.session_type != 'cardio')
          and ws.started_at >= now() - make_interval(days => p_days)
      )::int as week_sessions,
      coalesce(sum(ws.total_volume_kg) filter (
        where ws.finished_at is not null
          and (ws.session_type is null or ws.session_type != 'cardio')
          and ws.started_at >= now() - make_interval(days => p_days)
      ), 0)::numeric as week_tonnage_kg,
      max(ws.started_at) filter (where ws.finished_at is not null) as last_workout_at,
      bool_or(
        ws.finished_at is null
        and ws.started_at >= now() - interval '6 hours'
      ) as is_in_gym
    from workout_sessions ws
    where ws.user_id in (select id from friend_ids)
    group by ws.user_id
  ),
  strength_stats as (
    select se.user_id, max(se.calculated_1rm)::numeric as best_e1rm
    from set_entries se
    where se.user_id in (select id from friend_ids)
      and se.calculated_1rm is not null
    group by se.user_id
  )
  select
    fi.id,
    p.friend_code,
    p.display_name,
    coalesce(ss.total_sessions, 0),
    coalesce(ss.week_sessions, 0),
    coalesce(ss.week_tonnage_kg, 0),
    ss.last_workout_at,
    st.best_e1rm,
    coalesce(ss.is_in_gym, false)
  from friend_ids fi
  join profiles p on p.id = fi.id
  left join session_stats ss on ss.user_id = fi.id
  left join strength_stats st on st.user_id = fi.id;
$$;

grant execute on function get_friends_with_stats(int) to authenticated;

drop function if exists get_pending_friend_requests();

create function get_pending_friend_requests()
returns table (
  friendship_id uuid,
  requester_id uuid,
  requester_code text,
  requester_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.requested_by, p.friend_code, p.display_name, f.created_at
  from friendships f
  left join profiles p on p.id = f.requested_by
  where (f.user_a = auth.uid() or f.user_b = auth.uid())
    and f.status = 'pending'
    and f.requested_by is not null
    and f.requested_by <> auth.uid()
  order by f.created_at desc;
$$;

grant execute on function get_pending_friend_requests() to authenticated;
