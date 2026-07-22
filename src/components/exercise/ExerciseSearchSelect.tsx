'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Search } from 'lucide-react'
import { normalizeQuery } from '@/lib/utils/exercise-filter'

export interface ExerciseOption {
  id: string
  label: string
}

interface Props {
  options: ExerciseOption[]
  selectedId?: string
  /** Route to navigate to on pick; the exercise id lands in ?exercise=. */
  basePath: string
  /** Extra query params to preserve (e.g. period). */
  preserveParams?: Record<string, string>
  labels: {
    placeholder: string
    empty: string
  }
  /** Visual size: full-width field (progress) or compact pill (analytics). */
  variant?: 'field' | 'pill'
}

export function ExerciseSearchSelect({
  options,
  selectedId,
  basePath,
  preserveParams,
  labels,
  variant = 'field',
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.id === selectedId)

  const filtered = useMemo(() => {
    const q = normalizeQuery(query)
    if (!q) return options
    return options.filter((o) => normalizeQuery(o.label).includes(q))
  }, [options, query])

  function pick(id: string) {
    setOpen(false)
    setQuery('')
    const params = new URLSearchParams(preserveParams)
    params.set('exercise', id)
    router.push(`${basePath}?${params.toString()}`)
  }

  function toggle() {
    setOpen((v) => {
      if (!v) setTimeout(() => inputRef.current?.focus(), 0)
      return !v
    })
  }

  const triggerClass =
    variant === 'pill'
      ? 'inline-flex max-w-[180px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold'
      : 'flex h-11 w-full items-center gap-2 rounded-[10px] px-3 text-sm font-medium'

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={`${triggerClass} cursor-pointer outline-none transition-colors`}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#FFFFFF',
        }}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {selected?.label ?? labels.placeholder}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform"
          style={{
            color: 'rgba(255,255,255,0.5)',
            transform: open ? 'rotate(180deg)' : undefined,
          }}
        />
      </button>

      {open && (
        <>
          {/* click-away captor */}
          <button
            type="button"
            aria-label="close"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div
            className="absolute right-0 z-50 mt-2 w-72 max-w-[85vw] overflow-hidden rounded-[14px] shadow-2xl"
            style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={labels.placeholder}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                style={{ color: '#FFFFFF' }}
              />
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <p className="px-3 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {labels.empty}
                </p>
              )}
              {filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => pick(o.id)}
                  className="block w-full truncate px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06]"
                  style={{
                    color: o.id === selectedId ? 'var(--tar-brand-2, #FFB627)' : '#FFFFFF',
                    fontWeight: o.id === selectedId ? 700 : 400,
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
