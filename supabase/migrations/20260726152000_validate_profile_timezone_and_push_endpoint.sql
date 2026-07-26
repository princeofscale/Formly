begin;

create or replace function public.is_valid_time_zone(p_value text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists(select 1 from pg_catalog.pg_timezone_names where name = p_value);
$$;

update public.profiles
set time_zone = 'UTC'
where not public.is_valid_time_zone(time_zone);

alter table public.profiles
  add constraint profiles_time_zone_check
  check (public.is_valid_time_zone(time_zone)) not valid;
alter table public.profiles validate constraint profiles_time_zone_check;

delete from public.push_subscriptions
where endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com)/';

alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_check
  check (
    endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com)/'
  ) not valid;
alter table public.push_subscriptions validate constraint push_subscriptions_endpoint_check;

revoke all on function public.is_valid_time_zone(text) from public, anon;
grant execute on function public.is_valid_time_zone(text) to authenticated, service_role;

commit;
