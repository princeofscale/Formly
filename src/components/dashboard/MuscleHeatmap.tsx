'use client'

import { useState } from 'react'
import type { MuscleVolume } from '@/lib/types/models'

// ─── Константы ────────────────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = ['#fde68a', '#fbbf24', '#d97706', '#b45309', '#92400e']
const NEUTRAL = '#3f3f50'

function setsToFrequency(sets: number): number {
  if (sets <= 2) return 1
  if (sets <= 5) return 2
  if (sets <= 9) return 3
  if (sets <= 14) return 4
  return 5
}

function muscleColor(name: string, volumes: MuscleVolume[]): string {
  const vol = volumes.find(mv => mv.muscle === name)
  if (!vol || vol.total_sets === 0) return NEUTRAL
  return HIGHLIGHT_COLORS[setsToFrequency(vol.total_sets) - 1]
}

// ─── Radar chart ──────────────────────────────────────────────────────────────

const RADAR_GROUPS = [
  { key: 'push',   label: 'Грудь/Пл', muscles: ['chest', 'front_delts', 'side_delts'] },
  { key: 'back',   label: 'Спина',    muscles: ['back', 'lats', 'traps', 'rear_delts'] },
  { key: 'arms',   label: 'Руки',     muscles: ['biceps', 'triceps', 'forearms'] },
  { key: 'core',   label: 'Пресс',    muscles: ['core'] },
  { key: 'legs',   label: 'Ноги',     muscles: ['quads', 'hamstrings', 'calves'] },
  { key: 'glutes', label: 'Ягодицы',  muscles: ['glutes'] },
] as const

const RADAR_ANGLES = [-90, -30, 30, 90, 150, 210].map(d => (d * Math.PI) / 180)
const MAX_R = 42

function radarPoint(angle: number, r: number): string {
  return `${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`
}

function hexPoints(r: number): string {
  return RADAR_ANGLES.map(a => radarPoint(a, r)).join(' ')
}

function RadarChart({ volumes }: { volumes: MuscleVolume[] }) {
  const groupSets = RADAR_GROUPS.map(g =>
    g.muscles.reduce((sum, m) => sum + (volumes.find(mv => mv.muscle === m)?.total_sets ?? 0), 0)
  )
  const maxSets = Math.max(...groupSets, 1)

  const dataPoints = RADAR_ANGLES.map((angle, i) =>
    radarPoint(angle, (groupSets[i] / maxSets) * MAX_R)
  ).join(' ')

  return (
    <svg viewBox="-60 -60 120 120" width="110" height="110" className="overflow-visible">
      {[14, 28, MAX_R].map(r => (
        <polygon key={r} points={hexPoints(r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {RADAR_ANGLES.map((a, i) => (
        <line key={i} x1="0" y1="0" x2={(MAX_R * Math.cos(a)).toFixed(2)} y2={(MAX_R * Math.sin(a)).toFixed(2)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      <polygon points={dataPoints} fill="rgba(245,158,11,0.18)" stroke="#f59e0b" strokeWidth="1.5" />
      {RADAR_ANGLES.map((a, i) => (
        <circle key={i} cx={(((groupSets[i] / maxSets) * MAX_R) * Math.cos(a)).toFixed(2)} cy={(((groupSets[i] / maxSets) * MAX_R) * Math.sin(a)).toFixed(2)} r="2.5" fill="#f59e0b" />
      ))}
      {RADAR_ANGLES.map((a, i) => {
        const lx = 52 * Math.cos(a)
        const ly = 52 * Math.sin(a)
        const anchor = lx > 5 ? 'start' : lx < -5 ? 'end' : 'middle'
        return (
          <text key={i} x={lx.toFixed(1)} y={(ly + 2).toFixed(1)} textAnchor={anchor} fontSize="6.5" fill="rgba(255,255,255,0.45)">
            {RADAR_GROUPS[i].label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  muscleVolumes: MuscleVolume[]
  muscleLabels: Record<string, string>
  clickHint: string
  setsLabel: string
}

// ─── Заглушки тела (заполним в Task 2 и 3) ───────────────────────────────────

function BodyFront({ volumes, onMuscleClick }: { volumes: MuscleVolume[]; onMuscleClick: (name: string) => void }) {
  const c = (name: string) => muscleColor(name, volumes)
  const isActive = (name: string) => (volumes.find(mv => mv.muscle === name)?.total_sets ?? 0) > 0
  const clickable = (name: string) => isActive(name) ? 'cursor-pointer' : 'cursor-default'

  return (
    <svg viewBox="0 0 65 138" width="65" height="138" className="overflow-visible">
      {/* ── Body base ── */}
      <ellipse cx="32.5" cy="11" rx="10" ry="10.5" fill="#18182a" stroke="#3f3f50" strokeWidth="1.2" />
      <rect x="29" y="21" width="7" height="6" rx="2" fill="#18182a" stroke="#3f3f50" strokeWidth="1" />
      <path d="M17 27 Q11 31 10 51 L10 75 Q10 79 17 79 L48 79 Q55 79 55 75 L55 51 Q54 31 48 27 Q42 24 32.5 24 Q23 24 17 27Z" fill="#18182a" stroke="#3f3f50" strokeWidth="1.2" />

      {/* ── Left arm (viewer's right) ── */}
      {/* Background outline */}
      <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke="#18182a" strokeWidth="13" strokeLinecap="round" fill="none" />
      {/* Bicep zone */}
      <path d="M10 28 Q3 35 2 47 Q1 56 3 63"
        stroke={c('biceps')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('biceps')} onClick={() => onMuscleClick('biceps')} />
      {/* Forearm background */}
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87" stroke="#18182a" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* Forearm zone */}
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87"
        stroke={c('forearms')} strokeWidth="8" strokeLinecap="round" fill="none"
        className={clickable('forearms')} onClick={() => onMuscleClick('forearms')} />

      {/* ── Right arm ── */}
      <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke="#18182a" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M55 28 Q62 35 63 47 Q64 56 62 63"
        stroke={c('biceps')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('biceps')} onClick={() => onMuscleClick('biceps')} />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87" stroke="#18182a" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87"
        stroke={c('forearms')} strokeWidth="8" strokeLinecap="round" fill="none"
        className={clickable('forearms')} onClick={() => onMuscleClick('forearms')} />

      {/* ── Left leg ── */}
      <path d="M21 79 Q18 98 18 114 Q18 127 19 137" stroke="#18182a" strokeWidth="15" strokeLinecap="round" fill="none" />
      {/* Quad zone */}
      <path d="M21 79 Q18 98 18 112"
        stroke={c('quads')} strokeWidth="13" strokeLinecap="round" fill="none"
        className={clickable('quads')} onClick={() => onMuscleClick('quads')} />
      {/* Calf zone */}
      <path d="M18 116 Q18 127 19 137"
        stroke={c('calves')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('calves')} onClick={() => onMuscleClick('calves')} />

      {/* ── Right leg ── */}
      <path d="M44 79 Q47 98 47 114 Q47 127 46 137" stroke="#18182a" strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M44 79 Q47 98 47 112"
        stroke={c('quads')} strokeWidth="13" strokeLinecap="round" fill="none"
        className={clickable('quads')} onClick={() => onMuscleClick('quads')} />
      <path d="M47 116 Q47 127 46 137"
        stroke={c('calves')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('calves')} onClick={() => onMuscleClick('calves')} />

      {/* ── Muscles on top of torso ── */}
      {/* Front deltoids (shoulders) */}
      <ellipse cx="10" cy="30" rx="8" ry="6.5"
        fill={c('front_delts')} className={clickable('front_delts')} onClick={() => onMuscleClick('front_delts')} />
      <ellipse cx="55" cy="30" rx="8" ry="6.5"
        fill={c('front_delts')} className={clickable('front_delts')} onClick={() => onMuscleClick('front_delts')} />
      {/* Chest */}
      <ellipse cx="23" cy="42" rx="10.5" ry="8"
        fill={c('chest')} className={clickable('chest')} onClick={() => onMuscleClick('chest')} />
      <ellipse cx="42" cy="42" rx="10.5" ry="8"
        fill={c('chest')} className={clickable('chest')} onClick={() => onMuscleClick('chest')} />
      {/* Abs */}
      <g className={clickable('core')} onClick={() => onMuscleClick('core')}>
        <rect x="27" y="52" width="5" height="4.5" rx="1.5" fill={c('core')} />
        <rect x="33" y="52" width="5" height="4.5" rx="1.5" fill={c('core')} />
        <rect x="27" y="58" width="5" height="4.5" rx="1.5" fill={c('core')} opacity="0.85" />
        <rect x="33" y="58" width="5" height="4.5" rx="1.5" fill={c('core')} opacity="0.85" />
        <rect x="27" y="64" width="5" height="4.5" rx="1.5" fill={c('core')} opacity="0.7" />
        <rect x="33" y="64" width="5" height="4.5" rx="1.5" fill={c('core')} opacity="0.7" />
      </g>
    </svg>
  )
}

function BodyBack({ volumes, onMuscleClick }: { volumes: MuscleVolume[]; onMuscleClick: (name: string) => void }) {
  return <svg viewBox="0 0 65 138" width="65" height="138"><text x="32" y="70" textAnchor="middle" fontSize="8" fill="#71717a">back</text></svg>
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MuscleHeatmap({ muscleVolumes, muscleLabels, clickHint, setsLabel }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const [selected, setSelected] = useState<{ name: string; sets: number } | null>(null)

  function handleMuscleClick(name: string) {
    const vol = muscleVolumes.find(mv => mv.muscle === name)
    if (!vol || vol.total_sets === 0) return
    setSelected(prev => prev?.name === name ? null : { name, sets: vol.total_sets })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 space-y-2">
          <div className="flex gap-1">
            {(['front', 'back'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`h-6 px-2.5 text-[9px] rounded-md border transition-colors ${
                  view === v
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {v === 'front' ? 'Спереди' : 'Сзади'}
              </button>
            ))}
          </div>
          {view === 'front'
            ? <BodyFront volumes={muscleVolumes} onMuscleClick={handleMuscleClick} />
            : <BodyBack volumes={muscleVolumes} onMuscleClick={handleMuscleClick} />
          }
        </div>
        <div className="flex-1 space-y-1 pt-8">
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Баланс нагрузки</p>
          <RadarChart volumes={muscleVolumes} />
        </div>
      </div>
      <div className="min-h-[32px] flex items-center justify-center">
        {selected ? (
          <div className="flex items-center gap-2 bg-white/10 border border-amber-500/40 rounded-lg px-3 py-1.5 text-sm">
            <span className="font-semibold text-amber-400">
              {muscleLabels[selected.name] ?? selected.name}
            </span>
            <span className="text-zinc-400">—</span>
            <span className="font-mono text-white">{selected.sets}</span>
            <span className="text-zinc-400">{setsLabel}</span>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">{clickHint}</p>
        )}
      </div>
    </div>
  )
}
