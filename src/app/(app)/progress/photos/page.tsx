import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { listProgressPhotosWithUrls } from '@/lib/db/progress-photos'
import { PhotoGallery } from '@/components/progress/PhotoGallery'
import { PhotoUploadCard } from '@/components/progress/PhotoUploadCard'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function ProgressPhotosPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('progress.photos')

  const photos = await listProgressPhotosWithUrls(supabase, user.id)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/progress"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('back')}
        </Link>
      </div>

      <h1 className="text-[28px] font-bold tracking-tight">{t('title')}</h1>

      <PhotoUploadCard />

      <PhotoGallery photos={photos} />
    </div>
  )
}
