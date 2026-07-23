'use client'

import { useMemo, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { MessageCircle, Trash2 } from 'lucide-react'
import {
  commentAction,
  deleteCommentAction,
  loadCommentsAction,
} from '@/app/(app)/friends/activity-actions'
import type { FeedComment } from '@/lib/db/activity'

interface Props {
  eventId: string
  commentCount: number
  myUserId: string
  eventAuthorId: string
}

// Top-level helper so Date.now() stays out of the render path
// (React Compiler purity rule) — see FriendsPrFeed.buildTimeAgoLabels.
function buildCommentTimeLabels(comments: FeedComment[], locale: string): Map<string, string> {
  const now = Date.now()
  const m = new Map<string, string>()
  for (const c of comments) {
    const minutes = Math.max(0, Math.floor((now - new Date(c.created_at).getTime()) / 60000))
    let label: string
    if (minutes < 1) {
      label = locale === 'ru' ? 'сейчас' : 'now'
    } else if (minutes < 60) {
      label = locale === 'ru' ? `${minutes} мин назад` : `${minutes}m ago`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      label = locale === 'ru' ? `${hours} ч назад` : `${hours}h ago`
    } else {
      const days = Math.floor(minutes / 1440)
      label = locale === 'ru' ? `${days} дн назад` : `${days}d ago`
    }
    m.set(c.id, label)
  }
  return m
}

export function EventComments({ eventId, commentCount, myUserId, eventAuthorId }: Props) {
  const t = useTranslations('friends')
  const locale = useLocale()
  const [expanded, setExpanded] = useState(false)
  // null = not fetched yet; [] = fetched and empty.
  const [comments, setComments] = useState<FeedComment[] | null>(null)
  const [isPending, startTransition] = useTransition()
  // Separate transition for create/delete mutations so it doesn't interfere
  // with the initial list-load pending state above.
  const [isMutating, startMutation] = useTransition()

  const timeLabels = useMemo(
    () => buildCommentTimeLabels(comments ?? [], locale),
    [comments, locale],
  )

  function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next && comments === null) {
      startTransition(async () => {
        const res = await loadCommentsAction(eventId)
        setComments(res)
      })
    }
  }

  function handleSubmit(formData: FormData) {
    startMutation(async () => {
      await commentAction(formData)
      const res = await loadCommentsAction(eventId)
      setComments(res)
    })
  }

  function handleDelete(commentId: string) {
    startMutation(async () => {
      const fd = new FormData()
      fd.set('commentId', commentId)
      await deleteCommentAction(fd)
      const res = await loadCommentsAction(eventId)
      setComments(res)
    })
  }

  return (
    <div className="tar-fr-cm">
      <button type="button" onClick={toggle} className="tar-fr-cm-toggle" aria-expanded={expanded}>
        <MessageCircle className="i" />
        {t('comments.count', { n: commentCount })}
      </button>

      {expanded && (
        <div className="tar-fr-cm-body">
          {comments === null ? (
            isPending && <div className="tar-fr-cm-loading">…</div>
          ) : comments.length === 0 ? (
            <div className="tar-fr-cm-empty">{t('comments.empty')}</div>
          ) : (
            <div className="tar-fr-cm-list">
              {comments.map((c) => {
                const name = c.display_name?.trim() || c.friend_code || t('anonymous')
                const canDelete = c.user_id === myUserId || eventAuthorId === myUserId
                return (
                  <div key={c.id} className="tar-fr-cm-item">
                    <span className="tar-fr-av sm">{name.slice(0, 2).toUpperCase()}</span>
                    <div className="bx">
                      <div className="row1">
                        <span className="name">{name}</span>
                        <span className="ago">{timeLabels.get(c.id)}</span>
                      </div>
                      <p className="txt">{c.body}</p>
                    </div>
                    {canDelete && (
                      <form
                        className="del-form"
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleDelete(c.id)
                        }}
                      >
                        <button
                          type="submit"
                          aria-label={t('comments.delete')}
                          className="del"
                          disabled={isMutating}
                        >
                          <Trash2 className="i" />
                        </button>
                      </form>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <form action={handleSubmit} className="tar-fr-cm-form">
            <input type="hidden" name="eventId" value={eventId} />
            <textarea
              name="body"
              maxLength={280}
              rows={2}
              placeholder={t('comments.placeholder')}
            />
            <button type="submit" disabled={isMutating}>
              {t('comments.send')}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
