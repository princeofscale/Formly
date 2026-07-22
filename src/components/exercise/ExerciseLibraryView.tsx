'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Search, Flame } from 'lucide-react'
import type { MuscleGroup, Equipment, Mechanic } from '@/lib/types/models'
import { MuscleIcon } from '@/components/workout/muscle-icon'
import { weightUnit } from '@/lib/units'

export type Bucket = 'chest' | 'back' | 'legs' | 'shoulder' | 'arms' | 'core'

// Normalize ё→е and lowercase so "лежа" matches "Жим лёжа".
// Server-side search uses the same rule (see src/lib/db/exercises.ts).
function normalizeSearch(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е')
}

interface Item {
  id: string
  name: string
  searchKey: string
  primary_muscle: MuscleGroup
  equipment: Equipment
  equipmentLabel: string
  mechanic: Mechanic
  mechanicLabel: string
  count: number
  lastAt: string | null
  bestWeight: number
  bestSet: { weight: number; reps: number } | null
}

interface Props {
  items: Item[]
  bucketLabels: Record<Bucket, string>
}

function buildLastLabel(
  items: Item[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): Map<string, string> {
  const now = Date.now()
  const m = new Map<string, string>()
  for (const i of items) {
    if (!i.lastAt) {
      m.set(i.id, t('never'))
      continue
    }
    const days = Math.floor((now - new Date(i.lastAt).getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) m.set(i.id, t('today'))
    else if (days === 1) m.set(i.id, t('yesterday'))
    else if (days < 14) m.set(i.id, t('daysAgo', { n: days }))
    else m.set(i.id, t('weeksAgo', { n: Math.floor(days / 7) }))
  }
  return m
}

function buildRecentSet(items: Item[]): Set<string> {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 5
  const s = new Set<string>()
  for (const i of items) if (i.lastAt && new Date(i.lastAt).getTime() >= cutoff) s.add(i.id)
  return s
}

function muscleBucket(m: MuscleGroup): Bucket {
  if (m === 'chest') return 'chest'
  if (m === 'back' || m === 'lats' || m === 'traps' || m === 'rear_delts') return 'back'
  if (m === 'quads' || m === 'hamstrings' || m === 'glutes' || m === 'calves') return 'legs'
  if (m === 'front_delts' || m === 'side_delts') return 'shoulder'
  if (m === 'biceps' || m === 'triceps' || m === 'forearms') return 'arms'
  return 'core'
}

const BUCKETS: Bucket[] = ['chest', 'back', 'legs', 'shoulder', 'arms', 'core']

export function ExerciseLibraryView({ items, bucketLabels }: Props) {
  const t = useTranslations('exerciseLibrary')
  const locale = useLocale()
  const kg = weightUnit(locale)

  const [query, setQuery] = useState('')
  const [bucket, setBucket] = useState<Bucket | 'all'>('all')
  const [eq, setEq] = useState<Equipment | 'all'>('all')

  const equipmentOptions = useMemo(() => {
    const seen = new Map<Equipment, string>()
    for (const i of items) if (!seen.has(i.equipment)) seen.set(i.equipment, i.equipmentLabel)
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }))
  }, [items])

  const featured = useMemo(() => {
    return [...items]
      .filter((i) => i.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [items])

  // Pre-compute time-relative labels via top-level helpers so Date.now()
  // isn't called inside the render path (React Compiler purity rule).
  const lastLabelMap = useMemo(() => buildLastLabel(items, t), [items, t])
  const recentSet = useMemo(() => buildRecentSet(items), [items])

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return items.filter((i) => {
      if (bucket !== 'all' && muscleBucket(i.primary_muscle) !== bucket) return false
      if (eq !== 'all' && i.equipment !== eq) return false
      if (q && !i.searchKey.includes(q)) return false
      return true
    })
  }, [items, query, bucket, eq])

  // Group by bucket
  const grouped = useMemo(() => {
    const g: Record<Bucket, Item[]> = {
      chest: [],
      back: [],
      legs: [],
      shoulder: [],
      arms: [],
      core: [],
    }
    for (const it of filtered) g[muscleBucket(it.primary_muscle)].push(it)
    for (const k of BUCKETS) {
      g[k].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    }
    return g
  }, [filtered])

  return (
    <>
      {/* Search */}
      <div className="tar-lib-search tar-d-rise tar-d-rise-2">
        <Search className="tar-lib-search-ico" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
        />
      </div>

      {/* Filter chips */}
      <div className="tar-lib-filters tar-d-rise tar-d-rise-2">
        <button
          type="button"
          onClick={() => setBucket('all')}
          className={`tar-s-chip ${bucket === 'all' ? 'on' : ''}`}
        >
          {t('filterAll')}
        </button>
        {BUCKETS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBucket(b)}
            className={`tar-s-chip ${bucket === b ? 'on' : ''}`}
          >
            {bucketLabels[b]}
          </button>
        ))}
      </div>

      {equipmentOptions.length > 1 && (
        <div className="tar-lib-filters tar-d-rise tar-d-rise-2">
          <button
            type="button"
            onClick={() => setEq('all')}
            className={`tar-s-chip ${eq === 'all' ? 'on' : ''}`}
          >
            {t('filterAll')}
          </button>
          {equipmentOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEq(opt.value)}
              className={`tar-s-chip ${eq === opt.value ? 'on' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Featured row */}
      {featured.length > 0 && (
        <>
          <div className="tar-d-rise tar-d-rise-3" style={{ padding: '8px 0 0' }}>
            <div className="flex items-baseline justify-between" style={{ padding: '0 2px 6px' }}>
              <div className="tar-d-eyebrow">{t('mostLogged')}</div>
              <div className="tar-d-eyebrow" style={{ opacity: 0.7 }}>
                {t('topN', { n: featured.length })}
              </div>
            </div>
            <div className="tar-lib-featured-wrap">
              {featured.map((it) => {
                const b = muscleBucket(it.primary_muscle)
                return (
                  <Link
                    key={it.id}
                    href={`/progress?exercise=${it.id}`}
                    className="tar-lib-feat-card"
                  >
                    <span className="tar-lib-feat-badge">
                      <Flame className="h-2.5 w-2.5" />
                      {t('mostLogged')}
                    </span>
                    <div className="tar-lib-feat-name">{it.name}</div>
                    <div className="tar-lib-feat-meta">
                      <span
                        className={`tar-s-mglyph ${b}`}
                        style={{ width: 16, height: 16, borderRadius: 5 }}
                      >
                        <MuscleIcon muscle={it.primary_muscle} />
                      </span>
                      {bucketLabels[b]} · {it.equipmentLabel}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Grouped list */}
      <div className="tar-d-rise tar-d-rise-4">
        {BUCKETS.map((b) => {
          const list = grouped[b]
          if (list.length === 0) return null
          return (
            <div key={b}>
              <div className="tar-lib-group-hd">
                <span
                  className={`tar-s-mglyph ${b}`}
                  style={{ width: 20, height: 20, borderRadius: 6 }}
                >
                  <MuscleIcon muscle={list[0].primary_muscle} />
                </span>
                {bucketLabels[b]}
                <span className="cnt">{list.length}</span>
              </div>
              {list.map((it) => {
                const isRecent = recentSet.has(it.id)
                return (
                  <Link key={it.id} href={`/progress?exercise=${it.id}`} className="tar-lib-row">
                    <span className={`tar-s-mglyph ${muscleBucket(it.primary_muscle)}`}>
                      <MuscleIcon muscle={it.primary_muscle} />
                    </span>
                    <div>
                      <div className="exname">{it.name}</div>
                      <div className="extags">
                        <span>{it.equipmentLabel}</span>
                        <span className="sep">·</span>
                        <span>{it.mechanicLabel}</span>
                        {it.lastAt && (
                          <>
                            <span className="sep">·</span>
                            <span className={isRecent ? 'hot' : ''}>{lastLabelMap.get(it.id)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="exwhen">
                      {it.bestWeight > 0
                        ? `${Math.round(it.bestWeight)} ${kg} ${t('prShort')}`
                        : ''}
                    </span>
                  </Link>
                )
              })}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="tar-pl-empty">
            <div className="t">{t('noExercises')}</div>
          </div>
        )}
      </div>
    </>
  )
}
