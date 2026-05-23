'use client'

import { useTranslations } from 'next-intl'
import { Check, X } from 'lucide-react'
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
} from '@/app/(app)/friends/actions'
import type { PendingFriendRequest } from '@/lib/db/friends'

interface Props {
  requests: PendingFriendRequest[]
}

export function FriendRequestList({ requests }: Props) {
  const t = useTranslations('friends')

  if (requests.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
        {t('requestsTitle', { n: requests.length })}
      </h2>
      <div className="space-y-2">
        {requests.map(req => (
          <div
            key={req.friendship_id}
            className="flex items-center gap-3 rounded-2xl p-3"
            style={{
              background: 'rgba(167, 139, 250, 0.06)',
              border: '1px solid rgba(167, 139, 250, 0.28)',
            }}
          >
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center font-mono font-extrabold text-sm shrink-0"
              style={{ background: 'rgba(167, 139, 250, 0.16)', color: '#A78BFA' }}
            >
              {(req.requester_code ?? '??').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white font-mono tabular-nums">
                {req.requester_code ?? '······'}
              </p>
              <p className="text-[11px] text-white/45">{t('wantsToAdd')}</p>
            </div>
            <form action={acceptFriendRequestAction}>
              <input type="hidden" name="friendshipId" value={req.friendship_id} />
              <button
                type="submit"
                aria-label={t('accept')}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 transition hover:bg-emerald-500/25"
              >
                <Check className="h-4 w-4" />
              </button>
            </form>
            <form action={declineFriendRequestAction}>
              <input type="hidden" name="friendshipId" value={req.friendship_id} />
              <button
                type="submit"
                aria-label={t('decline')}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-white/45 transition hover:bg-white/[0.08] hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
