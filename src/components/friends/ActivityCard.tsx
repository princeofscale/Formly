import type { ReactNode } from 'react'
import { Check, Dumbbell, Flame } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { ReactionRow } from '@/components/friends/ReactionRow'
import { EventComments } from '@/components/friends/EventComments'
import { weightUnit } from '@/lib/units'
import type { FeedEvent } from '@/lib/db/activity'

interface Props {
  event: FeedEvent
  myUserId: string
}

// Top-level helper so Date.now() stays out of the JSX construction —
// mirrors the buildTimeAgoLabels/buildCommentTimeLabels pattern used by the
// sibling friends components (server components don't need it for React
// Compiler purity, but it keeps the render body clean and consistent).
function relativeTime(createdAt: string, locale: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
  if (minutes < 1) return locale === 'ru' ? 'сейчас' : 'now'
  if (minutes < 60) return locale === 'ru' ? `${minutes} мин назад` : `${minutes}m ago`
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return locale === 'ru' ? `${hours} ч назад` : `${hours}h ago`
  }
  const days = Math.floor(minutes / 1440)
  return locale === 'ru' ? `${days} дн назад` : `${days}d ago`
}

export async function ActivityCard({ event, myUserId }: Props) {
  const t = await getTranslations('friends')
  const locale = await getLocale()
  const kg = weightUnit(locale)

  const name = event.display_name?.trim() || event.friend_code || t('anonymous')
  const initials = name.slice(0, 2).toUpperCase()

  let icon: ReactNode
  let text: string

  switch (event.type) {
    case 'weight_pr': {
      const exerciseName = String(event.payload.exercise_name ?? '')
      const exerciseNameRu =
        event.payload.exercise_name_ru != null ? String(event.payload.exercise_name_ru) : null
      const localizedName = locale === 'ru' ? (exerciseNameRu ?? exerciseName) : exerciseName
      const weightKg = Number(event.payload.weight_kg) || 0
      const reps = Number(event.payload.reps) || 0
      const improvementPct =
        typeof event.payload.improvement_pct === 'number' ? event.payload.improvement_pct : null
      icon = <Dumbbell className="i" />
      text = `${t('feed.weightPr')} ${localizedName} ${weightKg}${kg} × ${reps}${
        improvementPct != null ? ` +${improvementPct.toFixed(1)}%` : ''
      }`
      break
    }
    case 'volume_pr': {
      const tonnage = ((Number(event.payload.tonnage_kg) || 0) / 1000).toFixed(1)
      icon = <Dumbbell className="i" />
      text = t('feed.volumePr', { tonnage })
      break
    }
    case 'workout_finished': {
      const tonnage = ((Number(event.payload.tonnage_kg) || 0) / 1000).toFixed(1)
      const sets = Number(event.payload.set_count) || 0
      const min = Number(event.payload.duration_min) || 0
      icon = <Check className="i finished" />
      text = t('feed.finished', { tonnage, sets, min })
      break
    }
    case 'streak_milestone': {
      const days = Number(event.payload.days) || 0
      icon = <Flame className="i streak" />
      text = t('feed.streak', { days })
      break
    }
    case 'workout_started':
    default: {
      icon = <span className="tar-fr-ac-live" aria-hidden />
      text = t('feed.live')
      break
    }
  }

  return (
    <div className="tar-fr-ac">
      <div className="hd">
        <span className="tar-fr-av">{initials}</span>
        <div className="who">
          <div className="name">{name}</div>
          <div className="ago">{relativeTime(event.created_at, locale)}</div>
        </div>
      </div>
      <div className="line">
        {icon}
        <span>{text}</span>
      </div>
      <ReactionRow eventId={event.event_id} counts={event.reactions} mine={event.my_reactions} />
      <EventComments
        eventId={event.event_id}
        commentCount={event.comment_count}
        myUserId={myUserId}
        eventAuthorId={event.author_id}
      />
    </div>
  )
}
