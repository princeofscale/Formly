import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations, getLocale } from 'next-intl/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { MuscleGroup } from '@/lib/types/models'

const FILTER_MUSCLES: MuscleGroup[] = [
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

interface RecordRow {
  exercise_id: string
  calculated_1rm: number
  created_at: string
  exercises: {
    id: string
    name: string
    name_ru?: string | null
    primary_muscle: MuscleGroup
  } | null
}

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ muscle?: string }>
}) {
  const { muscle } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('records')
  const tHistory = await getTranslations('history')
  const tLib = await getTranslations('exerciseLibrary')
  const locale = await getLocale()

  const { data: rows } = await supabase
    .from('set_entries')
    .select('exercise_id, calculated_1rm, created_at, exercises(id, name, name_ru, primary_muscle)')
    .eq('user_id', user.id)
    .not('calculated_1rm', 'is', null)
    .order('exercise_id')
    .order('calculated_1rm', { ascending: false })

  const seen = new Set<string>()
  const allRecords: RecordRow[] = []
  for (const row of (rows ?? []) as unknown as RecordRow[]) {
    if (!seen.has(row.exercise_id)) {
      seen.add(row.exercise_id)
      allRecords.push(row)
    }
  }

  const filteredRecords = muscle
    ? allRecords.filter((r) => r.exercises?.primary_muscle === muscle)
    : allRecords

  filteredRecords.sort((a, b) => b.calculated_1rm - a.calculated_1rm)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h1 className="text-2xl font-black uppercase tracking-wider">{t('title')}</h1>
      </div>

      {allRecords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {FILTER_MUSCLES.map((m) => (
            <Link key={m} href={muscle === m ? '/records' : `/records?muscle=${m}`}>
              <Badge variant={muscle === m ? 'default' : 'outline'} className="cursor-pointer">
                {tHistory(`muscleLabel.${m}`)}
              </Badge>
            </Link>
          ))}
          {muscle && (
            <Link href="/records">
              <Badge variant="destructive" className="cursor-pointer">
                {tLib('clearFilter')}
              </Badge>
            </Link>
          )}
        </div>
      )}

      {filteredRecords.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <Trophy className="h-10 w-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-500 text-sm">{t('noRecords')}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {filteredRecords.map((r, i) => {
          const ex = r.exercises
          const name = locale === 'ru' ? (ex?.name_ru ?? ex?.name) : ex?.name
          const muscleLabel = ex?.primary_muscle ? tHistory(`muscleLabel.${ex.primary_muscle}`) : ''
          const date = new Date(r.created_at).toLocaleDateString(
            locale === 'ru' ? 'ru-RU' : 'en-GB',
            { day: 'numeric', month: 'short', year: 'numeric' },
          )

          return (
            <Link key={r.exercise_id} href={`/analytics?exercise=${r.exercise_id}`}>
              <Card className="hover:border-white/20 transition-colors">
                <CardContent className="py-3 flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-600 w-6 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{name}</p>
                    <p className="text-[11px] text-zinc-500">{muscleLabel}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-black text-amber-500">
                      {r.calculated_1rm.toFixed(1)}
                      <span className="text-xs font-normal text-zinc-500 ml-1">{t('e1rm')}</span>
                    </p>
                    <p className="text-[10px] text-zinc-600">{date}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
