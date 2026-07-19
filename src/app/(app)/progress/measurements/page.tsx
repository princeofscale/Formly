import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { getMeasurementForDate, getRecentMeasurements } from '@/lib/db/body-measurements'
import { MeasurementForm } from '@/components/progress/MeasurementForm'
import { MeasurementHistory } from '@/components/progress/MeasurementHistory'
import { MeasurementSparks } from '@/components/progress/MeasurementSparks'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function MeasurementsPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('progress.measurements')

  const today = new Date().toISOString().slice(0, 10)
  const [todayEntry, history] = await Promise.all([
    getMeasurementForDate(supabase, user.id, today),
    getRecentMeasurements(supabase, user.id, 30),
  ])

  return (
    <div className="tar-ms">
      <Link href="/progress" className="tar-fr-back tar-d-rise tar-d-rise-1">
        <ChevronLeft className="i" strokeWidth={2.5} />
        {t('back')}
      </Link>

      <h1 className="tar-fr-h tar-d-rise tar-d-rise-1">{t('title')}</h1>

      <MeasurementSparks entries={history} />

      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-3">{t('formTitle')}</div>
      <div className="tar-d-rise tar-d-rise-3">
        <MeasurementForm initial={todayEntry} defaultDate={today} hasHistory={history.length > 0} />
      </div>

      <div className="tar-d-sectionhead tar-d-rise tar-d-rise-4">{t('historyTitle')}</div>
      <MeasurementHistory entries={history} />
    </div>
  )
}
