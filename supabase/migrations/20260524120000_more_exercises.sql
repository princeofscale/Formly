-- Additional gym staples missing from the initial seed.
-- Triggered by user feedback: "тренер сказал делать суппинацию, у нас этого нет".
-- Adds 20 commonly-prescribed exercises across biceps, triceps, delts, back,
-- legs, core. All gated by ON CONFLICT (slug) so re-running is idempotent.

insert into exercises (name, name_ru, slug, primary_muscle, secondary_muscles, mechanic, equipment) values
-- Biceps / forearms — supination & friends
('Supinating Dumbbell Curl', 'Супинированный подъём гантелей', 'supinating-dumbbell-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'dumbbell'),
('Reverse Curl', 'Обратный подъём на бицепс', 'reverse-curl', 'forearms', array['biceps']::muscle_group[], 'isolation', 'barbell'),
('Spider Curl', 'Сгибания «паук»', 'spider-curl', 'biceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Incline Dumbbell Curl', 'Подъём гантелей на наклонной', 'incline-dumbbell-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'dumbbell'),

-- Triceps
('Lying Dumbbell Tricep Extension', 'Французский жим гантелями', 'lying-dumbbell-tricep-extension', 'triceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Cable Tricep Kickback', 'Кикбэк на блоке', 'cable-tricep-kickback', 'triceps', array[]::muscle_group[], 'isolation', 'cable'),

-- Delts
('Reverse Pec Deck', 'Обратная «бабочка»', 'reverse-pec-deck', 'rear_delts', array['traps']::muscle_group[], 'isolation', 'machine'),
('Cable Lateral Raise', 'Махи в сторону на блоке', 'cable-lateral-raise', 'side_delts', array[]::muscle_group[], 'isolation', 'cable'),
('Cable Front Raise', 'Передние махи на блоке', 'cable-front-raise', 'front_delts', array[]::muscle_group[], 'isolation', 'cable'),

-- Chest / push bodyweight
('Push-Up', 'Отжимания от пола', 'push-up', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'bodyweight'),
('Diamond Push-Up', 'Отжимания с узкой постановкой', 'diamond-push-up', 'triceps', array['chest','front_delts']::muscle_group[], 'compound', 'bodyweight'),

-- Back / lats / row variations
('Pendlay Row', 'Тяга Пендлая', 'pendlay-row', 'back', array['lats','biceps','rear_delts']::muscle_group[], 'compound', 'barbell'),
('Chest-Supported Dumbbell Row', 'Тяга гантелей с упором в скамью', 'chest-supported-dumbbell-row', 'back', array['lats','biceps','rear_delts']::muscle_group[], 'compound', 'dumbbell'),
('Straight-Arm Pulldown', 'Пуловер на верхнем блоке', 'straight-arm-pulldown', 'lats', array['back']::muscle_group[], 'isolation', 'cable'),
('Inverted Row', 'Австралийские подтягивания', 'inverted-row', 'back', array['biceps','rear_delts']::muscle_group[], 'compound', 'bodyweight'),

-- Legs
('Goblet Squat', 'Кубковые приседания', 'goblet-squat', 'quads', array['glutes','core']::muscle_group[], 'compound', 'dumbbell'),
('Step-Up', 'Зашагивания на тумбу', 'step-up', 'quads', array['glutes','hamstrings']::muscle_group[], 'compound', 'dumbbell'),
('Dumbbell Romanian Deadlift', 'Румынская тяга с гантелями', 'dumbbell-romanian-deadlift', 'hamstrings', array['glutes','back']::muscle_group[], 'compound', 'dumbbell'),

-- Core
('Cable Crunch', 'Скручивания на блоке', 'cable-crunch', 'core', array[]::muscle_group[], 'isolation', 'cable'),
('Russian Twist', 'Русские скручивания', 'russian-twist', 'core', array[]::muscle_group[], 'isolation', 'bodyweight')
on conflict (slug) do nothing;
