import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from './safe-redirect'

describe('safeRedirectPath', () => {
  it.each(['/dashboard', '/history/abc?finished=1', '/'])('accepts internal path %s', (path) => {
    expect(safeRedirectPath(path)).toBe(path)
  })

  it.each([null, '', 'dashboard', '//evil.example', 'https://evil.example', '\\\\evil.example'])(
    'rejects unsafe target %s',
    (target) => {
      expect(safeRedirectPath(target)).toBe('/dashboard')
    },
  )
})
