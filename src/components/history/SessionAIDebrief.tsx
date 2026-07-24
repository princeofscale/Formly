'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Sparkles, Loader2, Database } from 'lucide-react'
import { getOrGenerateSessionDebriefAction } from '@/app/(app)/history/actions'
import { buildPrefillQuestion } from '@/lib/utils/coach-prefill'
import { normalizeDebriefItems } from '@/lib/services/session-debrief.service'
import type { SessionDebrief } from '@/lib/services/session-debrief.service'

interface Props {
  sessionId: string
}

export function SessionAIDebrief({ sessionId }: Props) {
  const t = useTranslations('history.debrief')
  const tCoach = useTranslations('coach')
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'ready'; data: SessionDebrief } | { kind: 'error' }
  >({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await getOrGenerateSessionDebriefAction(sessionId)
        if (cancelled) return
        if (!data || data.items.length === 0) setState({ kind: 'error' })
        else setState({ kind: 'ready', data })
      } catch {
        if (!cancelled) setState({ kind: 'error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  if (state.kind === 'error') return null

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-500/[0.08] to-transparent ring-1 ring-amber-500/20 p-4 space-y-2 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
          {t('title')}
        </h3>
      </div>

      {state.kind === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-white/55 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('loading')}
        </div>
      )}

      {state.kind === 'ready' && (
        <ul className="space-y-1.5">
          {normalizeDebriefItems(state.data.items).map((point, i) => (
            <li
              key={i}
              className="text-sm text-white/85 leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-amber-400/60"
            >
              {point.text}
              {point.evidence && (
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-white/45">
                  <Database className="h-3 w-3" />
                  {point.evidence}
                </span>
              )}
              <Link
                href={`/coach?q=${encodeURIComponent(
                  buildPrefillQuestion({ body: point.text, evidence: point.evidence }, (quoted) =>
                    tCoach('whyQuestion', { quoted }),
                  ),
                )}`}
                className="tar-coach-why"
              >
                {tCoach('why')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
