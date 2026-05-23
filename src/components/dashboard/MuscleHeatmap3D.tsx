'use client'

// Entry component for the muscle heatmap on the dashboard. Detects WebGL2
// availability; falls back to the original 2D SVG (MuscleHeatmap2D) when
// it's missing or while the Three.js bundle is still loading.

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { MuscleGroup } from '@/lib/types/models'
import { MuscleHeatmap2D, type MuscleHeatmapProps } from './MuscleHeatmap2D'
import { MUSCLE_GROUPS_ORDERED, volumeFor } from '@/lib/utils/muscle-heat'

const PERIODS = ['7d', '30d', '90d'] as const
type MusclePeriod = typeof PERIODS[number]

const Body = dynamic(
  () => import('./MuscleHeatmap3D.Body').then(m => m.MuscleHeatmap3DBody),
  { ssr: false, loading: () => <BodyPlaceholder /> },
)

function BodyPlaceholder() {
  return (
    <div className="flex h-[320px] items-center justify-center text-xs uppercase tracking-widest text-white/30">
      Loading 3D…
    </div>
  )
}

function hasWebGL2(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

export function MuscleHeatmap3D(props: MuscleHeatmapProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [webgl, setWebgl] = useState<'unknown' | 'yes' | 'no'>('unknown')
  const [selected, setSelected] = useState<MuscleGroup | null>(null)

  useEffect(() => {
    setWebgl(hasWebGL2() ? 'yes' : 'no')
  }, [])

  const ranked = useMemo(
    () => MUSCLE_GROUPS_ORDERED
      .map(muscle => ({ muscle, sets: volumeFor(muscle, props.muscleVolumes) }))
      .sort((a, b) => b.sets - a.sets),
    [props.muscleVolumes],
  )
  const top = ranked.slice(0, 6)
  const selectedSets = selected ? volumeFor(selected, props.muscleVolumes) : 0

  function setPeriod(period: MusclePeriod) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('musclePeriod', period)
    router.push(`/dashboard?${params.toString()}`)
  }

  // Until we know whether WebGL2 is available, render the 2D SVG. Avoids any
  // visual jank from a loading flash and gives non-WebGL users a real UI.
  if (webgl !== 'yes') {
    return <MuscleHeatmap2D {...props} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
          {PERIODS.map(period => {
            const active = period === props.currentPeriod
            return (
              <button
                key={period}
                type="button"
                onClick={() => setPeriod(period)}
                className={`h-8 rounded-xl px-3 text-xs font-bold transition ${
                  active ? 'bg-primary text-white shadow-[0_8px_20px_rgba(255,59,71,0.22)]' : 'text-white/45 hover:text-white'
                }`}
              >
                {props.periodLabels[period]}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {props.setsLabel}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] lg:items-center">
        <div
          className="relative rounded-[24px] bg-white/[0.025] p-2 ring-1 ring-white/[0.06]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(255, 59, 71, 0.06), transparent 70%), rgba(255,255,255,0.025)',
          }}
        >
          <Body
            muscleVolumes={props.muscleVolumes}
            onPickMuscle={(muscle) => setSelected(prev => prev === muscle ? null : muscle)}
          />
          <p className="mt-1 text-center text-[9px] uppercase tracking-[0.22em] text-white/30">
            drag · tap muscle
          </p>
        </div>

        <div className="space-y-3">
          <div className="min-h-14 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
            {selected ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{props.muscleLabels[selected] ?? selected}</div>
                  <div className="text-xs text-white/40">{props.setsLabel}</div>
                </div>
                <div className="font-mono text-3xl font-black text-primary tabular-nums">
                  {selectedSets.toFixed(selectedSets % 1 === 0 ? 0 : 1)}
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-white/42">{props.clickHint}</p>
            )}
          </div>

          <div className="space-y-2">
            {top.map(({ muscle, sets }) => {
              const pct = Math.min(100, (sets / Math.max(top[0]?.sets ?? 1, 1)) * 100)
              return (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => setSelected(prev => prev === muscle ? null : muscle)}
                  className="group w-full rounded-2xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-semibold text-white/72 group-hover:text-white">
                      {props.muscleLabels[muscle] ?? muscle}
                    </span>
                    <span className="font-mono text-xs text-white/45">
                      {sets.toFixed(sets % 1 === 0 ? 0 : 1)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%`, opacity: sets > 0 ? 1 : 0.2 }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
