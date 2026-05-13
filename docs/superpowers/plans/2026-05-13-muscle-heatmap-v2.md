# MuscleHeatmap v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить `react-body-highlighter` на кастомный SVG-компонент с правильными пропорциями тела + radar chart баланса нагрузки.

**Architecture:** Один файл `MuscleHeatmap.tsx` перезаписывается полностью. Пакет `react-body-highlighter` удаляется. Внутри компонента три части: переключатель вид/сзади, SVG-тело с кликабельными мышечными зонами, radar chart на чистом SVG.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS, чистый SVG (без библиотек)

---

## Файловая карта

| Файл | Действие |
|---|---|
| `src/components/dashboard/MuscleHeatmap.tsx` | Полная перезапись |
| `package.json` | Удалить `react-body-highlighter` |

---

## Task 1: Удалить зависимость и написать хелперы

**Files:**
- Modify: `package.json`
- Modify: `src/components/dashboard/MuscleHeatmap.tsx`

- [ ] **Шаг 1: Удалить react-body-highlighter**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npm uninstall react-body-highlighter
```

Ожидаем: строка `"react-body-highlighter"` исчезает из `package.json`.

- [ ] **Шаг 2: Создать новый каркас `src/components/dashboard/MuscleHeatmap.tsx`**

Заменить весь файл:

```tsx
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

// Углы 6 осей, начиная сверху (−90°), по часовой стрелке
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
      {/* Сетка */}
      {[14, 28, MAX_R].map(r => (
        <polygon key={r} points={hexPoints(r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {/* Оси */}
      {RADAR_ANGLES.map((a, i) => (
        <line key={i} x1="0" y1="0" x2={(MAX_R * Math.cos(a)).toFixed(2)} y2={(MAX_R * Math.sin(a)).toFixed(2)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      {/* Данные */}
      <polygon points={dataPoints} fill="rgba(245,158,11,0.18)" stroke="#f59e0b" strokeWidth="1.5" />
      {RADAR_ANGLES.map((a, i) => (
        <circle key={i} cx={(((groupSets[i] / maxSets) * MAX_R) * Math.cos(a)).toFixed(2)} cy={(((groupSets[i] / maxSets) * MAX_R) * Math.sin(a)).toFixed(2)} r="2.5" fill="#f59e0b" />
      ))}
      {/* Подписи */}
      {RADAR_ANGLES.map((a, i) => {
        const lx = (52 * Math.cos(a))
        const ly = (52 * Math.sin(a))
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

// ─── Заглушка тела (заполним в Task 2) ───────────────────────────────────────

function BodyFront({ volumes, onMuscleClick }: { volumes: MuscleVolume[]; onMuscleClick: (name: string) => void }) {
  return <svg viewBox="0 0 65 138" width="65" height="138"><text x="32" y="70" textAnchor="middle" fontSize="8" fill="#71717a">front</text></svg>
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
        {/* Тело */}
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

        {/* Radar */}
        <div className="flex-1 space-y-1 pt-8">
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">Баланс нагрузки</p>
          <RadarChart volumes={muscleVolumes} />
        </div>
      </div>

      {/* Тег выбранной мышцы */}
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
```

- [ ] **Шаг 3: Проверить TypeScript**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npx tsc --noEmit 2>&1 | head -20
```

Ожидаем: 0 ошибок.

- [ ] **Шаг 4: Commit**

```bash
git add src/components/dashboard/MuscleHeatmap.tsx package.json package-lock.json
git commit -m "feat: scaffold MuscleHeatmap v2, remove react-body-highlighter"
```

---

## Task 2: SVG-тело — вид спереди

**Files:**
- Modify: `src/components/dashboard/MuscleHeatmap.tsx` (заменить функцию `BodyFront`)

- [ ] **Шаг 1: Заменить `BodyFront` на полную реализацию**

Найти и полностью заменить функцию `BodyFront` на:

```tsx
function BodyFront({ volumes, onMuscleClick }: { volumes: MuscleVolume[]; onMuscleClick: (name: string) => void }) {
  const c = (name: string) => muscleColor(name, volumes)
  const isActive = (name: string) => volumes.find(mv => mv.muscle === name)?.total_sets ?? 0 > 0
  const clickable = (name: string) => isActive(name) ? 'cursor-pointer' : 'cursor-default'

  return (
    <svg viewBox="0 0 65 138" width="65" height="138" className="overflow-visible">
      {/* ── Тело (фон) ── */}
      {/* Голова */}
      <ellipse cx="32.5" cy="11" rx="10" ry="10.5" fill="#18182a" stroke="#3f3f50" strokeWidth="1.2" />
      {/* Шея */}
      <rect x="29" y="21" width="7" height="6" rx="2" fill="#18182a" stroke="#3f3f50" strokeWidth="1" />
      {/* Торс с сужением в талии */}
      <path d="M17 27 Q11 31 10 51 L10 75 Q10 79 17 79 L48 79 Q55 79 55 75 L55 51 Q54 31 48 27 Q42 24 32.5 24 Q23 24 17 27Z" fill="#18182a" stroke="#3f3f50" strokeWidth="1.2" />

      {/* ── Левая рука (фоновый контур) ── */}
      <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke="#18182a" strokeWidth="13" strokeLinecap="round" fill="none" />
      {/* Левый бицепс */}
      <path d="M10 28 Q3 35 2 47 Q1 56 3 63"
        stroke={c('biceps')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('biceps')} onClick={() => onMuscleClick('biceps')} />
      {/* Левое предплечье фон */}
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87" stroke="#18182a" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* Левое предплечье */}
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87"
        stroke={c('forearms')} strokeWidth="8" strokeLinecap="round" fill="none"
        className={clickable('forearms')} onClick={() => onMuscleClick('forearms')} />

      {/* ── Правая рука ── */}
      <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke="#18182a" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M55 28 Q62 35 63 47 Q64 56 62 63"
        stroke={c('biceps')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('biceps')} onClick={() => onMuscleClick('biceps')} />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87" stroke="#18182a" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87"
        stroke={c('forearms')} strokeWidth="8" strokeLinecap="round" fill="none"
        className={clickable('forearms')} onClick={() => onMuscleClick('forearms')} />

      {/* ── Левая нога ── */}
      <path d="M21 79 Q18 98 18 114 Q18 127 19 137" stroke="#18182a" strokeWidth="15" strokeLinecap="round" fill="none" />
      {/* Квадрицепс лев */}
      <path d="M21 79 Q18 98 18 112"
        stroke={c('quads')} strokeWidth="13" strokeLinecap="round" fill="none"
        className={clickable('quads')} onClick={() => onMuscleClick('quads')} />
      {/* Икра лев */}
      <path d="M18 116 Q18 127 19 135"
        stroke={c('calves')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('calves')} onClick={() => onMuscleClick('calves')} />

      {/* ── Правая нога ── */}
      <path d="M44 79 Q47 98 47 114 Q47 127 46 137" stroke="#18182a" strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M44 79 Q47 98 47 112"
        stroke={c('quads')} strokeWidth="13" strokeLinecap="round" fill="none"
        className={clickable('quads')} onClick={() => onMuscleClick('quads')} />
      <path d="M47 116 Q47 127 46 135"
        stroke={c('calves')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('calves')} onClick={() => onMuscleClick('calves')} />

      {/* ── Мышцы поверх торса ── */}
      {/* Дельты / плечи */}
      <ellipse cx="10" cy="30" rx="8" ry="6.5"
        fill={c('front_delts')} className={clickable('front_delts')} onClick={() => onMuscleClick('front_delts')} />
      <ellipse cx="55" cy="30" rx="8" ry="6.5"
        fill={c('front_delts')} className={clickable('front_delts')} onClick={() => onMuscleClick('front_delts')} />
      {/* Грудь */}
      <ellipse cx="23" cy="42" rx="10.5" ry="8"
        fill={c('chest')} className={clickable('chest')} onClick={() => onMuscleClick('chest')} />
      <ellipse cx="42" cy="42" rx="10.5" ry="8"
        fill={c('chest')} className={clickable('chest')} onClick={() => onMuscleClick('chest')} />
      {/* Пресс */}
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
```

- [ ] **Шаг 2: Проверить TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/dashboard/MuscleHeatmap.tsx
git commit -m "feat: MuscleHeatmap v2 — SVG body front view with muscle zones"
```

---

## Task 3: SVG-тело — вид сзади

**Files:**
- Modify: `src/components/dashboard/MuscleHeatmap.tsx` (заменить функцию `BodyBack`)

- [ ] **Шаг 1: Заменить `BodyBack` на полную реализацию**

Найти и полностью заменить функцию `BodyBack` на:

```tsx
function BodyBack({ volumes, onMuscleClick }: { volumes: MuscleVolume[]; onMuscleClick: (name: string) => void }) {
  const c = (name: string) => muscleColor(name, volumes)
  const isActive = (name: string) => (volumes.find(mv => mv.muscle === name)?.total_sets ?? 0) > 0
  const clickable = (name: string) => isActive(name) ? 'cursor-pointer' : 'cursor-default'

  return (
    <svg viewBox="0 0 65 138" width="65" height="138" className="overflow-visible">
      {/* ── Тело (фон) ── */}
      <ellipse cx="32.5" cy="11" rx="10" ry="10.5" fill="#18182a" stroke="#3f3f50" strokeWidth="1.2" />
      <rect x="29" y="21" width="7" height="6" rx="2" fill="#18182a" stroke="#3f3f50" strokeWidth="1" />
      <path d="M17 27 Q11 31 10 51 L10 75 Q10 79 17 79 L48 79 Q55 79 55 75 L55 51 Q54 31 48 27 Q42 24 32.5 24 Q23 24 17 27Z" fill="#18182a" stroke="#3f3f50" strokeWidth="1.2" />

      {/* ── Левая рука ── */}
      <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke="#18182a" strokeWidth="13" strokeLinecap="round" fill="none" />
      {/* Трицепс лев */}
      <path d="M10 28 Q3 35 2 47 Q1 56 3 63"
        stroke={c('triceps')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('triceps')} onClick={() => onMuscleClick('triceps')} />
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87" stroke="#18182a" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87"
        stroke={c('forearms')} strokeWidth="8" strokeLinecap="round" fill="none"
        className={clickable('forearms')} onClick={() => onMuscleClick('forearms')} />

      {/* ── Правая рука ── */}
      <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke="#18182a" strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M55 28 Q62 35 63 47 Q64 56 62 63"
        stroke={c('triceps')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('triceps')} onClick={() => onMuscleClick('triceps')} />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87" stroke="#18182a" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87"
        stroke={c('forearms')} strokeWidth="8" strokeLinecap="round" fill="none"
        className={clickable('forearms')} onClick={() => onMuscleClick('forearms')} />

      {/* ── Левая нога ── */}
      <path d="M21 79 Q18 98 18 114 Q18 127 19 137" stroke="#18182a" strokeWidth="15" strokeLinecap="round" fill="none" />
      {/* Бицепс бедра лев */}
      <path d="M21 79 Q18 98 18 112"
        stroke={c('hamstrings')} strokeWidth="13" strokeLinecap="round" fill="none"
        className={clickable('hamstrings')} onClick={() => onMuscleClick('hamstrings')} />
      <path d="M18 116 Q18 127 19 135"
        stroke={c('calves')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('calves')} onClick={() => onMuscleClick('calves')} />

      {/* ── Правая нога ── */}
      <path d="M44 79 Q47 98 47 114 Q47 127 46 137" stroke="#18182a" strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M44 79 Q47 98 47 112"
        stroke={c('hamstrings')} strokeWidth="13" strokeLinecap="round" fill="none"
        className={clickable('hamstrings')} onClick={() => onMuscleClick('hamstrings')} />
      <path d="M47 116 Q47 127 46 135"
        stroke={c('calves')} strokeWidth="11" strokeLinecap="round" fill="none"
        className={clickable('calves')} onClick={() => onMuscleClick('calves')} />

      {/* ── Мышцы поверх торса ── */}
      {/* Задние дельты */}
      <ellipse cx="10" cy="30" rx="8" ry="6.5"
        fill={c('rear_delts')} className={clickable('rear_delts')} onClick={() => onMuscleClick('rear_delts')} />
      <ellipse cx="55" cy="30" rx="8" ry="6.5"
        fill={c('rear_delts')} className={clickable('rear_delts')} onClick={() => onMuscleClick('rear_delts')} />
      {/* Спина/широчайшие (фоновый слой) */}
      <path d="M19 28 Q13 46 13 68 L52 68 Q52 46 46 28 Z"
        fill={c('back')} className={clickable('back')} onClick={() => onMuscleClick('back')} />
      {/* Широчайшие (боковые) */}
      <path d="M10 33 Q7 50 10 70"
        stroke={c('lats')} strokeWidth="7" strokeLinecap="round" fill="none"
        className={clickable('lats')} onClick={() => onMuscleClick('lats')} />
      <path d="M55 33 Q58 50 55 70"
        stroke={c('lats')} strokeWidth="7" strokeLinecap="round" fill="none"
        className={clickable('lats')} onClick={() => onMuscleClick('lats')} />
      {/* Трапеции */}
      <path d="M17 27 Q32.5 21 48 27 Q40 34 32.5 35 Q25 34 17 27Z"
        fill={c('traps')} className={clickable('traps')} onClick={() => onMuscleClick('traps')} />
      {/* Ягодицы */}
      <ellipse cx="23" cy="80" rx="9.5" ry="7"
        fill={c('glutes')} className={clickable('glutes')} onClick={() => onMuscleClick('glutes')} />
      <ellipse cx="42" cy="80" rx="9.5" ry="7"
        fill={c('glutes')} className={clickable('glutes')} onClick={() => onMuscleClick('glutes')} />
    </svg>
  )
}
```

- [ ] **Шаг 2: Проверить TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/dashboard/MuscleHeatmap.tsx
git commit -m "feat: MuscleHeatmap v2 — SVG body back view with muscle zones"
```

---

## Task 4: Финальная проверка и push

**Files:**
- Modify: `src/components/dashboard/MuscleHeatmap.tsx` (проверка)

- [ ] **Шаг 1: Убедиться что `react-body-highlighter` нигде не импортируется**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
grep -r "react-body-highlighter" src/ --include="*.tsx" --include="*.ts"
```

Ожидаем: нет результатов.

- [ ] **Шаг 2: Финальный TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Ожидаем: 0 ошибок.

- [ ] **Шаг 3: Убедиться что dashboard/page.tsx не нужно менять**

```bash
grep -n "MuscleHeatmap" src/app/\(app\)/dashboard/page.tsx
```

Props компонента не изменились (`muscleVolumes`, `muscleLabels`, `clickHint`, `setsLabel`) — никаких правок в page.tsx не требуется.

- [ ] **Шаг 4: Push**

```bash
git push origin main
```

---

## Чеклист готовности

- [ ] `react-body-highlighter` удалён из package.json
- [ ] Тело спереди: грудь, плечи, бицепс, предплечья, пресс, квадрицепс, икры — кликабельны
- [ ] Тело сзади: трапеции, спина, широчайшие, задние дельты, трицепс, ягодицы, бицепс бедра, икры — кликабельны
- [ ] Переключатель Спереди/Сзади работает
- [ ] Radar chart рисует 6-осевую диаграмму
- [ ] Клик на мышцу → тег с названием и подходами
- [ ] Неактивные мышцы — нейтральный цвет, без курсора-pointer
- [ ] TypeScript: 0 ошибок
