export type Formula = 'brzycki' | 'epley'

export function selectFormula(reps: number): Formula {
  return reps < 10 ? 'brzycki' : 'epley'
}

export function calculate1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0) throw new Error('Weight must be positive')
  if (reps <= 0) throw new Error('Reps must be positive')
  if (reps === 1) return weightKg

  if (selectFormula(reps) === 'brzycki') {
    return weightKg / (1.0278 - 0.0278 * reps)
  }
  return weightKg * (1 + 0.0333 * reps)
}
