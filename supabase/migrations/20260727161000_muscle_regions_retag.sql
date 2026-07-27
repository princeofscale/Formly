-- Move catalog exercises onto the regions added in the previous migration.
--
-- The region is already in the movement's own name — that is what "incline",
-- "decline" and "seated calf raise" mean — so the re-tag reads it from there
-- rather than from a hand-written list of several hundred slugs.
--
-- Only shipped catalog rows are touched. An exercise an athlete created and
-- assigned a muscle to themselves keeps the muscle they chose; the picker now
-- offers the regions to anyone creating a new one.
--
-- secondary_muscles is deliberately left alone. A secondary contribution is
-- already counted at half weight and rolls up to the parent group either way,
-- so splitting it buys nothing and doubles the surface that can go wrong.

-- Upper chest: the clavicular head, which is what an incline angle recruits.
update exercises
set primary_muscle = 'chest_upper'
where is_custom = false
  and primary_muscle = 'chest'
  and (slug like '%incline%' or name ~* 'incline');

-- Lower chest: decline pressing and chest dips.
update exercises
set primary_muscle = 'chest_lower'
where is_custom = false
  and primary_muscle = 'chest'
  and (slug like '%decline%' or name ~* 'decline|(^|\s)dips?(\s|$)');

-- Erectors. Deadlifts stay on `back`: they are a whole posterior chain and
-- calling them lower-back work would understate everything else they train.
update exercises
set primary_muscle = 'lower_back'
where is_custom = false
  and primary_muscle = 'back'
  and name ~* 'hyperextension|back extension|good ?morning|superman|reverse hyper';

-- Obliques and the rest of the rotational/lateral trunk.
update exercises
set primary_muscle = 'obliques'
where is_custom = false
  and primary_muscle = 'core'
  and name ~* 'oblique|twist|side bend|side crunch|side plank|wood ?chop|windshield|woodchop';

-- Soleus: the seated calf raise, which is the whole reason the machine exists.
update exercises
set primary_muscle = 'soleus'
where is_custom = false
  and primary_muscle = 'calves'
  and name ~* 'seated';
