// Server-side bound checks for client-supplied workout values.
// RLS already restricts who can write to whose rows; these guards protect the
// *shape* of the data — preventing things like negative weights, 99999 reps,
// or NaN slipping into the DB and breaking aggregates / analytics later.

export class ValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`${field}: ${reason}`)
    this.name = 'ValidationError'
  }
}

// Realistic gym bounds. Bench/Squat/Deadlift world records sit around 500kg,
// so 1000 leaves headroom for sled/leg-press while still rejecting garbage.
const MAX_WEIGHT_KG = 1000
const MAX_REPS = 200
const MAX_SET_NUMBER = 99

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateWeightKg(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError('weightKg', 'must be a finite number')
  }
  if (value < 0 || value > MAX_WEIGHT_KG) {
    throw new ValidationError('weightKg', `must be 0..${MAX_WEIGHT_KG}`)
  }
  return value
}

export function validateReps(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > MAX_REPS) {
    throw new ValidationError('reps', `must be an integer in 1..${MAX_REPS}`)
  }
  return value as number
}

export function validateRpe(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 10) {
    throw new ValidationError('rpe', 'must be 1..10 or omitted')
  }
  return value
}

export function validateSetNumber(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > MAX_SET_NUMBER) {
    throw new ValidationError('setNumber', `must be an integer in 1..${MAX_SET_NUMBER}`)
  }
  return value as number
}

export function validateUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new ValidationError(field, 'must be a UUID')
  }
  return value
}
