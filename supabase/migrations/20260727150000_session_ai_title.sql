-- A finished workout is listed by the first two exercises in it — "Barbell
-- Bench Press · Crunches" — which reads like a fragment of the log rather than
-- a name for the day. The coach already reads the whole session to write the
-- debrief; it now names it in the same reply, at no extra call and no extra
-- quota. Sessions finished before this, and any where the model is unavailable,
-- keep falling back to the exercise list.

alter table workout_sessions add column if not exists ai_title text;
