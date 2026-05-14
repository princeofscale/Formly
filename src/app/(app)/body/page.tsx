import { Activity } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getMeasurements } from '@/lib/db/body-measurements'
import { CurrentSnapshot } from '@/components/body/CurrentSnapshot'
import { MeasurementForm } from '@/components/body/MeasurementForm'
import { MetricCard } from '@/components/body/MetricCard'
import { BmiCard } from '@/components/body/BmiCard'
import { MeasurementHistory } from '@/components/body/MeasurementHistory'
import type { MeasurementField, BodyMeasurement } from '@/lib/types/models'

const METRIC_FIELDS: MeasurementField[] = [
  'weight_kg', 'chest_cm', 'waist_cm', 'hips_cm', 'biceps_cm', 'body_fat_pct',
]

function buildHistory(measurements: BodyMeasurement[], field: MeasurementField): number[] {
  return measurements
    .slice()
    .reverse()
    .map(m => m[field])
    .filter((v): v is number => v !== null)
}

export default async function BodyPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('body')

  const [measurements, profileResult] = await Promise.all([
    getMeasurements(supabase, user.id),
    supabase.from('profiles').select('height_cm').eq('id', user.id).single(),
  ])

  const heightCm = profileResult.data?.height_cm ?? null
  const latest = measurements[0] ?? null
  const previous = measurements[1] ?? null

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <Activity className="h-7 w-7 text-amber-500" />
        <h1 className="text-2xl font-black uppercase tracking-wider">{t('title')}</h1>
      </div>

      {latest && <CurrentSnapshot latest={latest} />}

      <MeasurementForm />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {METRIC_FIELDS.map(field => (
          <MetricCard
            key={field}
            field={field}
            current={latest?.[field] ?? null}
            previous={previous?.[field] ?? null}
            history={buildHistory(measurements, field)}
          />
        ))}
      </div>

      <BmiCard weightKg={latest?.weight_kg ?? null} heightCm={heightCm} />

      <MeasurementHistory measurements={measurements} />
    </div>
  )
}
