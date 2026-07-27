// POST endpoint used by OfflineSyncWatcher to flush a queued set after the
// device comes back online. Mirrors saveSetAction's logic (auth, addSet, PR
// detection, friend-PR push) so offline-logged sets land in the DB
// identically to online ones.

import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getBestWeightForExercise } from '@/lib/db/sets'
import { calculate1RM } from '@/lib/utils/one-rep-max'
import { detectPRFromHistory } from '@/lib/services/pr.service'
import { notifyFriendsOfPR } from '@/lib/services/pr-notifications.service'
import { emitWeightPr } from '@/lib/services/activity.service'
import {
  ValidationError,
  validateReps,
  validateRpe,
  validateSetNumber,
  validateUuid,
  validateWeightKg,
} from '@/lib/utils/validators'
import { rpcErrorStatus } from '@/lib/utils/rpc-error'
import { nullableArg } from '@/lib/supabase/rpc-args'
import type { SetEntry } from '@/lib/types/models'

export const dynamic = 'force-dynamic'

interface QueuedSetBody {
  clientMutationId: string
  sessionId: string
  exerciseId: string
  setNumber: number
  weightKg: number
  reps: number
  rpe?: number
  isWarmup?: boolean
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
  let clientMutationId: string
  let exerciseId: string
  let setNumber: number
  let weightKg: number
  let reps: number
  let rpe: number | undefined
  try {
    clientMutationId = validateUuid(body.clientMutationId, 'clientMutationId')
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

  const isWarmup = body.isWarmup === true
  const calculated1rm = weightKg > 0 ? calculate1RM(weightKg, reps) : null

  const { data, error } = await supabase.rpc('save_offline_set', {
    p_client_mutation_id: clientMutationId,
    p_session_id: sessionId,
    p_exercise_id: exerciseId,
    p_set_number: setNumber,
    p_weight_kg: weightKg,
    p_reps: reps,
    p_rpe: nullableArg(rpe),
    p_calculated_1rm: nullableArg(calculated1rm),
    // Sent only when set: PostgREST resolves the function by the argument names
    // it gets, so a database that has not run the migration yet still syncs
    // ordinary sets instead of rejecting every one of them.
    ...(isWarmup ? { p_is_warmup: true } : {}),
  })
  if (error) {
    // A permanent failure has to reach the client as 4xx, or the queue retries
    // it forever and everything behind it stalls.
    const status = rpcErrorStatus(error.code)
    if (status === 500) console.error('[sets/queue] save_offline_set failed:', error)
    return NextResponse.json({ error: status === 500 ? 'Sync failed' : error.message }, { status })
  }

  const result = data as unknown as { set: SetEntry; inserted: boolean }
  const set = result.set
  if (!result.inserted) {
    return NextResponse.json({
      set,
      duplicate: true,
      prResult: {
        is_pr: false,
        previous_best: null,
        current_best: weightKg,
        improvement_pct: null,
      },
    })
  }

  // Records go by the heaviest weight actually lifted, ramp sets excluded
  // (same rule as saveSetAction).
  const prResult =
    weightKg > 0 && !isWarmup
      ? detectPRFromHistory(
          weightKg,
          await getBestWeightForExercise(supabase, user.id, exerciseId, set.id),
        )
      : { is_pr: false, previous_best: null, current_best: 0, improvement_pct: null }

  if (prResult.is_pr) {
    const { data: ex } = await supabase
      .from('exercises')
      .select('name, name_ru')
      .eq('id', exerciseId)
      .maybeSingle()
    const exerciseName = ex?.name_ru ?? ex?.name ?? 'Упражнение'
    await Promise.allSettled([
      notifyFriendsOfPR(supabase, {
        userId: user.id,
        exerciseName,
        weightKg,
        reps,
        improvementPct: prResult.improvement_pct,
      }),
      emitWeightPr(supabase, {
        userId: user.id,
        sessionId,
        exerciseId,
        exerciseName: ex?.name ?? 'Exercise',
        exerciseNameRu: ex?.name_ru ?? null,
        weightKg,
        reps,
        improvementPct: prResult.improvement_pct,
      }),
    ])
  }

  return NextResponse.json({ set, prResult })
}
