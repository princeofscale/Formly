// Generates a warm-up ramp before a working set. Standard scheme used by
// most intermediate lifters: 50% / 70% / 85% of the working weight with
// descending rep counts. Skips warm-ups entirely for very light working
// weights (< 30 kg) where you'd just be wasting time.

export interface WarmupSet {
  weightKg: number
  reps: number
}

export function calculateWarmupSets(workingWeightKg: number): WarmupSet[] {
  if (!Number.isFinite(workingWeightKg) || workingWeightKg < 30) return []

  // Step size keyed off the *working* weight, not each warmup individually,
  // so a heavy ramp uses 5 kg precision throughout (no mixed 97.5 / 100 jumps).
  const step = workingWeightKg >= 100 ? 5 : 2.5

  // Three-step ramp; same scheme RP / 5-3-1 / Greg Nuckols use for the
  // intermediate weight range. Top warm-up at 85% × 3 is the "pre-work" set.
  const plan: Array<{ pct: number; reps: number }> = [
    { pct: 0.5, reps: 8 },
    { pct: 0.7, reps: 5 },
    { pct: 0.85, reps: 3 },
  ]

  return plan.map(({ pct, reps }) => ({
    weightKg: Math.max(0, Math.round((workingWeightKg * pct) / step) * step),
    reps,
  }))
}
