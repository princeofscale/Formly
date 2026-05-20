-- Cardio sessions reuse the workout_sessions table with a discriminator column.
-- Strength = default, doesn't change. Cardio gets a few extra fields.

create type cardio_activity as enum (
  'running', 'cycling', 'walking', 'swimming', 'rowing', 'elliptical', 'hiit', 'other'
);

alter table workout_sessions
  add column session_type text not null default 'strength'
    check (session_type in ('strength', 'cardio')),
  add column cardio_activity cardio_activity,
  add column cardio_duration_seconds int check (cardio_duration_seconds > 0),
  add column cardio_distance_km numeric(6, 2) check (cardio_distance_km >= 0),
  add column cardio_avg_hr int check (cardio_avg_hr > 0 and cardio_avg_hr < 250),
  add column cardio_calories int check (cardio_calories >= 0);

-- Index for filtering by type on the dashboard
create index workout_sessions_user_type_date
  on workout_sessions(user_id, session_type, started_at desc);
