'use client'

import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { acceptFriendRequestAction, declineFriendRequestAction } from '@/app/(app)/friends/actions'
import type { PendingFriendRequest } from '@/lib/db/friends'

interface Props {
  requests: PendingFriendRequest[]
}

export function FriendRequestList({ requests }: Props) {
  const t = useTranslations('friends')

  if (requests.length === 0) return null

  return (
    <div className="tar-fr-list tar-d-rise tar-d-rise-4">
      {requests.map((req) => (
        <div key={req.friendship_id} className="tar-fr-req">
          <span className="tar-fr-av">
            {(req.requester_name || req.requester_code || '??').slice(0, 2).toUpperCase()}
          </span>
          <div className="who">
            <div className="code">{req.requester_name || req.requester_code || t('anonymous')}</div>
            <div className="sub">
              <span className="tabular-nums">{req.requester_code ?? '······'}</span> ·{' '}
              {t('wantsToAdd')}
            </div>
          </div>
          <form action={acceptFriendRequestAction}>
            <input type="hidden" name="friendshipId" value={req.friendship_id} />
            <button type="submit" className="tar-fr-acc">
              {t('accept')}
            </button>
          </form>
          <form action={declineFriendRequestAction}>
            <input type="hidden" name="friendshipId" value={req.friendship_id} />
            <button type="submit" className="tar-fr-dec" aria-label={t('decline')}>
              <X className="i" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}
