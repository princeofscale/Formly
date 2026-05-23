'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySession } from '@/lib/dal'

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function deleteAccountAction() {
  // verifySession redirects to /login if not authenticated, so user.id is safe.
  // Admin client is required: auth.admin.deleteUser bypasses the user-scoped
  // client. The user can only delete *their own* row because we pass user.id
  // from the verified session — never a value from the request body.
  const { user } = await verifySession()

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('deleteAccountAction failed:', error.message)
    throw new Error('Failed to delete account')
  }

  // FK cascades take care of profile, sessions, sets, friendships, push subs, etc.
  // Sign out the now-orphan session and bounce to login.
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
