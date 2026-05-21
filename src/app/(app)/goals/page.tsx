import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations } from 'next-intl/server'
import { getExercises } from '@/lib/db/exercises'
import { getGoalsWithProgress } from '@/lib/db/goals'
import { GoalForm } from '@/components/goals/GoalForm'
import { GoalList } from '@/components/goals/GoalList'

export default async function GoalsPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('goals')

  const [exercises, goals] = await Promise.all([
    getExercises(supabase, user.id),
    getGoalsWithProgress(supabase, user.id),
  ])

  // Only show barbell-ish lifts (anything with calculated_1rm makes sense — but
  // we don't filter here; let the user pick. Could refine later.)
  const exerciseOptions = exercises.map(e => ({
    id: e.id,
    name: e.name,
    name_ru: e.name_ru ?? null,
  }))

  return (
    <div className="space-y-5">
      <h1 className="text-[28px] font-bold tracking-tight">{t('title')}</h1>

      <GoalForm exercises={exerciseOptions} />

      <h2 className="pt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        {t('listTitle')}
      </h2>

      <GoalList goals={goals} />
    </div>
  )
}
