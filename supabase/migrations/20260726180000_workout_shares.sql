-- Revocable public snapshots of a finished workout.
--
-- The share card could only be fetched by its owner, so a link pasted into
-- Telegram or Discord was crawled by a bot with no session and answered 401.
-- The card never appeared.
--
-- Opening the workout route to anonymous readers was not the answer: that
-- would make a workout's own id a public handle, guessable across the whole
-- table and impossible to withdraw. Instead a share is its own row with its
-- own random token, and it carries a snapshot of what the card showed rather
-- than a pointer to live data. Revoking is then a single flag, and editing or
-- deleting the workout afterwards cannot leak anything through an old link.

begin;

create table if not exists public.workout_shares (
  -- 32 hex characters from a v4 UUID: 122 random bits, no dashes to keep the
  -- URL tidy. Deliberately not the session id.
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists workout_shares_user_idx
  on public.workout_shares (user_id, created_at desc);

-- One live share per workout keeps the link stable when an athlete shares the
-- same workout twice, and keeps revocation unambiguous.
create unique index if not exists workout_shares_session_live_uniq
  on public.workout_shares (session_id)
  where revoked_at is null;

alter table public.workout_shares enable row level security;

create policy workout_shares_select_own on public.workout_shares
  for select using (auth.uid() = user_id);

create policy workout_shares_insert_own on public.workout_shares
  for insert with check (auth.uid() = user_id);

-- Revoking is the only update anyone needs; there is no delete policy, so a
-- share cannot be erased from the owner's own history of what they published.
create policy workout_shares_revoke_own on public.workout_shares
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Anonymous readers never touch the table. They call this, which hands back
-- the snapshot for a live token and nothing at all for a revoked or unknown
-- one — the same answer either way, so the function cannot be used to learn
-- which tokens exist.
create or replace function public.get_shared_workout(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select share.snapshot
  from public.workout_shares share
  where share.token = p_token
    and share.revoked_at is null;
$$;

revoke all on function public.get_shared_workout(text) from public;
grant execute on function public.get_shared_workout(text) to anon, authenticated, service_role;

commit;
