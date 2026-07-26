begin;

update public.profiles set locale = 'ru' where locale is null or locale not in ('ru', 'en');

alter table public.profiles
  alter column locale set default 'ru',
  alter column locale set not null,
  add constraint profiles_locale_check check (locale in ('ru', 'en')),
  add column if not exists time_zone text not null default 'UTC';

commit;
