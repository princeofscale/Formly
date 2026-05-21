'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { createGoal, deleteGoal } from '@/lib/db/goals'

export async function createGoalAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const exerciseId = formData.get('exerciseId')?.toString()
  const targetE1rmStr = formData.get('targetE1rm')?.toString()
  const targetDate = formData.get('targetDate')?.toString() || null
  if (!exerciseId || !targetE1rmStr) return

  const targetE1rm = Number(targetE1rmStr.replace(',', '.'))
  if (!Number.isFinite(targetE1rm) || targetE1rm <= 0) return

  await createGoal(supabase, user.id, exerciseId, targetE1rm, targetDate)
  revalidatePath('/goals')
  revalidatePath('/dashboard')
}

export async function deleteGoalAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const goalId = formData.get('goalId')?.toString()
  if (!goalId) return
  await deleteGoal(supabase, user.id, goalId)
  revalidatePath('/goals')
  revalidatePath('/dashboard')
}
