'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ACHIEVEMENT_META } from '@/lib/services/achievements.service'
import type { AchievementCode } from '@/lib/types/models'

interface Props {
  codes: AchievementCode[]
}

export function AchievementToast({ codes }: Props) {
  const t = useTranslations('achievements.items')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setTimeout(() => setVisible(false), 6000)
    return () => clearTimeout(id)
  }, [])

  if (!visible || codes.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs">
      {codes.map((code, i) => {
        const meta = ACHIEVEMENT_META[code]
        if (!meta) return null
        return (
          <div
            key={code}
            className="flex items-center gap-3 p-3 rounded-xl animate-in slide-in-from-right-4 fade-in zoom-in-95 duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(139,92,246,0.18))',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(245,158,11,0.4)',
              animationDelay: `${i * 200}ms`,
            }}
          >
            <div className="text-3xl flex-shrink-0">{meta.icon}</div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400">
                ✦ Achievement
              </div>
              <div className="text-sm font-bold text-white truncate">{t(`${code}.title`)}</div>
              <div className="text-[10px] text-zinc-400 truncate">{t(`${code}.desc`)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
