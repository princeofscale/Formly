import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => {
    throw new Error('Supabase must not be called without consent')
  }),
}))

import { registerAction } from './actions'

describe('registerAction', () => {
  it('rejects registration without legal consent before contacting Supabase', async () => {
    const formData = new FormData()
    formData.set('email', 'person@example.com')
    formData.set('password', 'StrongPass1!')

    await expect(registerAction(null, formData)).resolves.toEqual({
      errorKey: 'auth.errors.legalRequired',
    })
  })

  it('continues to credential validation when consent is present', async () => {
    const formData = new FormData()
    formData.set('email', 'invalid')
    formData.set('password', 'StrongPass1!')
    formData.set('agree', 'on')

    await expect(registerAction(null, formData)).resolves.toEqual({
      errorKey: 'auth.errors.invalidCredentials',
    })
  })
})
