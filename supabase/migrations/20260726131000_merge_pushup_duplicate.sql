begin;

lock table exercises, set_entries, exercise_notes, user_exercise_videos, user_goals
  in share row exclusive mode;

create temp table _pushup_merge on commit drop as
select duplicate.id as duplicate_id, canonical.id as canonical_id
from exercises duplicate
join exercises canonical on canonical.slug = 'push-up'
where duplicate.slug = 'pushups'
  and not duplicate.is_custom
  and not canonical.is_custom;

-- Prefer an existing canonical per-user record when both variants exist.
delete from exercise_notes duplicate
using _pushup_merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from exercise_notes canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update exercise_notes note
set exercise_id = mapping.canonical_id
from _pushup_merge mapping
where note.exercise_id = mapping.duplicate_id;

delete from user_exercise_videos duplicate
using _pushup_merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from user_exercise_videos canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update user_exercise_videos video
set exercise_id = mapping.canonical_id
from _pushup_merge mapping
where video.exercise_id = mapping.duplicate_id;

delete from user_goals duplicate
using _pushup_merge mapping
where duplicate.exercise_id = mapping.duplicate_id
  and exists (
    select 1
    from user_goals canonical
    where canonical.user_id = duplicate.user_id
      and canonical.exercise_id = mapping.canonical_id
  );

update user_goals goal
set exercise_id = mapping.canonical_id
from _pushup_merge mapping
where goal.exercise_id = mapping.duplicate_id;

update set_entries entry
set exercise_id = mapping.canonical_id
from _pushup_merge mapping
where entry.exercise_id = mapping.duplicate_id;

update exercises canonical
set aliases = (
  select array_agg(distinct alias order by alias)
  from (
    select unnest(canonical.aliases) as alias
    union all
    select duplicate.name
    from exercises duplicate
    join _pushup_merge mapping on mapping.duplicate_id = duplicate.id
    union all
    select duplicate.name_ru
    from exercises duplicate
    join _pushup_merge mapping on mapping.duplicate_id = duplicate.id
    union all
    select duplicate.slug
    from exercises duplicate
    join _pushup_merge mapping on mapping.duplicate_id = duplicate.id
  ) merged
  where nullif(trim(alias), '') is not null
)
from _pushup_merge mapping
where canonical.id = mapping.canonical_id;

delete from exercises duplicate
using _pushup_merge mapping
where duplicate.id = mapping.duplicate_id;

commit;
