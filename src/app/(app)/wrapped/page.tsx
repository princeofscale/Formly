import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getWrappedReport } from '@/lib/services/wrapped.service'
import { WrappedView } from '@/components/wrapped/WrappedView'

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year: yearStr } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()

  const now = new Date()
  const requested = yearStr ? parseInt(yearStr, 10) : now.getUTCFullYear()
  const year =
    Number.isFinite(requested) && requested >= 2000 && requested <= 2100
      ? requested
      : now.getUTCFullYear()

  const report = await getWrappedReport(supabase, user.id, year)

  return <WrappedView report={report} />
}
