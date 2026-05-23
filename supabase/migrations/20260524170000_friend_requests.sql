-- Add accept/decline flow to friendships. Existing rows are auto-marked
-- 'accepted' so nothing changes for current friendships; new requests
-- arrive as 'pending' and need explicit acceptance from the recipient.

alter table friendships
  add column if not exists status text not null default 'accepted'
    check (status in ('pending', 'accepted'));

alter table friendships
  add column if not exists requested_by uuid references profiles(id) on delete cascade;

-- Helpful when we list incoming pending requests for the current user.
create index if not exists friendships_pending_by_recipient
  on friendships(user_a, user_b)
  where status = 'pending';

-- INSERT policy: must mark themselves as the requester and the row as pending.
drop policy if exists "Users add own friendships" on friendships;
create policy "Users add own friendships"
  on friendships for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and requested_by = auth.uid()
    and status = 'pending'
  );

-- UPDATE policy: only the *other* party (not the requester) can change a
-- pending request, and only by flipping status to 'accepted'.
drop policy if exists "Recipient can accept friend request" on friendships;
create policy "Recipient can accept friend request"
  on friendships for update
  using (
    (auth.uid() = user_a or auth.uid() = user_b)
    and requested_by is not null
    and requested_by <> auth.uid()
    and status = 'pending'
  )
  with check (status = 'accepted');

-- get_friends_with_stats: only count *accepted* friendships now.
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
    where (f.user_a = me.id or f.user_b = me.id)
      and f.status = 'accepted'
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

-- New RPC: incoming pending friend requests addressed to the caller.
create or replace function get_pending_friend_requests()
returns table (
  friendship_id uuid,
  requester_id uuid,
  requester_code text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.requested_by, p.friend_code, f.created_at
  from friendships f
  left join profiles p on p.id = f.requested_by
  where (f.user_a = auth.uid() or f.user_b = auth.uid())
    and f.status = 'pending'
    and f.requested_by is not null
    and f.requested_by <> auth.uid()
  order by f.created_at desc;
$$;

grant execute on function get_pending_friend_requests() to authenticated;
