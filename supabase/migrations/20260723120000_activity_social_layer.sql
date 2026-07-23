-- Friends social layer: activity feed, emoji reactions, comments, hard blocking, privacy toggle.

-- ---------- profile columns ----------
alter table profiles add column if not exists share_activity boolean not null default true;
alter table profiles add column if not exists last_streak_milestone int not null default 0;

-- ---------- tables ----------
create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in
    ('workout_started','workout_finished','weight_pr','volume_pr','streak_milestone')),
  session_id uuid references workout_sessions(id) on delete cascade,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists activity_events_user_created_idx
  on activity_events (user_id, created_at desc);
-- idempotency under offline-queue retries: one started/finished event per session
create unique index if not exists activity_events_started_uniq
  on activity_events (session_id) where type = 'workout_started';
create unique index if not exists activity_events_finished_uniq
  on activity_events (session_id) where type = 'workout_finished';

create table if not exists event_reactions (
  event_id uuid not null references activity_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('🔥','💪','👏','🐐','🤯')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id, emoji)
);
create index if not exists event_reactions_event_idx on event_reactions (event_id);

create table if not exists event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references activity_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists event_comments_event_idx on event_comments (event_id, created_at);

create table if not exists user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on user_blocks (blocked_id);

-- ---------- RLS: own-rows only via direct client; cross-user via SECURITY DEFINER RPC ----------
alter table activity_events enable row level security;
alter table event_reactions enable row level security;
alter table event_comments enable row level security;
alter table user_blocks enable row level security;

create policy ae_own_select on activity_events for select using (user_id = auth.uid());
create policy er_own_select on event_reactions for select using (user_id = auth.uid());
create policy ec_own_select on event_comments for select using (user_id = auth.uid());
create policy ub_own_all on user_blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
-- No direct INSERT/UPDATE/DELETE policies on activity_events/event_reactions/event_comments:
-- all writes flow through the SECURITY DEFINER functions below.

-- ---------- shared predicate helpers ----------
create or replace function are_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.user_a = a and f.user_b = b) or (f.user_a = b and f.user_b = a))
  ) and not exists (
    select 1 from user_blocks ub
    where (ub.blocker_id = a and ub.blocked_id = b)
       or (ub.blocker_id = b and ub.blocked_id = a)
  );
$$;

-- ---------- emit ----------
create or replace function emit_activity_event(p_type text, p_session_id uuid, p_payload jsonb)
returns void language sql security definer set search_path = public as $$
  insert into activity_events (user_id, type, session_id, payload)
  values (auth.uid(), p_type, p_session_id, coalesce(p_payload, '{}'::jsonb))
  on conflict do nothing;
$$;
grant execute on function emit_activity_event(text, uuid, jsonb) to authenticated;

create or replace function set_last_streak_milestone(p_value int)
returns void language sql security definer set search_path = public as $$
  update profiles set last_streak_milestone = p_value where id = auth.uid();
$$;
grant execute on function set_last_streak_milestone(int) to authenticated;

create or replace function set_share_activity(p_on boolean)
returns void language sql security definer set search_path = public as $$
  update profiles set share_activity = p_on where id = auth.uid();
$$;
grant execute on function set_share_activity(boolean) to authenticated;

-- ---------- feed read ----------
create or replace function get_activity_feed(
  p_days int default 21, p_limit int default 30, p_before timestamptz default null)
returns table (
  event_id uuid, author_id uuid, friend_code text, display_name text,
  type text, session_id uuid, is_live boolean, payload jsonb, created_at timestamptz,
  reactions jsonb, my_reactions text[], comment_count int
)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  visible_authors as (
    select id from me
    union
    select case when f.user_a = (select id from me) then f.user_b else f.user_a end
    from friendships f
    where f.status = 'accepted'
      and ((f.user_a = (select id from me)) or (f.user_b = (select id from me)))
  ),
  allowed as (
    select va.id
    from visible_authors va
    join profiles pr on pr.id = va.id
    where (va.id = (select id from me) or pr.share_activity = true)
      and not exists (
        select 1 from user_blocks ub
        where (ub.blocker_id = (select id from me) and ub.blocked_id = va.id)
           or (ub.blocker_id = va.id and ub.blocked_id = (select id from me))
      )
  )
  select
    ae.id, ae.user_id, pr.friend_code, pr.display_name,
    ae.type, ae.session_id,
    (ae.type = 'workout_started' and ws.finished_at is null) as is_live,
    ae.payload, ae.created_at,
    coalesce((
      select jsonb_object_agg(g.emoji, g.cnt)
      from (select emoji, count(*) as cnt from event_reactions r
            where r.event_id = ae.id group by emoji) g
    ), '{}'::jsonb) as reactions,
    coalesce((
      select array_agg(r.emoji) from event_reactions r
      where r.event_id = ae.id and r.user_id = (select id from me)
    ), '{}') as my_reactions,
    (select count(*)::int from event_comments c where c.event_id = ae.id) as comment_count
  from activity_events ae
  join allowed al on al.id = ae.user_id
  join profiles pr on pr.id = ae.user_id
  left join workout_sessions ws on ws.id = ae.session_id
  where ae.created_at >= now() - make_interval(days => p_days)
    and (p_before is null or ae.created_at < p_before)
    -- hide a live "started" row once its "finished" row exists
    and not (ae.type = 'workout_started' and exists (
      select 1 from activity_events f2
      where f2.session_id = ae.session_id and f2.type = 'workout_finished'))
  order by ae.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;
grant execute on function get_activity_feed(int, int, timestamptz) to authenticated;

-- ---------- comments read ----------
create or replace function get_event_comments(p_event_id uuid)
returns table (id uuid, user_id uuid, display_name text, friend_code text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  with ev as (select user_id from activity_events where id = p_event_id)
  select c.id, c.user_id, pr.display_name, pr.friend_code, c.body, c.created_at
  from event_comments c
  join profiles pr on pr.id = c.user_id, ev
  where c.event_id = p_event_id
    and (ev.user_id = auth.uid() or are_connected(auth.uid(), ev.user_id))
  order by c.created_at asc;
$$;
grant execute on function get_event_comments(uuid) to authenticated;

-- ---------- reaction toggle ----------
create or replace function toggle_event_reaction(p_event_id uuid, p_emoji text)
returns table (reacted boolean, author_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_exists boolean;
begin
  if p_emoji not in ('🔥','💪','👏','🐐','🤯') then raise exception 'bad emoji'; end if;
  select user_id into v_author from activity_events where id = p_event_id;
  if v_author is null then return; end if;
  if not (v_author = auth.uid() or are_connected(auth.uid(), v_author)) then
    raise exception 'not allowed';
  end if;
  select exists(select 1 from event_reactions
    where event_id = p_event_id and user_id = auth.uid() and emoji = p_emoji) into v_exists;
  if v_exists then
    delete from event_reactions
      where event_id = p_event_id and user_id = auth.uid() and emoji = p_emoji;
    reacted := false;
  else
    insert into event_reactions (event_id, user_id, emoji) values (p_event_id, auth.uid(), p_emoji)
      on conflict do nothing;
    reacted := true;
  end if;
  author_id := v_author;
  return next;
end;
$$;
grant execute on function toggle_event_reaction(uuid, text) to authenticated;

-- ---------- add / delete comment ----------
create or replace function add_event_comment(p_event_id uuid, p_body text)
returns table (comment_id uuid, author_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_author uuid; v_id uuid; v_body text := btrim(p_body);
begin
  if char_length(v_body) < 1 or char_length(v_body) > 280 then raise exception 'bad length'; end if;
  select user_id into v_author from activity_events where id = p_event_id;
  if v_author is null then return; end if;
  if not (v_author = auth.uid() or are_connected(auth.uid(), v_author)) then
    raise exception 'not allowed';
  end if;
  insert into event_comments (event_id, user_id, body) values (p_event_id, auth.uid(), v_body)
    returning id into v_id;
  comment_id := v_id; author_id := v_author; return next;
end;
$$;
grant execute on function add_event_comment(uuid, text) to authenticated;

create or replace function delete_event_comment(p_comment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_comment_author uuid; v_event_author uuid;
begin
  select c.user_id, ae.user_id into v_comment_author, v_event_author
  from event_comments c join activity_events ae on ae.id = c.event_id
  where c.id = p_comment_id;
  if v_comment_author is null then return; end if;
  if auth.uid() = v_comment_author or auth.uid() = v_event_author then
    delete from event_comments where id = p_comment_id;
  else
    raise exception 'not allowed';
  end if;
end;
$$;
grant execute on function delete_event_comment(uuid) to authenticated;

-- ---------- block / unblock (hard block also severs friendship) ----------
create or replace function block_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_target = auth.uid() or p_target is null then return; end if;
  delete from friendships f
   where (f.user_a = auth.uid() and f.user_b = p_target)
      or (f.user_a = p_target and f.user_b = auth.uid());
  insert into user_blocks (blocker_id, blocked_id) values (auth.uid(), p_target)
    on conflict do nothing;
end;
$$;
grant execute on function block_user(uuid) to authenticated;

create or replace function unblock_user(p_target uuid)
returns void language sql security definer set search_path = public as $$
  delete from user_blocks where blocker_id = auth.uid() and blocked_id = p_target;
$$;
grant execute on function unblock_user(uuid) to authenticated;

-- ---------- amend existing friend RPCs to exclude blocked pairs ----------
-- get_friends_with_stats: add a NOT EXISTS user_blocks filter to friend_ids CTE.
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
      max(ws.started_at) filter (where ws.finished_at is not null) as last_workout_at,
      bool_or(ws.finished_at is null and ws.started_at >= now() - interval '6 hours') as is_in_gym
    from workout_sessions ws where ws.user_id in (select id from friend_ids) group by ws.user_id
  ),
  strength_stats as (
    select se.user_id, max(se.weight_kg)::numeric as best_weight_kg
    from set_entries se where se.user_id in (select id from friend_ids)
      and se.is_warmup = false and se.weight_kg > 0 group by se.user_id
  )
  select fi.id, p.friend_code, p.display_name,
    coalesce(ss.total_sessions,0), coalesce(ss.week_sessions,0), coalesce(ss.week_tonnage_kg,0),
    ss.last_workout_at, st.best_weight_kg, coalesce(ss.is_in_gym,false)
  from friend_ids fi
  join profiles p on p.id = fi.id
  left join session_stats ss on ss.user_id = fi.id
  left join strength_stats st on st.user_id = fi.id;
$$;
grant execute on function get_friends_with_stats(int) to authenticated;

-- find_user_by_friend_code: block-aware (a blocked pair cannot re-add). Original body is in
-- supabase/migrations/20260522120000_friends.sql; only the block NOT EXISTS is added.
create or replace function find_user_by_friend_code(p_code text)
returns table (id uuid, friend_code text)
language sql stable security definer set search_path = public as $$
  select p.id, p.friend_code from profiles p
  where p.friend_code = upper(p_code)
    and not exists (
      select 1 from user_blocks ub
      where (ub.blocker_id = auth.uid() and ub.blocked_id = p.id)
         or (ub.blocker_id = p.id and ub.blocked_id = auth.uid())
    )
  limit 1;
$$;
grant execute on function find_user_by_friend_code(text) to authenticated;

-- ---------- backfill existing 🔥 PR reactions into the new model ----------
-- Create a weight_pr event per PR set that has at least one reaction, then map reactions.
insert into activity_events (id, user_id, type, session_id, payload, created_at)
select gen_random_uuid(), se.user_id, 'weight_pr', se.session_id,
  jsonb_build_object('exercise_id', se.exercise_id, 'exercise_name', e.name,
    'exercise_name_ru', e.name_ru, 'weight_kg', se.weight_kg, 'reps', se.reps,
    'improvement_pct', null, 'backfilled', true),
  se.created_at
from set_entries se
join exercises e on e.id = se.exercise_id
where se.id in (select distinct pr_set_id from pr_reactions);

-- map old reactions (single 🔥) onto the freshly created backfill events
insert into event_reactions (event_id, user_id, emoji, created_at)
select ae.id, prx.reactor_id, '🔥', now()
from pr_reactions prx
join set_entries se on se.id = prx.pr_set_id
join activity_events ae on ae.session_id = se.session_id and ae.type = 'weight_pr'
  and (ae.payload->>'exercise_id')::uuid = se.exercise_id
  and (ae.payload->>'backfilled')::boolean = true
on conflict do nothing;

-- retire the old PR-reaction path (superseded by the unified feed)
drop function if exists get_friends_recent_prs(int);
drop table if exists pr_reactions;
