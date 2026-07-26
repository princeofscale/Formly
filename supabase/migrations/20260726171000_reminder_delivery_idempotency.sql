-- Makes reminder delivery at-most-once per athlete, kind and local day.
--
-- Two sweeps can reach the same athlete in the same local hour, and a retried
-- cron request re-sends everything it already sent, because nothing recorded
-- what had gone out. The move of the hourly sweeps to an external scheduler
-- makes a repeat more likely, not less: a workflow can be re-run by hand or
-- fire twice around a delay.
--
-- The claim is the send permit. A sweep asks for it first and stays silent if
-- somebody else already holds it, so the unique key — not the caller's
-- politeness — is what prevents a duplicate push.

begin;

create table if not exists public.reminder_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily', 'smart')),
  local_date date not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, kind, local_date)
);

-- Only the cron routes touch this table, and they authenticate as
-- service_role, which bypasses RLS. Enabling it without policies therefore
-- denies every ordinary user rather than leaving the table open.
alter table public.reminder_deliveries enable row level security;

create index if not exists reminder_deliveries_local_date_idx
  on public.reminder_deliveries (local_date);

create or replace function public.claim_reminder_delivery(
  p_user_id uuid,
  p_kind text,
  p_local_date date
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.reminder_deliveries (user_id, kind, local_date)
  values (p_user_id, p_kind, p_local_date)
  on conflict (user_id, kind, local_date) do nothing;

  -- FOUND is false when the conflict clause swallowed the insert, which is
  -- exactly the case where somebody has already sent this reminder.
  return found;
end;
$$;

revoke all on function public.claim_reminder_delivery(uuid, text, date)
  from public, anon, authenticated;
grant execute on function public.claim_reminder_delivery(uuid, text, date) to service_role;

commit;
