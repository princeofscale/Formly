'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Trash2, X, Pencil, CloudUpload } from 'lucide-react'
import { updateSetAction, deleteSetAction } from '@/app/(app)/workout/[id]/actions'
import type { SetEntry } from '@/lib/types/models'

interface Props {
  set: SetEntry
  isLast: boolean
  isBodyweight?: boolean
  onUpdated: (set: SetEntry) => void
  onDeleted: (setId: string) => void
}

const SWIPE_THRESHOLD = 80

export function LoggedSetRow({ set, isLast, isBodyweight = false, onUpdated, onDeleted }: Props) {
  const t = useTranslations('workout')
  const tEdit = useTranslations('workout.editSet')

  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(String(set.weight_kg))
  const [reps, setReps] = useState(String(set.reps))
  const [rpe, setRpe] = useState(set.rpe != null ? String(set.rpe) : '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [, startTransition] = useTransition()
  const [isBusy, setIsBusy] = useState(false)

  // Swipe state
  const [swipeX, setSwipeX] = useState(0)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)

  const isOffline = set.id.startsWith('offline_')

  // Reset draft fields if set prop changes externally
  useEffect(() => {
    setWeight(String(set.weight_kg))
    setReps(String(set.reps))
    setRpe(set.rpe != null ? String(set.rpe) : '')
  }, [set.id, set.weight_kg, set.reps, set.rpe])

  if (isOffline) {
    return (
      <div className={`flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-[6px] text-sm opacity-60 ${
        isLast ? 'border-l-2 border-amber-400/60 pl-2' : ''
      }`}
        style={{ background: 'rgba(255, 196, 68, 0.04)' }}
        title="Set queued offline — syncs when back online"
      >
        <span className="font-mono text-[10px] text-zinc-700 w-5">#{set.set_number}</span>
        <span className={`font-mono font-bold ${isLast ? 'text-zinc-200' : 'text-zinc-500'}`}>
          {isBodyweight && set.weight_kg === 0 ? (
            <span className="text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>BW</span>
          ) : isBodyweight && set.weight_kg > 0 ? (
            <>+{set.weight_kg}<span className="text-zinc-700 font-normal text-[10px]">кг</span></>
          ) : (
            <>{set.weight_kg}<span className="text-zinc-700 font-normal text-[10px]">кг</span></>
          )}
          <span className="text-zinc-700 mx-1.5">×</span>
          {set.reps}
        </span>
        {set.rpe != null && (
          <span className="text-[10px] text-zinc-600">{t('rpe')} {set.rpe}</span>
        )}
        <CloudUpload className="h-3.5 w-3.5 ml-auto flex-shrink-0 animate-pulse text-amber-300" />
      </div>
    )
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (editing) return
    touchStartXRef.current = e.touches[0].clientX
    touchStartYRef.current = e.touches[0].clientY
    cancelledRef.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (editing || touchStartXRef.current == null || cancelledRef.current) return
    const dx = e.touches[0].clientX - touchStartXRef.current
    const dy = e.touches[0].clientY - (touchStartYRef.current ?? 0)
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
      cancelledRef.current = true
      setSwipeX(0)
      return
    }
    if (dx < 0) setSwipeX(Math.max(-120, dx))
    else if (swipeX < 0 && dx > 0) setSwipeX(Math.min(0, swipeX + dx))
  }

  function handleTouchEnd() {
    if (editing) return
    if (swipeX <= -SWIPE_THRESHOLD) setSwipeX(-96)
    else setSwipeX(0)
    touchStartXRef.current = null
    touchStartYRef.current = null
  }

  function handleSave() {
    const r = parseInt(reps)
    if (!r) return
    const w = parseFloat(weight)
    const weightToSave = isBodyweight ? (Number.isFinite(w) ? w : 0) : w
    if (!isBodyweight && !weightToSave) return
    const rpeVal = rpe ? Math.max(1, Math.min(10, parseFloat(rpe))) : undefined
    setIsBusy(true)
    startTransition(async () => {
      try {
        const { set: updated } = await updateSetAction({
          setId: set.id, weightKg: weightToSave, reps: r, rpe: rpeVal,
        })
        onUpdated(updated)
        setEditing(false)
      } finally {
        setIsBusy(false)
      }
    })
  }

  function handleDelete() {
    setIsBusy(true)
    startTransition(async () => {
      try {
        await deleteSetAction(set.id)
        onDeleted(set.id)
      } finally {
        setIsBusy(false)
      }
    })
  }

  function cancelEdit() {
    setWeight(String(set.weight_kg))
    setReps(String(set.reps))
    setRpe(set.rpe != null ? String(set.rpe) : '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-[10px] p-2 my-1 space-y-2 animate-in fade-in duration-150"
        style={{
          background: 'rgba(255, 59, 71, 0.06)',
          border: '1px solid rgba(255, 59, 71, 0.25)',
        }}
      >
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest"
          style={{ color: 'rgba(255, 59, 71, 0.8)' }}
        >
          <Pencil className="h-3 w-3" />
          <span className="font-bold">{tEdit('title', { n: set.set_number })}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <div className="space-y-0.5">
            <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">
              {isBodyweight ? t('extraWeightLabel') : t('weightLabel')}
            </p>
            <input
              type="number" inputMode="decimal" step={2.5} min={0}
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder={isBodyweight ? 'BW' : ''}
              className="w-full h-9 px-1.5 text-center font-mono font-bold text-sm rounded-[6px] bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">{t('repsLabel')}</p>
            <input
              type="number" inputMode="numeric" min={1}
              value={reps}
              onChange={e => setReps(e.target.value)}
              className="w-full h-9 px-1.5 text-center font-mono font-bold text-sm rounded-[6px] bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="space-y-0.5">
            <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-600">{t('rpeLabel')}</p>
            <input
              type="number" inputMode="decimal" step={1} min={1} max={10}
              value={rpe}
              onChange={e => setRpe(e.target.value)}
              placeholder="—"
              className="w-full h-9 px-1.5 text-center font-mono font-bold text-sm rounded-[6px] bg-white/5 border border-white/10 outline-none focus:border-[#FF3B47]/60 text-white placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy || !parseFloat(weight) || !parseInt(reps)}
            className="flex-1 h-8 rounded-[6px] text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: '#FF3B47' }}
          >
            <Check className="h-3.5 w-3.5 inline mr-1" />
            {tEdit('save')}
          </button>
          <button
            type="button"
            onClick={() => { setConfirmDelete(true) }}
            disabled={isBusy}
            className="h-8 px-2 rounded-[6px] text-[11px] transition-colors disabled:opacity-40"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 100, 100, 0.85)',
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isBusy}
            className="h-8 px-2 rounded-[6px] text-[11px] transition-colors disabled:opacity-40"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {confirmDelete && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/10 animate-in fade-in duration-150">
            <span className="text-[10px] flex-1" style={{ color: 'rgba(255, 100, 100, 0.85)' }}>
              {tEdit('confirmDelete')}
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isBusy}
              className="h-7 px-3 rounded-[6px] text-[10px] font-bold text-white disabled:opacity-40"
              style={{ background: '#FF3B47' }}
            >
              {tEdit('deleteYes')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="h-7 px-3 rounded-[6px] text-[10px]"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {tEdit('deleteNo')}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── Display mode (with swipe-to-delete) ─────────────────────────────────
  return (
    <div className="relative overflow-hidden">
      {/* delete affordance under the row */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3" style={{ width: 96 }}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isBusy}
          className="ml-auto h-8 px-3 rounded-[6px] flex items-center gap-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: '#FF3B47' }}
          aria-label={tEdit('delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {tEdit('delete')}
        </button>
      </div>

      {/* swipeable foreground */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (swipeX === 0) setEditing(true); else setSwipeX(0) }}
        className={`relative flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-[6px] cursor-pointer hover:bg-white/[0.03] transition-colors text-sm ${
          isLast ? 'border-l-2 border-[#FF3B47] pl-2' : ''
        }`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: touchStartXRef.current == null ? 'transform 180ms ease' : 'none',
          background: '#15151C',
        }}
      >
        <span className="font-mono text-[10px] text-zinc-700 w-5">#{set.set_number}</span>
        <span className={`font-mono font-bold ${isLast ? 'text-zinc-100' : 'text-zinc-500'}`}>
          {isBodyweight && set.weight_kg === 0 ? (
            <span className="text-[10px] font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>BW</span>
          ) : isBodyweight && set.weight_kg > 0 ? (
            <>+{set.weight_kg}<span className="text-zinc-700 font-normal text-[10px]">кг</span></>
          ) : (
            <>{set.weight_kg}<span className="text-zinc-700 font-normal text-[10px]">кг</span></>
          )}
          <span className="text-zinc-700 mx-1.5">×</span>
          {set.reps}
        </span>
        {set.rpe != null && (
          <span className="text-[10px] text-zinc-600">{t('rpe')} {set.rpe}</span>
        )}
        {set.calculated_1rm != null && isLast && (
          <span className="text-[10px] text-zinc-600 ml-auto">1ПМ {set.calculated_1rm.toFixed(0)}</span>
        )}
        <Pencil className="h-3 w-3 text-zinc-700 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-50" />
      </div>
    </div>
  )
}
