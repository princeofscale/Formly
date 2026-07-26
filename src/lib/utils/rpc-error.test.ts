import { describe, expect, it } from 'vitest'
import { rpcErrorStatus } from './rpc-error'
import { classifySyncStatus } from '@/components/workout/offline-sync'

describe('rpcErrorStatus', () => {
  it('treats a missing or finished session as permanent', () => {
    // save_offline_set raises 22023 for "workout session not found", which
    // covers a session that is gone, already finished, or someone else's.
    expect(rpcErrorStatus('22023')).toBe(422)
    expect(classifySyncStatus(rpcErrorStatus('22023'))).toBe('dead-letter')
  })

  it('treats a missing authenticated user as an auth failure', () => {
    expect(rpcErrorStatus('42501')).toBe(401)
    expect(classifySyncStatus(rpcErrorStatus('42501'))).toBe('auth')
  })

  it('lets an unrecognized database failure be retried', () => {
    // A deadlock or a dropped connection is temporary; the record must stay
    // in the queue rather than be discarded.
    expect(rpcErrorStatus('40P01')).toBe(500)
    expect(classifySyncStatus(rpcErrorStatus('40P01'))).toBe('retry')
  })

  it('retries when the driver reported no code at all', () => {
    expect(rpcErrorStatus(undefined)).toBe(500)
    expect(rpcErrorStatus(null)).toBe(500)
  })
})
