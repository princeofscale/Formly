-- The catalog knew one "chest", but the clavicular, sternal and costal heads
-- answer to different angles and are trained on different days — an athlete
-- pressing only flat reads as a fully covered chest. Same story for the
-- erectors inside "back", the obliques inside "core" and the soleus inside
-- "calves", each of which needs work the parent group's other movements do
-- not give it.
--
-- The existing values keep their rows and narrow in meaning: `chest` is the
-- middle chest, `back` the upper and middle back, `core` the rectus abdominis,
-- `calves` the gastrocnemius. Only exercises that clearly belong to a region
-- move, in the migration after this one.
--
-- ALTER TYPE ADD VALUE cannot share a transaction with a statement that uses
-- the new value, so this migration only extends the type.

alter type muscle_group add value if not exists 'chest_upper';
alter type muscle_group add value if not exists 'chest_lower';
alter type muscle_group add value if not exists 'lower_back';
alter type muscle_group add value if not exists 'obliques';
alter type muscle_group add value if not exists 'soleus';
