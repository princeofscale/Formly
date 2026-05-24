'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { WORKOUT_PRESETS } from '@/lib/constants/workout-presets'
import { startFromPresetAction } from '@/app/(app)/workout/new/actions'

export function PresetPrograms() {
  const t = useTranslations('presets')
  const [openProgramId, setOpenProgramId] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{t('title')}</h2>
        <p className="text-[11px] text-zinc-600 mt-0.5">{t('subtitle')}</p>
      </div>

      <div className="space-y-2">
        {WORKOUT_PRESETS.map((program) => {
          const isOpen = openProgramId === program.id
          return (
            <div
              key={program.id}
              className="rounded-xl overflow-hidden transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${isOpen ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              <button
                type="button"
                onClick={() => setOpenProgramId(isOpen ? null : program.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/3 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    background: isOpen
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.15))'
                      : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {program.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white truncate">{t(program.titleKey)}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{t(program.subtitleKey)}</div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 transition-transform flex-shrink-0 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {program.days.map((day) => (
                    <form key={day.id} action={startFromPresetAction}>
                      <input type="hidden" name="dayId" value={day.id} />
                      <button
                        type="submit"
                        className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white/3 border border-white/8 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors group text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {t(day.titleKey)}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {t('exercises', { n: day.slugs.length })}
                          </div>
                        </div>
                        <span
                          className="h-7 px-3 flex items-center text-[10px] font-bold uppercase tracking-wider rounded-md text-black flex-shrink-0 transition-opacity group-hover:opacity-100"
                          style={{
                            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          }}
                        >
                          {t('startDay')}
                        </span>
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
