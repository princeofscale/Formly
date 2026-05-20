import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import {
  getMeasurementForDate,
  getRecentMeasurements,
} from '@/lib/db/body-measurements'
import { MeasurementForm } from '@/components/progress/MeasurementForm'
import { MeasurementHistory } from '@/components/progress/MeasurementHistory'
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

      <MeasurementForm initial={todayEntry} defaultDate={today} />

      <h2 className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        {t('historyTitle')}
      </h2>

      <MeasurementHistory entries={history} />
    </div>
  )
}
