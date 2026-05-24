'use client'

import { useState, useEffect, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { RefreshCw, Sparkles, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { refreshAIInsightsAction } from '@/app/(app)/dashboard/actions'
import type { AIInsights, AIInsightItem } from '@/lib/types/models'

const SECTION_COLORS: Record<AIInsightItem['type'], { border: string; color: string }> = {
  today: { border: '#FF3B47', color: '#FF7A82' },
  progression: { border: '#F97316', color: '#FDBA74' },
  prediction: { border: '#34D399', color: '#86EFAC' },
  warning: { border: '#F87171', color: '#FCA5A5' },
}

interface Props {
  initialInsights: AIInsights | null
}

export function AIInsightsCard({ initialInsights }: Props) {
  const t = useTranslations('aiInsights')
  const locale = useLocale()
  const [insights, setInsights] = useState<AIInsights | null>(initialInsights)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function runGeneration() {
    const goal =
      typeof window !== 'undefined' ? (localStorage.getItem('gymlog_goal') ?? undefined) : undefined

    setError(null)
    startTransition(async () => {
      try {
        const result = await refreshAIInsightsAction(goal)
        setInsights(result)
      } catch (e) {
        console.error('[AIInsights] generation failed:', e)
        setError(t('error'))
      }
    })
  }

  useEffect(() => {
    if (!initialInsights) {
      const id = window.setTimeout(runGeneration, 0)
      return () => window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updatedTime = insights?.generated_at
    ? new Date(insights.generated_at).toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: locale !== 'ru',
      })
    : null

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[300ms]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="uppercase tracking-wider font-bold text-xs">{t('title')}</span>
          </div>
          <div className="flex items-center gap-2">
            {updatedTime && !isPending && (
              <span className="text-[9px] text-zinc-600 font-mono">
                {t('updated')} {updatedTime}
              </span>
            )}
            {insights && (
              <button
                onClick={runGeneration}
                disabled={isPending}
                className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors hover:bg-white/10 disabled:opacity-40"
                title={t('refresh')}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-white/45 ${isPending ? 'animate-spin' : ''}`}
                />
              </button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Loading state */}
        {isPending && !insights && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 animate-pulse">{t('updating')}</p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isPending && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button
              onClick={runGeneration}
              className="text-[10px] text-red-400 hover:text-red-300 underline"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* Insights */}
        {insights && !error && (
          <div className="space-y-2.5">
            {insights.items.map((item, i) => {
              const style = SECTION_COLORS[item.type] ?? SECTION_COLORS.today
              return (
                <div
                  key={i}
                  className="rounded-r-2xl bg-white/[0.025] py-1.5 pl-3 pr-2"
                  style={{ borderLeft: `2px solid ${style.border}` }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: style.color }}
                  >
                    {t(`types.${item.type}`)}
                  </p>
                  <p className="text-sm font-semibold text-white leading-tight">{item.title}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.body}</p>
                  {item.detail && (
                    <p className="text-[10px] font-mono text-zinc-500">{item.detail}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Refresh spinner overlay (while refreshing existing insights) */}
        {isPending && insights && (
          <p className="text-[10px] text-zinc-600 text-center animate-pulse">{t('updating')}</p>
        )}
      </CardContent>
    </Card>
  )
}
