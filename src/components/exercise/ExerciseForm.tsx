'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, X, Check, Loader2 } from 'lucide-react'
import { createExerciseAction } from '@/app/(app)/exercise-library/actions'
import type { Exercise } from '@/lib/types/models'

const MUSCLES = [
  'chest',
  'back',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'traps',
  'lats',
  'rear_delts',
  'front_delts',
  'side_delts',
]
const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']
const MECHANIC = ['compound', 'isolation']

interface Props {
  /** Optional callback when an exercise is created (used by ExerciseSearch inline path) */
  onCreated?: (exercise: Exercise) => void
  /** Default name to prefill */
  prefilledName?: string
  /** Replace the trigger button label */
  triggerLabel?: string
  /** Skip the trigger button and open the form right away */
  defaultOpen?: boolean
  /** Called when the user closes the form (only relevant with defaultOpen) */
  onDismiss?: () => void
}

export function ExerciseForm({
  onCreated,
  prefilledName,
  triggerLabel,
  defaultOpen = false,
  onDismiss,
}: Props) {
  const t = useTranslations('exerciseForm')
  const tHistory = useTranslations('history')
  const tLib = useTranslations('exerciseLibrary')

  const [open, setOpen] = useState(defaultOpen)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(prefilledName ?? '')
  const [nameRu, setNameRu] = useState('')
  const [primaryMuscle, setPrimaryMuscle] = useState('chest')
  const [equipment, setEquipment] = useState('barbell')
  const [mechanic, setMechanic] = useState<'compound' | 'isolation'>('compound')

  function reset() {
    setName('')
    setNameRu('')
    setPrimaryMuscle('chest')
    setEquipment('barbell')
    setMechanic('compound')
    setError(null)
    setSaved(false)
  }

  function close() {
    setOpen(false)
    reset()
    if (onDismiss) onDismiss()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('name', name.trim())
    if (nameRu.trim()) fd.set('name_ru', nameRu.trim())
    fd.set('primary_muscle', primaryMuscle)
    fd.set('equipment', equipment)
    fd.set('mechanic', mechanic)

    startTransition(async () => {
      try {
        const result = await createExerciseAction(fd)
        setSaved(true)
        if (onCreated) onCreated(result)
        setTimeout(() => {
          close()
        }, 700)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90"
        style={{ background: '#FF3B47', color: '#FFFFFF' }}
      >
        <Plus className="h-3.5 w-3.5" />
        {triggerLabel ?? t('triggerLabel')}
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      style={{ background: 'rgba(0, 0, 0, 0.65)' }}
      onClick={close}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[20px] flex flex-col animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        style={{
          background: '#15151C',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          maxHeight: 'calc(100dvh - 24px)',
        }}
      >
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">{t('title')}</h2>
            <button
              type="button"
              onClick={close}
              className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Name (en + ru) */}
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t('name')}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                autoFocus
                required
                minLength={2}
                maxLength={100}
                className="w-full h-10 px-3 rounded-[8px] text-sm bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {t('nameRu')}
              </label>
              <input
                value={nameRu}
                onChange={(e) => setNameRu(e.target.value)}
                placeholder={t('nameRuPlaceholder')}
                maxLength={100}
                className="w-full h-10 px-3 rounded-[8px] text-sm bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700"
              />
            </div>
          </div>

          {/* Primary muscle — pill grid */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t('primaryMuscle')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {MUSCLES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPrimaryMuscle(m)}
                  className="h-9 text-[11px] font-bold rounded-[6px] transition-colors truncate px-1"
                  style={{
                    background:
                      primaryMuscle === m ? 'rgba(255, 59, 71, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border:
                      primaryMuscle === m
                        ? '1px solid #FF3B47'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                    color: primaryMuscle === m ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                  }}
                >
                  {tHistory(`muscleLabel.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t('equipment')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {EQUIPMENT.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEquipment(e)}
                  className="h-9 text-[11px] font-bold rounded-[6px] transition-colors truncate px-1"
                  style={{
                    background:
                      equipment === e ? 'rgba(255, 59, 71, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border:
                      equipment === e ? '1px solid #FF3B47' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: equipment === e ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                  }}
                >
                  {tLib(`equipment.${e}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Mechanic */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t('mechanic')}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {MECHANIC.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMechanic(m as 'compound' | 'isolation')}
                  className="h-9 text-[11px] font-bold rounded-[6px] transition-colors"
                  style={{
                    background:
                      mechanic === m ? 'rgba(255, 59, 71, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border:
                      mechanic === m ? '1px solid #FF3B47' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: mechanic === m ? '#FFFFFF' : 'rgba(255, 255, 255, 0.55)',
                  }}
                >
                  {t(`mechanicOption.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[11px]" style={{ color: '#FF6E76' }}>
              {error}
            </p>
          )}
        </div>

        <div
          className="flex gap-2 p-5 pt-3"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: '#15151C',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
          }}
        >
          <button
            type="submit"
            disabled={isPending || !name.trim() || name.trim().length < 2}
            className="flex-1 h-10 rounded-[8px] text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: '#FF3B47' }}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {saved && <Check className="h-4 w-4" />}
            {saved ? t('saved') : isPending ? t('saving') : t('save')}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={isPending}
            className="h-10 px-4 rounded-[8px] text-sm transition-colors disabled:opacity-40"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.65)',
            }}
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
