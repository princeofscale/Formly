import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { CardioLogForm } from '@/components/cardio/CardioLogForm'

export default async function NewCardioPage() {
  const t = await getTranslations('cardio')

  return (
    <div className="space-y-5">
      <Link
        href="/workout/new"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('back')}
      </Link>

      <h1 className="text-[28px] font-bold tracking-tight">{t('logTitle')}</h1>

      <CardioLogForm />
    </div>
  )
}
