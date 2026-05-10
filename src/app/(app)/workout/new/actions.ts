'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createSession } from '@/lib/db/workouts'
import { verifySession } from '@/lib/dal'

export async function startWorkoutAction(): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const session = await createSession(supabase, user.id)
  redirect(`/workout/${session.id}`)
}
