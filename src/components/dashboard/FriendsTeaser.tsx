'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { Users, ChevronRight } from 'lucide-react'
import type { FriendWithStats } from '@/lib/db/friends'

interface Props {
  friends: FriendWithStats[]
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  return Math.floor((Date.now() - then) / 86400000)
}

export function FriendsTeaser({ friends }: Props) {
  const t = useTranslations('friends')
  const locale = useLocale()

  if (friends.length === 0) {
    return (
      <Link
        href="/friends"
        className="block rounded-2xl p-4 transition hover:bg-white/[0.04]"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(167, 139, 250, 0.16)' }}
          >
            <Users className="h-4 w-4" style={{ color: '#A78BFA' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A78BFA' }}>
              {t('teaserLabel')}
            </p>
            <p className="text-sm font-bold text-white">{t('teaserEmptyTitle')}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
        </div>
      </Link>
    )
  }

  const inGymCount = friends.filter(f => f.is_in_gym).length
  const sorted = [...friends]
    .sort((a, b) => {
      if (a.is_in_gym !== b.is_in_gym) return a.is_in_gym ? -1 : 1
      const at = a.last_workout_at ? new Date(a.last_workout_at).getTime() : 0
      const bt = b.last_workout_at ? new Date(b.last_workout_at).getTime() : 0
      return bt - at
    })
    .slice(0, 3)

  return (
    <Link
      href="/friends"
      className="block rounded-2xl p-5 space-y-3 transition hover:bg-white/[0.02]"
      style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(167, 139, 250, 0.16)' }}
          >
            <Users className="h-4 w-4" style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#A78BFA' }}>
              {t('teaserLabel')}
            </p>
            <p className="text-sm font-bold text-white">{t('teaserTitle', { n: friends.length })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inGymCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'rgba(34, 211, 168, 0.12)', color: '#22D3A8' }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: '#22D3A8' }}
              />
              {inGymCount} {t('inGym')}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </div>
      </div>

      <div className="space-y-1.5">
        {sorted.map(f => {
          const d = daysAgo(f.last_workout_at)
          const isHot = d != null && d <= 2
          const isCold = d != null && d >= 7
          const baseDot = isHot ? '#22D3A8' : isCold ? '#FF6E76' : '#FFC044'
          const dot = f.is_in_gym ? '#22D3A8' : baseDot
          const lastLabel = d == null
            ? t('neverTrained')
            : d === 0 ? t('today')
            : d === 1 ? t('yesterday')
            : t('daysAgo', { n: d })
          return (
            <div key={f.friend_id} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${f.is_in_gym ? 'animate-pulse' : ''}`}
                  style={{ background: dot }}
                />
                <span className="font-mono font-bold text-white truncate">{f.friend_code ?? '······'}</span>
              </div>
              <span className="shrink-0 tabular-nums text-white/55">
                <span style={{ color: dot }}>{f.is_in_gym ? t('inGym') : lastLabel}</span>
                <span className="text-white/30 mx-2">·</span>
                {Math.round(f.week_tonnage_kg).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')} kg
              </span>
            </div>
          )
        })}
      </div>
    </Link>
  )
}
