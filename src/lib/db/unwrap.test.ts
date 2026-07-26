import { describe, expect, it } from 'vitest'
import { unwrap, unwrapRows, DatabaseError } from './unwrap'
import type { PostgrestError } from '@supabase/supabase-js'

const failure: PostgrestError = {
  message: 'connection terminated',
  details: '',
  hint: '',
  code: '08006',
  name: 'PostgrestError',
  toJSON: () => ({
    name: 'PostgrestError',
    message: 'connection terminated',
    details: '',
    hint: '',
    code: '08006',
  }),
}

describe('unwrapRows', () => {
  it('returns the rows when the query succeeded', () => {
    expect(unwrapRows({ data: [{ id: 1 }], error: null }, 'sessions')).toEqual([{ id: 1 }])
  })

  it('returns an empty list when the query succeeded and matched nothing', () => {
    // A genuine "no rows" answer must stay an empty list; only a failure throws.
    expect(unwrapRows({ data: [], error: null }, 'sessions')).toEqual([])
    expect(unwrapRows({ data: null, error: null }, 'sessions')).toEqual([])
  })

  it('throws when the query failed rather than reporting no data', () => {
    // The regression this guards: a failed read used to be indistinguishable
    // from an empty one, so a database outage looked like an empty account.
    expect(() => unwrapRows({ data: null, error: failure }, 'sessions')).toThrow(DatabaseError)
  })

  it('names what was being read and keeps the SQL state', () => {
    try {
      unwrapRows({ data: null, error: failure }, 'finished sessions')
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(DatabaseError)
      expect((err as Error).message).toContain('finished sessions')
      expect((err as DatabaseError).code).toBe('08006')
    }
  })
})

describe('unwrap', () => {
  it('passes a single row through, including a legitimate null', () => {
    expect(unwrap({ data: { id: 1 }, error: null }, 'profile')).toEqual({ id: 1 })
    expect(unwrap({ data: null, error: null }, 'profile')).toBeNull()
  })

  it('throws on failure', () => {
    expect(() => unwrap({ data: null, error: failure }, 'profile')).toThrow(DatabaseError)
  })
})
