// POST endpoint used by OfflineSyncWatcher to flush a workout finished
// offline. Mirrors finishWorkoutAction (recompute tonnage from sets, then
// finishSession) but is idempotent: flushing an already-finished session
// returns ok so retries never wedge the queue.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getSession, finishSession } from '@/lib/db/workouts'
import { getSetsForSession } from '@/lib/db/sets'
import { ValidationError, validateUuid } from '@/lib/utils/validators'

export const dynamic = 'force-dynamic'

interface QueuedFinishBody {
  sessionId: string
}

export async function POST(request: Request) {
  const { user } = await verifySession()
  const supabase = await createClient()

  let body: QueuedFinishBody
  try {
    body = (await request.json()) as QueuedFinishBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let sessionId: string
  try {
    sessionId = validateUuid(body.sessionId, 'sessionId')
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  const session = await getSession(supabase, sessionId)
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (session.finished_at) {
    return NextResponse.json({ ok: true, alreadyFinished: true })
  }

  // Same tonnage math as finishWorkoutAction — by flush time the queued
  // sets have already landed (watcher drains sets before finishes).
  const allSets = await getSetsForSession(supabase, sessionId)
  const totalVolume = allSets
    .filter((s) => !s.is_warmup)
    .reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

  await finishSession(supabase, sessionId, totalVolume)

  revalidatePath('/dashboard')
  revalidatePath('/history')

  return NextResponse.json({ ok: true })
}
