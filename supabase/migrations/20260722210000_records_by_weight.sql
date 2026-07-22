-- Records now go by the heaviest working set actually lifted, not by the
-- estimated 1RM. calculated_1rm stays stored (CSV export, the 1RM calculator
-- tool) but no ranking reads it anymore. Warmup sets never count.

-- 1) Own recent PRs (dashboard "Recent PRs" card)
create or replace function get_recent_prs(p_user_id uuid, p_days int default 30)
returns table (
  exercise_id uuid,
  exercise_name text,
  exercise_name_ru text,
  current_best numeric,
  previous_best numeric,
  improvement_pct numeric,
  achieved_at timestamptz,
  weight_kg numeric,
  reps int
)
language sql
stable
security invoker
set search_path = public
as $$
  with cutoff as (
    select (now() - (p_days || ' days')::interval) as ts
  ),
  recent as (
    select se.exercise_id, max(se.weight_kg) as best_weight
    from set_entries se, cutoff
    where se.user_id = p_user_id
      and se.is_warmup = false
      and se.weight_kg > 0
      and se.created_at >= cutoff.ts
    group by se.exercise_id
  ),
  prev as (
    select se.exercise_id, max(se.weight_kg) as best_weight
    from set_entries se, cutoff
    where se.user_id = p_user_id
      and se.is_warmup = false
      and se.weight_kg > 0
      and se.created_at < cutoff.ts
    group by se.exercise_id
  ),
  pr_set as (
    select distinct on (se.exercise_id)
      se.exercise_id,
      se.created_at,
      se.weight_kg,
      se.reps
    from set_entries se
    join recent r on r.exercise_id = se.exercise_id and se.weight_kg = r.best_weight
    where se.user_id = p_user_id
      and se.is_warmup = false
      and se.created_at >= (select ts from cutoff)
    order by se.exercise_id, se.created_at desc
  )
  select
    r.exercise_id,
    e.name        as exercise_name,
    e.name_ru     as exercise_name_ru,
    r.best_weight as current_best,
    coalesce(p.best_weight, 0) as previous_best,
    case
      when coalesce(p.best_weight, 0) = 0 then null
      else round(((r.best_weight - p.best_weight) / p.best_weight * 100)::numeric, 1)
    end           as improvement_pct,
    ps.created_at as achieved_at,
    ps.weight_kg,
    ps.reps
  from recent r
  join exercises e on e.id = r.exercise_id
  join pr_set ps on ps.exercise_id = r.exercise_id
  left join prev p on p.exercise_id = r.exercise_id
  where r.best_weight > coalesce(p.best_weight, 0)
  order by ps.created_at desc
  limit 10;
$$;

grant execute on function get_recent_prs(uuid, int) to authenticated;

-- 2) Friends' recent PRs (friends feed)
create or replace function get_friends_recent_prs(p_days int default 14)
returns table (
  friend_id uuid,
  friend_code text,
  pr_set_id uuid,
  exercise_id uuid,
  exercise_name text,
  exercise_name_ru text,
  current_best numeric,
  previous_best numeric,
  improvement_pct numeric,
  achieved_at timestamptz,
  weight_kg numeric,
  reps int,
  reaction_count int,
  did_react boolean
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
    where (f.user_a = me.id or f.user_b = me.id)
      and f.status = 'accepted'
  ),
  cutoff as (
    select (now() - (p_days || ' days')::interval) as ts
  ),
  recent as (
    select se.user_id, se.exercise_id, max(se.weight_kg) as best_weight
    from set_entries se, cutoff
    where se.user_id in (select id from friend_ids)
      and se.is_warmup = false
      and se.weight_kg > 0
      and se.created_at >= cutoff.ts
    group by se.user_id, se.exercise_id
  ),
  prev as (
    select se.user_id, se.exercise_id, max(se.weight_kg) as best_weight
    from set_entries se, cutoff
    where se.user_id in (select id from friend_ids)
      and se.is_warmup = false
      and se.weight_kg > 0
      and se.created_at < cutoff.ts
    group by se.user_id, se.exercise_id
  ),
  pr_set as (
    select distinct on (se.user_id, se.exercise_id)
      se.id,
      se.user_id,
      se.exercise_id,
      se.created_at,
      se.weight_kg,
      se.reps
    from set_entries se
    join recent r
      on r.user_id = se.user_id
     and r.exercise_id = se.exercise_id
     and se.weight_kg = r.best_weight
    where se.is_warmup = false
      and se.created_at >= (select ts from cutoff)
    order by se.user_id, se.exercise_id, se.created_at desc
  )
  select
    r.user_id as friend_id,
    p.friend_code,
    ps.id as pr_set_id,
    r.exercise_id,
    e.name as exercise_name,
    e.name_ru as exercise_name_ru,
    r.best_weight as current_best,
    coalesce(pv.best_weight, 0) as previous_best,
    case
      when coalesce(pv.best_weight, 0) = 0 then null
      else round(((r.best_weight - pv.best_weight) / pv.best_weight * 100)::numeric, 1)
    end as improvement_pct,
    ps.created_at as achieved_at,
    ps.weight_kg,
    ps.reps,
    (select count(*)::int from pr_reactions x where x.pr_set_id = ps.id) as reaction_count,
    exists(
      select 1 from pr_reactions x
      where x.pr_set_id = ps.id and x.reactor_id = (select id from me)
    ) as did_react
  from recent r
  join exercises e on e.id = r.exercise_id
  join pr_set ps on ps.user_id = r.user_id and ps.exercise_id = r.exercise_id
  left join prev pv on pv.user_id = r.user_id and pv.exercise_id = r.exercise_id
  left join profiles p on p.id = r.user_id
  where r.best_weight > coalesce(pv.best_weight, 0)
  order by ps.created_at desc
  limit 50;
$$;

grant execute on function get_friends_recent_prs(int) to authenticated;

-- 3) Friend aggregates: best_e1rm column becomes best_weight_kg
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
  best_weight_kg numeric,
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
    select se.user_id, max(se.weight_kg)::numeric as best_weight_kg
    from set_entries se
    where se.user_id in (select id from friend_ids)
      and se.is_warmup = false
      and se.weight_kg > 0
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
    st.best_weight_kg,
    coalesce(ss.is_in_gym, false)
  from friend_ids fi
  join profiles p on p.id = fi.id
  left join session_stats ss on ss.user_id = fi.id
  left join strength_stats st on st.user_id = fi.id;
$$;

grant execute on function get_friends_with_stats(int) to authenticated;
