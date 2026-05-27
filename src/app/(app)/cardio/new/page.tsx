import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { CardioLogForm } from '@/components/cardio/CardioLogForm'

export default async function NewCardioPage() {
  const t = await getTranslations('cardio')

  return (
    <div className="space-y-3 pb-4">
      <Link
        href="/workout/new"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('back')}
      </Link>

      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <div className="tar-d-eyebrow">{t('eyebrow')}</div>
        <h1 className="tar-d-hello-name" style={{ fontSize: 28, marginTop: 4 }}>
          {t('heroTitle')}
        </h1>
      </div>

      <CardioLogForm />
    </div>
  )
}
