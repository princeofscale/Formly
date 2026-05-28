export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'traps'
  | 'lats'
  | 'rear_delts'
  | 'front_delts'
  | 'side_delts'
  | 'cardio'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'smith'
  | 'ez_bar'
  | 'kettlebell'
  | 'band'
  | 'plate'
  | 'other'
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
  locale: string | null
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
  name_ru?: string | null
  instructions_en?: string | null
  instructions_ru?: string | null
  image_urls?: string[]
  aliases?: string[]
}

export type CardioActivity =
  | 'running'
  | 'cycling'
  | 'walking'
  | 'swimming'
  | 'rowing'
  | 'elliptical'
  | 'hiit'
  | 'other'

export interface WorkoutSession {
  id: string
  user_id: string
  started_at: string
  finished_at: string | null
  notes: string | null
  mood_score: number | null
  total_volume_kg: number
  session_type?: 'strength' | 'cardio'
  cardio_activity?: CardioActivity | null
  cardio_duration_seconds?: number | null
  cardio_distance_km?: number | null
  cardio_avg_hr?: number | null
  cardio_calories?: number | null
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
  is_warmup?: boolean
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

export interface TemplateExercise {
  exercise_id: string
  name: string
  name_ru?: string | null
  default_weight_kg?: number | null
  default_reps?: number | null
}

export interface WorkoutTemplate {
  id: string
  user_id: string
  name: string
  exercises: TemplateExercise[]
  created_at: string
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

export interface AIInsightItem {
  type: 'today' | 'progression' | 'prediction' | 'warning'
  title: string
  body: string
  detail?: string
}

export interface AIInsights {
  items: AIInsightItem[]
  generated_at: string
}

export interface StreakInfo {
  current: number
  longest: number
  last_workout_date: string | null
  /** How many freeze "lives" exist per calendar month (0 = freezes disabled). */
  freezes_per_month?: number
  /** Freezes consumed in the *current* calendar month within the active streak. */
  freezes_used_this_month?: number
}

export interface DayActivity {
  date: string // YYYY-MM-DD
  sets: number
}

export interface ExerciseNote {
  user_id: string
  exercise_id: string
  note: string
  updated_at: string
}
