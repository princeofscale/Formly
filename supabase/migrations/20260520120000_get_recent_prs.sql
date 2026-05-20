-- Personal records over a recent window: for each exercise where the user's
-- best e1rm in the last N days exceeds their best e1rm before that window.
-- Returns one row per exercise with the % improvement and the timestamp of
-- the PR set (for the dashboard "🏆 Recent PRs" card).

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
    select se.exercise_id, max(se.calculated_1rm) as best_e1rm
    from set_entries se, cutoff
    where se.user_id = p_user_id
      and se.calculated_1rm is not null
      and se.created_at >= cutoff.ts
    group by se.exercise_id
  ),
  prev as (
    select se.exercise_id, max(se.calculated_1rm) as best_e1rm
    from set_entries se, cutoff
    where se.user_id = p_user_id
      and se.calculated_1rm is not null
      and se.created_at < cutoff.ts
    group by se.exercise_id
  ),
  pr_set as (
    select distinct on (se.exercise_id)
      se.exercise_id,
      se.created_at,
      se.weight_kg,
      se.reps,
      se.calculated_1rm
    from set_entries se
    join recent r on r.exercise_id = se.exercise_id and se.calculated_1rm = r.best_e1rm
    where se.user_id = p_user_id
      and se.created_at >= (select ts from cutoff)
    order by se.exercise_id, se.created_at desc
  )
  select
    r.exercise_id,
    e.name        as exercise_name,
    e.name_ru     as exercise_name_ru,
    r.best_e1rm   as current_best,
    coalesce(p.best_e1rm, 0) as previous_best,
    case
      when coalesce(p.best_e1rm, 0) = 0 then null
      else round(((r.best_e1rm - p.best_e1rm) / p.best_e1rm * 100)::numeric, 1)
    end           as improvement_pct,
    ps.created_at as achieved_at,
    ps.weight_kg,
    ps.reps
  from recent r
  join exercises e on e.id = r.exercise_id
  join pr_set ps on ps.exercise_id = r.exercise_id
  left join prev p on p.exercise_id = r.exercise_id
  where r.best_e1rm > coalesce(p.best_e1rm, 0)
  order by ps.created_at desc
  limit 10;
$$;

grant execute on function get_recent_prs(uuid, int) to authenticated;
