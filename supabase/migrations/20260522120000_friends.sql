-- Friends / accountability buddies.
-- Symmetric friendship — no accept/reject flow. Sharing the friend_code IS
-- the consent (you wouldn't share it with someone you don't trust).
-- Aggregate stats (streak, weekly tonnage) are exposed through SECURITY DEFINER
-- RPCs so we never have to weaken RLS on profiles/workout_sessions.

alter table profiles
  add column if not exists friend_code text;

create unique index if not exists profiles_friend_code_unique
  on profiles(friend_code) where friend_code is not null;

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a::text < user_b::text),
  unique (user_a, user_b)
);

create index if not exists friendships_user_a on friendships(user_a);
create index if not exists friendships_user_b on friendships(user_b);

alter table friendships enable row level security;

drop policy if exists "Users see own friendships" on friendships;
create policy "Users see own friendships"
  on friendships for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "Users add own friendships" on friendships;
create policy "Users add own friendships"
  on friendships for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "Users delete own friendships" on friendships;
create policy "Users delete own friendships"
  on friendships for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Ensure the calling user has a friend_code; lazily generate one on demand.
create or replace function ensure_friend_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  code text;
  attempts int := 0;
begin
  if uid is null then return null; end if;

  select friend_code into code from profiles where id = uid;
  if code is not null then return code; end if;

  loop
    attempts := attempts + 1;
    -- 6-char A-Z 0-9 (no easily-confused 0/O, 1/I)
    code := upper(translate(substring(md5(random()::text || clock_timestamp()::text), 1, 6),
                            '0Oo1Il', 'XYZWQR'));
    begin
      update profiles set friend_code = code where id = uid;
      return code;
    exception when unique_violation then
      if attempts > 8 then raise; end if;
    end;
  end loop;
end;
$$;

grant execute on function ensure_friend_code() to authenticated;

-- Look up a user by friend_code without exposing the full profiles row.
-- Used by the "add friend" flow.
create or replace function find_user_by_friend_code(p_code text)
returns table (id uuid, friend_code text)
language sql
stable
security definer
set search_path = public
as $$
  select id, friend_code from profiles
  where friend_code = upper(p_code)
  limit 1;
$$;

grant execute on function find_user_by_friend_code(text) to authenticated;

-- Aggregated stats for each of the caller's friends. SECURITY DEFINER lets us
-- read across users without weakening RLS. Returns only safe aggregates:
-- never raw set rows, never email or photos.
create or replace function get_friends_with_stats(p_days int default 7)
returns table (
  friend_id uuid,
  friend_code text,
  total_sessions int,
  week_sessions int,
  week_tonnage_kg numeric,
  last_workout_at timestamptz,
  best_e1rm numeric
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
       where se.user_id = fi.id and se.calculated_1rm is not null) as best_e1rm
  from friend_ids fi
  left join profiles p on p.id = fi.id;
$$;

grant execute on function get_friends_with_stats(int) to authenticated;
