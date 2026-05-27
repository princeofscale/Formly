'use client'

import { useTranslations } from 'next-intl'
import { Check, X } from 'lucide-react'
import { acceptFriendRequestAction, declineFriendRequestAction } from '@/app/(app)/friends/actions'
import type { PendingFriendRequest } from '@/lib/db/friends'

interface Props {
  requests: PendingFriendRequest[]
}

export function FriendRequestList({ requests }: Props) {
  const t = useTranslations('friends')

  if (requests.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="tar-d-eyebrow">{t('requestsTitle', { n: requests.length })}</div>
      <div className="space-y-2">
        {requests.map((req) => (
          <div
            key={req.friendship_id}
            className="flex items-center gap-3 relative overflow-hidden"
            style={{
              padding: 12,
              borderRadius: 'var(--tar-r-lg)',
              background:
                'radial-gradient(120% 80% at 100% 0%, rgba(167, 139, 250, 0.08), transparent 60%), var(--tar-bg-elevated)',
              border: '1px solid rgba(167, 139, 250, 0.32)',
            }}
          >
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 tabular-nums"
              style={{
                background: 'rgba(167, 139, 250, 0.16)',
                color: '#A78BFA',
                font: '800 14px/1 var(--tar-tight)',
                letterSpacing: '0.04em',
              }}
            >
              {(req.requester_code ?? '??').slice(0, 2)}
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
                {req.requester_code ?? '······'}
              </div>
              <div
                style={{
                  font: '500 11px/1 var(--tar-mono)',
                  letterSpacing: '0.06em',
                  color: 'var(--tar-ink-mute)',
                  marginTop: 3,
                }}
              >
                {t('wantsToAdd')}
              </div>
            </div>
            <form action={acceptFriendRequestAction}>
              <input type="hidden" name="friendshipId" value={req.friendship_id} />
              <button
                type="submit"
                aria-label={t('accept')}
                className="flex items-center justify-center transition"
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 10,
                  background: 'rgba(43, 216, 132, 0.14)',
                  color: 'var(--tar-success)',
                  border: '1px solid rgba(43, 216, 132, 0.35)',
                }}
              >
                <Check className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </form>
            <form action={declineFriendRequestAction}>
              <input type="hidden" name="friendshipId" value={req.friendship_id} />
              <button
                type="submit"
                aria-label={t('decline')}
                className="flex items-center justify-center transition"
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 10,
                  background: 'var(--tar-card)',
                  color: 'var(--tar-ink-soft)',
                  border: '1px solid var(--tar-line)',
                }}
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
