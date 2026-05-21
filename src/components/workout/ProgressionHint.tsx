'use client'

import { useTranslations } from 'next-intl'
import { Sparkles, TrendingUp, Minus, TrendingDown } from 'lucide-react'
import type { NextSetSuggestion } from '@/lib/services/progression.service'

interface Props {
  suggestion: NextSetSuggestion
  onApply: (weightKg: number, reps: number) => void
}

const ACTION_STYLE = {
  increase: { color: '#22D3A8', bg: 'rgba(34, 211, 168, 0.10)', border: 'rgba(34, 211, 168, 0.28)' },
  hold:     { color: '#FFC044', bg: 'rgba(255, 196, 68, 0.10)', border: 'rgba(255, 196, 68, 0.28)' },
  deload:   { color: '#FF6E76', bg: 'rgba(255, 110, 118, 0.10)', border: 'rgba(255, 110, 118, 0.28)' },
  firstSet: { color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.10)', border: 'rgba(148, 163, 184, 0.20)' },
}

export function ProgressionHint({ suggestion, onApply }: Props) {
  const t = useTranslations('workout.progression')
  const style = ACTION_STYLE[suggestion.action]
  const Icon = suggestion.action === 'increase' ? TrendingUp
    : suggestion.action === 'deload' ? TrendingDown
    : Minus

  return (
    <button
      type="button"
      onClick={() => onApply(suggestion.weightKg, suggestion.reps)}
      className="w-full flex items-center gap-2 rounded-xl p-2.5 transition active:scale-[0.98]"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Sparkles className="h-3.5 w-3.5" style={{ color: style.color }} />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3" style={{ color: style.color }} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: style.color }}>
            {t(`action.${suggestion.action}`)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-white/55 leading-tight">
          {t(`reason.${suggestion.reasonKey}`, suggestion.reasonParams ?? {})}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-extrabold tabular-nums" style={{ color: style.color }}>
          {suggestion.weightKg.toFixed(suggestion.weightKg % 1 === 0 ? 0 : 1)}
          <span className="text-white/35 font-mono mx-1">×</span>
          {suggestion.reps}
        </p>
        <p className="text-[9px] uppercase tracking-widest text-white/40">{t('tapToApply')}</p>
      </div>
    </button>
  )
}
