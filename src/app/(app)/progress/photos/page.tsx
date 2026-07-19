import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { listProgressPhotosWithUrls } from '@/lib/db/progress-photos'
import { PhotoGallery } from '@/components/progress/PhotoGallery'
import Link from 'next/link'
import { ChevronLeft, Lock } from 'lucide-react'

export default async function ProgressPhotosPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('progress.photos')

  const photos = await listProgressPhotosWithUrls(supabase, user.id)

  return (
    <div className="tar-ph">
      <Link href="/progress" className="tar-fr-back tar-d-rise tar-d-rise-1">
        <ChevronLeft className="i" strokeWidth={2.5} />
        {t('back')}
      </Link>

      <h1 className="tar-fr-h tar-d-rise tar-d-rise-1">{t('title')}</h1>

      <div className="tar-ph-priv tar-d-rise tar-d-rise-2">
        <Lock className="i" />
        {t('privacy')}
      </div>

      <PhotoGallery photos={photos} />
    </div>
  )
}
