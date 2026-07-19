import { getTranslations } from 'next-intl/server'
import { OneRMCalculator } from '@/components/tools/OneRMCalculator'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function OneRMPage() {
  const t = await getTranslations('tools.oneRM')

  return (
    <div className="tar-rm">
      <Link href="/progress" className="tar-fr-back tar-d-rise tar-d-rise-1">
        <ChevronLeft className="i" strokeWidth={2.5} />
        {t('back')}
      </Link>

      <h1 className="tar-fr-h tar-d-rise tar-d-rise-1">{t('title')}</h1>

      <OneRMCalculator />

      <p className="tar-rm-hint tar-d-rise tar-d-rise-4">{t('formulaHint')}</p>
    </div>
  )
}
