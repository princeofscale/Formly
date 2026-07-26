begin;

alter table public.profiles drop constraint profiles_age_check;

alter table public.profiles
  add constraint profiles_weight_kg_check
    check (weight_kg is null or weight_kg between 20 and 500) not valid,
  add constraint profiles_height_cm_check
    check (height_cm is null or height_cm between 80 and 260) not valid,
  add constraint profiles_age_check check (age is null or age between 13 and 119) not valid;

alter table public.profiles validate constraint profiles_weight_kg_check;
alter table public.profiles validate constraint profiles_height_cm_check;
alter table public.profiles validate constraint profiles_age_check;

alter table public.body_measurements
  drop constraint if exists body_measurements_height_cm_check,
  add constraint body_measurements_height_cm_check
    check (height_cm is null or height_cm between 80 and 260);

create or replace function public.save_body_metrics(p_weight_kg numeric, p_height_cm numeric)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_date date;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_weight_kg not between 20 and 500 or p_height_cm not between 80 and 260 then
    raise exception 'Body metrics are outside the supported range';
  end if;

  select (now() at time zone time_zone)::date
  into v_date
  from public.profiles
  where id = v_user_id;

  update public.profiles
  set weight_kg = p_weight_kg, height_cm = p_height_cm
  where id = v_user_id;

  insert into public.body_measurements (user_id, date, weight_kg, height_cm)
  values (v_user_id, v_date, p_weight_kg, p_height_cm)
  on conflict (user_id, date) do update
  set weight_kg = excluded.weight_kg,
      height_cm = excluded.height_cm;
end;
$$;

revoke all on function public.save_body_metrics(numeric, numeric) from public, anon;
grant execute on function public.save_body_metrics(numeric, numeric) to authenticated;

commit;
