// Shared 6-step heat palette for muscle-volume visualization. Used by both the
// 2D SVG fallback (MuscleHeatmap2D) and the 3D toon-shader version (MuscleHeatmap3D).

import type { MuscleGroup, MuscleVolume } from '@/lib/types/models'

export const HEAT = ['#272733', '#451F25', '#723036', '#B63C45', '#FF3B47', '#FF7A82'] as const

export const MUSCLE_GROUPS_ORDERED: MuscleGroup[] = [
  'chest', 'back', 'lats', 'traps',
  'front_delts', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'forearms',
  'core', 'quads', 'hamstrings', 'glutes', 'calves',
]

export function volumeFor(muscle: MuscleGroup, volumes: MuscleVolume[]): number {
  return volumes.find(mv => mv.muscle === muscle)?.total_sets ?? 0
}

export function colorForSets(sets: number): string {
  if (sets <= 0) return HEAT[0]
  if (sets <= 2) return HEAT[1]
  if (sets <= 5) return HEAT[2]
  if (sets <= 9) return HEAT[3]
  if (sets <= 14) return HEAT[4]
  return HEAT[5]
}

/** 0..1 intensity scale used by the 3D shader uniforms. */
export function heatIntensity(sets: number): number {
  if (sets <= 0) return 0
  if (sets <= 2) return 0.2
  if (sets <= 5) return 0.4
  if (sets <= 9) return 0.6
  if (sets <= 14) return 0.8
  return 1.0
}

export function opacityForSets(sets: number): number {
  return sets <= 0 ? 0.68 : 1
}
