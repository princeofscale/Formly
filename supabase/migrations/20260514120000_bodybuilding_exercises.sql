-- Add Russian names to existing exercises
update exercises set name_ru = case slug
  when 'barbell-bench-press' then 'Жим лёжа со штангой'
  when 'incline-barbell-bench-press' then 'Жим штанги на наклонной'
  when 'dumbbell-bench-press' then 'Жим гантелей лёжа'
  when 'dumbbell-flyes' then 'Разводка гантелей'
  when 'cable-crossover' then 'Кроссовер'
  when 'barbell-deadlift' then 'Становая тяга'
  when 'pull-up' then 'Подтягивания'
  when 'barbell-row' then 'Тяга штанги в наклоне'
  when 'cable-row' then 'Тяга нижнего блока'
  when 'lat-pulldown' then 'Тяга верхнего блока'
  when 'barbell-overhead-press' then 'Армейский жим'
  when 'dumbbell-overhead-press' then 'Жим гантелей сидя'
  when 'dumbbell-lateral-raise' then 'Махи в стороны'
  when 'face-pull' then 'Тяга к лицу'
  when 'barbell-squat' then 'Приседания со штангой'
  when 'romanian-deadlift' then 'Румынская тяга'
  when 'leg-press' then 'Жим ногами'
  when 'leg-curl' then 'Сгибания ног лёжа'
  when 'leg-extension' then 'Разгибания ног'
  when 'calf-raise' then 'Подъём на носки'
  when 'barbell-curl' then 'Подъём штанги на бицепс'
  when 'dumbbell-curl' then 'Подъём гантелей на бицепс'
  when 'hammer-curl' then 'Молотки'
  when 'tricep-pushdown' then 'Разгибания на блоке'
  when 'skull-crusher' then 'Французский жим'
  when 'close-grip-bench-press' then 'Жим узким хватом'
  when 'plank' then 'Планка'
  when 'crunch' then 'Скручивания'
  when 'ab-wheel-rollout' then 'Ролик пресса'
  else name_ru
end
where name_ru is null;

-- New bodybuilding exercises
insert into exercises (name, name_ru, slug, primary_muscle, secondary_muscles, mechanic, equipment) values
('Incline Dumbbell Press', 'Жим гантелей на наклонной', 'incline-dumbbell-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'dumbbell'),
('Decline Barbell Press', 'Жим штанги головой вниз', 'decline-barbell-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'barbell'),
('Machine Chest Press', 'Жим в тренажёре на грудь', 'machine-chest-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'machine'),
('Pec Deck', 'Сведения в тренажёре «бабочка»', 'pec-deck', 'chest', array[]::muscle_group[], 'isolation', 'machine'),
('Dips', 'Отжимания на брусьях', 'dips', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'bodyweight'),
('One-Arm Dumbbell Row', 'Тяга гантели одной рукой', 'one-arm-dumbbell-row', 'back', array['lats','biceps','rear_delts']::muscle_group[], 'compound', 'dumbbell'),
('T-Bar Row', 'Тяга Т-грифа', 't-bar-row', 'back', array['lats','biceps']::muscle_group[], 'compound', 'barbell'),
('Hyperextension', 'Гиперэкстензия', 'hyperextension', 'back', array['glutes','hamstrings']::muscle_group[], 'isolation', 'bodyweight'),
('Barbell Shrug', 'Шраги со штангой', 'barbell-shrug', 'traps', array[]::muscle_group[], 'isolation', 'barbell'),
('Arnold Press', 'Жим Арнольда', 'arnold-press', 'front_delts', array['side_delts','triceps']::muscle_group[], 'compound', 'dumbbell'),
('Bent-Over Reverse Flye', 'Махи в наклоне', 'bent-over-reverse-flye', 'rear_delts', array['traps']::muscle_group[], 'isolation', 'dumbbell'),
('Upright Row', 'Тяга к подбородку', 'upright-row', 'side_delts', array['traps','front_delts']::muscle_group[], 'compound', 'barbell'),
('Front Raise', 'Передние махи гантелями', 'front-raise', 'front_delts', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Preacher Curl', 'Подъём на скамье Скотта', 'preacher-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'barbell'),
('Concentration Curl', 'Концентрированные сгибания', 'concentration-curl', 'biceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Cable Curl', 'Сгибания на блоке', 'cable-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'cable'),
('Overhead Tricep Extension', 'Разгибания из-за головы', 'overhead-tricep-extension', 'triceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Bench Dips', 'Обратные отжимания от скамьи', 'bench-dips', 'triceps', array['chest','front_delts']::muscle_group[], 'compound', 'bodyweight'),
('Tricep Kickback', 'Кикбэк гантелью', 'tricep-kickback', 'triceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Front Squat', 'Фронтальные приседания', 'front-squat', 'quads', array['glutes','core']::muscle_group[], 'compound', 'barbell'),
('Walking Lunges', 'Выпады с гантелями', 'walking-lunges', 'quads', array['glutes','hamstrings']::muscle_group[], 'compound', 'dumbbell'),
('Bulgarian Split Squat', 'Болгарские выпады', 'bulgarian-split-squat', 'quads', array['glutes','hamstrings']::muscle_group[], 'compound', 'dumbbell'),
('Hack Squat', 'Хак-приседания', 'hack-squat', 'quads', array['glutes']::muscle_group[], 'compound', 'machine'),
('Stiff-Leg Deadlift', 'Становая на прямых ногах', 'stiff-leg-deadlift', 'hamstrings', array['glutes','back']::muscle_group[], 'compound', 'barbell'),
('Seated Leg Curl', 'Сгибания ног сидя', 'seated-leg-curl', 'hamstrings', array[]::muscle_group[], 'isolation', 'machine'),
('Hip Thrust', 'Ягодичный мостик', 'hip-thrust', 'glutes', array['hamstrings']::muscle_group[], 'compound', 'barbell'),
('Cable Glute Kickback', 'Отведение ноги назад на блоке', 'cable-glute-kickback', 'glutes', array['hamstrings']::muscle_group[], 'isolation', 'cable'),
('Sumo Squat', 'Приседания сумо', 'sumo-squat', 'glutes', array['quads','hamstrings']::muscle_group[], 'compound', 'barbell'),
('Standing Calf Raise', 'Подъём на носки стоя', 'standing-calf-raise', 'calves', array[]::muscle_group[], 'isolation', 'machine'),
('Seated Calf Raise', 'Подъём на носки сидя', 'seated-calf-raise', 'calves', array[]::muscle_group[], 'isolation', 'machine'),
('Hanging Leg Raise', 'Подъём ног в висе', 'hanging-leg-raise', 'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Bicycle Crunch', 'Велосипед', 'bicycle-crunch', 'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Lying Leg Raise', 'Подъём ног лёжа', 'lying-leg-raise', 'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Wrist Curl', 'Сгибания запястий', 'wrist-curl', 'forearms', array[]::muscle_group[], 'isolation', 'barbell'),
('Reverse Wrist Curl', 'Разгибания запястий', 'reverse-wrist-curl', 'forearms', array[]::muscle_group[], 'isolation', 'barbell')
on conflict (slug) do nothing;
