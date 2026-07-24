-- Direct messages (1:1 DM) between accepted, non-blocked friends.
-- The table is touched ONLY through the SECURITY DEFINER RPCs below; the typed
-- Supabase client never selects or writes it directly. Blocked pairs (see
-- are_connected in 20260723120000_activity_social_layer.sql) get empty threads
-- and cannot send.

create table direct_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  pair_key     text generated always as (
                 least(sender_id, recipient_id)::text || ':' ||
                 greatest(sender_id, recipient_id)::text
               ) stored,
  body         text not null check (char_length(body) between 1 and 1000),
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  deleted_at   timestamptz,
  constraint dm_not_self check (sender_id <> recipient_id)
);

create index dm_thread_idx on direct_messages (pair_key, created_at desc);
create index dm_unread_idx on direct_messages (recipient_id)
  where read_at is null and deleted_at is null;

alter table direct_messages enable row level security;

-- Defense in depth: even though every access path is a SECURITY DEFINER RPC,
-- restrict any direct SELECT to rows the caller is part of. No write policies.
create policy dm_select_own on direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- ---------- send ----------
create or replace function send_direct_message(p_recipient uuid, p_body text)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  v_id uuid;
  v_body text := btrim(p_body);
begin
  if not are_connected(auth.uid(), p_recipient) then
    raise exception 'not connected';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'invalid body';
  end if;
  insert into direct_messages (sender_id, recipient_id, body)
  values (auth.uid(), p_recipient, v_body)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function send_direct_message(uuid, text) to authenticated;

-- ---------- read thread ----------
create or replace function get_thread(
  p_friend uuid, p_limit int default 50, p_before timestamptz default null
)
returns table(
  id uuid, sender_id uuid, body text,
  created_at timestamptz, read_at timestamptz, is_mine boolean
)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id)
  select * from (
    select dm.id, dm.sender_id, dm.body, dm.created_at, dm.read_at,
           (dm.sender_id = (select id from me)) as is_mine
    from direct_messages dm, me
    where are_connected((select id from me), p_friend)
      and dm.deleted_at is null
      and (
        (dm.sender_id = (select id from me) and dm.recipient_id = p_friend)
        or (dm.sender_id = p_friend and dm.recipient_id = (select id from me))
      )
      and (p_before is null or dm.created_at < p_before)
    order by dm.created_at desc
    limit p_limit
  ) t
  order by t.created_at asc;
$$;
grant execute on function get_thread(uuid, int, timestamptz) to authenticated;

-- ---------- mark read ----------
create or replace function mark_thread_read(p_friend uuid)
returns void language sql volatile security definer set search_path = public as $$
  update direct_messages
  set read_at = now()
  where recipient_id = auth.uid() and sender_id = p_friend and read_at is null;
$$;
grant execute on function mark_thread_read(uuid) to authenticated;

-- ---------- delete own ----------
create or replace function delete_direct_message(p_message uuid)
returns void language sql volatile security definer set search_path = public as $$
  update direct_messages
  set deleted_at = now()
  where id = p_message and sender_id = auth.uid();
$$;
grant execute on function delete_direct_message(uuid) to authenticated;

-- ---------- unread counts (friend-list badges) ----------
create or replace function get_unread_counts()
returns table(friend_id uuid, unread int)
language sql stable security definer set search_path = public as $$
  select dm.sender_id as friend_id, count(*)::int as unread
  from direct_messages dm
  where dm.recipient_id = auth.uid()
    and dm.read_at is null
    and dm.deleted_at is null
    and are_connected(auth.uid(), dm.sender_id)
  group by dm.sender_id;
$$;
grant execute on function get_unread_counts() to authenticated;
