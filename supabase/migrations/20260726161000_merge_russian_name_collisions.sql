-- Merges catalog rows that share a Russian name but were left untouched by
-- 20260726130000.
--
-- That migration only merged a Russian-name group when at least one row had
-- Cyrillic in `name`. Rows imported from free-exercise-db keep an English
-- `name` with a translated `name_ru`, so pairs like «Сведения в тренажёре
-- "бабочка"» (pec-deck / butterfly) stayed in the catalog and still show up
-- twice in the exercise picker.
--
-- Pairs are listed explicitly rather than derived, because a shared Russian
-- name does not always mean a shared exercise — see the rename at the end.
-- Which row survives is decided by usage, not by list order: the row users
-- logged more sets against wins, so history never moves when it does not
-- have to.

begin;

lock table exercises, set_entries, exercise_notes, user_exercise_videos,
  user_goals, workout_templates in share row exclusive mode;

create temp table _pairs on commit drop as
select *
from (
  values
    ('decline-barbell-press', 'decline-barbell-bench-press'),
    ('pec-deck', 'butterfly'),
    ('arnold-press', 'arnold-dumbbell-press'),
    ('front-squat', 'front-barbell-squat'),
    ('cable-glute-kickback', 'one-legged-cable-kickback'),
    -- Singular/plural pair the automatic rule should already have merged;
    -- kept here so the migration is correct whichever way that went.
    ('concentration-curl', 'concentration-curls')
) as v(preferred_slug, other_slug);

create temp table _merge on commit drop as
with resolved as (
  select
    p.preferred_slug,
    a.id as id_a,
    b.id as id_b,
    (select count(*) from set_entries s where s.exercise_id = a.id) as sets_a,
    (select count(*) from set_entries s where s.exercise_id = b.id) as sets_b
  from _pairs p
  join exercises a on a.slug = p.preferred_slug and not a.is_custom
  join exercises b on b.slug = p.other_slug and not b.is_custom
)
select
  case when sets_b > sets_a then id_a else id_b end as duplicate_id,
  case when sets_b > sets_a then id_b else id_a end as canonical_id
from resolved;

create unique index on _merge (duplicate_id);

-- Keep the per-user row that already points at the survivor, then move the
-- rest across. Both tables key on (user_id, exercise_id), so remapping
-- without this delete would violate the primary key.
delete from exercise_notes duplicate
using _merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from exercise_notes canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update exercise_notes note
set exercise_id = mapping.canonical_id
from _merge mapping
where note.exercise_id = mapping.duplicate_id;

delete from user_exercise_videos duplicate
using _merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from user_exercise_videos canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update user_exercise_videos video
set exercise_id = mapping.canonical_id
from _merge mapping
where video.exercise_id = mapping.duplicate_id;

delete from user_goals duplicate
using _merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from user_goals canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update user_goals goal
set exercise_id = mapping.canonical_id
from _merge mapping
where goal.exercise_id = mapping.duplicate_id;

update set_entries entry
set exercise_id = mapping.canonical_id
from _merge mapping
where entry.exercise_id = mapping.duplicate_id;

-- workout_templates.exercises stores exercise ids inside JSONB, so no foreign
-- key protects it. Deleting a duplicate without this step leaves templates
-- pointing at a row that no longer exists — the breakage 20260726153000 had
-- to repair by hand afterwards.
update workout_templates template
set exercises = (
  select jsonb_agg(
    case
      when mapping.canonical_id is not null
        then jsonb_set(item, '{exercise_id}', to_jsonb(mapping.canonical_id::text))
      else item
    end
    order by ordinality
  )
  from jsonb_array_elements(template.exercises) with ordinality entries(item, ordinality)
  left join _merge mapping on mapping.duplicate_id::text = item ->> 'exercise_id'
)
where exists (
  select 1
  from jsonb_array_elements(template.exercises) item
  join _merge mapping on mapping.duplicate_id::text = item ->> 'exercise_id'
);

-- Carry over anything the survivor is missing, and keep the discarded names
-- as aliases so search still finds the exercise by them.
update exercises canonical
set
  name_ru = coalesce(canonical.name_ru, duplicate.name_ru),
  instructions_en = coalesce(canonical.instructions_en, duplicate.instructions_en),
  instructions_ru = coalesce(canonical.instructions_ru, duplicate.instructions_ru),
  image_urls = case
    when coalesce(cardinality(canonical.image_urls), 0) = 0 then duplicate.image_urls
    else canonical.image_urls
  end,
  aliases = coalesce(
    (
      select array_agg(distinct value)
      from unnest(
        canonical.aliases
        || duplicate.aliases
        || array[duplicate.name, coalesce(duplicate.name_ru, '')]
      ) as value
      where value <> '' and value is not null
    ),
    canonical.aliases
  )
from _merge mapping
join exercises duplicate on duplicate.id = mapping.duplicate_id
where canonical.id = mapping.canonical_id;

delete from exercises
where id in (select duplicate_id from _merge);

-- Not a duplicate: walking lunges and stationary dumbbell lunges are separate
-- movements that happened to share a translation. Renaming keeps both and
-- stops the pair from reading as a catalog error.
update exercises
set name_ru = 'Выпады в движении'
where slug = 'walking-lunges'
  and name_ru = 'Выпады с гантелями';

do $$
declare
  v_left int;
  v_orphans int;
begin
  -- Which slug survives depends on usage, so the check counts rows per pair
  -- rather than naming the one that should be gone.
  select coalesce(sum(present) - count(*) filter (where present > 0), 0)
    into v_left
  from (
    select (
      select count(*)
      from exercises e
      where e.slug in (p.preferred_slug, p.other_slug)
    ) as present
    from _pairs p
  ) counted;

  if v_left > 0 then
    raise exception 'merge left % duplicate row(s) in the catalog', v_left;
  end if;

  select count(*) into v_orphans
  from workout_templates template
  cross join lateral jsonb_array_elements(template.exercises) item
  left join exercises e on e.id = (item ->> 'exercise_id')::uuid
  where item ? 'exercise_id' and e.id is null;

  if v_orphans > 0 then
    raise exception 'merge orphaned % template exercise reference(s)', v_orphans;
  end if;
end;
$$;

commit;
