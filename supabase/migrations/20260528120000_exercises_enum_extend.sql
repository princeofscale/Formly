-- Extend equipment_type enum with new variants from RU exercise base.
-- ALTER TYPE ADD VALUE cannot share a transaction with usage of the new
-- value, so this migration only extends the enums. Aliases column + import
-- happen in the next migration / import script.

alter type equipment_type add value if not exists 'smith';
alter type equipment_type add value if not exists 'ez_bar';
alter type equipment_type add value if not exists 'kettlebell';
alter type equipment_type add value if not exists 'band';
alter type equipment_type add value if not exists 'plate';

-- Cardio gets its own primary_muscle category. It is intentionally excluded
-- from muscle-volume aggregation in src/lib/utils/muscle-volume.ts.
alter type muscle_group add value if not exists 'cardio';
