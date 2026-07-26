import { describe, expect, it } from 'vitest'
import { underworkedMuscles } from './underworked-muscles'

describe('underworkedMuscles', () => {
  it('counts delt work under the shoulders label', () => {
    // The regression this guards: sets land on front/side/rear delts, so a
    // lookup for a literal 'shoulders' key always missed and every athlete was
    // told they had skipped shoulders.
    const sets = new Map([
      ['front_delts', 2],
      ['side_delts', 2],
    ])
    expect(underworkedMuscles(sets)).not.toContain('shoulders')
  })

  it('still reports shoulders when delt work is genuinely thin', () => {
    expect(underworkedMuscles(new Map([['side_delts', 2]]))).toContain('shoulders')
  })

  it('counts lat work towards back', () => {
    expect(underworkedMuscles(new Map([['lats', 4]]))).not.toContain('back')
  })

  it('reports every label when nothing was trained', () => {
    expect(underworkedMuscles(new Map())).toEqual([
      'chest',
      'back',
      'quads',
      'hamstrings',
      'glutes',
      'biceps',
      'triceps',
      'shoulders',
    ])
  })

  it('reports nothing when every group is covered', () => {
    const sets = new Map([
      ['chest', 3],
      ['back', 3],
      ['quads', 3],
      ['hamstrings', 3],
      ['glutes', 3],
      ['biceps', 3],
      ['triceps', 3],
      ['rear_delts', 3],
    ])
    expect(underworkedMuscles(sets)).toEqual([])
  })
})
