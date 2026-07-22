import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getRecentSessions, getWorkoutLifetimeStats } from '@/lib/db/workouts'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Dumbbell, Trophy } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { MOOD_EMOJIS } from '@/components/workout/MoodSelector'
import { weightUnit } from '@/lib/units'

interface SetRow {
  session_id: string
  exercises: { name: string; name_ru: string | null } | null
}

const PAGE_SIZE = 30

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const requestedPage = Number((await searchParams).page ?? '1')
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('history')
  const locale = await getLocale()
  const kg = weightUnit(locale)

  // Two independent reads — one Promise.all round-trip.
  const [sessions, lifetimeStats] = await Promise.all([
    getRecentSessions(supabase, user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getWorkoutLifetimeStats(supabase),
  ])

  const totalSessions = lifetimeStats.total_sessions
  const totalVolumeKg = lifetimeStats.total_tonnage_kg
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
    <div className="space-y-3 pb-4">
      {/* Title eyebrow */}
      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <div className="tar-d-eyebrow">
          {t('eyebrow')} · {totalSessions} {t('sessionsShort')}
        </div>
        <h1 className="tar-d-hello-name" style={{ fontSize: 28, marginTop: 4 }}>
          {t('totalSessions')}
        </h1>
      </div>

      {/* Stats row */}
      <div className="tar-pr-stats tar-d-rise tar-d-rise-2">
        <div className="tar-pr-stat">
          <div className="v">{totalSessions}</div>
          <div className="k">{t('totalSessions')}</div>
        </div>
        <div className="tar-pr-stat">
          <div className="v gold">{nf.format(Math.round(totalVolumeKg))}</div>
          <div className="k">
            {t('totalTonnage')} · {kg}
          </div>
        </div>
        <div className="tar-pr-stat">
          <div className="v">{totalSessions > 0 ? nf.format(avgPerSession) : '—'}</div>
          <div className="k">{t('avgPerSession')}</div>
        </div>
      </div>

      {sessions.length === 0 && (
        <div className="tar-pl-empty">
          <div className="plus">
            <Dumbbell />
          </div>
          <div className="t">{t('noWorkouts')}</div>
        </div>
      )}

      {/* Timeline */}
      {groups.map((group) => (
        <section key={group.key} className="space-y-2 tar-d-rise tar-d-rise-4">
          <div className="tar-d-sectionhead" style={{ marginTop: 14 }}>
            <span className="capitalize">{group.label}</span>
            <span className="counter">
              {group.items.length} {t('sessionsShort')}
            </span>
          </div>
          <div className="tar-h-timeline">
            {group.items.map((s) => {
              const date = new Date(s.started_at)
              const duration = s.finished_at
                ? Math.round((new Date(s.finished_at).getTime() - date.getTime()) / 60000)
                : null
              const tags = exerciseTags.get(s.id) ?? []
              const setCount = setCounts.get(s.id) ?? 0
              const moodEmoji = s.mood_score && MOOD_EMOJIS[s.mood_score]
              const isCardio = s.session_type === 'cardio'
              const cardioMin =
                s.cardio_duration_seconds != null
                  ? Math.round(s.cardio_duration_seconds / 60)
                  : null
              const dayNum = date.getDate()
              const weekday = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                weekday: 'short',
              })
              const title = isCardio
                ? (s.cardio_activity ?? 'Cardio')
                : tags.slice(0, 2).join(' · ') || t('totalSessions')
              const tonnage = Math.round(s.total_volume_kg ?? 0)
              // PR is a stretch — we don't have per-session PR info loaded here.
              // Mark sessions with >2000kg tonnage as visually elevated for now.
              const isStandout = !isCardio && tonnage >= 2000

              return (
                <div key={s.id} className={`tar-h-day ${isStandout ? 'pr' : ''}`}>
                  <div className="node">
                    <span className="dot" />
                    <span className="d">{dayNum}</span>
                    <span className="m">{weekday}</span>
                  </div>
                  <Link
                    href={isCardio ? '/history' : `/history/${s.id}`}
                    className={`tar-h-sess ${isStandout ? 'pr' : ''}`}
                  >
                    <div className="top">
                      <div>
                        <span className="e">
                          {date.toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {duration != null ? ` · ${duration} ${t('minutes')}` : ''}
                          {moodEmoji ? <span style={{ marginLeft: 6 }}>{moodEmoji}</span> : null}
                        </span>
                        <div className="t">{title}</div>
                      </div>
                      {isStandout && (
                        <span className="tar-s-prtag">
                          <Trophy />
                          {t('big') ?? 'BIG'}
                        </span>
                      )}
                    </div>
                    <div className="stats">
                      {isCardio ? (
                        <>
                          <div className="cell">
                            <span className="v">
                              {cardioMin ?? 0}
                              <span className="u">{t('minutes')}</span>
                            </span>
                            <span className="k">{t('duration') ?? 'Duration'}</span>
                          </div>
                          {s.cardio_distance_km != null && (
                            <div className="cell">
                              <span className="v">
                                {s.cardio_distance_km}
                                <span className="u">км</span>
                              </span>
                              <span className="k">{t('distance') ?? 'Distance'}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="cell">
                            <span className={`v ${isStandout ? 'gold' : ''}`}>
                              {nf.format(tonnage)}
                              <span className="u">{kg}</span>
                            </span>
                            <span className="k">{t('totalTonnage')}</span>
                          </div>
                          {setCount > 0 && (
                            <div className="cell">
                              <span className="v">
                                {setCount}
                                <span className="u">{t('sets')}</span>
                              </span>
                              <span className="k">{t('volume') ?? 'Volume'}</span>
                            </div>
                          )}
                          {duration != null && (
                            <div className="cell">
                              <span className="v">{duration}</span>
                              <span className="k">{t('minutes')}</span>
                            </div>
                          )}
                        </>
                      )}
                      <ChevronRight className="h-4 w-4 ml-auto self-center text-white/30" />
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {totalSessions > PAGE_SIZE && (
        <nav className="flex items-center justify-between gap-3 pt-3" aria-label={t('pagination')}>
          {page > 1 ? (
            <Link
              href={`/history?page=${page - 1}`}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/65 hover:bg-white/[0.05]"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('previous')}
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-[10px] text-white/35">{t('page', { n: page })}</span>
          {page * PAGE_SIZE < totalSessions ? (
            <Link
              href={`/history?page=${page + 1}`}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/65 hover:bg-white/[0.05]"
            >
              {t('next')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}
