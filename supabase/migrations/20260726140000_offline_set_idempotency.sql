begin;

alter table set_entries
  add column if not exists client_mutation_id uuid;

create unique index if not exists set_entries_user_client_mutation_idx
  on set_entries (user_id, client_mutation_id)
  where client_mutation_id is not null;

create or replace function save_offline_set(
  p_client_mutation_id uuid,
  p_session_id uuid,
  p_exercise_id uuid,
  p_set_number int,
  p_weight_kg double precision,
  p_reps int,
  p_rpe double precision,
  p_calculated_1rm double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved set_entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_client_mutation_id is null then
    raise exception 'client mutation id is required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from workout_sessions session
    where session.id = p_session_id
      and session.user_id = auth.uid()
      and session.finished_at is null
  ) then
    raise exception 'workout session not found' using errcode = '22023';
  end if;

  select entry.*
  into saved
  from set_entries entry
  where entry.user_id = auth.uid()
    and entry.client_mutation_id = p_client_mutation_id;

  if found then
    return jsonb_build_object('set', to_jsonb(saved), 'inserted', false);
  end if;

  begin
    insert into set_entries (
      session_id,
      user_id,
      exercise_id,
      set_number,
      weight_kg,
      reps,
      rpe,
      calculated_1rm,
      client_mutation_id
    )
    values (
      p_session_id,
      auth.uid(),
      p_exercise_id,
      p_set_number,
      p_weight_kg,
      p_reps,
      p_rpe,
      p_calculated_1rm,
      p_client_mutation_id
    )
    returning * into saved;

    return jsonb_build_object('set', to_jsonb(saved), 'inserted', true);
  exception
    when unique_violation then
      select entry.*
      into saved
      from set_entries entry
      where entry.user_id = auth.uid()
        and entry.client_mutation_id = p_client_mutation_id;

      if not found then
        raise;
      end if;

      return jsonb_build_object('set', to_jsonb(saved), 'inserted', false);
  end;
end;
$$;

revoke all on function save_offline_set(
  uuid,
  uuid,
  uuid,
  int,
  double precision,
  int,
  double precision,
  double precision
) from public;

grant execute on function save_offline_set(
  uuid,
  uuid,
  uuid,
  int,
  double precision,
  int,
  double precision,
  double precision
) to authenticated;

commit;
