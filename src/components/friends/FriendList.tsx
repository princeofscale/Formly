'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Trash2, Flame, Activity } from 'lucide-react'
import { removeFriendAction } from '@/app/(app)/friends/actions'
import type { FriendWithStats } from '@/lib/db/friends'

interface Props {
  friends: FriendWithStats[]
  myUserId: string
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return Math.floor((Date.now() - then) / 86400000)
}

export function FriendList({ friends }: Props) {
  const t = useTranslations('friends')
  const locale = useLocale()

  if (friends.length === 0) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <p className="text-sm text-white/50">{t('empty')}</p>
        <p className="text-[11px] text-white/35 mt-2">{t('emptySub')}</p>
      </div>
    )
  }

  // Most recently active first
  const sorted = [...friends].sort((a, b) => {
    const at = a.last_workout_at ? new Date(a.last_workout_at).getTime() : 0
    const bt = b.last_workout_at ? new Date(b.last_workout_at).getTime() : 0
    return bt - at
  })

  return (
    <div className="space-y-3">
      {sorted.map(f => {
        const lastDays = daysAgo(f.last_workout_at)
        const isHot = lastDays != null && lastDays <= 2
        const isCold = lastDays != null && lastDays >= 7
        const lastLabel = lastDays == null
          ? t('neverTrained')
          : lastDays === 0 ? t('today')
          : lastDays === 1 ? t('yesterday')
          : t('daysAgo', { n: lastDays })

        const dotColor = isHot ? '#22D3A8' : isCold ? '#FF6E76' : '#FFC044'

        return (
          <div
            key={f.friend_id}
            className="rounded-2xl p-4"
            style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center font-mono font-extrabold text-sm"
                style={{ background: `${dotColor}1F`, color: dotColor }}
              >
                {(f.friend_code ?? '??').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white font-mono tabular-nums">
                  {f.friend_code ?? '······'}
                </p>
                <p className="text-[11px]" style={{ color: dotColor }}>{lastLabel}</p>
              </div>
              <form action={removeFriendAction}>
                <input type="hidden" name="friendId" value={f.friend_id} />
                <button
                  type="submit"
                  aria-label={t('remove')}
                  className="text-white/30 hover:text-red-300 transition"
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
                unit="kg"
              />
              <Stat
                icon={<Flame className="h-3 w-3" style={{ color: '#A78BFA' }} />}
                label={t('stats.bestE1rm')}
                value={f.best_e1rm != null ? `${Math.round(f.best_e1rm)}` : '—'}
                unit={f.best_e1rm != null ? 'kg' : undefined}
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
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-white/35">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span className="text-base font-extrabold tabular-nums text-white">{value}</span>
        {unit && <span className="text-[9px] text-white/35 font-mono">{unit}</span>}
      </div>
    </div>
  )
}
