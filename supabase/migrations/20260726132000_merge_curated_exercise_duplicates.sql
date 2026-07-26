begin;

lock table exercises, set_entries, exercise_notes, user_exercise_videos, user_goals
  in share row exclusive mode;

create temp table _exercise_merge on commit drop as
select duplicate.id as duplicate_id, canonical.id as canonical_id
from (
  values
    ('mertvyy-zhuk', 'dead-bug'),
    ('podem-blina-pered-soboy', 'front-plate-raise'),
    ('dumbbell-incline-shoulder-raise', 'front-incline-dumbbell-raise'),
    ('poocherednyy-zhim-giri', 'alternating-kettlebell-press'),
    ('squats-with-bands', 'squat-with-bands'),
    ('rolik-dlya-pressa', 'ab-roller'),
    ('rumynskaya-tyaga-s-gantelyami', 'dumbbell-romanian-deadlift'),
    ('dumbbell-curl', 'dumbbell-bicep-curl'),
    ('flexor-incline-dumbbell-curls', 'incline-dumbbell-curl'),
    ('skruchivaniya-s-otyagoscheniem', 'weighted-crunches'),
    ('tyaga-verhnego-bloka-k-grudi', 'lat-pulldown')
) slugs(duplicate_slug, canonical_slug)
join exercises duplicate on duplicate.slug = slugs.duplicate_slug
join exercises canonical on canonical.slug = slugs.canonical_slug
where not duplicate.is_custom
  and not canonical.is_custom;

delete from exercise_notes duplicate
using _exercise_merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from exercise_notes canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update exercise_notes note
set exercise_id = mapping.canonical_id
from _exercise_merge mapping
where note.exercise_id = mapping.duplicate_id;

delete from user_exercise_videos duplicate
using _exercise_merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from user_exercise_videos canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update user_exercise_videos video
set exercise_id = mapping.canonical_id
from _exercise_merge mapping
where video.exercise_id = mapping.duplicate_id;

delete from user_goals duplicate
using _exercise_merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from user_goals canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update user_goals goal
set exercise_id = mapping.canonical_id
from _exercise_merge mapping
where goal.exercise_id = mapping.duplicate_id;

update set_entries entry
set exercise_id = mapping.canonical_id
from _exercise_merge mapping
where entry.exercise_id = mapping.duplicate_id;

update exercises canonical
set
  name_ru = coalesce(canonical.name_ru, duplicate.name_ru),
  instructions_en = coalesce(canonical.instructions_en, duplicate.instructions_en),
  instructions_ru = coalesce(canonical.instructions_ru, duplicate.instructions_ru),
  secondary_muscles = coalesce(
    (
      select array_agg(distinct muscle)
      from unnest(canonical.secondary_muscles || duplicate.secondary_muscles) as muscle
    ),
    '{}'::muscle_group[]
  ),
  image_urls = coalesce(
    (
      select array_agg(distinct image_url order by image_url)
      from unnest(
        coalesce(canonical.image_urls, '{}'::text[])
        || coalesce(duplicate.image_urls, '{}'::text[])
      ) as image_url
      where nullif(trim(image_url), '') is not null
    ),
    '{}'::text[]
  ),
  aliases = coalesce(
    (
      select array_agg(distinct alias order by alias)
      from unnest(
        canonical.aliases
        || duplicate.aliases
        || array[
          duplicate.name,
          duplicate.name_ru,
          duplicate.slug
        ]
      ) as alias
      where nullif(trim(alias), '') is not null
    ),
    '{}'::text[]
  )
from _exercise_merge mapping
join exercises duplicate on duplicate.id = mapping.duplicate_id
where canonical.id = mapping.canonical_id;

delete from exercises duplicate
using _exercise_merge mapping
where duplicate.id = mapping.duplicate_id;

commit;
