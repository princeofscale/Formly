// POST endpoint used by OfflineSyncWatcher to flush a queued set after the
// device comes back online. Mirrors saveSetAction's logic (auth, addSet, PR
// detection, goal check, friend-PR push) so offline-logged sets land in the
// DB identically to online ones.

import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { addSet, getBestE1RMForExercise } from '@/lib/db/sets'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import { detectPRFromHistory } from '@/lib/services/pr.service'
import { notifyFriendsOfPR } from '@/lib/services/pr-notifications.service'
import { checkGoalAchievement } from '@/lib/db/goals'
import {
  ValidationError,
  validateReps,
  validateRpe,
  validateSetNumber,
  validateUuid,
  validateWeightKg,
} from '@/lib/utils/validators'

export const dynamic = 'force-dynamic'

interface QueuedSetBody {
  sessionId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  rpe?: number
}

export async function POST(request: Request) {
  const { user } = await verifySession()
  const supabase = await createClient()

  let body: QueuedSetBody
  try {
    body = (await request.json()) as QueuedSetBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let sessionId: string
  let exerciseId: string
  let setNumber: number
  let weightKg: number
  let reps: number
  let rpe: number | undefined
  try {
    sessionId = validateUuid(body.sessionId, 'sessionId')
    exerciseId = validateUuid(body.exerciseId, 'exerciseId')
    setNumber = validateSetNumber(body.setNumber)
    weightKg = validateWeightKg(body.weightKg)
    reps = validateReps(body.reps)
    rpe = validateRpe(body.rpe)
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  const calculated1rm = weightKg > 0 ? calculate1RM(weightKg, reps) : null

  const set = await addSet(supabase, {
    sessionId,
    userId: user.id,
    exerciseId,
    setNumber,
    weightKg,
    reps,
    rpe,
    calculated1rm,
  })

  const prResult =
    calculated1rm != null
      ? detectPRFromHistory(
          calculated1rm,
          await getBestE1RMForExercise(supabase, user.id, exerciseId, set.id),
        )
      : { is_pr: false, previous_1rm: null, current_1rm: 0, improvement_pct: null }

  if (calculated1rm != null) {
    void checkGoalAchievement(supabase, user.id, exerciseId, calculated1rm)
  }

  if (prResult.is_pr && calculated1rm != null) {
    const { data: ex } = await supabase
      .from('exercises')
      .select('name, name_ru')
      .eq('id', exerciseId)
      .maybeSingle()
    const exerciseName = ex?.name_ru ?? ex?.name ?? 'Упражнение'
    void notifyFriendsOfPR(supabase, {
      userId: user.id,
      exerciseName,
      weightKg,
      reps,
      e1rm: calculated1rm,
      improvementPct: prResult.improvement_pct,
    })
  }

  return NextResponse.json({ set, prResult })
}
