// POST endpoint used by OfflineSyncWatcher to flush a workout finished
// offline. Runs the same completion path as the in-app button so an offline
// workout lands identically: atomic tonnage, finished-workout and volume-PR
// events, and the streak milestone. It stays idempotent — flushing an
// already-finished session returns ok so retries never wedge the queue.

import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/db/workouts'
import { finishWorkout } from '@/lib/services/workout-finish.service'
import { rpcErrorStatus } from '@/lib/utils/rpc-error'
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

  const { error } = await finishWorkout(supabase, user.id, sessionId)
  if (error) {
    const status = rpcErrorStatus(error.code)
    if (status === 500) console.error('[workouts/finish-queue] finish_workout failed:', error)
    return NextResponse.json({ error: status === 500 ? 'Sync failed' : error.message }, { status })
  }

  revalidatePath('/dashboard')
  revalidatePath('/history')

  return NextResponse.json({ ok: true })
}
