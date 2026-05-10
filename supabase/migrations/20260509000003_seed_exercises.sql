insert into exercises (name, slug, primary_muscle, secondary_muscles, mechanic, equipment) values
-- Chest
('Barbell Bench Press', 'barbell-bench-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'barbell'),
('Incline Barbell Bench Press', 'incline-barbell-bench-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'barbell'),
('Dumbbell Bench Press', 'dumbbell-bench-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'dumbbell'),
('Dumbbell Flyes', 'dumbbell-flyes', 'chest', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Cable Crossover', 'cable-crossover', 'chest', array[]::muscle_group[], 'isolation', 'cable'),
-- Back
('Barbell Deadlift', 'barbell-deadlift', 'back', array['hamstrings','glutes','traps']::muscle_group[], 'compound', 'barbell'),
('Pull-Up', 'pull-up', 'lats', array['biceps','rear_delts']::muscle_group[], 'compound', 'bodyweight'),
('Barbell Row', 'barbell-row', 'back', array['biceps','rear_delts']::muscle_group[], 'compound', 'barbell'),
('Cable Row', 'cable-row', 'back', array['biceps']::muscle_group[], 'compound', 'cable'),
('Lat Pulldown', 'lat-pulldown', 'lats', array['biceps']::muscle_group[], 'compound', 'machine'),
-- Shoulders
('Barbell Overhead Press', 'barbell-overhead-press', 'front_delts', array['side_delts','triceps']::muscle_group[], 'compound', 'barbell'),
('Dumbbell Overhead Press', 'dumbbell-overhead-press', 'front_delts', array['side_delts','triceps']::muscle_group[], 'compound', 'dumbbell'),
('Dumbbell Lateral Raise', 'dumbbell-lateral-raise', 'side_delts', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Face Pull', 'face-pull', 'rear_delts', array['side_delts']::muscle_group[], 'isolation', 'cable'),
-- Legs
('Barbell Squat', 'barbell-squat', 'quads', array['hamstrings','glutes']::muscle_group[], 'compound', 'barbell'),
('Romanian Deadlift', 'romanian-deadlift', 'hamstrings', array['glutes','back']::muscle_group[], 'compound', 'barbell'),
('Leg Press', 'leg-press', 'quads', array['hamstrings','glutes']::muscle_group[], 'compound', 'machine'),
('Leg Curl', 'leg-curl', 'hamstrings', array[]::muscle_group[], 'isolation', 'machine'),
('Leg Extension', 'leg-extension', 'quads', array[]::muscle_group[], 'isolation', 'machine'),
('Calf Raise', 'calf-raise', 'calves', array[]::muscle_group[], 'isolation', 'machine'),
-- Arms
('Barbell Curl', 'barbell-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'barbell'),
('Dumbbell Curl', 'dumbbell-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'dumbbell'),
('Hammer Curl', 'hammer-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'dumbbell'),
('Tricep Pushdown', 'tricep-pushdown', 'triceps', array[]::muscle_group[], 'isolation', 'cable'),
('Skull Crusher', 'skull-crusher', 'triceps', array[]::muscle_group[], 'isolation', 'barbell'),
('Close-Grip Bench Press', 'close-grip-bench-press', 'triceps', array['chest']::muscle_group[], 'compound', 'barbell'),
-- Core
('Plank', 'plank', 'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Crunch', 'crunch', 'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Ab Wheel Rollout', 'ab-wheel-rollout', 'core', array[]::muscle_group[], 'isolation', 'other')
ON CONFLICT (slug) DO NOTHING;
