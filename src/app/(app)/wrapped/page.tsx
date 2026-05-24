import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { getWrappedReport } from '@/lib/services/wrapped.service'
import { WrappedView } from '@/components/wrapped/WrappedView'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year: yearStr } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('wrapped')

  const now = new Date()
  const requested = yearStr ? parseInt(yearStr, 10) : now.getUTCFullYear()
  const year =
    Number.isFinite(requested) && requested >= 2000 && requested <= 2100
      ? requested
      : now.getUTCFullYear()

  const report = await getWrappedReport(supabase, user.id, year)

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('back')}
      </Link>

      <WrappedView report={report} />
    </div>
  )
}
