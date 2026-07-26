begin;

lock table exercises, set_entries, exercise_notes, user_exercise_videos, user_goals
  in share row exclusive mode;

-- Only merge high-confidence catalog duplicates:
--   1. an imported Russian row and another row with the same localized name,
--      muscle, equipment, and mechanic; or
--   2. English singular/plural variants with the same attributes.
-- Custom exercises are never considered.
create temp table _exercise_dedupe_groups on commit drop as
with base as (
  select
    e.*,
    lower(
      regexp_replace(
        translate(coalesce(nullif(trim(e.name_ru), ''), e.name), 'Ёё', 'Ее'),
        '[^[:alnum:]]',
        '',
        'g'
      )
    ) as ru_key,
    regexp_replace(
      case
        when lower(trim(e.name)) ~ '[^s]s$'
          then regexp_replace(lower(trim(e.name)), 's$', '')
        else lower(trim(e.name))
      end,
      '[^a-z0-9]',
      '',
      'g'
    ) as en_key,
    e.name ~ '[А-Яа-яЁё]' as is_ru_source
  from exercises e
  where not e.is_custom
),
eligible as (
  select
    b.*,
    count(*) over (
      partition by b.ru_key, b.primary_muscle, b.equipment, b.mechanic
    ) as ru_count,
    bool_or(b.is_ru_source) over (
      partition by b.ru_key, b.primary_muscle, b.equipment, b.mechanic
    ) as has_ru_source,
    count(*) filter (where b.en_key <> '') over (
      partition by b.en_key, b.primary_muscle, b.equipment, b.mechanic
    ) as en_count
  from base b
),
keyed as (
  select
    e.*,
    case
      when e.ru_count > 1 and e.has_ru_source then 'ru:' || e.ru_key
      else 'en:' || e.en_key
    end as duplicate_key
  from eligible e
  where
    (e.ru_count > 1 and e.has_ru_source)
    or (e.en_key <> '' and e.en_count > 1)
),
scored as (
  select
    k.*,
    (select count(*) from set_entries s where s.exercise_id = k.id) as set_count,
    (
      (select count(*) from set_entries s where s.exercise_id = k.id)
      + (select count(*) from exercise_notes n where n.exercise_id = k.id)
      + (select count(*) from user_exercise_videos v where v.exercise_id = k.id)
      + (select count(*) from user_goals g where g.exercise_id = k.id)
    ) as reference_count,
    cardinality(k.aliases)
      + cardinality(coalesce(k.image_urls, '{}'::text[]))
      + (k.instructions_en is not null)::int
      + (k.instructions_ru is not null)::int
      + (k.name_ru is not null)::int as data_score
  from keyed k
),
ranked as (
  select
    s.*,
    count(*) over (
      partition by s.duplicate_key, s.primary_muscle, s.equipment, s.mechanic
    ) as group_size,
    first_value(s.id) over (
      partition by s.duplicate_key, s.primary_muscle, s.equipment, s.mechanic
      order by
        s.set_count desc,
        s.reference_count desc,
        s.is_ru_source asc,
        s.data_score desc,
        s.created_at asc,
        s.id
    ) as canonical_id
  from scored s
)
select r.id as exercise_id, r.canonical_id
from ranked r
where r.group_size > 1;

create unique index on _exercise_dedupe_groups (exercise_id);
create index on _exercise_dedupe_groups (canonical_id);

-- Preserve the newest per-user record where remapping would collide with a
-- composite key or unique constraint.
create temp table _dedupe_notes on commit drop as
select distinct on (n.user_id, g.canonical_id)
  n.user_id,
  g.canonical_id as exercise_id,
  n.note,
  n.updated_at
from exercise_notes n
join _exercise_dedupe_groups g on g.exercise_id = n.exercise_id
order by n.user_id, g.canonical_id, n.updated_at desc;

create temp table _dedupe_videos on commit drop as
select distinct on (v.user_id, g.canonical_id)
  v.user_id,
  g.canonical_id as exercise_id,
  v.url,
  v.updated_at
from user_exercise_videos v
join _exercise_dedupe_groups g on g.exercise_id = v.exercise_id
order by v.user_id, g.canonical_id, v.updated_at desc;

create temp table _dedupe_goals on commit drop as
select distinct on (u.user_id, g.canonical_id)
  u.id,
  u.user_id,
  g.canonical_id as exercise_id,
  u.target_e1rm,
  u.target_date,
  u.starting_e1rm,
  u.achieved_at,
  u.created_at
from user_goals u
join _exercise_dedupe_groups g on g.exercise_id = u.exercise_id
order by
  u.user_id,
  g.canonical_id,
  (u.achieved_at is not null) desc,
  u.target_date desc nulls last,
  u.created_at desc;

delete from exercise_notes n
using _exercise_dedupe_groups g
where n.exercise_id = g.exercise_id;

insert into exercise_notes (user_id, exercise_id, note, updated_at)
select user_id, exercise_id, note, updated_at
from _dedupe_notes;

delete from user_exercise_videos v
using _exercise_dedupe_groups g
where v.exercise_id = g.exercise_id;

insert into user_exercise_videos (user_id, exercise_id, url, updated_at)
select user_id, exercise_id, url, updated_at
from _dedupe_videos;

delete from user_goals u
using _exercise_dedupe_groups g
where u.exercise_id = g.exercise_id;

insert into user_goals (
  id,
  user_id,
  exercise_id,
  target_e1rm,
  target_date,
  starting_e1rm,
  achieved_at,
  created_at
)
select
  id,
  user_id,
  exercise_id,
  target_e1rm,
  target_date,
  starting_e1rm,
  achieved_at,
  created_at
from _dedupe_goals;

update set_entries s
set exercise_id = g.canonical_id
from _exercise_dedupe_groups g
where s.exercise_id = g.exercise_id
  and g.exercise_id <> g.canonical_id;

-- Merge useful catalog metadata into the surviving row before deletion.
update exercises canonical
set
  name = coalesce(
    (
      select e.name
      from exercises e
      join _exercise_dedupe_groups g on g.exercise_id = e.id
      where g.canonical_id = canonical.id
        and e.name !~ '[А-Яа-яЁё]'
      order by
        (select count(*) from set_entries s where s.exercise_id = e.id) desc,
        (
          cardinality(e.aliases)
          + cardinality(coalesce(e.image_urls, '{}'::text[]))
          + (e.instructions_en is not null)::int
          + (e.instructions_ru is not null)::int
        ) desc,
        e.created_at,
        e.id
      limit 1
    ),
    canonical.name
  ),
  name_ru = coalesce(
    (
      select e.name_ru
      from exercises e
      join _exercise_dedupe_groups g on g.exercise_id = e.id
      where g.canonical_id = canonical.id
        and nullif(trim(e.name_ru), '') is not null
      order by length(e.name_ru) desc, e.created_at, e.id
      limit 1
    ),
    canonical.name_ru
  ),
  instructions_en = coalesce(
    (
      select e.instructions_en
      from exercises e
      join _exercise_dedupe_groups g on g.exercise_id = e.id
      where g.canonical_id = canonical.id
        and nullif(trim(e.instructions_en), '') is not null
      order by length(e.instructions_en) desc, e.created_at, e.id
      limit 1
    ),
    canonical.instructions_en
  ),
  instructions_ru = coalesce(
    (
      select e.instructions_ru
      from exercises e
      join _exercise_dedupe_groups g on g.exercise_id = e.id
      where g.canonical_id = canonical.id
        and nullif(trim(e.instructions_ru), '') is not null
      order by length(e.instructions_ru) desc, e.created_at, e.id
      limit 1
    ),
    canonical.instructions_ru
  ),
  secondary_muscles = coalesce(
    (
      select array_agg(distinct muscle)
      from exercises e
      join _exercise_dedupe_groups g on g.exercise_id = e.id
      cross join lateral unnest(e.secondary_muscles) as muscle
      where g.canonical_id = canonical.id
    ),
    '{}'::muscle_group[]
  ),
  image_urls = coalesce(
    (
      select array_agg(distinct image_url order by image_url)
      from exercises e
      join _exercise_dedupe_groups g on g.exercise_id = e.id
      cross join lateral unnest(coalesce(e.image_urls, '{}'::text[])) as image_url
      where g.canonical_id = canonical.id
        and nullif(trim(image_url), '') is not null
    ),
    '{}'::text[]
  ),
  aliases = coalesce(
    (
      select array_agg(distinct alias order by alias)
      from (
        select unnest(e.aliases) as alias
        from exercises e
        join _exercise_dedupe_groups g on g.exercise_id = e.id
        where g.canonical_id = canonical.id

        union all

        select e.name
        from exercises e
        join _exercise_dedupe_groups g on g.exercise_id = e.id
        where g.canonical_id = canonical.id

        union all

        select e.name_ru
        from exercises e
        join _exercise_dedupe_groups g on g.exercise_id = e.id
        where g.canonical_id = canonical.id

        union all

        select e.slug
        from exercises e
        join _exercise_dedupe_groups g on g.exercise_id = e.id
        where g.canonical_id = canonical.id
      ) merged
      where nullif(trim(alias), '') is not null
    ),
    '{}'::text[]
  )
where exists (
  select 1
  from _exercise_dedupe_groups g
  where g.canonical_id = canonical.id
);

delete from exercises e
using _exercise_dedupe_groups g
where e.id = g.exercise_id
  and g.exercise_id <> g.canonical_id;

do $$
begin
  if exists (
    select 1
    from _exercise_dedupe_groups g
    join exercises e on e.id = g.exercise_id
    where g.exercise_id <> g.canonical_id
  ) then
    raise exception 'exercise deduplication left duplicate rows behind';
  end if;
end;
$$;

commit;
