import { getTranslations } from 'next-intl/server'
import { ActivityCard } from '@/components/friends/ActivityCard'
import type { FeedEvent } from '@/lib/db/activity'

interface Props {
  events: FeedEvent[]
  myUserId: string
}

// Pagination ("load more") is out of scope for v1 — the RPC already caps at
// the 30 most-recent events within the last 21 days.
export async function ActivityFeed({ events, myUserId }: Props) {
  const t = await getTranslations('friends')

  if (events.length === 0) {
    return (
      <div className="tar-fr-empty tar-d-rise tar-d-rise-5">
        <div className="t">{t('feed.empty')}</div>
      </div>
    )
  }

  return (
    <div className="tar-fr-list tar-d-rise tar-d-rise-5">
      {events.map((event) => (
        <ActivityCard key={event.event_id} event={event} myUserId={myUserId} />
      ))}
    </div>
  )
}
