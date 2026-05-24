import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getExercises } from '@/lib/db/exercises'
import { Badge } from '@/components/ui/badge'
import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import { ExerciseCard } from '@/components/exercise/ExerciseCard'
import { MuscleIcon } from '@/components/exercise/MuscleIcon'
import { Check } from 'lucide-react'
import Link from 'next/link'
import type { MuscleGroup, Equipment } from '@/lib/types/models'
import { getTranslations, getLocale } from 'next-intl/server'

const PRIMARY_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'front_delts',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'core',
  'calves',
]
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ muscle?: string; equipment?: string }>
}) {
  const { muscle, equipment } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('exerciseLibrary')
  const tHistory = await getTranslations('history')
  const locale = await getLocale()

  const exercises = await getExercises(supabase, user.id, {
    muscle: muscle as MuscleGroup | undefined,
    equipment: equipment as Equipment | undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <ExerciseForm />
      </div>

      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          {t('targetArea')}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PRIMARY_MUSCLE_GROUPS.map((m) => {
            const isActive = muscle === m
            const params = new URLSearchParams()
            if (!isActive) params.set('muscle', m)
            if (equipment) params.set('equipment', equipment)
            const href = params.toString()
              ? `/exercise-library?${params.toString()}`
              : '/exercise-library'

            return (
              <Link
                key={m}
                href={href}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'
                }`}
              >
                {isActive && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                    <Check className="h-3 w-3 text-black" strokeWidth={3} />
                  </div>
                )}
                <MuscleIcon muscle={m} size={48} active={isActive} />
                <div
                  className={`text-[10px] font-bold text-center ${isActive ? 'text-amber-400' : 'text-zinc-400'}`}
                >
                  {tHistory(`muscleLabel.${m}`)}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {EQUIPMENT.map((e) => (
          <Link
            key={e}
            href={`/exercise-library?${muscle ? `muscle=${muscle}&` : ''}equipment=${e}`}
          >
            <Badge variant={equipment === e ? 'default' : 'outline'} className="cursor-pointer">
              {t(`equipment.${e}`)}
            </Badge>
          </Link>
        ))}
        {(muscle || equipment) && (
          <Link href="/exercise-library">
            <Badge variant="destructive" className="cursor-pointer">
              {t('clearFilter')}
            </Badge>
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            displayName={locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name}
            muscleLabel={tHistory(`muscleLabel.${ex.primary_muscle}`)}
            equipmentLabel={t(`equipment.${ex.equipment}`)}
            customLabel={t('custom')}
            locale={locale}
          />
        ))}
        {exercises.length === 0 && (
          <p className="text-zinc-500 text-center py-8">{t('noExercises')}</p>
        )}
      </div>
    </div>
  )
}
