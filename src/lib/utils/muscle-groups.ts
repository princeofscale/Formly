import type { MuscleGroup } from '@/lib/types/models'

/**
 * Every value of the `muscle_group` database enum, in the order the exercise
 * form offers them. One list: a value added here and to the enum reaches the
 * picker, the create-exercise form and its server-side schema at once.
 */
export const MUSCLE_VALUES = [
  'chest_upper',
  'chest',
  'chest_lower',
  'back',
  'lats',
  'traps',
  'lower_back',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'soleus',
] as const satisfies readonly MuscleGroup[]

/**
 * Region → the group it recovers with. Weekly volume landmarks are a property
 * of the muscle, not of the angle you hit it from: six sets of incline press
 * is not an under-trained chest if flat and decline fill the rest of the week.
 *
 * `lats` and `traps` are not listed on purpose. They have always been counted
 * separately from `back`, several features read them that way, and folding
 * them in now would change numbers nobody asked about.
 */
export const MUSCLE_PARENT: Partial<Record<MuscleGroup, MuscleGroup>> = {
  chest_upper: 'chest',
  chest_lower: 'chest',
  lower_back: 'back',
  obliques: 'core',
  soleus: 'calves',
}

export function parentMuscle(muscle: MuscleGroup): MuscleGroup {
  return MUSCLE_PARENT[muscle] ?? muscle
}

export type MuscleBucket = 'chest' | 'back' | 'legs' | 'shoulder' | 'arms' | 'core'

const BUCKET_OF: Record<MuscleGroup, MuscleBucket> = {
  chest: 'chest',
  chest_upper: 'chest',
  chest_lower: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  lower_back: 'back',
  rear_delts: 'back',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  soleus: 'legs',
  front_delts: 'shoulder',
  side_delts: 'shoulder',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  core: 'core',
  obliques: 'core',
  cardio: 'core',
}

/** Broad grouping for icons, library tabs and the records screen. */
export function muscleBucket(m: MuscleGroup): MuscleBucket {
  return BUCKET_OF[m] ?? 'core'
}
