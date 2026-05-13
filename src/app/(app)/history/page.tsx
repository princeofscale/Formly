import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getRecentSessions } from '@/lib/db/workouts'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function HistoryPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('history')
  const locale = await getLocale()

  const sessions = await getRecentSessions(supabase, user.id, 50)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {sessions.length === 0 && (
        <p className="text-zinc-500 text-center py-12">{t('noWorkouts')}</p>
      )}

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

        return (
          <Link key={s.id} href={`/history/${s.id}`}>
            <Card className="hover:border-white/20 transition-colors">
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{dateStr}</p>
                  <p className="text-xs text-zinc-500">
                    {(s.total_volume_kg ?? 0).toFixed(0)} {t('volume')}
                    {duration ? ` · ${duration} ${t('minutes')}` : ''}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
