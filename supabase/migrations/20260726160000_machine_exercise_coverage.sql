-- Adds the gym machines the catalog was missing.
--
-- Gap list came from auditing every seeded exercise by name, name_ru and slug:
-- assisted pull-up/dip stations, machine lateral raise, machine pullover,
-- pendulum and belt squats, hip thrust machine, chest-supported row, machine
-- back extension and glute kickback had no row at any equipment type.
--
-- Rows are skipped when the slug is taken OR when a row already carries the
-- same deduplication key (normalized Russian name + muscle + equipment +
-- mechanic). Production holds exercises that no repository migration creates,
-- so matching on slug alone would risk reintroducing the duplicates that
-- 20260726130000 and 20260726132000 just cleaned up.

begin;

lock table exercises in share row exclusive mode;

create temp table _machine_additions on commit drop as
select *
from (
  values
    ('Assisted Pull-Up Machine', 'Подтягивания в гравитроне', 'assisted-pull-up-machine',
     'lats', array['biceps', 'back']::muscle_group[], 'compound', 'machine',
     array['гравитрон', 'подтягивания с противовесом', 'assisted pull up']::text[],
     'Противовес компенсирует часть веса тела: чем больше плитка, тем легче подъём. Колени или стопы на платформе, хват шире плеч, движение до касания грудью уровня рукоятей.'),

    ('Assisted Dip Machine', 'Отжимания на брусьях с противовесом', 'assisted-dip-machine',
     'triceps', array['chest', 'front_delts']::muscle_group[], 'compound', 'machine',
     array['гравитрон брусья', 'брусья с противовесом']::text[],
     'Тот же тренажёр, что и для подтягиваний, в положении для брусьев. Корпус вертикально — акцент на трицепс, наклон вперёд — на грудь.'),

    ('Machine Lateral Raise', 'Махи в стороны в тренажёре', 'machine-lateral-raise',
     -- `shoulders` left the muscle_group enum in 20260509000004; the delts are
     -- tracked separately, so the secondary groups have to name them.
     'side_delts', array['front_delts', 'traps']::muscle_group[], 'isolation', 'machine',
     array['разведения в тренажёре', 'махи в тренажёре']::text[],
     'Валики прижаты к внешней стороне предплечий, ось вращения на уровне плечевого сустава. Подъём до горизонтали без рывка корпусом.'),

    ('Machine Pullover', 'Пуловер в тренажёре', 'machine-pullover',
     'lats', array['chest', 'triceps']::muscle_group[], 'isolation', 'machine',
     array['пуловер наутилус', 'nautilus pullover']::text[],
     'Изолирующее движение на широчайшие с фиксированной траекторией. Локти прижаты к валикам, тяга выполняется плечами, а не руками.'),

    ('Pendulum Squat', 'Маятниковые приседания', 'pendulum-squat',
     'quads', array['glutes', 'hamstrings']::muscle_group[], 'compound', 'machine',
     array['маятник', 'pendulum squat']::text[],
     'Дугообразная траектория снимает нагрузку с поясницы и держит корпус вертикально. Стопы на платформе на ширине плеч, спина прижата к спинке.'),

    ('Belt Squat', 'Приседания с поясом', 'belt-squat',
     'quads', array['glutes']::muscle_group[], 'compound', 'machine',
     array['присед с поясом', 'belt squat']::text[],
     'Вес крепится к поясу на бёдрах, позвоночник не сжимается. Подходит, когда приседания со штангой ограничены состоянием спины.'),

    ('Machine Hip Thrust', 'Ягодичный мост в тренажёре', 'machine-hip-thrust',
     'glutes', array['hamstrings']::muscle_group[], 'compound', 'machine',
     array['хип траст в тренажёре', 'ягодичный тренажёр']::text[],
     'Валик или платформа давит на таз, спина опирается на подушку. В верхней точке корпус и бёдра образуют прямую линию.'),

    ('Chest Supported Row Machine', 'Тяга в тренажёре с упором в грудь', 'chest-supported-row-machine',
     'back', array['lats', 'biceps', 'rear_delts']::muscle_group[], 'compound', 'machine',
     array['тяга с упором в грудь', 'т-тяга с упором']::text[],
     'Упор в грудь исключает раскачивание корпусом, поэтому нагрузка приходится на середину спины. Лопатки сводятся в конце движения.'),

    ('Machine Back Extension', 'Разгибания спины в тренажёре', 'machine-back-extension',
     'back', array['glutes', 'hamstrings']::muscle_group[], 'isolation', 'machine',
     array['гиперэкстензия в тренажёре', 'разгибание спины сидя']::text[],
     'Сидячая версия гиперэкстензии с регулируемым сопротивлением. Амплитуда до нейтрального положения спины, без переразгибания.'),

    ('Machine Glute Kickback', 'Отведение ноги назад в тренажёре', 'machine-glute-kickback',
     'glutes', array['hamstrings']::muscle_group[], 'isolation', 'machine',
     array['кикбэк в тренажёре', 'махи назад в тренажёре']::text[],
     'Опорная нога слегка согнута, корпус зафиксирован упорами. Отведение до включения ягодичной без прогиба в пояснице.')
) as v(
  name, name_ru, slug,
  primary_muscle, secondary_muscles, mechanic, equipment,
  aliases, instructions_ru
);

insert into exercises (
  name, name_ru, slug,
  primary_muscle, secondary_muscles, mechanic, equipment,
  aliases, instructions_ru, is_custom, created_by
)
select
  a.name, a.name_ru, a.slug,
  a.primary_muscle::muscle_group, a.secondary_muscles, a.mechanic,
  a.equipment::equipment_type, a.aliases, a.instructions_ru, false, null
from _machine_additions a
where not exists (
    select 1 from exercises e where e.slug = a.slug
  )
  and not exists (
    select 1
    from exercises e
    where not e.is_custom
      and e.primary_muscle = a.primary_muscle::muscle_group
      and e.equipment = a.equipment::equipment_type
      and e.mechanic = a.mechanic
      and lower(
            regexp_replace(
              translate(coalesce(nullif(trim(e.name_ru), ''), e.name), 'Ёё', 'Ее'),
              '[^[:alnum:]]', '', 'g'
            )
          ) = lower(
            regexp_replace(
              translate(a.name_ru, 'Ёё', 'Ее'),
              '[^[:alnum:]]', '', 'g'
            )
          )
  );

do $$
declare
  v_present int;
  v_collisions int;
begin
  select count(*) into v_present
  from exercises e
  join _machine_additions a on a.slug = e.slug;

  -- Every addition must end up in the catalog under its own slug, unless the
  -- concept was already there under a different one. Both outcomes are fine;
  -- what is not fine is a row that shares a deduplication key with another,
  -- because that is exactly the state the dedup migrations exist to prevent.
  select count(*) into v_collisions
  from exercises added
  join _machine_additions a on a.slug = added.slug
  join exercises other
    on other.id <> added.id
   and not other.is_custom
   and other.primary_muscle = added.primary_muscle
   and other.equipment = added.equipment
   and other.mechanic = added.mechanic
   and lower(
         regexp_replace(
           translate(coalesce(nullif(trim(other.name_ru), ''), other.name), 'Ёё', 'Ее'),
           '[^[:alnum:]]', '', 'g'
         )
       ) = lower(
         regexp_replace(
           translate(coalesce(nullif(trim(added.name_ru), ''), added.name), 'Ёё', 'Ее'),
           '[^[:alnum:]]', '', 'g'
         )
       );

  if v_collisions > 0 then
    raise exception 'machine coverage: % duplicate collision(s) introduced', v_collisions;
  end if;

  raise notice 'machine coverage: % of 10 additions present in catalog', v_present;
end;
$$;

commit;
