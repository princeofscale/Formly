export type MuscleGroup =
  | 'chest' | 'back' | 'biceps' | 'triceps'
  | 'forearms' | 'core' | 'quads' | 'hamstrings' | 'glutes'
  | 'calves' | 'traps' | 'lats' | 'rear_delts' | 'front_delts' | 'side_delts'

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other'
export type Mechanic = 'compound' | 'isolation'
export type TrainingLocation = 'gym' | 'home' | 'both'
export type UnitSystem = 'metric' | 'imperial'

export interface Profile {
  id: string
  unit_system: UnitSystem
  weight_kg: number | null
  height_cm: number | null
  body_fat_pct: number | null
  age: number | null
  training_since: string | null
  training_location: TrainingLocation | null
  training_schedule: number[]
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  slug: string
  primary_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  mechanic: Mechanic
  equipment: Equipment
  is_custom: boolean
  created_by: string | null
}

export interface WorkoutSession {
  id: string
  user_id: string
  started_at: string
  finished_at: string | null
  notes: string | null
  mood_score: number | null
  total_volume_kg: number
}

export interface SetEntry {
  id: string
  session_id: string
  user_id: string
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  rpe: number | null
  calculated_1rm: number | null
  rest_seconds: number | null
  created_at: string
}

export interface MuscleVolume {
  muscle: MuscleGroup
  direct_sets: number
  indirect_sets: number
  total_sets: number
}

export interface PRResult {
  is_pr: boolean
  previous_1rm: number | null
  current_1rm: number
  improvement_pct: number | null
}

export interface ExerciseWithSets extends Exercise {
  sets: SetEntry[]
}

export interface ProgressionSuggestion {
  exercise_id: string
  exercise_name: string
  current_weight_kg: number
  suggested_weight_kg: number
  reason: string
}

export interface VolumeLandmark {
  muscle: MuscleGroup
  weekly_sets: number
  status: 'mv' | 'optimal' | 'mrv'
}
