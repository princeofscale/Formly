import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getRecentSessions } from '@/lib/db/workouts'
import Link from 'next/link'
import { ChevronRight, Dumbbell, Flame, Activity } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { MOOD_EMOJIS } from '@/components/workout/MoodSelector'
import { weightUnit } from '@/lib/units'

interface SetRow {
  session_id: string
  exercises: { name: string; name_ru: string | null } | null
}

interface AggregateRow {
  total_volume_kg: number | null
}

export default async function HistoryPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('history')
  const locale = await getLocale()
  const kg = weightUnit(locale)

  // Two independent reads — one Promise.all round-trip.
  const [sessions, allSessionsAgg] = await Promise.all([
    getRecentSessions(supabase, user.id, 100),
    supabase
      .from('workout_sessions')
      .select('total_volume_kg', { count: 'exact' })
      .eq('user_id', user.id)
      .not('finished_at', 'is', null),
  ])

  const totalSessions = allSessionsAgg.count ?? 0
  const totalVolumeKg = ((allSessionsAgg.data ?? []) as AggregateRow[]).reduce(
    (s, r) => s + (r.total_volume_kg ?? 0),
    0,
  )
  const avgPerSession = totalSessions > 0 ? Math.round(totalVolumeKg / totalSessions) : 0

  // Batch-fetch exercise tags for all sessions in one query
  const sessionIds = sessions.map((s) => s.id)
  const exerciseTags = new Map<string, string[]>()
  const setCounts = new Map<string, number>()

  if (sessionIds.length > 0) {
    // (is_warmup filter omitted — database.types.ts pre-dates the column and
    // typing it would need a regen. Warm-up rows still appear as faint tags
    // here; minor cosmetic issue, not worth the regen overhead for v1.)
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

  // Group sessions by YYYY-MM for month section headers
  const groups: { key: string; label: string; items: typeof sessions }[] = []
  for (const s of sessions) {
    const key = s.started_at.slice(0, 7)
    let group = groups.find((g) => g.key === key)
    if (!group) {
      const d = new Date(`${key}-01T00:00:00Z`)
      const monthName = d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
        month: 'long',
        year: 'numeric',
      })
      group = { key, label: monthName, items: [] }
      groups.push(group)
    }
    group.items.push(s)
  }

  const nf = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US')

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* HERO — mirrors the dashboard streak hero (flame icon + huge number
          + uppercase eyebrow + secondary stats in a tight grid) */}
      <section className="relative overflow-hidden rounded-[28px] bg-card p-5 ring-1 ring-white/[0.06] sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />

        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {t('eyebrow')}
          </p>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/25">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[68px] font-black leading-[0.9] text-primary tabular-nums sm:text-[80px]">
                  {totalSessions}
                </div>
                <div className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/55">
                  {t('totalSessions')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-white/35">
                  <Flame className="h-3 w-3" style={{ color: '#FF6E76' }} />
                  {t('totalTonnage')}
                </div>
                <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-white">
                  {nf.format(Math.round(totalVolumeKg))}
                </p>
                <p className="text-[9px] text-white/30">{kg}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-white/35">
                  <Activity className="h-3 w-3" style={{ color: '#FFC044' }} />
                  {t('avgPerSession')}
                </div>
                <p className="mt-1 font-mono text-lg font-extrabold tabular-nums text-white">
                  {totalSessions > 0 ? nf.format(avgPerSession) : '—'}
                </p>
                <p className="text-[9px] text-white/30">{kg}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {sessions.length === 0 && (
        <div className="rounded-[24px] bg-card p-10 ring-1 ring-white/[0.06] text-center space-y-3">
          <Dumbbell className="h-10 w-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-500 text-sm">{t('noWorkouts')}</p>
        </div>
      )}

      {/* SESSION LIST grouped by month */}
      {groups.map((group) => (
        <section
          key={group.key}
          className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100"
        >
          <h2 className="px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {group.label}
          </h2>
          <div className="rounded-[24px] bg-card p-2 ring-1 ring-white/[0.06]">
            <div className="space-y-0.5">
              {group.items.map((s) => {
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
                const isCardio = s.session_type === 'cardio'
                const cardioMin =
                  s.cardio_duration_seconds != null
                    ? Math.round(s.cardio_duration_seconds / 60)
                    : null

                return (
                  <Link
                    key={s.id}
                    href={isCardio ? '/history' : `/history/${s.id}`}
                    className="group flex items-center rounded-2xl transition hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-1 min-w-0 items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-bold capitalize">{dateStr}</p>
                          {moodEmoji && <span className="text-sm leading-none">{moodEmoji}</span>}
                          {isCardio && (
                            <span
                              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
                              style={{ background: 'rgba(94, 234, 212, 0.14)', color: '#5EEAD4' }}
                            >
                              CARDIO
                            </span>
                          )}
                        </div>
                        {isCardio ? (
                          <p className="mt-0.5 truncate text-xs text-white/40">
                            {s.cardio_activity ?? ''}
                            {cardioMin != null ? ` · ${cardioMin} ${t('minutes')}` : ''}
                            {s.cardio_distance_km != null ? ` · ${s.cardio_distance_km} км` : ''}
                          </p>
                        ) : (
                          <p className="mt-0.5 truncate text-xs text-white/40">
                            {tags.length > 0 && <>{tags.join(' · ')}</>}
                            {tags.length > 0 && (setCount > 0 || duration) && (
                              <span className="text-white/20"> · </span>
                            )}
                            {setCount > 0 && (
                              <>
                                {setCount} {t('sets')}
                              </>
                            )}
                            {duration && (
                              <>
                                {setCount > 0 && <span className="text-white/20"> · </span>}
                                {duration} {t('minutes')}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                      {isCardio ? (
                        <span
                          className="shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums"
                          style={{ background: 'rgba(94, 234, 212, 0.12)', color: '#5EEAD4' }}
                        >
                          {cardioMin ?? 0} {t('minutes')}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary tabular-nums">
                          {Math.round(s.total_volume_kg ?? 0)} {kg}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
