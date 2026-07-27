-- "In gym" meant "has an unfinished session started in the last 6 hours",
-- which is not presence: an athlete who closes the tab mid-workout, or forgets
-- to tap Finish, stays lit up green on their friends' screens until the
-- auto-finish sweep catches the session hours later. Friends were shown as
-- training while they were at home.
--
-- Presence is now the athlete's last *action*: the later of when the session
-- started and when they last logged a set. Nothing logged for 45 minutes and
-- the dot goes out. 45 minutes is generous for a rest between sets and short
-- enough that a closed tab stops lying within the hour.
--
-- Only the is_in_gym expression changes; the rest of the body is carried over
-- unchanged from supabase/migrations/20260723120000_activity_social_layer.sql.

create or replace function get_friends_with_stats(p_days int default 7)
returns table (
  friend_id uuid, friend_code text, display_name text, total_sessions int,
  week_sessions int, week_tonnage_kg numeric, last_workout_at timestamptz,
  best_weight_kg numeric, is_in_gym boolean)
language sql stable security definer set search_path = public as $$
  with friend_ids as (
    select case when f.user_a = auth.uid() then f.user_b else f.user_a end as id
    from friendships f
    where (f.user_a = auth.uid() or f.user_b = auth.uid()) and f.status = 'accepted'
      and not exists (
        select 1 from user_blocks ub
        where (ub.blocker_id = auth.uid() and ub.blocked_id =
                 (case when f.user_a = auth.uid() then f.user_b else f.user_a end))
           or (ub.blocked_id = auth.uid() and ub.blocker_id =
                 (case when f.user_a = auth.uid() then f.user_b else f.user_a end))
      )
  ),
  session_stats as (
    select ws.user_id,
      count(*) filter (where ws.finished_at is not null
        and (ws.session_type is null or ws.session_type != 'cardio'))::int as total_sessions,
      count(*) filter (where ws.finished_at is not null
        and (ws.session_type is null or ws.session_type != 'cardio')
        and ws.started_at >= now() - make_interval(days => p_days))::int as week_sessions,
      coalesce(sum(ws.total_volume_kg) filter (where ws.finished_at is not null
        and (ws.session_type is null or ws.session_type != 'cardio')
        and ws.started_at >= now() - make_interval(days => p_days)), 0)::numeric as week_tonnage_kg,
      max(ws.started_at) filter (where ws.finished_at is not null) as last_workout_at
    from workout_sessions ws where ws.user_id in (select id from friend_ids) group by ws.user_id
  ),
  -- Narrowed to open sessions from the last 12 hours before the per-session
  -- "last set" lookup runs, so this stays a handful of rows per friend rather
  -- than one subquery per session they have ever logged.
  presence as (
    select ws.user_id,
      bool_or(
        greatest(
          ws.started_at,
          coalesce((select max(se.created_at) from set_entries se where se.session_id = ws.id),
                   ws.started_at)
        ) >= now() - interval '45 minutes'
      ) as is_in_gym
    from workout_sessions ws
    where ws.user_id in (select id from friend_ids)
      and ws.finished_at is null
      and ws.started_at >= now() - interval '12 hours'
    group by ws.user_id
  ),
  strength_stats as (
    select se.user_id, max(se.weight_kg)::numeric as best_weight_kg
    from set_entries se where se.user_id in (select id from friend_ids)
      and se.is_warmup = false and se.weight_kg > 0 group by se.user_id
  )
  select fi.id, p.friend_code, p.display_name,
    coalesce(ss.total_sessions,0), coalesce(ss.week_sessions,0), coalesce(ss.week_tonnage_kg,0),
    ss.last_workout_at, st.best_weight_kg, coalesce(pr.is_in_gym,false)
  from friend_ids fi
  join profiles p on p.id = fi.id
  left join session_stats ss on ss.user_id = fi.id
  left join presence pr on pr.user_id = fi.id
  left join strength_stats st on st.user_id = fi.id;
$$;

grant execute on function get_friends_with_stats(int) to authenticated;
