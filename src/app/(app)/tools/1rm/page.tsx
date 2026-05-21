import { getTranslations } from 'next-intl/server'
import { OneRMCalculator } from '@/components/tools/OneRMCalculator'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function OneRMPage() {
  const t = await getTranslations('tools.oneRM')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href="/progress"
          className="flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('back')}
        </Link>
      </div>

      <h1 className="text-[28px] font-bold tracking-tight">{t('title')}</h1>

      <OneRMCalculator />

      <p className="text-[10px] leading-relaxed text-white/35">
        {t('formulaHint')}
      </p>
    </div>
  )
}
