import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { MuscleIcon } from '@/components/workout/muscle-icon'
import type { MuscleGroup } from '@/lib/types/models'

type Tab = 'all' | 'recent' | 'muscle'

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

// Group MuscleGroup → broad bucket for grouping in the "By muscle" tab
function muscleBucket(m: MuscleGroup): 'chest' | 'back' | 'legs' | 'shoulder' | 'arms' | 'core' {
  if (m === 'chest') return 'chest'
  if (m === 'back' || m === 'lats' || m === 'traps' || m === 'rear_delts') return 'back'
  if (m === 'quads' || m === 'hamstrings' || m === 'glutes' || m === 'calves') return 'legs'
  if (m === 'front_delts' || m === 'side_delts') return 'shoulder'
  if (m === 'biceps' || m === 'triceps' || m === 'forearms') return 'arms'
  return 'core'
}

const BUCKET_ORDER: Array<{ key: 'back' | 'chest' | 'legs' | 'shoulder' | 'arms' | 'core' }> = [
  { key: 'back' },
  { key: 'chest' },
  { key: 'legs' },
  { key: 'shoulder' },
  { key: 'arms' },
  { key: 'core' },
]

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabRaw } = await searchParams
  const tab: Tab = tabRaw === 'recent' || tabRaw === 'muscle' ? tabRaw : 'all'

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

  // First row per exercise is the best (data is sorted desc by 1RM)
  const seen = new Set<string>()
  const allRecords: RecordRow[] = []
  for (const row of (rows ?? []) as unknown as RecordRow[]) {
    if (!seen.has(row.exercise_id)) {
      seen.add(row.exercise_id)
      allRecords.push(row)
    }
  }

  // For "recent" tab: PRs sorted by date DESC. Same data, different sort.
  const recentRecords = [...allRecords].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  // Latest PR for hero
  const latestPr = recentRecords[0] ?? null
  const totalPRs = allRecords.length
  const liftsCount = allRecords.length // 1 PR == 1 lift here since we already deduped
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thisWeekCount = recentRecords.filter((r) => new Date(r.created_at) >= sevenDaysAgo).length

  // For "All lifts" 2-col card grid — sorted by 1RM desc, take top 12
  const topLifts = [...allRecords].sort((a, b) => b.calculated_1rm - a.calculated_1rm).slice(0, 12)

  // For "By muscle" grouping
  const byBucket: Record<string, RecordRow[]> = {}
  for (const r of allRecords) {
    const m = r.exercises?.primary_muscle
    if (!m) continue
    const b = muscleBucket(m)
    if (!byBucket[b]) byBucket[b] = []
    byBucket[b].push(r)
  }
  for (const k of Object.keys(byBucket)) {
    byBucket[k].sort((a, b) => b.calculated_1rm - a.calculated_1rm)
  }

  const displayName = (r: RecordRow) =>
    locale === 'ru'
      ? (r.exercises?.name_ru ?? r.exercises?.name ?? '—')
      : (r.exercises?.name ?? '—')

  const formatDateShort = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      month: 'short',
      year: '2-digit',
    })

  const formatDateFull = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="space-y-3 pb-4">
      {/* Page title */}
      <div className="tar-d-rise tar-d-rise-1" style={{ padding: '4px 2px 0' }}>
        <div className="tar-d-eyebrow">{t('subtitle')}</div>
        <h1 className="tar-d-hello-name" style={{ fontSize: 28, marginTop: 4 }}>
          {t('title')}
        </h1>
      </div>

      {/* Hero card */}
      <div className="tar-rec-hero tar-d-rise tar-d-rise-2">
        <div className="tar-rec-hero-stats">
          <div className="tar-rec-stat">
            <span className="k">{t('totalPrs')}</span>
            <span className="v gold">{totalPRs}</span>
          </div>
          <div className="tar-rec-stat">
            <span className="k">{t('lifts')}</span>
            <span className="v">{liftsCount}</span>
          </div>
          <div className="tar-rec-stat">
            <span className="k">{t('latestPr')}</span>
            {latestPr ? (
              <>
                <span className="last-name">{displayName(latestPr)}</span>
                <span className="last-date">
                  {formatDateFull(latestPr.created_at)} · {Math.round(latestPr.calculated_1rm)}{' '}
                  {locale === 'ru' ? 'кг' : 'kg'}
                </span>
              </>
            ) : (
              <span className="last-name">—</span>
            )}
          </div>
        </div>
        {totalPRs > 0 && (
          <div className="tar-rec-hero-foot">
            <span className="tar-s-prtag">
              <Trophy />
              {thisWeekCount > 0
                ? t('thisWeek', { n: thisWeekCount })
                : `${totalPRs} ${t('totalPrs').toLowerCase()}`}
            </span>
            <span className="tar-d-eyebrow accent">{t('activeSeason')}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className="tar-s-tabs tar-d-rise tar-d-rise-3"
        style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
      >
        <Link href="/records" className={tab === 'all' ? 'on' : ''}>
          {t('tabs.all')}
        </Link>
        <Link href="/records?tab=recent" className={tab === 'recent' ? 'on' : ''}>
          {t('tabs.recent')}
        </Link>
        <Link href="/records?tab=muscle" className={tab === 'muscle' ? 'on' : ''}>
          {t('tabs.muscle')}
        </Link>
      </div>

      {allRecords.length === 0 && (
        <div className="tar-pl-empty tar-d-rise tar-d-rise-4">
          <div className="plus">
            <Trophy />
          </div>
          <div className="t">{t('noRecords')}</div>
          <div className="s">{t('noRecordsHint')}</div>
        </div>
      )}

      {/* All lifts — 2-col card grid */}
      {tab === 'all' && topLifts.length > 0 && (
        <div className="tar-rec-grid tar-d-rise tar-d-rise-4">
          {topLifts.map((r) => {
            const bucket = r.exercises?.primary_muscle
              ? muscleBucket(r.exercises.primary_muscle)
              : 'core'
            return (
              <Link
                key={r.exercise_id}
                href={`/progress?exercise=${r.exercise_id}`}
                className="tar-rec-card"
              >
                <div className="tar-rec-card-head">
                  <span className={`tar-s-mglyph ${bucket}`}>
                    {r.exercises?.primary_muscle && (
                      <MuscleIcon muscle={r.exercises.primary_muscle} />
                    )}
                  </span>
                  <span className="tar-rec-card-name">{displayName(r)}</span>
                </div>
                <div>
                  <span className="tar-rec-num">{Math.round(r.calculated_1rm)}</span>
                  <span className="tar-rec-unit">{locale === 'ru' ? 'кг' : 'kg'}</span>
                </div>
                <div className="tar-rec-meta">{formatDateShort(r.created_at)}</div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Recent — list sorted by date */}
      {tab === 'recent' && recentRecords.length > 0 && (
        <div className="tar-rec-list tar-d-rise tar-d-rise-4">
          {recentRecords.map((r) => {
            const bucket = r.exercises?.primary_muscle
              ? muscleBucket(r.exercises.primary_muscle)
              : 'core'
            return (
              <Link
                key={r.exercise_id}
                href={`/progress?exercise=${r.exercise_id}`}
                className="tar-rec-row"
              >
                <span className={`tar-s-mglyph ${bucket}`}>
                  {r.exercises?.primary_muscle && (
                    <MuscleIcon muscle={r.exercises.primary_muscle} />
                  )}
                </span>
                <div className="info">
                  <div className="n">{displayName(r)}</div>
                  <div className="d">{formatDateFull(r.created_at)}</div>
                </div>
                <div className="end">
                  <span className="tar-rec-row-wt">{Math.round(r.calculated_1rm)}</span>
                  <span className="tar-rec-row-unit">{locale === 'ru' ? 'кг' : 'kg'}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* By muscle — grouped list */}
      {tab === 'muscle' &&
        BUCKET_ORDER.map(({ key }) => {
          const items = byBucket[key] ?? []
          if (items.length === 0) return null
          const headMuscle: MuscleGroup =
            key === 'back'
              ? 'back'
              : key === 'chest'
                ? 'chest'
                : key === 'legs'
                  ? 'quads'
                  : key === 'shoulder'
                    ? 'front_delts'
                    : key === 'arms'
                      ? 'biceps'
                      : 'core'
          return (
            <div key={key} className="tar-d-rise tar-d-rise-4">
              <div className="tar-rec-mgroup-head">
                <span className={`tar-s-mglyph ${key}`}>
                  <MuscleIcon muscle={headMuscle} />
                </span>
                <span className="lbl">{tHistory(`muscleLabel.${headMuscle}`)}</span>
              </div>
              <div className="tar-rec-list">
                {items.map((r) => (
                  <Link
                    key={r.exercise_id}
                    href={`/progress?exercise=${r.exercise_id}`}
                    className="tar-rec-row"
                  >
                    <span style={{ width: 28, flexShrink: 0 }} />
                    <div className="info">
                      <div className="n">{displayName(r)}</div>
                      <div className="d">{formatDateShort(r.created_at)}</div>
                    </div>
                    <div className="end">
                      <span className="tar-rec-row-wt">{Math.round(r.calculated_1rm)}</span>
                      <span className="tar-rec-row-unit">{locale === 'ru' ? 'кг' : 'kg'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
    </div>
  )
}
