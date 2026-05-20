'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { insertProgressPhoto, deleteProgressPhoto } from '@/lib/db/progress-photos'

export async function registerProgressPhotoAction(data: {
  storagePath: string
  takenAt: string
  weightKg: number | null
  caption: string | null
}): Promise<{ ok: true; id: string }> {
  const { user } = await verifySession()
  const supabase = await createClient()

  // Sanity: path must live under the user's folder
  const expectedPrefix = `${user.id}/`
  if (!data.storagePath.startsWith(expectedPrefix)) {
    throw new Error('Invalid storage path')
  }

  const row = await insertProgressPhoto(
    supabase,
    user.id,
    data.storagePath,
    data.takenAt,
    data.weightKg,
    data.caption,
  )
  revalidatePath('/progress/photos')
  revalidatePath('/progress')
  return { ok: true, id: row.id }
}

export async function deleteProgressPhotoAction(photoId: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await deleteProgressPhoto(supabase, user.id, photoId)
  revalidatePath('/progress/photos')
  revalidatePath('/progress')
}
