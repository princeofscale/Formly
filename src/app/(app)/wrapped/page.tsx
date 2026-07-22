import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getWrappedReport, wrappedYear } from '@/lib/services/wrapped.service'
import { WrappedView } from '@/components/wrapped/WrappedView'

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year: yearStr } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()

  // Default to the season's year: in January that's the year that just ended.
  const now = new Date()
  const requested = yearStr ? parseInt(yearStr, 10) : wrappedYear(now)
  const year =
    Number.isFinite(requested) && requested >= 2000 && requested <= 2100
      ? requested
      : wrappedYear(now)

  const report = await getWrappedReport(supabase, user.id, year)

  return <WrappedView report={report} />
}
