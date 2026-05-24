'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import type { Exercise } from '@/lib/types/models'

interface Props {
  exercises: Exercise[]
  selectedId: string | undefined
  locale: string
  currentPeriod: string
  label: string
}

export function ExerciseDropdown({ exercises, selectedId, locale, currentPeriod, label }: Props) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams()
    params.set('exercise', e.target.value)
    if (currentPeriod) params.set('period', currentPeriod)
    router.push(`/progress?${params.toString()}`)
  }

  return (
    <label className="block">
      <span
        className="text-[10px] uppercase tracking-widest"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {label}
      </span>
      <div className="relative mt-1">
        <select
          value={selectedId ?? ''}
          onChange={handleChange}
          className="w-full h-11 pl-3 pr-9 rounded-[10px] text-sm font-medium appearance-none outline-none cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#FFFFFF',
          }}
        >
          {exercises.map((e) => (
            <option key={e.id} value={e.id} style={{ background: '#15151C' }}>
              {locale === 'ru' ? (e.name_ru ?? e.name) : e.name}
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
