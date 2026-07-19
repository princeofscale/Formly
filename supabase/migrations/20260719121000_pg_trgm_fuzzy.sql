-- Fuzzy search fallback for typo'd queries («жым лижа» → «Жим лёжа»).
create extension if not exists pg_trgm;

create index if not exists exercises_name_trgm_idx
  on exercises using gin (name gin_trgm_ops);
create index if not exists exercises_name_ru_trgm_idx
  on exercises using gin (name_ru gin_trgm_ops);

-- security invoker (default): the caller's RLS on exercises applies, so
-- other users' custom exercises never leak through this function.
create or replace function search_exercises_fuzzy(q text)
returns setof exercises
language sql
stable
as $$
  select *
  from exercises
  where greatest(similarity(name, q), similarity(coalesce(name_ru, ''), q)) > 0.3
  order by greatest(similarity(name, q), similarity(coalesce(name_ru, ''), q)) desc
  limit 5;
$$;
