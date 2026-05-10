'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

export async function deleteSessionAction(sessionId: string) {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('user_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.user_id !== user.id) {
    throw new Error('Not found')
  }

  await supabase.from('set_entries').delete().eq('session_id', sessionId)
  await supabase.from('workout_sessions').delete().eq('id', sessionId)

  revalidatePath('/history')
  redirect('/history')
}
