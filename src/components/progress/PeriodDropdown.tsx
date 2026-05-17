'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

interface Props {
  current: string
  exerciseId: string | undefined
  label: string
}

const PERIODS = ['7d', '30d', '90d', '1y'] as const

export function PeriodDropdown({ current, exerciseId, label }: Props) {
  const router = useRouter()
  const t = useTranslations('progress.periods')

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams()
    if (exerciseId) params.set('exercise', exerciseId)
    params.set('period', e.target.value)
    router.push(`/progress?${params.toString()}`)
  }

  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </span>
      <div className="relative mt-1">
        <select
          value={current}
          onChange={handleChange}
          className="w-full h-11 pl-3 pr-9 rounded-[10px] text-sm font-medium appearance-none outline-none cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#FFFFFF',
          }}
        >
          {PERIODS.map(p => (
            <option key={p} value={p} style={{ background: '#15151C' }}>
              {t(p)}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        />
      </div>
    </label>
  )
}
