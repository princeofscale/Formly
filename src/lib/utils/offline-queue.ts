// IndexedDB queue for sets logged while offline. Flushed by OfflineSyncWatcher
// once the device comes back online.

// Keep the legacy name so queued workouts survive the Formly rebrand.
const DB_NAME = 'trainingar-offline'
const DB_VERSION = 2
const STORE = 'set_queue'
const FINISH_STORE = 'finish_queue'

export interface QueuedSetPayload {
  sessionId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  rpe?: number
}

export interface QueuedSetRecord {
  id: string
  payload: QueuedSetPayload
  queuedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(FINISH_STORE)) {
        db.createObjectStore(FINISH_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function enqueueSet(payload: QueuedSetPayload): Promise<string> {
  const db = await openDb()
  const id = genId()
  const record: QueuedSetRecord = { id, payload, queuedAt: Date.now() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueuedSets(): Promise<QueuedSetRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as QueuedSetRecord[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

export async function removeQueuedSet(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueueSize(): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// --- Finish queue: a workout finished offline waits here until online. ---

export interface QueuedFinishRecord {
  id: string
  sessionId: string
  queuedAt: number
}

/** Pure so it's testable without IndexedDB. */
export function hasQueuedFinish(records: QueuedFinishRecord[], sessionId: string): boolean {
  return records.some((r) => r.sessionId === sessionId)
}

export async function getQueuedFinishes(): Promise<QueuedFinishRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINISH_STORE, 'readonly')
    const req = tx.objectStore(FINISH_STORE).getAll()
    req.onsuccess = () => resolve((req.result as QueuedFinishRecord[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

/** Idempotent per session: re-queuing an already-queued finish is a no-op. */
export async function enqueueFinish(sessionId: string): Promise<string> {
  const existing = await getQueuedFinishes()
  const dup = existing.find((r) => r.sessionId === sessionId)
  if (dup) return dup.id

  const db = await openDb()
  const record: QueuedFinishRecord = { id: genId(), sessionId, queuedAt: Date.now() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINISH_STORE, 'readwrite')
    tx.objectStore(FINISH_STORE).put(record)
    tx.oncomplete = () => resolve(record.id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function removeQueuedFinish(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINISH_STORE, 'readwrite')
    tx.objectStore(FINISH_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
