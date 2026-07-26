export type SyncDecision = 'success' | 'dead-letter' | 'auth' | 'retry'

export function classifySyncStatus(status: number): SyncDecision {
  if (status >= 200 && status < 300) return 'success'
  if (status === 401) return 'auth'
  if (status >= 400 && status < 500) return 'dead-letter'
  return 'retry'
}
