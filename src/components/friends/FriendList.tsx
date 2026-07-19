'use client'

import { useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Trash2, UserPlus } from 'lucide-react'
import { removeFriendAction } from '@/app/(app)/friends/actions'
import type { FriendWithStats } from '@/lib/db/friends'

interface Props {
  friends: FriendWithStats[]
  myUserId: string
}

interface PreparedFriend {
  f: FriendWithStats
  lastDays: number | null
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
  return sorted.map((f) => ({
    f,
    lastDays: f.last_workout_at
      ? Math.max(0, Math.floor((now - new Date(f.last_workout_at).getTime()) / 86400000))
      : null,
  }))
}

export function FriendList({ friends }: Props) {
  const t = useTranslations('friends')
  const locale = useLocale()

  const prepared = useMemo(() => prepareFriends(friends), [friends])

  if (friends.length === 0) {
    return (
      <div className="tar-fr-empty" style={{ padding: '30px 20px' }}>
        <div className="eico">
          <UserPlus className="i" />
        </div>
        <div className="t">{t('empty')}</div>
        <div className="s">{t('emptySub')}</div>
      </div>
    )
  }

  return (
    <div className="tar-fr-list tar-d-rise tar-d-rise-6">
      {prepared.map(({ f, lastDays }) => {
        const lastLabel =
          lastDays == null
            ? t('neverTrained')
            : lastDays === 0
              ? t('today')
              : lastDays === 1
                ? t('yesterday')
                : t('daysAgo', { n: lastDays })
        const tons = (f.week_tonnage_kg / 1000).toLocaleString(
          locale === 'ru' ? 'ru-RU' : 'en-US',
          { maximumFractionDigits: 1 },
        )

        return (
          <div key={f.friend_id} className="tar-fr-friend" style={{ cursor: 'default' }}>
            <span className="tar-fr-av tabular-nums">{(f.friend_code ?? '??').slice(0, 2)}</span>
            <div className="who">
              <div className="code tabular-nums">{f.friend_code ?? '······'}</div>
              <div className={`last${f.is_in_gym ? ' live' : ''}`}>
                {f.is_in_gym ? t('inGym') : lastLabel}
              </div>
            </div>
            <div className="wk">
              <div className="v tabular-nums">
                {f.week_sessions}
                <em>{t('unitSessions')}</em>
              </div>
              <div className="k">{t('stats.week')}</div>
            </div>
            <div className="wk">
              <div className="v tabular-nums">
                {tons}
                <em>{t('unitTons')}</em>
              </div>
              <div className="k">{t('stats.tonnage')}</div>
            </div>
            <form action={removeFriendAction} className="go">
              <input type="hidden" name="friendId" value={f.friend_id} />
              <button
                type="submit"
                aria-label={t('remove')}
                className="transition-colors hover:text-red-400"
                style={{ color: 'var(--tar-ink-soft)', display: 'grid', placeItems: 'center' }}
              >
                <Trash2 className="i" style={{ width: 14, height: 14 }} />
              </button>
            </form>
          </div>
        )
      })}
    </div>
  )
}
