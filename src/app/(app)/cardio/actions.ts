'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { createCardioSession, deleteCardioSession, type CardioActivity } from '@/lib/db/cardio'

const ACTIVITIES: readonly CardioActivity[] = [
  'running',
  'cycling',
  'walking',
  'swimming',
  'rowing',
  'elliptical',
  'hiit',
  'other',
] as const

export async function logCardioAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const activity = String(formData.get('activity') ?? '')
  if (!ACTIVITIES.includes(activity as CardioActivity)) throw new Error('Invalid activity')

  const durationMin = parseFloat(String(formData.get('duration_min') ?? ''))
  if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 600) {
    throw new Error('Duration must be between 0 and 600 minutes')
  }

  const distRaw = String(formData.get('distance_km') ?? '').trim()
  const distance = distRaw ? parseFloat(distRaw) : null
  if (distance != null && (!Number.isFinite(distance) || distance < 0 || distance > 500)) {
    throw new Error('Invalid distance')
  }

  const hrRaw = String(formData.get('avg_hr') ?? '').trim()
  const avgHr = hrRaw ? parseInt(hrRaw, 10) : null
  if (avgHr != null && (!Number.isFinite(avgHr) || avgHr <= 0 || avgHr >= 250)) {
    throw new Error('Invalid heart rate')
  }

  const calRaw = String(formData.get('calories') ?? '').trim()
  const calories = calRaw ? parseInt(calRaw, 10) : null
  if (calories != null && (!Number.isFinite(calories) || calories < 0)) {
    throw new Error('Invalid calories')
  }

  const notes = String(formData.get('notes') ?? '').slice(0, 500) || null

  await createCardioSession(supabase, user.id, {
    activity: activity as CardioActivity,
    durationSeconds: Math.round(durationMin * 60),
    distanceKm: distance,
    avgHr,
    calories,
    notes,
  })

  revalidatePath('/dashboard')
  revalidatePath('/history')
  redirect('/dashboard')
}

export async function deleteCardioAction(sessionId: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await deleteCardioSession(supabase, sessionId, user.id)
  revalidatePath('/dashboard')
  revalidatePath('/history')
}
