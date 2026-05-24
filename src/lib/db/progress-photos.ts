import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProgressPhoto {
  id: string
  user_id: string
  storage_path: string
  taken_at: string
  weight_kg: number | null
  caption: string | null
  created_at: string
}

export interface ProgressPhotoWithUrl extends ProgressPhoto {
  signed_url: string | null
}

export const PROGRESS_BUCKET = 'progress-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

export async function listProgressPhotos(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProgressPhoto[]> {
  const { data } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
  return (data as ProgressPhoto[]) ?? []
}

export async function listProgressPhotosWithUrls(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProgressPhotoWithUrl[]> {
  const rows = await listProgressPhotos(supabase, userId)
  if (rows.length === 0) return []

  const paths = rows.map((r) => r.storage_path)
  const { data: signed } = await supabase.storage
    .from(PROGRESS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  const urlByPath = new Map<string, string>()
  for (const s of signed ?? []) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
  }

  return rows.map((r) => ({ ...r, signed_url: urlByPath.get(r.storage_path) ?? null }))
}

export async function insertProgressPhoto(
  supabase: SupabaseClient,
  userId: string,
  storagePath: string,
  takenAt: string,
  weightKg: number | null,
  caption: string | null,
): Promise<ProgressPhoto> {
  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      user_id: userId,
      storage_path: storagePath,
      taken_at: takenAt,
      weight_kg: weightKg,
      caption: caption && caption.trim() ? caption.trim() : null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ProgressPhoto
}

export async function deleteProgressPhoto(
  supabase: SupabaseClient,
  userId: string,
  photoId: string,
): Promise<{ storage_path: string } | null> {
  const { data: existing } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('user_id', userId)
    .single()

  if (!existing) return null

  const { error } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)

  // Remove the underlying file (best-effort; RLS allows owner)
  await supabase.storage.from(PROGRESS_BUCKET).remove([existing.storage_path])

  return existing as { storage_path: string }
}
