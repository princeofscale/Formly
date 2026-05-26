-- Cache for post-workout AI debrief. Generated once on first view of the
-- finished session page; subsequent reads serve from this column.
-- JSONB shape: { items: string[], generated_at: ISO timestamp }
alter table public.workout_sessions
  add column if not exists ai_debrief jsonb;
