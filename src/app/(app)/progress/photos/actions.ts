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

  // Sanity: path must live under the user's folder. Reject anything that could
  // escape it (`..`, absolute paths) even though Supabase treats keys literally.
  const expectedPrefix = `${user.id}/`
  if (!data.storagePath.startsWith(expectedPrefix) || data.storagePath.includes('..')) {
    throw new Error('Invalid storage path')
  }

  // The client already caps these, but the server is the real boundary — never
  // trust client-supplied lengths / ranges / date strings.
  const caption = data.caption && data.caption.trim() ? data.caption.trim().slice(0, 200) : null
  const weightKg =
    data.weightKg != null && Number.isFinite(data.weightKg) && data.weightKg > 0
      ? Math.min(500, data.weightKg)
      : null
  const takenAtMs = Date.parse(data.takenAt)
  const takenAt = Number.isFinite(takenAtMs)
    ? new Date(takenAtMs).toISOString()
    : new Date().toISOString()

  const row = await insertProgressPhoto(
    supabase,
    user.id,
    data.storagePath,
    takenAt,
    weightKg,
    caption,
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
