'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { MuscleGroup, MuscleVolume } from '@/lib/types/models'

const PERIODS = ['7d', '30d', '90d'] as const
type MusclePeriod = typeof PERIODS[number]

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'lats', 'traps',
  'front_delts', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'forearms',
  'core', 'quads', 'hamstrings', 'glutes', 'calves',
]

const FRONT_MUSCLES: MuscleGroup[] = ['front_delts', 'chest', 'biceps', 'forearms', 'core', 'quads', 'calves']
const BACK_MUSCLES: MuscleGroup[] = ['rear_delts', 'traps', 'back', 'lats', 'triceps', 'forearms', 'glutes', 'hamstrings', 'calves']

const HEAT = ['#272733', '#451F25', '#723036', '#B63C45', '#FF3B47', '#FF7A82']

function volumeFor(muscle: MuscleGroup, volumes: MuscleVolume[]): number {
  return volumes.find(mv => mv.muscle === muscle)?.total_sets ?? 0
}

function colorFor(sets: number): string {
  if (sets <= 0) return HEAT[0]
  if (sets <= 2) return HEAT[1]
  if (sets <= 5) return HEAT[2]
  if (sets <= 9) return HEAT[3]
  if (sets <= 14) return HEAT[4]
  return HEAT[5]
}

function opacityFor(sets: number): number {
  return sets <= 0 ? 0.68 : 1
}

function BodyMap({
  side,
  volumes,
  onPick,
}: {
  side: 'front' | 'back'
  volumes: MuscleVolume[]
  onPick: (muscle: MuscleGroup) => void
}) {
  const activeSet = new Set(side === 'front' ? FRONT_MUSCLES : BACK_MUSCLES)
  const paint = (muscle: MuscleGroup) => colorFor(volumeFor(muscle, volumes))
  const opacity = (muscle: MuscleGroup) => opacityFor(volumeFor(muscle, volumes))
  const segmentClass = 'cursor-pointer transition duration-150 hover:brightness-125'

  return (
    <svg
      viewBox="0 0 148 220"
      className="mx-auto h-full w-full max-w-[220px]"
      role="img"
      aria-label={side}
      style={{ filter: 'drop-shadow(0 16px 24px rgba(0,0,0,0.45)) drop-shadow(0 0 14px rgba(255,59,71,0.05))' }}
    >
      <g fill="#15151C" stroke="rgba(255,255,255,0.14)" strokeWidth="2">
        <circle cx="74" cy="20" r="16" />
        <rect x="67" y="37" width="14" height="13" rx="5" />
      </g>

      <g stroke="rgba(255,255,255,0.11)" strokeWidth="2">
        <path d="M43 56 C52 48 96 48 105 56 L113 118 C103 128 45 128 35 118 Z" fill="#15151C" />
        <path d="M51 124 L68 124 L65 206 L48 206 Z" fill="#15151C" />
        <path d="M80 124 L97 124 L100 206 L83 206 Z" fill="#15151C" />
        <path d="M33 61 C19 76 14 105 20 136" fill="none" stroke="#15151C" strokeLinecap="round" strokeWidth="18" />
        <path d="M115 61 C129 76 134 105 128 136" fill="none" stroke="#15151C" strokeLinecap="round" strokeWidth="18" />
      </g>

      {side === 'front' ? (
        <>
          <g onClick={() => onPick('front_delts')} className={segmentClass} opacity={opacity('front_delts')}>
            <path d="M36 57 C25 60 20 70 19 82 C30 80 39 73 43 62 Z" fill={paint('front_delts')} />
            <path d="M112 57 C123 60 128 70 129 82 C118 80 109 73 105 62 Z" fill={paint('front_delts')} />
          </g>
          <g onClick={() => onPick('chest')} className={segmentClass} opacity={opacity('chest')}>
            <path d="M45 61 C55 55 70 57 72 69 L72 91 C56 92 45 82 43 68 Z" fill={paint('chest')} />
            <path d="M103 61 C93 55 78 57 76 69 L76 91 C92 92 103 82 105 68 Z" fill={paint('chest')} />
          </g>
          <g onClick={() => onPick('core')} className={segmentClass} opacity={opacity('core')}>
            <path d="M57 94 L91 94 L94 119 C83 124 65 124 54 119 Z" fill={paint('core')} />
            <path d="M74 95 L74 120" stroke="rgba(10,10,15,0.36)" strokeWidth="2" />
            <path d="M60 103 L88 103 M58 112 L90 112" stroke="rgba(10,10,15,0.28)" strokeWidth="2" />
          </g>
          <g onClick={() => onPick('biceps')} className={segmentClass} opacity={opacity('biceps')}>
            <path d="M18 82 C24 79 31 82 33 91 L29 112 C22 111 17 105 16 96 Z" fill={paint('biceps')} />
            <path d="M130 82 C124 79 117 82 115 91 L119 112 C126 111 131 105 132 96 Z" fill={paint('biceps')} />
          </g>
          <g onClick={() => onPick('forearms')} className={segmentClass} opacity={opacity('forearms')}>
            <path d="M27 114 C34 116 37 123 34 136 L27 156 C20 153 17 144 20 134 Z" fill={paint('forearms')} />
            <path d="M121 114 C114 116 111 123 114 136 L121 156 C128 153 131 144 128 134 Z" fill={paint('forearms')} />
          </g>
          <g onClick={() => onPick('quads')} className={segmentClass} opacity={opacity('quads')}>
            <path d="M50 128 L69 128 L65 172 L46 172 Z" fill={paint('quads')} />
            <path d="M79 128 L98 128 L102 172 L83 172 Z" fill={paint('quads')} />
          </g>
          <g onClick={() => onPick('calves')} className={segmentClass} opacity={opacity('calves')}>
            <path d="M46 176 L65 176 L63 209 L49 209 Z" fill={paint('calves')} />
            <path d="M83 176 L102 176 L99 209 L85 209 Z" fill={paint('calves')} />
          </g>
        </>
      ) : (
        <>
          <g onClick={() => onPick('rear_delts')} className={segmentClass} opacity={opacity('rear_delts')}>
            <path d="M36 57 C25 60 20 70 19 82 C31 80 40 73 43 62 Z" fill={paint('rear_delts')} />
            <path d="M112 57 C123 60 128 70 129 82 C117 80 108 73 105 62 Z" fill={paint('rear_delts')} />
          </g>
          <g onClick={() => onPick('traps')} className={segmentClass} opacity={opacity('traps')}>
            <path d="M50 56 C61 48 87 48 98 56 C91 66 82 72 74 72 C66 72 57 66 50 56 Z" fill={paint('traps')} />
          </g>
          <g onClick={() => onPick('back')} className={segmentClass} opacity={opacity('back')}>
            <path d="M48 69 C61 62 87 62 100 69 L96 111 C84 119 64 119 52 111 Z" fill={paint('back')} />
          </g>
          <g onClick={() => onPick('lats')} className={segmentClass} opacity={opacity('lats')}>
            <path d="M40 73 C48 84 51 102 49 120 C41 117 36 105 35 91 Z" fill={paint('lats')} />
            <path d="M108 73 C100 84 97 102 99 120 C107 117 112 105 113 91 Z" fill={paint('lats')} />
          </g>
          <g onClick={() => onPick('triceps')} className={segmentClass} opacity={opacity('triceps')}>
            <path d="M18 82 C24 79 31 82 33 91 L29 112 C22 111 17 105 16 96 Z" fill={paint('triceps')} />
            <path d="M130 82 C124 79 117 82 115 91 L119 112 C126 111 131 105 132 96 Z" fill={paint('triceps')} />
          </g>
          <g onClick={() => onPick('forearms')} className={segmentClass} opacity={opacity('forearms')}>
            <path d="M27 114 C34 116 37 123 34 136 L27 156 C20 153 17 144 20 134 Z" fill={paint('forearms')} />
            <path d="M121 114 C114 116 111 123 114 136 L121 156 C128 153 131 144 128 134 Z" fill={paint('forearms')} />
          </g>
          <g onClick={() => onPick('glutes')} className={segmentClass} opacity={opacity('glutes')}>
            <path d="M49 126 C58 121 70 124 72 137 C67 146 54 148 46 140 Z" fill={paint('glutes')} />
            <path d="M99 126 C90 121 78 124 76 137 C81 146 94 148 102 140 Z" fill={paint('glutes')} />
          </g>
          <g onClick={() => onPick('hamstrings')} className={segmentClass} opacity={opacity('hamstrings')}>
            <path d="M50 147 L68 147 L65 174 L47 174 Z" fill={paint('hamstrings')} />
            <path d="M80 147 L98 147 L101 174 L83 174 Z" fill={paint('hamstrings')} />
          </g>
          <g onClick={() => onPick('calves')} className={segmentClass} opacity={opacity('calves')}>
            <path d="M46 178 L65 178 L63 209 L49 209 Z" fill={paint('calves')} />
            <path d="M83 178 L102 178 L99 209 L85 209 Z" fill={paint('calves')} />
          </g>
        </>
      )}

      <g pointerEvents="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none">
        <path d="M43 56 C52 48 96 48 105 56 L113 118 C103 128 45 128 35 118 Z" />
        <path d="M51 124 L68 124 L65 206 L48 206 Z" />
        <path d="M80 124 L97 124 L100 206 L83 206 Z" />
      </g>
      <text x="74" y="218" textAnchor="middle" fontSize="10" fontWeight="700" fill="rgba(255,255,255,0.35)">
        {side === 'front' ? 'FRONT' : 'BACK'}
      </text>
      {[...activeSet].map(muscle => (
        <title key={muscle}>{muscle}</title>
      ))}
    </svg>
  )
}

interface Props {
  muscleVolumes: MuscleVolume[]
  currentPeriod: string
  periodLabels: Record<MusclePeriod, string>
  muscleLabels: Record<string, string>
  clickHint: string
  setsLabel: string
}

export function MuscleHeatmap({
  muscleVolumes,
  currentPeriod,
  periodLabels,
  muscleLabels,
  clickHint,
  setsLabel,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<MuscleGroup | null>(null)
  const [showingBack, setShowingBack] = useState(false)

  const ranked = useMemo(
    () => MUSCLE_GROUPS
      .map(muscle => ({ muscle, sets: volumeFor(muscle, muscleVolumes) }))
      .sort((a, b) => b.sets - a.sets),
    [muscleVolumes]
  )
  const top = ranked.slice(0, 6)
  const selectedSets = selected ? volumeFor(selected, muscleVolumes) : 0

  function setPeriod(period: MusclePeriod) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('musclePeriod', period)
    router.push(`/dashboard?${params.toString()}`)
  }

  function pick(muscle: MuscleGroup) {
    setSelected(prev => prev === muscle ? null : muscle)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/[0.06]">
          {PERIODS.map(period => {
            const active = period === currentPeriod
            return (
              <button
                key={period}
                type="button"
                onClick={() => setPeriod(period)}
                className={`h-8 rounded-xl px-3 text-xs font-bold transition ${
                  active ? 'bg-primary text-white shadow-[0_8px_20px_rgba(255,59,71,0.22)]' : 'text-white/45 hover:text-white'
                }`}
              >
                {periodLabels[period]}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {setsLabel}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)] lg:items-center">
        <div
          className="relative rounded-[24px] bg-white/[0.025] p-4 ring-1 ring-white/[0.06]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(255, 59, 71, 0.06), transparent 70%), rgba(255,255,255,0.025)',
          }}
        >
          {/* 3D flip card: front / back swap with rotateY */}
          <div
            className="relative mx-auto"
            style={{
              perspective: '1200px',
              width: '100%',
              maxWidth: 280,
              height: 320,
            }}
          >
            <div
              className="absolute inset-0 transition-transform duration-700"
              style={{
                transformStyle: 'preserve-3d',
                transform: showingBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <BodyMap side="front" volumes={muscleVolumes} onPick={pick} />
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <BodyMap side="back" volumes={muscleVolumes} onPick={pick} />
              </div>
            </div>
          </div>

          {/* Front / Back toggle */}
          <div className="mt-2 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setShowingBack(false)}
              className="h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition"
              style={{
                background: !showingBack ? 'rgba(255, 59, 71, 0.16)' : 'rgba(255,255,255,0.04)',
                color: !showingBack ? '#FF6E76' : 'rgba(255,255,255,0.50)',
                border: !showingBack ? '1px solid rgba(255, 59, 71, 0.30)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              FRONT
            </button>
            <button
              type="button"
              onClick={() => setShowingBack(prev => !prev)}
              aria-label="Rotate"
              className="h-7 w-7 rounded-lg flex items-center justify-center transition hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)' }}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 11-3-6.7" />
                <polyline points="21 4 21 10 15 10" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowingBack(true)}
              className="h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition"
              style={{
                background: showingBack ? 'rgba(255, 59, 71, 0.16)' : 'rgba(255,255,255,0.04)',
                color: showingBack ? '#FF6E76' : 'rgba(255,255,255,0.50)',
                border: showingBack ? '1px solid rgba(255, 59, 71, 0.30)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              BACK
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="min-h-14 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
            {selected ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{muscleLabels[selected] ?? selected}</div>
                  <div className="text-xs text-white/40">{setsLabel}</div>
                </div>
                <div className="font-mono text-3xl font-black text-primary tabular-nums">
                  {selectedSets.toFixed(selectedSets % 1 === 0 ? 0 : 1)}
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-white/42">{clickHint}</p>
            )}
          </div>

          <div className="space-y-2">
            {top.map(({ muscle, sets }) => {
              const pct = Math.min(100, (sets / Math.max(top[0]?.sets ?? 1, 1)) * 100)
              return (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => pick(muscle)}
                  className="group w-full rounded-2xl px-3 py-2 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-semibold text-white/72 group-hover:text-white">
                      {muscleLabels[muscle] ?? muscle}
                    </span>
                    <span className="font-mono text-xs text-white/45">{sets.toFixed(sets % 1 === 0 ? 0 : 1)}</span>
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
