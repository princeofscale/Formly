'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Database, Loader2, Send } from 'lucide-react'
import { askCoachAction, getCoachThreadAction } from '@/app/(app)/coach/actions'
import type { CoachMessage } from '@/lib/db/coach'

interface Props {
  initial: CoachMessage[]
  prefill: string
}

const STARTERS = ['starterStalled', 'starterVolume', 'starterNext'] as const

export function CoachThread({ initial, prefill }: Props) {
  const t = useTranslations('coach')
  const [messages, setMessages] = useState(initial)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<'quota' | 'failed' | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Вопрос из «Почему так?» только подставляется. Автоотправка сожгла бы
  // единицу квоты и создала запись в треде от одного случайного нажатия.
  useEffect(() => {
    if (prefill && inputRef.current) inputRef.current.value = prefill
  }, [prefill])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending])

  async function handleAsk(formData: FormData) {
    const question = String(formData.get('question') ?? '').trim()
    if (!question || pending) return

    setPending(true)
    setNotice(null)
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: 'user',
        body: question,
        evidence: null,
        created_at: new Date().toISOString(),
      },
    ])

    const result = await askCoachAction(formData)

    if (result.ok) {
      // Перечитываем тред целиком: сервер вернул только статус, а ответ коуча
      // и его основание лежат в базе. Заодно временное сообщение заменяется
      // настоящей записью с её идентификатором.
      setMessages(await getCoachThreadAction())
    } else if (result.reason === 'quota') {
      setNotice('quota')
    } else if (result.reason === 'failed') {
      setNotice('failed')
    }

    setPending(false)
  }

  return (
    <div className="tar-chat">
      <div className="tar-chat-thread">
        {messages.length === 0 && !pending && (
          <div className="tar-chat-empty">
            <p>{t('empty')}</p>
            <div className="tar-chat-starters">
              {STARTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="tar-chat-starter"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.value = t(key)
                      inputRef.current.focus()
                    }
                  }}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`tar-chat-msg ${m.role === 'user' ? 'mine' : 'their'}`}>
            <div className="bubble">
              <span className="txt">{m.body}</span>
            </div>
            {m.evidence && (
              <span className="tar-chat-evidence">
                <Database className="i" />
                {m.evidence}
              </span>
            )}
          </div>
        ))}

        {pending && (
          <div className="tar-chat-msg their">
            <div className="bubble tar-chat-thinking">
              <Loader2 className="i" />
              <span className="txt">{t('thinking')}</span>
            </div>
          </div>
        )}

        {notice && <div className="tar-chat-notice">{t(notice)}</div>}
        <div ref={endRef} />
      </div>

      <form action={handleAsk} className="tar-chat-form">
        <textarea
          ref={inputRef}
          name="question"
          maxLength={1000}
          rows={1}
          placeholder={t('placeholder')}
          disabled={pending}
        />
        <button type="submit" disabled={pending} aria-label={t('send')}>
          <Send className="i" />
        </button>
      </form>
    </div>
  )
}
