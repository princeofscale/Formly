import { describe, expect, it } from 'vitest'
import { ALTERNATIVE_RULES } from './exercise-alternatives.service'

describe('ALTERNATIVE_RULES', () => {
  it('asks for a guided variant when the target is a barbell movement', () => {
    expect(ALTERNATIVE_RULES).toMatch(/barbell/i)
    expect(ALTERNATIVE_RULES).toMatch(/machine or cable/i)
    expect(ALTERNATIVE_RULES).toMatch(/include at least one/i)
  })

  it('keeps the same primary muscle as the hard constraint', () => {
    expect(ALTERNATIVE_RULES).toMatch(/same primary muscle/i)
  })

  it('requires every reason to name what the alternative shares', () => {
    expect(ALTERNATIVE_RULES).toMatch(/reason must name what the alternative shares/i)
  })

  it('carries no imperative coaching cues of its own', () => {
    // The tone contract lives in aiToneBlock; these rules must not smuggle in
    // the "push it"/"hold" register the progression hints were cleaned of.
    expect(ALTERNATIVE_RULES).not.toMatch(/\bpush it\b|\bhold\b|\bgo heavy\b/i)
  })
})
