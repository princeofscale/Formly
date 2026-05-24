-- Lightweight 🔥-reactions on a friend's PR set. One reactor can react once per
-- PR; un-clicking the button removes the row (toggle behaviour).
-- Push notification to the PR owner is fired from the server action.

create table if not exists pr_reactions (
  reactor_id uuid not null references profiles(id) on delete cascade,
  pr_set_id  uuid not null references set_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reactor_id, pr_set_id)
);

create index if not exists pr_reactions_set_id on pr_reactions(pr_set_id);

alter table pr_reactions enable row level security;

-- Anyone authenticated can read counts (RLS on set_entries still hides the
-- actual PR row from non-friends; the count itself is harmless).
drop policy if exists "Authenticated can read pr_reactions" on pr_reactions;
create policy "Authenticated can read pr_reactions"
  on pr_reactions for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users insert own reactions" on pr_reactions;
create policy "Users insert own reactions"
  on pr_reactions for insert
  with check (auth.uid() = reactor_id);

drop policy if exists "Users delete own reactions" on pr_reactions;
create policy "Users delete own reactions"
  on pr_reactions for delete
  using (auth.uid() = reactor_id);

-- Friend PRs feed: each friend's recent PR per exercise within the window,
-- plus aggregate reaction count and whether the caller already reacted.
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
    select se.user_id, se.exercise_id, max(se.calculated_1rm) as best_e1rm
    from set_entries se, cutoff
    where se.user_id in (select id from friend_ids)
      and se.calculated_1rm is not null
      and se.created_at >= cutoff.ts
    group by se.user_id, se.exercise_id
  ),
  prev as (
    select se.user_id, se.exercise_id, max(se.calculated_1rm) as best_e1rm
    from set_entries se, cutoff
    where se.user_id in (select id from friend_ids)
      and se.calculated_1rm is not null
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
      se.reps,
      se.calculated_1rm
    from set_entries se
    join recent r
      on r.user_id = se.user_id
     and r.exercise_id = se.exercise_id
     and se.calculated_1rm = r.best_e1rm
    where se.created_at >= (select ts from cutoff)
    order by se.user_id, se.exercise_id, se.created_at desc
  )
  select
    r.user_id as friend_id,
    p.friend_code,
    ps.id as pr_set_id,
    r.exercise_id,
    e.name as exercise_name,
    e.name_ru as exercise_name_ru,
    r.best_e1rm as current_best,
    coalesce(pv.best_e1rm, 0) as previous_best,
    case
      when coalesce(pv.best_e1rm, 0) = 0 then null
      else round(((r.best_e1rm - pv.best_e1rm) / pv.best_e1rm * 100)::numeric, 1)
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
  where r.best_e1rm > coalesce(pv.best_e1rm, 0)
  order by ps.created_at desc
  limit 50;
$$;

grant execute on function get_friends_recent_prs(int) to authenticated;
