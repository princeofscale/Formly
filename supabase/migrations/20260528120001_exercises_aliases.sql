-- Aliases column for RU/EN search synonyms (e.g. "бенч", "bench press").

alter table exercises add column if not exists aliases text[] not null default '{}';

-- GIN index supports both array containment and array_to_string ILIKE patterns.
create index if not exists exercises_aliases_gin_idx on exercises using gin (aliases);
