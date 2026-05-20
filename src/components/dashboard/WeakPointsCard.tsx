'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import type { WeakPoint } from '@/lib/services/weak-points.service'

interface Props {
  weakPoints: WeakPoint[]
  muscleLabels: Record<string, string>
}

export function WeakPointsCard({ weakPoints, muscleLabels }: Props) {
  const t = useTranslations('dashboard.weakPoints')

  if (weakPoints.length === 0) {
    return (
      <div
        className="rounded-[20px] p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 211, 168, 0.08), rgba(255, 255, 255, 0.02))',
          border: '1px solid rgba(34, 211, 168, 0.18)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(34, 211, 168, 0.16)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8.5L6.5 12L13 4" stroke="#5EEAD4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#5EEAD4' }}>
              {t('label')}
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">{t('allCovered')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-[20px] p-5"
      style={{
        background: '#15151C',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255, 180, 50, 0.14)' }}
          >
            <AlertTriangle className="h-4 w-4" style={{ color: '#FFC044' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#FFC044' }}>
              {t('label')}
            </p>
            <p className="text-sm font-bold text-white">{t('title')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {weakPoints.map(wp => {
          const name = muscleLabels[wp.muscle] ?? wp.muscle
          return (
            <Link
              key={wp.muscle}
              href={`/exercise-library?muscle=${wp.muscle}`}
              className="flex items-center gap-3 p-2.5 -mx-1 rounded-[12px] transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white truncate">{name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {/* Progress bar */}
                  <div className="relative h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(4, 100 - wp.deficit_pct)}%`,
                        background: wp.deficit_pct > 60 ? '#FF6E76' : '#FFC044',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 tabular-nums flex-shrink-0 w-16 text-right">
                    {wp.weekly_sets_avg}/{wp.target_mv} {t('setsShort')}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 flex-shrink-0" />
            </Link>
          )
        })}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
        {t('hint')}
      </p>
    </div>
  )
}
