import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getRecentSessions } from '@/lib/db/workouts'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronRight, Dumbbell } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { MOOD_EMOJIS } from '@/components/workout/MoodSelector'

interface SetRow {
  session_id: string
  exercises: { name: string; name_ru: string | null } | null
}

export default async function HistoryPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('history')
  const locale = await getLocale()

  const sessions = await getRecentSessions(supabase, user.id, 50)

  // Batch-fetch exercise tags for all sessions in one query
  const sessionIds = sessions.map(s => s.id)
  const exerciseTags = new Map<string, string[]>()
  const setCounts = new Map<string, number>()

  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from('set_entries')
      .select('session_id, exercises(name, name_ru)')
      .in('session_id', sessionIds)

    for (const row of (data ?? []) as unknown as SetRow[]) {
      setCounts.set(row.session_id, (setCounts.get(row.session_id) ?? 0) + 1)
      const ex = row.exercises
      const name = locale === 'ru' ? (ex?.name_ru ?? ex?.name) : ex?.name
      if (!name) continue
      const list = exerciseTags.get(row.session_id) ?? []
      if (!list.includes(name) && list.length < 3) {
        list.push(name)
        exerciseTags.set(row.session_id, list)
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {sessions.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Dumbbell className="h-10 w-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-500 text-sm">{t('noWorkouts')}</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map(s => {
          const date = new Date(s.started_at)
          const duration = s.finished_at
            ? Math.round((new Date(s.finished_at).getTime() - date.getTime()) / 60000)
            : null

          const dateStr = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })

          const tags = exerciseTags.get(s.id) ?? []
          const setCount = setCounts.get(s.id) ?? 0

          const moodEmoji = s.mood_score && MOOD_EMOJIS[s.mood_score]
          return (
            <Link key={s.id} href={`/history/${s.id}`} className="block">
              <Card className="transition-colors hover:border-white/20">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium capitalize">{dateStr}</p>
                        {moodEmoji && <span className="text-base leading-none">{moodEmoji}</span>}
                      </div>
                      {tags.length > 0 && (
                        <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                          {tags.join(' · ')}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {(s.total_volume_kg ?? 0).toFixed(0)} {t('volume')}
                        {setCount > 0 ? ` · ${setCount} ${t('sets')}` : ''}
                        {duration ? ` · ${duration} ${t('minutes')}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
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
