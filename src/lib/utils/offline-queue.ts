// IndexedDB queue for sets logged while offline. Flushed by OfflineSyncWatcher
// once the device comes back online.

// Keep the legacy name so queued workouts survive the Formly rebrand.
const DB_NAME = 'trainingar-offline'
const DB_VERSION = 3
const STORE = 'set_queue'
const FINISH_STORE = 'finish_queue'
const DEAD_LETTER_STORE = 'dead_letter'

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
  ownerId?: string
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
      if (!db.objectStoreNames.contains(DEAD_LETTER_STORE)) {
        db.createObjectStore(DEAD_LETTER_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close()
      resolve(req.result)
    }
    req.onerror = () => reject(req.error)
  })
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function enqueueSet(payload: QueuedSetPayload, ownerId: string): Promise<string> {
  const db = await openDb()
  const id = genId()
  const record: QueuedSetRecord = { id, ownerId, payload, queuedAt: Date.now() }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getQueuedSets(ownerId: string): Promise<QueuedSetRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () =>
      resolve(
        ((req.result as QueuedSetRecord[]) ?? []).filter((record) =>
          isRecordForOwner(record, ownerId),
        ),
      )
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

// --- Finish queue: a workout finished offline waits here until online. ---

export interface QueuedFinishRecord {
  id: string
  ownerId?: string
  sessionId: string
  queuedAt: number
}

/** Pure so it's testable without IndexedDB. */
export function hasQueuedFinish(records: QueuedFinishRecord[], sessionId: string): boolean {
  return records.some((r) => r.sessionId === sessionId)
}

/** Records created before v3 have no owner; the server verifies their session ownership. */
export function isRecordForOwner(
  record: Pick<QueuedSetRecord | QueuedFinishRecord, 'ownerId'>,
  ownerId: string,
): boolean {
  return record.ownerId === undefined || record.ownerId === ownerId
}

export async function getQueuedFinishes(ownerId: string): Promise<QueuedFinishRecord[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FINISH_STORE, 'readonly')
    const req = tx.objectStore(FINISH_STORE).getAll()
    req.onsuccess = () =>
      resolve(
        ((req.result as QueuedFinishRecord[]) ?? []).filter((record) =>
          isRecordForOwner(record, ownerId),
        ),
      )
    req.onerror = () => reject(req.error)
  })
}

/** Idempotent per session: re-queuing an already-queued finish is a no-op. */
export async function enqueueFinish(sessionId: string, ownerId: string): Promise<string> {
  const existing = await getQueuedFinishes(ownerId)
  const dup = existing.find((r) => r.sessionId === sessionId)
  if (dup) return dup.id

  const db = await openDb()
  const record: QueuedFinishRecord = { id: genId(), ownerId, sessionId, queuedAt: Date.now() }
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

async function moveToDeadLetter(
  kind: 'set' | 'finish',
  record: QueuedSetRecord | QueuedFinishRecord,
  status: number,
  error: string,
): Promise<void> {
  const db = await openDb()
  const sourceStore = kind === 'set' ? STORE : FINISH_STORE
  return new Promise((resolve, reject) => {
    const tx = db.transaction([sourceStore, DEAD_LETTER_STORE], 'readwrite')
    tx.objectStore(DEAD_LETTER_STORE).put({
      id: `${kind}:${record.id}`,
      kind,
      ownerId: record.ownerId,
      record,
      status,
      error: error.slice(0, 500),
      failedAt: Date.now(),
    })
    tx.objectStore(sourceStore).delete(record.id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function moveQueuedSetToDeadLetter(
  record: QueuedSetRecord,
  status: number,
  error: string,
): Promise<void> {
  return moveToDeadLetter('set', record, status, error)
}

export function moveQueuedFinishToDeadLetter(
  record: QueuedFinishRecord,
  status: number,
  error: string,
): Promise<void> {
  return moveToDeadLetter('finish', record, status, error)
}

export async function clearOfflineData(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onblocked = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
