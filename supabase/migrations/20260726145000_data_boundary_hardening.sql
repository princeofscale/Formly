begin;

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'progress-photos';

create unique index if not exists progress_photos_storage_path_uniq
  on public.progress_photos (storage_path);

alter table public.progress_photos
  add constraint progress_photos_caption_length
  check (caption is null or char_length(caption) <= 500) not valid;
alter table public.progress_photos validate constraint progress_photos_caption_length;

alter table public.body_measurements
  add constraint body_measurements_notes_length
  check (notes is null or char_length(notes) <= 2000) not valid;
alter table public.body_measurements validate constraint body_measurements_notes_length;

create table public.action_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  window_started_at timestamptz not null default now(),
  count integer not null default 1,
  primary key (user_id, kind)
);

alter table public.action_rate_limits enable row level security;
revoke all on table public.action_rate_limits from public, anon, authenticated;

create or replace function public.consume_action_rate_limit(
  p_kind text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null or p_max < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.action_rate_limits (user_id, kind, window_started_at, count)
  values (v_user_id, p_kind, now(), 1)
  on conflict (user_id, kind) do update
  set count = case
        when public.action_rate_limits.window_started_at <=
          now() - make_interval(secs => p_window_seconds) then 1
        else public.action_rate_limits.count + 1
      end,
      window_started_at = case
        when public.action_rate_limits.window_started_at <=
          now() - make_interval(secs => p_window_seconds) then now()
        else public.action_rate_limits.window_started_at
      end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke all on function public.consume_action_rate_limit(text, integer, integer)
from public, anon, authenticated;

create or replace function public.claim_test_push()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.consume_action_rate_limit('test_push', 1, 60);
$$;

revoke all on function public.claim_test_push() from public, anon;
grant execute on function public.claim_test_push() to authenticated;

create or replace function public.send_direct_message(p_recipient uuid, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_body text := btrim(p_body);
begin
  if not public.are_connected(auth.uid(), p_recipient) then
    raise exception 'not connected';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'invalid body';
  end if;
  if not public.consume_action_rate_limit('direct_message', 30, 60) then
    raise exception 'rate limit exceeded';
  end if;

  insert into public.direct_messages (sender_id, recipient_id, body)
  values (auth.uid(), p_recipient, v_body)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_thread(
  p_friend uuid,
  p_limit integer default 50,
  p_before timestamptz default null
)
returns table(
  id uuid,
  sender_id uuid,
  body text,
  created_at timestamptz,
  read_at timestamptz,
  is_mine boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select auth.uid() as id)
  select * from (
    select dm.id, dm.sender_id, dm.body, dm.created_at, dm.read_at,
           (dm.sender_id = (select id from me)) as is_mine
    from public.direct_messages dm, me
    where public.are_connected((select id from me), p_friend)
      and dm.deleted_at is null
      and (
        (dm.sender_id = (select id from me) and dm.recipient_id = p_friend)
        or (dm.sender_id = p_friend and dm.recipient_id = (select id from me))
      )
      and (p_before is null or dm.created_at < p_before)
    order by dm.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ) thread
  order by thread.created_at asc;
$$;

create or replace function public.toggle_event_reaction(p_event_id uuid, p_emoji text)
returns table (reacted boolean, author_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author uuid;
  v_exists boolean;
begin
  if p_emoji not in ('🔥','💪','👏','🐐','🤯') then raise exception 'bad emoji'; end if;
  if not public.consume_action_rate_limit('event_reaction', 60, 60) then
    raise exception 'rate limit exceeded';
  end if;
  select user_id into v_author from public.activity_events where id = p_event_id;
  if v_author is null then return; end if;
  if v_author <> auth.uid() then
    if not public.are_connected(auth.uid(), v_author) then raise exception 'not allowed'; end if;
    if not exists (
      select 1 from public.profiles where id = v_author and share_activity = true
    ) then raise exception 'not allowed'; end if;
  end if;
  select exists(
    select 1 from public.event_reactions
    where event_id = p_event_id and user_id = auth.uid() and emoji = p_emoji
  ) into v_exists;
  if v_exists then
    delete from public.event_reactions
    where event_id = p_event_id and user_id = auth.uid() and emoji = p_emoji;
    reacted := false;
  else
    insert into public.event_reactions (event_id, user_id, emoji)
    values (p_event_id, auth.uid(), p_emoji)
    on conflict do nothing;
    reacted := true;
  end if;
  author_id := v_author;
  return next;
end;
$$;

create or replace function public.add_event_comment(p_event_id uuid, p_body text)
returns table (comment_id uuid, author_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author uuid;
  v_id uuid;
  v_body text := btrim(p_body);
begin
  if char_length(v_body) < 1 or char_length(v_body) > 280 then
    raise exception 'bad length';
  end if;
  if not public.consume_action_rate_limit('event_comment', 20, 60) then
    raise exception 'rate limit exceeded';
  end if;
  select user_id into v_author from public.activity_events where id = p_event_id;
  if v_author is null then return; end if;
  if v_author <> auth.uid() then
    if not public.are_connected(auth.uid(), v_author) then raise exception 'not allowed'; end if;
    if not exists (
      select 1 from public.profiles where id = v_author and share_activity = true
    ) then raise exception 'not allowed'; end if;
  end if;
  insert into public.event_comments (event_id, user_id, body)
  values (p_event_id, auth.uid(), v_body)
  returning id into v_id;
  comment_id := v_id;
  author_id := v_author;
  return next;
end;
$$;

create or replace function public.finish_my_stale_sessions(p_idle_hours integer default 4)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cutoff timestamptz :=
    now() - make_interval(hours => greatest(1, least(coalesce(p_idle_hours, 4), 24)));
  my_id uuid := auth.uid();
  closed_count integer;
begin
  if my_id is null then return 0; end if;

  with stale as (
    select ws.id,
      coalesce(
        (select max(se.created_at) from public.set_entries se where se.session_id = ws.id),
        ws.started_at
      ) as last_activity
    from public.workout_sessions ws
    where ws.user_id = my_id
      and ws.finished_at is null
      and ws.started_at < cutoff
  ),
  updated as (
    update public.workout_sessions ws
    set finished_at = stale.last_activity,
        total_volume_kg = coalesce((
          select sum(se.weight_kg * se.reps)
          from public.set_entries se
          where se.session_id = ws.id and se.is_warmup = false
        ), 0)
    from stale
    where ws.id = stale.id and stale.last_activity < cutoff
    returning 1
  )
  select count(*)::integer into closed_count from updated;

  return coalesce(closed_count, 0);
end;
$$;

revoke all on function public.auto_finish_stale_sessions(integer) from public, anon, authenticated;
grant execute on function public.auto_finish_stale_sessions(integer) to service_role;

revoke all on function public.are_connected(uuid, uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.delete_direct_message(uuid) from public, anon;
revoke all on function public.delete_event_comment(uuid) from public, anon;
revoke all on function public.ensure_friend_code() from public, anon;
revoke all on function public.find_user_by_friend_code(text) from public, anon;
revoke all on function public.get_activity_feed(integer, integer, timestamptz) from public, anon;
revoke all on function public.get_event_comments(uuid) from public, anon;
revoke all on function public.get_friends_with_stats(integer) from public, anon;
revoke all on function public.get_pending_friend_requests() from public, anon;
revoke all on function public.get_unread_counts() from public, anon;
revoke all on function public.get_workout_lifetime_stats() from public, anon;
revoke all on function public.mark_thread_read(uuid) from public, anon;
revoke all on function public.set_last_streak_milestone(integer) from public, anon;
revoke all on function public.set_share_activity(boolean) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.send_direct_message(uuid, text) from public, anon;
revoke all on function public.get_thread(uuid, integer, timestamptz) from public, anon;
revoke all on function public.toggle_event_reaction(uuid, text) from public, anon;
revoke all on function public.add_event_comment(uuid, text) from public, anon;
revoke all on function public.finish_my_stale_sessions(integer) from public, anon;
revoke all on function public.save_offline_set(
  uuid, uuid, uuid, integer, double precision, integer, double precision, double precision
) from public, anon;

grant execute on function public.send_direct_message(uuid, text) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.delete_direct_message(uuid) to authenticated;
grant execute on function public.delete_event_comment(uuid) to authenticated;
grant execute on function public.ensure_friend_code() to authenticated;
grant execute on function public.find_user_by_friend_code(text) to authenticated;
grant execute on function public.get_activity_feed(integer, integer, timestamptz) to authenticated;
grant execute on function public.get_event_comments(uuid) to authenticated;
grant execute on function public.get_friends_with_stats(integer) to authenticated;
grant execute on function public.get_pending_friend_requests() to authenticated;
grant execute on function public.get_unread_counts() to authenticated;
grant execute on function public.get_workout_lifetime_stats() to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.set_last_streak_milestone(integer) to authenticated;
grant execute on function public.set_share_activity(boolean) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.get_thread(uuid, integer, timestamptz) to authenticated;
grant execute on function public.toggle_event_reaction(uuid, text) to authenticated;
grant execute on function public.add_event_comment(uuid, text) to authenticated;
grant execute on function public.finish_my_stale_sessions(integer) to authenticated;
grant execute on function public.save_offline_set(
  uuid, uuid, uuid, integer, double precision, integer, double precision, double precision
) to authenticated;

commit;
