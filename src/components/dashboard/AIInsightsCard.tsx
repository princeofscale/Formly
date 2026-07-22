'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  RefreshCw,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Database,
} from 'lucide-react'
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

  const updatedTime = insights?.generated_at
    ? new Date(insights.generated_at).toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: locale !== 'ru',
      })
    : null

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.10] via-card to-card animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[300ms]">
      <CardHeader className="border-b border-white/[0.06] pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20">
              <BrainCircuit className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="block uppercase tracking-wider font-bold text-xs">{t('title')}</span>
              <span className="block text-[9px] font-normal text-white/40">{t('subtitle')}</span>
            </div>
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
        {!insights && !isPending && !error && (
          <div className="py-3 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
            <p className="mx-auto max-w-xs text-xs leading-relaxed text-white/50">{t('empty')}</p>
            <button
              type="button"
              onClick={runGeneration}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-primary-foreground transition hover:brightness-110"
            >
              {t('analyze')}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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
                    <p className="mt-1 flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                      <Database className="h-3 w-3" />
                      {item.detail}
                    </p>
                  )}
                  {item.action && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-white/[0.045] px-2.5 py-2 text-[11px] font-semibold text-white/75">
                      <ArrowRight
                        className="mt-0.5 h-3 w-3 shrink-0"
                        style={{ color: style.color }}
                      />
                      <span>
                        <b className="mr-1 text-white/40">{t('action')}:</b>
                        {item.action}
                      </span>
                    </div>
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
