import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations, getLocale } from 'next-intl/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Trophy } from 'lucide-react'

export default async function RecordsPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('records')
  const tHistory = await getTranslations('history')
  const locale = await getLocale()

  const { data: rows } = await supabase
    .from('set_entries')
    .select('exercise_id, calculated_1rm, created_at, exercises(id, name, name_ru, primary_muscle)')
    .eq('user_id', user.id)
    .not('calculated_1rm', 'is', null)
    .order('exercise_id')
    .order('calculated_1rm', { ascending: false })

  // Best 1RM per exercise
  const seen = new Set<string>()
  const records: {
    exercise_id: string
    calculated_1rm: number
    created_at: string
    exercises: { id: string; name: string; name_ru?: string | null; primary_muscle: string } | null
  }[] = []

  for (const row of rows ?? []) {
    if (!seen.has(row.exercise_id)) {
      seen.add(row.exercise_id)
      records.push(row as typeof records[0])
    }
  }

  records.sort((a, b) => b.calculated_1rm - a.calculated_1rm)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h1 className="text-2xl font-black uppercase tracking-wider">{t('title')}</h1>
      </div>

      {records.length === 0 && (
        <p className="text-zinc-500 text-center py-12">{t('noRecords')}</p>
      )}

      <div className="space-y-1.5">
        {records.map((r, i) => {
          const ex = r.exercises
          const name = locale === 'ru' ? (ex?.name_ru ?? ex?.name) : ex?.name
          const muscle = ex?.primary_muscle ? tHistory(`muscleLabel.${ex.primary_muscle}`) : ''
          const date = new Date(r.created_at).toLocaleDateString(
            locale === 'ru' ? 'ru-RU' : 'en-GB',
            { day: 'numeric', month: 'short', year: 'numeric' }
          )

          return (
            <Link key={r.exercise_id} href={`/analytics?exercise=${r.exercise_id}`}>
              <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="py-3 flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-600 w-6 flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{name}</p>
                    <p className="text-[11px] text-zinc-500">{muscle}</p>
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
