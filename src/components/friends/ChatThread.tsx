'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import {
  sendMessageAction,
  loadThreadAction,
  markReadAction,
  deleteMessageAction,
} from '@/app/(app)/friends/message-actions'
import { groupMessagesByDay, type ThreadMessage } from '@/lib/db/messages'

interface Props {
  friendId: string
  friendName: string
  myUserId: string
  initial: ThreadMessage[]
}

const POLL_MS = 3000

// Top-level so Date.now() stays out of the render path (React Compiler purity),
// mirroring the buildCommentTimeLabels pattern in the sibling components.
function buildDayLabels(
  dayKeys: string[],
  locale: string,
  todayLabel: string,
  yesterdayLabel: string,
): Map<string, string> {
  const now = new Date()
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
  const todayKey = keyOf(now)
  const yd = new Date(now)
  yd.setDate(now.getDate() - 1)
  const yesterdayKey = keyOf(yd)

  const labels = new Map<string, string>()
  for (const dayKey of dayKeys) {
    if (dayKey === todayKey) {
      labels.set(dayKey, todayLabel)
    } else if (dayKey === yesterdayKey) {
      labels.set(dayKey, yesterdayLabel)
    } else {
      const [y, m, d] = dayKey.split('-').map(Number)
      labels.set(
        dayKey,
        new Date(y, m - 1, d).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
          day: 'numeric',
          month: 'short',
        }),
      )
    }
  }
  return labels
}

export function ChatThread({ friendId, friendName, myUserId, initial }: Props) {
  const t = useTranslations('friends')
  const locale = useLocale()
  const [messages, setMessages] = useState<ThreadMessage[]>(initial)
  const [isSending, startSend] = useTransition()
  const threadRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const groups = useMemo(() => groupMessagesByDay(messages), [messages])
  const dayLabels = useMemo(
    () =>
      buildDayLabels(
        groups.map((g) => g.dayKey),
        locale,
        t('chat.today'),
        t('chat.yesterday'),
      ),
    [groups, locale, t],
  )
  const lastMineId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].is_mine) return messages[i].id
    return null
  }, [messages])

  // Poll for new messages while the tab is visible.
  useEffect(() => {
    let cancelled = false
    async function refresh() {
      if (document.visibilityState !== 'visible') return
      const fresh = await loadThreadAction(friendId)
      if (!cancelled) setMessages(fresh)
    }
    const id = setInterval(refresh, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [friendId])

  // Mark incoming as read whenever an unread one is present while the thread is open.
  useEffect(() => {
    if (messages.some((m) => !m.is_mine && m.read_at === null)) {
      void markReadAction(friendId)
    }
  }, [messages, friendId])

  // Autoscroll to the bottom when near it (don't yank the user reading history).
  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  function handleSend(formData: FormData) {
    const body = (formData.get('body')?.toString() ?? '').trim()
    if (body.length === 0) return
    const optimistic: ThreadMessage = {
      id: `temp-${Date.now()}`,
      sender_id: myUserId,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
      is_mine: true,
    }
    setMessages((prev) => [...prev, optimistic])
    startSend(async () => {
      await sendMessageAction(formData)
      const fresh = await loadThreadAction(friendId)
      setMessages(fresh)
    })
  }

  function handleDelete(formData: FormData) {
    startSend(async () => {
      await deleteMessageAction(formData)
      const fresh = await loadThreadAction(friendId)
      setMessages(fresh)
    })
  }

  return (
    <div className="tar-chat-wrap tar-d-rise tar-d-rise-2">
      <div className="tar-chat-thread" ref={threadRef}>
        {messages.length === 0 ? (
          <div className="tar-chat-empty">{t('chat.empty')}</div>
        ) : (
          groups.map((g) => (
            <div key={g.dayKey} className="tar-chat-group">
              <div className="tar-chat-day">
                <span>{dayLabels.get(g.dayKey)}</span>
              </div>
              {g.messages.map((m) => {
                const isTemp = m.id.startsWith('temp-')
                return (
                  <div key={m.id} className={`tar-chat-msg ${m.is_mine ? 'mine' : 'their'}`}>
                    <div className="bubble">
                      <span className="txt">{m.body}</span>
                      {m.is_mine && !isTemp && (
                        <form
                          className="del-form"
                          onSubmit={(e) => {
                            e.preventDefault()
                            const fd = new FormData()
                            fd.set('messageId', m.id)
                            handleDelete(fd)
                          }}
                        >
                          <button
                            type="submit"
                            className="del"
                            aria-label={t('chat.delete')}
                            disabled={isSending}
                          >
                            <Trash2 className="i" />
                          </button>
                        </form>
                      )}
                    </div>
                    {m.is_mine && m.id === lastMineId && m.read_at !== null && (
                      <div className="tar-chat-seen">{t('chat.seen')}</div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      <form ref={formRef} action={handleSend} className="tar-chat-form">
        <input type="hidden" name="friendId" value={friendId} />
        <label className="sr-only" htmlFor="chat-body">
          {t('chat.placeholder')}
        </label>
        <textarea
          id="chat-body"
          name="body"
          rows={1}
          maxLength={1000}
          placeholder={t('chat.placeholder')}
          aria-label={`${t('chat.placeholder')} · ${friendName}`}
        />
        <button type="submit" disabled={isSending}>
          {t('chat.send')}
        </button>
      </form>
    </div>
  )
}
