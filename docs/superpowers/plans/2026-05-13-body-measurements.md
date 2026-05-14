# Body Measurements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить страницу `/body` для трекинга замеров тела (вес, грудь, талия, бёдра, бицепс, % жира) с sparkline-графиками, BMI индикатором и историей замеров.

**Architecture:** Новая таблица `body_measurements` с уникальным `(user_id, date)` для upsert. Все поля nullable — пользователь записывает только что измеряет. Графики через чистый SVG sparkline (без библиотек). BMI использует существующие `calculateBMI`/`bmiCategory`.

**Tech Stack:** Next.js 16 App Router, Supabase + RLS, next-intl v4, Tailwind CSS, zod, чистый SVG

---

## Файловая карта

| Файл | Действие |
|---|---|
| `messages/en.json`, `messages/ru.json` | Добавить `body.*` секции |
| `supabase/migrations/20260513180000_body_measurements.sql` | Создать |
| `src/lib/types/models.ts` | Добавить `BodyMeasurement`, `MeasurementField` |
| `src/lib/db/body-measurements.ts` | Создать |
| `src/app/(app)/body/actions.ts` | Создать |
| `src/app/(app)/body/page.tsx` | Создать |
| `src/components/body/MetricSparkline.tsx` | Создать |
| `src/components/body/MetricCard.tsx` | Создать |
| `src/components/body/CurrentSnapshot.tsx` | Создать |
| `src/components/body/MeasurementForm.tsx` | Создать |
| `src/components/body/BmiCard.tsx` | Создать |
| `src/components/body/MeasurementHistory.tsx` | Создать |
| `src/components/body/DeleteMeasurementButton.tsx` | Создать |
| `src/app/(app)/profile/page.tsx` | Добавить ссылку на /body |

---

## Task 1: i18n + миграция + типы

**Files:**
- Modify: `messages/en.json`, `messages/ru.json`
- Create: `supabase/migrations/20260513180000_body_measurements.sql`
- Modify: `src/lib/types/models.ts`

- [ ] **Шаг 1: Добавить `body` секцию в `messages/en.json`**

После последней top-level секции:
```json
"body": {
  "title": "Body Measurements",
  "linkTitle": "Body Measurements",
  "linkSub": "Track weight, size, body fat",
  "addEntry": "Add Measurement",
  "save": "Save",
  "saved": "Saved!",
  "saving": "Saving...",
  "today": "Today",
  "noData": "No measurements yet",
  "deleteConfirm": "Delete this measurement?",
  "delete": "Delete",
  "cancel": "Cancel",
  "labels": {
    "weight": "Weight",
    "chest": "Chest",
    "waist": "Waist",
    "hips": "Hips",
    "biceps": "Biceps",
    "bodyFat": "Body Fat"
  },
  "units": {
    "kg": "kg",
    "cm": "cm",
    "pct": "%"
  },
  "bmi": {
    "title": "BMI",
    "setHeightHint": "Set your height in profile to see BMI",
    "underweight": "Underweight",
    "normal": "Normal",
    "overweight": "Overweight",
    "obese": "Obese"
  },
  "history": {
    "title": "History"
  }
}
```

- [ ] **Шаг 2: Добавить `body` секцию в `messages/ru.json`**

```json
"body": {
  "title": "Замеры тела",
  "linkTitle": "Замеры тела",
  "linkSub": "Вес, объёмы, процент жира",
  "addEntry": "Добавить замер",
  "save": "Сохранить",
  "saved": "Сохранено!",
  "saving": "Сохраняем...",
  "today": "Сегодня",
  "noData": "Замеров пока нет",
  "deleteConfirm": "Удалить этот замер?",
  "delete": "Удалить",
  "cancel": "Отмена",
  "labels": {
    "weight": "Вес",
    "chest": "Грудь",
    "waist": "Талия",
    "hips": "Бёдра",
    "biceps": "Бицепс",
    "bodyFat": "% жира"
  },
  "units": {
    "kg": "кг",
    "cm": "см",
    "pct": "%"
  },
  "bmi": {
    "title": "ИМТ",
    "setHeightHint": "Укажи рост в профиле чтобы видеть ИМТ",
    "underweight": "Дефицит",
    "normal": "Норма",
    "overweight": "Избыток",
    "obese": "Ожирение"
  },
  "history": {
    "title": "История"
  }
}
```

- [ ] **Шаг 3: Создать миграцию `supabase/migrations/20260513180000_body_measurements.sql`**

```sql
create table body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  weight_kg float check (weight_kg is null or weight_kg > 0),
  chest_cm float check (chest_cm is null or chest_cm > 0),
  waist_cm float check (waist_cm is null or waist_cm > 0),
  hips_cm float check (hips_cm is null or hips_cm > 0),
  biceps_cm float check (biceps_cm is null or biceps_cm > 0),
  body_fat_pct float check (body_fat_pct is null or (body_fat_pct >= 0 and body_fat_pct <= 100)),
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table body_measurements enable row level security;

create policy "users see own measurements"
  on body_measurements
  for all
  using (auth.uid() = user_id);

create index body_measurements_user_date on body_measurements(user_id, date desc);
```

- [ ] **Шаг 4: Добавить типы в `src/lib/types/models.ts`**

В конец файла:
```ts
export interface BodyMeasurement {
  id: string
  user_id: string
  date: string
  weight_kg: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  biceps_cm: number | null
  body_fat_pct: number | null
  created_at: string
}

export type MeasurementField =
  | 'weight_kg' | 'chest_cm' | 'waist_cm' | 'hips_cm' | 'biceps_cm' | 'body_fat_pct'
```

- [ ] **Шаг 5: Проверка**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en OK')"
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); console.log('ru OK')"
npx tsc --noEmit 2>&1 | head -10
```

Expected: `en OK`, `ru OK`, 0 TS errors.

- [ ] **Шаг 6: Commit**

```bash
git add messages/en.json messages/ru.json supabase/migrations/20260513180000_body_measurements.sql src/lib/types/models.ts
git commit -m "feat: add body measurements schema, types and i18n keys"
```

---

## Task 2: DB функции + server actions

**Files:**
- Create: `src/lib/db/body-measurements.ts`
- Create: `src/app/(app)/body/actions.ts`

- [ ] **Шаг 1: Создать `src/lib/db/body-measurements.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BodyMeasurement } from '@/lib/types/models'

export interface MeasurementInput {
  date: string
  weight_kg?: number
  chest_cm?: number
  waist_cm?: number
  hips_cm?: number
  biceps_cm?: number
  body_fat_pct?: number
}

export async function getMeasurements(
  supabase: SupabaseClient,
  userId: string
): Promise<BodyMeasurement[]> {
  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  return (data as BodyMeasurement[]) ?? []
}

export async function upsertMeasurement(
  supabase: SupabaseClient,
  userId: string,
  input: MeasurementInput
): Promise<void> {
  const row = {
    user_id: userId,
    date: input.date,
    weight_kg: input.weight_kg ?? null,
    chest_cm: input.chest_cm ?? null,
    waist_cm: input.waist_cm ?? null,
    hips_cm: input.hips_cm ?? null,
    biceps_cm: input.biceps_cm ?? null,
    body_fat_pct: input.body_fat_pct ?? null,
  }
  const { error } = await supabase
    .from('body_measurements')
    .upsert(row, { onConflict: 'user_id,date' })
  if (error) throw new Error(error.message)
}

export async function deleteMeasurement(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('body_measurements')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}
```

- [ ] **Шаг 2: Создать `src/app/(app)/body/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { upsertMeasurement, deleteMeasurement } from '@/lib/db/body-measurements'

const positiveOptional = z.preprocess(
  v => v === '' || v === null || v === undefined ? undefined : Number(v),
  z.number().positive().optional()
)

const bodyFatOptional = z.preprocess(
  v => v === '' || v === null || v === undefined ? undefined : Number(v),
  z.number().min(0).max(100).optional()
)

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight_kg: positiveOptional,
  chest_cm: positiveOptional,
  waist_cm: positiveOptional,
  hips_cm: positiveOptional,
  biceps_cm: positiveOptional,
  body_fat_pct: bodyFatOptional,
})

export async function addMeasurementAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const parsed = schema.parse({
    date: formData.get('date'),
    weight_kg: formData.get('weight_kg'),
    chest_cm: formData.get('chest_cm'),
    waist_cm: formData.get('waist_cm'),
    hips_cm: formData.get('hips_cm'),
    biceps_cm: formData.get('biceps_cm'),
    body_fat_pct: formData.get('body_fat_pct'),
  })

  await upsertMeasurement(supabase, user.id, parsed)
  revalidatePath('/body')
}

export async function deleteMeasurementAction(id: string): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  await deleteMeasurement(supabase, user.id, id)
  revalidatePath('/body')
}
```

- [ ] **Шаг 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

- [ ] **Шаг 4: Commit**

```bash
git add src/lib/db/body-measurements.ts src/app/\(app\)/body/actions.ts
git commit -m "feat: add body measurements DB functions and server actions"
```

---

## Task 3: MetricSparkline компонент

**Files:**
- Create: `src/components/body/MetricSparkline.tsx`

- [ ] **Шаг 1: Создать `src/components/body/MetricSparkline.tsx`**

```tsx
'use client'

interface Props {
  values: number[]  // ASC, без null
  color?: string    // hex
  height?: number
  width?: number
}

export function MetricSparkline({
  values,
  color = '#f59e0b',
  height = 40,
  width = 120,
}: Props) {
  if (values.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-700"
        style={{ height, width }}
      >
        —
      </div>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pad = 2
  const innerHeight = height - pad * 2

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = pad + innerHeight - ((v - min) / range) * innerHeight
    return { x, y }
  })

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`))
    .join(' ')

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  // Unique gradient id per component instance to avoid collisions
  const gradientId = `spark-${Math.random().toString(36).slice(2, 9)}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2.5"
        fill={color}
      />
    </svg>
  )
}
```

- [ ] **Шаг 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/body/MetricSparkline.tsx
git commit -m "feat: add MetricSparkline pure-SVG component"
```

---

## Task 4: MetricCard + CurrentSnapshot

**Files:**
- Create: `src/components/body/MetricCard.tsx`
- Create: `src/components/body/CurrentSnapshot.tsx`

- [ ] **Шаг 1: Создать `src/components/body/MetricCard.tsx`**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { MetricSparkline } from './MetricSparkline'
import type { MeasurementField } from '@/lib/types/models'

const METRIC_COLORS: Record<MeasurementField, string> = {
  weight_kg:    '#f59e0b',
  chest_cm:     '#a78bfa',
  waist_cm:     '#f87171',
  hips_cm:      '#f472b6',
  biceps_cm:    '#4ade80',
  body_fat_pct: '#c084fc',
}

const METRIC_LABEL_KEY: Record<MeasurementField, string> = {
  weight_kg:    'weight',
  chest_cm:     'chest',
  waist_cm:     'waist',
  hips_cm:      'hips',
  biceps_cm:    'biceps',
  body_fat_pct: 'bodyFat',
}

const METRIC_UNIT: Record<MeasurementField, 'kg' | 'cm' | 'pct'> = {
  weight_kg:    'kg',
  chest_cm:     'cm',
  waist_cm:     'cm',
  hips_cm:      'cm',
  biceps_cm:    'cm',
  body_fat_pct: 'pct',
}

// Goal direction per metric: when value decreases, is it "good"?
const DECREASE_IS_GOOD: Record<MeasurementField, boolean> = {
  weight_kg:    false,  // neutral by default — depends on user goal
  chest_cm:     false,  // bigger chest = good for muscle gain
  waist_cm:     true,   // smaller waist = good
  hips_cm:      false,
  biceps_cm:    false,  // bigger bicep = good
  body_fat_pct: true,   // less fat = good
}

interface Props {
  field: MeasurementField
  current: number | null
  previous: number | null
  history: number[]  // ASC, без null
}

export function MetricCard({ field, current, previous, history }: Props) {
  const tLabel = useTranslations('body.labels')
  const tUnit = useTranslations('body.units')
  const color = METRIC_COLORS[field]
  const unit = tUnit(METRIC_UNIT[field])
  const label = tLabel(METRIC_LABEL_KEY[field])

  const delta = current !== null && previous !== null ? current - previous : null

  let deltaColor = 'text-zinc-500'
  let DeltaIcon = Minus
  if (delta !== null && Math.abs(delta) >= 0.01) {
    DeltaIcon = delta > 0 ? ArrowUp : ArrowDown
    const decreaseIsGood = DECREASE_IS_GOOD[field]
    const isPositiveOutcome = decreaseIsGood ? delta < 0 : delta > 0
    deltaColor = isPositiveOutcome ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <div className="text-2xl font-black text-white tabular-nums leading-none">
          {current !== null ? current.toFixed(unit === 'pct' ? 1 : 1) : '—'}
        </div>
        <div className="text-[10px] text-zinc-500">{unit}</div>
      </div>
      {delta !== null && Math.abs(delta) >= 0.01 && (
        <div className={`flex items-center gap-1 text-[10px] font-mono ${deltaColor} mb-2`}>
          <DeltaIcon className="h-3 w-3" />
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit}
        </div>
      )}
      <MetricSparkline values={history} color={color} height={32} width={120} />
    </div>
  )
}
```

- [ ] **Шаг 2: Создать `src/components/body/CurrentSnapshot.tsx`**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import type { BodyMeasurement } from '@/lib/types/models'

interface Props {
  latest: BodyMeasurement | null
}

export function CurrentSnapshot({ latest }: Props) {
  const tLabel = useTranslations('body.labels')
  const tUnit = useTranslations('body.units')

  if (!latest) {
    return null
  }

  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
    })

  const stats: Array<{ value: number | null; label: string; unit: string }> = [
    { value: latest.weight_kg,    label: tLabel('weight'),   unit: tUnit('kg') },
    { value: latest.waist_cm,     label: tLabel('waist'),    unit: tUnit('cm') },
    { value: latest.body_fat_pct, label: tLabel('bodyFat'),  unit: tUnit('pct') },
  ]

  const filled = stats.filter(s => s.value !== null)
  if (filled.length === 0) return null

  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(139,92,246,0.10))',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-mono">
        {formatDate(latest.date)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={i}>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">{s.label}</div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-black text-amber-500 tabular-nums leading-none">
                {s.value !== null ? s.value.toFixed(1) : '—'}
              </div>
              {s.value !== null && (
                <div className="text-[10px] text-zinc-500">{s.unit}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Шаг 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

- [ ] **Шаг 4: Commit**

```bash
git add src/components/body/MetricCard.tsx src/components/body/CurrentSnapshot.tsx
git commit -m "feat: add MetricCard and CurrentSnapshot components"
```

---

## Task 5: MeasurementForm + BmiCard + MeasurementHistory + DeleteButton

**Files:**
- Create: `src/components/body/MeasurementForm.tsx`
- Create: `src/components/body/BmiCard.tsx`
- Create: `src/components/body/MeasurementHistory.tsx`
- Create: `src/components/body/DeleteMeasurementButton.tsx`

- [ ] **Шаг 1: Создать `src/components/body/MeasurementForm.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Check, X } from 'lucide-react'
import { addMeasurementAction } from '@/app/(app)/body/actions'

interface FieldDef {
  name: 'weight_kg' | 'chest_cm' | 'waist_cm' | 'hips_cm' | 'biceps_cm' | 'body_fat_pct'
  labelKey: string
  unit: 'kg' | 'cm' | 'pct'
  step: string
}

const FIELDS: FieldDef[] = [
  { name: 'weight_kg',    labelKey: 'weight',  unit: 'kg',  step: '0.1' },
  { name: 'chest_cm',     labelKey: 'chest',   unit: 'cm',  step: '0.5' },
  { name: 'waist_cm',     labelKey: 'waist',   unit: 'cm',  step: '0.5' },
  { name: 'hips_cm',      labelKey: 'hips',    unit: 'cm',  step: '0.5' },
  { name: 'biceps_cm',    labelKey: 'biceps',  unit: 'cm',  step: '0.5' },
  { name: 'body_fat_pct', labelKey: 'bodyFat', unit: 'pct', step: '0.1' },
]

export function MeasurementForm() {
  const t = useTranslations('body')
  const tLabel = useTranslations('body.labels')
  const tUnit = useTranslations('body.units')
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const todayIso = new Date().toISOString().slice(0, 10)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addMeasurementAction(formData)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
      }, 1500)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-12 rounded-xl font-bold text-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
          boxShadow: '0 8px 24px rgba(245,158,11,0.25)',
        }}
      >
        <Plus className="h-4 w-4" />
        {t('addEntry')}
      </button>
    )
  }

  return (
    <form
      action={handleSubmit}
      className="p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider">{t('addEntry')}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-zinc-500 hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-zinc-500 uppercase tracking-widest">{t('today')}</label>
        <input
          type="date"
          name="date"
          defaultValue={todayIso}
          required
          className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-amber-500/50 outline-none text-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(field => (
          <div key={field.name} className="space-y-1">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest">
              {tLabel(field.labelKey)} ({tUnit(field.unit)})
            </label>
            <input
              type="number"
              name={field.name}
              step={field.step}
              min={field.name === 'body_fat_pct' ? '0' : '0.1'}
              max={field.name === 'body_fat_pct' ? '100' : undefined}
              className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 focus:border-amber-500/50 outline-none text-white font-mono text-sm"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isPending || saved}
        className="w-full h-11 rounded-xl font-bold text-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-70"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> {t('saved')}
          </>
        ) : isPending ? (
          t('saving')
        ) : (
          t('save')
        )}
      </button>
    </form>
  )
}
```

- [ ] **Шаг 2: Создать `src/components/body/BmiCard.tsx`**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { calculateBMI, bmiCategory } from '@/lib/utils/bmi'

interface Props {
  weightKg: number | null
  heightCm: number | null
}

const ZONES = [
  { max: 18.5, color: '#60a5fa', key: 'underweight' },
  { max: 25,   color: '#4ade80', key: 'normal' },
  { max: 30,   color: '#fbbf24', key: 'overweight' },
  { max: 50,   color: '#f87171', key: 'obese' },
]

export function BmiCard({ weightKg, heightCm }: Props) {
  const t = useTranslations('body.bmi')

  if (!weightKg || !heightCm) {
    return (
      <div
        className="p-4 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">{t('title')}</div>
        <p className="text-sm text-zinc-400">{t('setHeightHint')}</p>
      </div>
    )
  }

  const bmi = calculateBMI(weightKg, heightCm)
  const category = bmiCategory(bmi)
  const categoryKey = category.toLowerCase() as 'underweight' | 'normal' | 'overweight' | 'obese'
  const activeZone = ZONES.find(z => bmi < z.max) ?? ZONES[ZONES.length - 1]

  // Marker position on the scale: clamp BMI to [12, 40] for display
  const scaleMin = 12
  const scaleMax = 40
  const markerPct = Math.max(0, Math.min(100, ((bmi - scaleMin) / (scaleMax - scaleMin)) * 100))

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{t('title')}</div>
        <div className="text-2xl font-black tabular-nums" style={{ color: activeZone.color }}>
          {bmi.toFixed(1)}
        </div>
      </div>

      <div className="relative h-2 rounded-full overflow-hidden flex">
        <div className="flex-1" style={{ background: '#60a5fa' }} />
        <div className="flex-1" style={{ background: '#4ade80' }} />
        <div className="flex-1" style={{ background: '#fbbf24' }} />
        <div className="flex-1" style={{ background: '#f87171' }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full shadow-lg"
          style={{ left: `${markerPct}%`, marginLeft: '-2px' }}
        />
      </div>

      <div className="text-xs mt-2 font-semibold" style={{ color: activeZone.color }}>
        {t(categoryKey)}
      </div>
    </div>
  )
}
```

- [ ] **Шаг 3: Создать `src/components/body/DeleteMeasurementButton.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import { deleteMeasurementAction } from '@/app/(app)/body/actions'

interface Props {
  id: string
}

export function DeleteMeasurementButton({ id }: Props) {
  const t = useTranslations('body')
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteMeasurementAction(id)
    })
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-zinc-600 hover:text-red-400 transition-colors"
        title={t('delete')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="text-zinc-500">{t('deleteConfirm')}</span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-red-400 hover:text-red-300 font-bold uppercase disabled:opacity-50"
      >
        {t('delete')}
      </button>
      <span className="text-zinc-700">/</span>
      <button
        onClick={() => setConfirm(false)}
        className="text-zinc-500 hover:text-zinc-300 uppercase"
      >
        {t('cancel')}
      </button>
    </div>
  )
}
```

- [ ] **Шаг 4: Создать `src/components/body/MeasurementHistory.tsx`**

```tsx
import { useTranslations, useLocale } from 'next-intl'
import { DeleteMeasurementButton } from './DeleteMeasurementButton'
import type { BodyMeasurement } from '@/lib/types/models'

interface Props {
  measurements: BodyMeasurement[]
}

export function MeasurementHistory({ measurements }: Props) {
  const t = useTranslations('body')
  const tLabel = useTranslations('body.labels')
  const tUnit = useTranslations('body.units')
  const locale = useLocale()

  if (measurements.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-zinc-500">{t('noData')}</div>
    )
  }

  const formatDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">{t('history.title')}</h2>
      <div className="space-y-2">
        {measurements.map(m => {
          const items: Array<{ label: string; value: number | null; unit: string }> = [
            { label: tLabel('weight'),   value: m.weight_kg,    unit: tUnit('kg') },
            { label: tLabel('waist'),    value: m.waist_cm,     unit: tUnit('cm') },
            { label: tLabel('chest'),    value: m.chest_cm,     unit: tUnit('cm') },
            { label: tLabel('hips'),     value: m.hips_cm,      unit: tUnit('cm') },
            { label: tLabel('biceps'),   value: m.biceps_cm,    unit: tUnit('cm') },
            { label: tLabel('bodyFat'),  value: m.body_fat_pct, unit: tUnit('pct') },
          ].filter(x => x.value !== null)

          return (
            <div
              key={m.id}
              className="p-3 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-mono text-amber-400">{formatDate(m.date)}</div>
                <DeleteMeasurementButton id={m.id} />
              </div>
              {items.length === 0 ? (
                <div className="text-[11px] text-zinc-600">—</div>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {items.map((it, i) => (
                    <div key={i} className="text-[11px]">
                      <span className="text-zinc-500">{it.label}:</span>{' '}
                      <span className="font-mono text-zinc-200">
                        {it.value!.toFixed(1)}
                      </span>{' '}
                      <span className="text-zinc-600">{it.unit}</span>
                    </div>
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
```

- [ ] **Шаг 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

- [ ] **Шаг 6: Commit**

```bash
git add src/components/body/
git commit -m "feat: add MeasurementForm, BmiCard, MeasurementHistory, DeleteButton"
```

---

## Task 6: Body страница + ссылка с профиля

**Files:**
- Create: `src/app/(app)/body/page.tsx`
- Modify: `src/app/(app)/profile/page.tsx`

- [ ] **Шаг 1: Создать `src/app/(app)/body/page.tsx`**

```tsx
import { Activity } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getMeasurements } from '@/lib/db/body-measurements'
import { CurrentSnapshot } from '@/components/body/CurrentSnapshot'
import { MeasurementForm } from '@/components/body/MeasurementForm'
import { MetricCard } from '@/components/body/MetricCard'
import { BmiCard } from '@/components/body/BmiCard'
import { MeasurementHistory } from '@/components/body/MeasurementHistory'
import type { MeasurementField, BodyMeasurement } from '@/lib/types/models'

const METRIC_FIELDS: MeasurementField[] = [
  'weight_kg', 'chest_cm', 'waist_cm', 'hips_cm', 'biceps_cm', 'body_fat_pct',
]

function buildHistory(measurements: BodyMeasurement[], field: MeasurementField): number[] {
  // measurements are DESC by date; reverse to ASC for sparkline
  return measurements
    .slice()
    .reverse()
    .map(m => m[field])
    .filter((v): v is number => v !== null)
}

export default async function BodyPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('body')

  const [measurements, profileResult] = await Promise.all([
    getMeasurements(supabase, user.id),
    supabase.from('profiles').select('height_cm').eq('id', user.id).single(),
  ])

  const heightCm = profileResult.data?.height_cm ?? null
  const latest = measurements[0] ?? null
  const previous = measurements[1] ?? null

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <Activity className="h-7 w-7 text-amber-500" />
        <h1 className="text-2xl font-black uppercase tracking-wider">{t('title')}</h1>
      </div>

      {latest && <CurrentSnapshot latest={latest} />}

      <MeasurementForm />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {METRIC_FIELDS.map(field => (
          <MetricCard
            key={field}
            field={field}
            current={latest?.[field] ?? null}
            previous={previous?.[field] ?? null}
            history={buildHistory(measurements, field)}
          />
        ))}
      </div>

      <BmiCard weightKg={latest?.weight_kg ?? null} heightCm={heightCm} />

      <MeasurementHistory measurements={measurements} />
    </div>
  )
}
```

- [ ] **Шаг 2: Прочитать `src/app/(app)/profile/page.tsx`** чтобы найти подходящее место для ссылки

```bash
cat "src/app/(app)/profile/page.tsx" | head -80
```

- [ ] **Шаг 3: Добавить ссылку в `profile/page.tsx`**

Добавить импорты (если их ещё нет):
```ts
import { Activity, ChevronRight } from 'lucide-react'
```

В переменных переводов рядом с `tAch`:
```ts
const tBody = await getTranslations('body')
```

В JSX, добавить ссылку **рядом** с существующей карточкой Achievements (так же стилизованную):

```tsx
<Link
  href="/body"
  className="flex items-center justify-between p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
>
  <div className="flex items-center gap-3">
    <Activity className="h-5 w-5 text-amber-500" />
    <div>
      <div className="font-bold text-sm">{tBody('linkTitle')}</div>
      <div className="text-xs text-zinc-500">{tBody('linkSub')}</div>
    </div>
  </div>
  <ChevronRight className="h-4 w-4 text-zinc-500" />
</Link>
```

- [ ] **Шаг 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

- [ ] **Шаг 5: Commit**

```bash
git add src/app/\(app\)/body/page.tsx src/app/\(app\)/profile/page.tsx
git commit -m "feat: add /body page and link from profile"
```

---

## Task 7: Финальная проверка + push

- [ ] **Шаг 1: Полный TypeScript check**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Шаг 2: Все Vitest тесты**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: all pass (existing 42 tests).

- [ ] **Шаг 3: Next.js build**

```bash
npx next build 2>&1 | tail -25
```

Expected: success, `/body` route in output.

- [ ] **Шаг 4: Push**

```bash
git push origin main
```

---

## Чеклист готовности

- [ ] Миграция `body_measurements` создана с RLS
- [ ] Типы `BodyMeasurement`, `MeasurementField` в `models.ts`
- [ ] i18n `body.*` в обоих файлах
- [ ] DB функции `getMeasurements`/`upsertMeasurement`/`deleteMeasurement`
- [ ] Server actions `addMeasurementAction`/`deleteMeasurementAction` с zod валидацией
- [ ] `MetricSparkline` чистый SVG, gradient fill
- [ ] `MetricCard` с цветом-акцентом, дельтой, sparkline
- [ ] `CurrentSnapshot` с топ-3 метриками
- [ ] `MeasurementForm` с раскрытием, today по умолчанию, всеми 6 полями
- [ ] `BmiCard` с цветной шкалой и маркером
- [ ] `MeasurementHistory` с удалением
- [ ] `/body` страница рендерит все компоненты
- [ ] Ссылка с `/profile`
- [ ] TypeScript: 0 ошибок, build: успех, route `/body` присутствует
