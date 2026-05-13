'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, Sparkles, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { refreshAIInsightsAction } from '@/app/(app)/dashboard/actions'
import type { AIInsights, AIInsightItem } from '@/lib/types/models'

const SECTION_COLORS: Record<AIInsightItem['type'], { border: string; color: string }> = {
  today:       { border: '#f59e0b', color: '#fbbf24' },
  progression: { border: '#a78bfa', color: '#c4b5fd' },
  prediction:  { border: '#4ade80', color: '#86efac' },
  warning:     { border: '#f87171', color: '#fca5a5' },
}

interface Props {
  initialInsights: AIInsights | null
}

export function AIInsightsCard({ initialInsights }: Props) {
  const t = useTranslations('aiInsights')
  const [insights, setInsights] = useState<AIInsights | null>(initialInsights)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function runGeneration() {
    const goal = typeof window !== 'undefined'
      ? localStorage.getItem('gymlog_goal') ?? undefined
      : undefined

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
      runGeneration()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updatedTime = insights?.generated_at
    ? new Date(insights.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[300ms]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #8b5cf6)' }}
            >
              <Sparkles className="h-3 w-3 text-white" />
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
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors disabled:opacity-40"
                title={t('refresh')}
              >
                <RefreshCw className={`h-3 w-3 text-zinc-500 ${isPending ? 'animate-spin' : ''}`} />
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
            {[0, 1, 2].map(i => (
              <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
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
                  className="pl-3 space-y-0.5"
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
