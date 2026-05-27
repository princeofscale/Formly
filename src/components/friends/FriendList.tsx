'use client'

import { useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Trash2, Flame, Activity } from 'lucide-react'
import { removeFriendAction } from '@/app/(app)/friends/actions'
import type { FriendWithStats } from '@/lib/db/friends'
import { weightUnit } from '@/lib/units'

interface Props {
  friends: FriendWithStats[]
  myUserId: string
}

interface PreparedFriend {
  f: FriendWithStats
  lastDays: number | null
  isHot: boolean
  isCold: boolean
}

// Top-level helper so Date.now() stays outside the render path
// (React Compiler purity rule).
function prepareFriends(friends: FriendWithStats[]): PreparedFriend[] {
  const now = Date.now()
  const sorted = [...friends].sort((a, b) => {
    if (a.is_in_gym !== b.is_in_gym) return a.is_in_gym ? -1 : 1
    const at = a.last_workout_at ? new Date(a.last_workout_at).getTime() : 0
    const bt = b.last_workout_at ? new Date(b.last_workout_at).getTime() : 0
    return bt - at
  })
  return sorted.map((f) => {
    const lastDays = f.last_workout_at
      ? Math.max(0, Math.floor((now - new Date(f.last_workout_at).getTime()) / 86400000))
      : null
    return {
      f,
      lastDays,
      isHot: lastDays != null && lastDays <= 2,
      isCold: lastDays != null && lastDays >= 7,
    }
  })
}

export function FriendList({ friends }: Props) {
  const t = useTranslations('friends')
  const locale = useLocale()
  const kg = weightUnit(locale)

  const prepared = useMemo(() => prepareFriends(friends), [friends])

  if (friends.length === 0) {
    return (
      <div className="tar-pl-empty">
        <div className="t">{t('empty')}</div>
        <div className="s">{t('emptySub')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {prepared.map(({ f, lastDays, isHot, isCold }) => {
        const lastLabel =
          lastDays == null
            ? t('neverTrained')
            : lastDays === 0
              ? t('today')
              : lastDays === 1
                ? t('yesterday')
                : t('daysAgo', { n: lastDays })

        const baseDotColor = isHot ? 'var(--tar-success)' : isCold ? 'var(--tar-danger)' : '#FFC044'
        const dotColor = f.is_in_gym ? 'var(--tar-success)' : baseDotColor
        const avatarBg = f.is_in_gym
          ? 'rgba(43,216,132,0.14)'
          : isHot
            ? 'rgba(43,216,132,0.14)'
            : isCold
              ? 'rgba(255,77,94,0.12)'
              : 'rgba(255,192,68,0.14)'

        return (
          <div
            key={f.friend_id}
            className="rounded-[20px] p-4 relative overflow-hidden"
            style={{
              background: f.is_in_gym
                ? 'radial-gradient(120% 80% at 100% 0%, rgba(43,216,132,0.10), transparent 60%), var(--tar-bg-elevated)'
                : 'var(--tar-bg-elevated)',
              border: f.is_in_gym
                ? '1px solid rgba(43, 216, 132, 0.45)'
                : '1px solid var(--tar-line)',
              boxShadow: f.is_in_gym ? '0 0 0 1px rgba(43, 216, 132, 0.18) inset' : undefined,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center tabular-nums"
                  style={{
                    background: avatarBg,
                    color: dotColor,
                    font: '800 14px/1 var(--tar-tight)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {(f.friend_code ?? '??').slice(0, 2)}
                </div>
                {f.is_in_gym && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full animate-pulse"
                    style={{
                      background: 'var(--tar-success)',
                      boxShadow: '0 0 0 2px var(--tar-bg-elevated)',
                    }}
                    aria-label={t('inGym')}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="tabular-nums"
                  style={{
                    font: '700 14px/1.2 var(--tar-mono)',
                    letterSpacing: '0.08em',
                    color: 'var(--tar-ink)',
                  }}
                >
                  {f.friend_code ?? '······'}
                </div>
                {f.is_in_gym ? (
                  <div
                    style={{
                      font: '700 10px/1 var(--tar-mono)',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: 'var(--tar-success)',
                      marginTop: 3,
                    }}
                  >
                    {t('inGym')}
                  </div>
                ) : (
                  <div
                    style={{
                      font: '500 11px/1 var(--tar-mono)',
                      letterSpacing: '0.08em',
                      color: dotColor,
                      marginTop: 3,
                    }}
                  >
                    {lastLabel}
                  </div>
                )}
              </div>
              <form action={removeFriendAction}>
                <input type="hidden" name="friendId" value={f.friend_id} />
                <button
                  type="submit"
                  aria-label={t('remove')}
                  className="transition-colors"
                  style={{ color: 'var(--tar-ink-soft)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat
                icon={<Flame className="h-3 w-3" style={{ color: '#FF6E76' }} />}
                label={t('stats.week')}
                value={`${f.week_sessions}`}
              />
              <Stat
                icon={<Activity className="h-3 w-3" style={{ color: '#FFC044' }} />}
                label={t('stats.tonnage')}
                value={`${Math.round(f.week_tonnage_kg).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')}`}
                unit={kg}
              />
              <Stat
                icon={<Flame className="h-3 w-3" style={{ color: '#A78BFA' }} />}
                label={t('stats.bestE1rm')}
                value={f.best_e1rm != null ? `${Math.round(f.best_e1rm)}` : '—'}
                unit={f.best_e1rm != null ? kg : undefined}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface StatProps {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
}

function Stat({ icon, label, value, unit }: StatProps) {
  return (
    <div
      className="rounded-lg p-2 flex flex-col"
      style={{ background: 'var(--tar-card)', border: '1px solid var(--tar-line)' }}
    >
      <div
        className="flex items-center gap-1"
        style={{
          font: '500 9px/1 var(--tar-mono)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--tar-ink-mute)',
        }}
      >
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className="tabular-nums"
          style={{
            font: '800 16px/1 var(--tar-tight)',
            letterSpacing: '-0.01em',
            color: 'var(--tar-ink)',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              font: '500 9px/1 var(--tar-mono)',
              color: 'var(--tar-ink-soft)',
              letterSpacing: '0.08em',
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
