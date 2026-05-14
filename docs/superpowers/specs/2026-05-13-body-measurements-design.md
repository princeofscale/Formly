# Body Measurements — Design Spec

**Дата:** 2026-05-13  
**Статус:** Утверждено

---

## Цель

Добавить страницу `/body` с трекингом замеров тела (вес, грудь, талия, бёдра, бицепс, % жира). Текущие значения с дельтой, sparkline-графики, BMI индикатор, история. Стиль — Aurora glassmorphism.

---

## Решения

| Параметр | Решение |
|---|---|
| Хранение | Новая таблица `body_measurements` с уникальным `(user_id, date)` |
| Поля | Все опциональны — пользователь записывает только то что меряет |
| Графики | Чистый SVG sparkline, без библиотек |
| BMI | Использует существующие `calculateBMI`/`bmiCategory` + рост из `profiles.height_cm` |
| Доступ | Карточка-ссылка с `/profile` |

---

## Секция 1: БД и типы

### Миграция `supabase/migrations/20260513180000_body_measurements.sql`

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

### Типы в `src/lib/types/models.ts`

```ts
export interface BodyMeasurement {
  id: string
  user_id: string
  date: string  // YYYY-MM-DD
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

---

## Секция 2: DB функции

### Файл `src/lib/db/body-measurements.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BodyMeasurement, MeasurementField } from '@/lib/types/models'

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

export interface MeasurementInput {
  date: string
  weight_kg?: number
  chest_cm?: number
  waist_cm?: number
  hips_cm?: number
  biceps_cm?: number
  body_fat_pct?: number
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

---

## Секция 3: Server Actions

### Файл `src/app/(app)/body/actions.ts`

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

---

## Секция 4: UI компоненты

### `src/components/body/MetricSparkline.tsx` (клиентский)

Чистый SVG, рисует линию + gradient fill.

```tsx
interface Props {
  values: number[]  // ASC по времени (старое → новое), null значения отфильтрованы
  color?: string    // amber по умолчанию
  height?: number
}
```

Если `values.length < 2` — показывает `—`.

Расчёт точек: нормализация в `[0, 100]` × ширина SVG. Использует `path` с `d="M ... L ... L ..."` для линии + второй path с `fill` для области под линией.

Цвета: line `#f59e0b`, fill `url(#sparkline-gradient)` (amber 0.3 → transparent).

### `src/components/body/MetricCard.tsx` (клиентский)

```tsx
interface Props {
  label: string      // "Вес"
  unit: string       // "кг"
  current: number | null
  previous: number | null
  history: number[]  // ASC, для sparkline
  /** Меньше = лучше для талии/жира, больше = лучше для бицепса/груди. По умолчанию любое изменение нейтральное */
  goalDirection?: 'up' | 'down' | 'neutral'
}
```

Структура карточки:
- Текущее значение крупно (`text-2xl font-black`)
- Под ним label маленьким `uppercase tracking-widest text-zinc-500`
- Дельта от prev цветом по `goalDirection` (для веса/талии/жира — `down` = green, для бицепса/груди = `up` = green; nuetral = amber)
- Sparkline снизу

Стиль: стеклянная карточка `.glass-card` с `p-3` и `border-l-2` цвета по метрике:
- Вес → amber
- Грудь → indigo
- Талия → red
- Бёдра → pink
- Бицепс → green
- % жира → violet

### `src/components/body/CurrentSnapshot.tsx` (клиентский)

Большая карточка с топ-3 метриками крупно (Вес, Талия, % жира). Дельты с прошлого замера.

### `src/components/body/MeasurementForm.tsx` (клиентский)

Раскрывающаяся форма (`useState showForm`). Поля: date (default today), все метрики опциональны. Кнопка submit с градиентом, на сохранении — `useTransition` + state "сохранено!".

### `src/components/body/BmiCard.tsx` (серверный или клиентский)

Использует `calculateBMI` и `bmiCategory`. Если `height_cm` или `weight_kg` отсутствуют — показывает плейсхолдер "Заполни рост в профиле".

Структура: значение BMI крупно + цветная горизонтальная шкала с маркером:
- Underweight: < 18.5 — синяя зона
- Normal: 18.5–25 — зелёная
- Overweight: 25–30 — янтарная
- Obese: > 30 — красная

### `src/components/body/MeasurementHistoryRow.tsx` (клиентский)

Строка истории с датой, значениями и кнопкой удалить (с подтверждением).

---

## Секция 5: Страница `/body`

### Файл `src/app/(app)/body/page.tsx`

Серверный компонент:
1. `verifySession()` → user
2. Fetch `getMeasurements()` + `profiles.height_cm`
3. Извлекает последний замер для current snapshot
4. Строит history per metric ASC для sparklines
5. Рендерит:

```tsx
<div className="space-y-4">
  <div className="flex items-center gap-3">
    <Activity className="h-7 w-7 text-amber-500" />
    <h1 className="text-2xl font-black uppercase tracking-wider">{t('title')}</h1>
  </div>

  <CurrentSnapshot latest={latest} prev={prev} />

  <MeasurementForm />

  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    <MetricCard label="weight" .../>
    <MetricCard label="chest" .../>
    <MetricCard label="waist" .../>
    <MetricCard label="hips" .../>
    <MetricCard label="biceps" .../>
    <MetricCard label="bodyFat" .../>
  </div>

  <BmiCard weight={latest.weight_kg} height={profile.height_cm} />

  <MeasurementHistory measurements={measurements} />
</div>
```

---

## Секция 6: Навигация

### Изменение `src/app/(app)/profile/page.tsx`

Добавить карточку-ссылку рядом с achievements:

```tsx
<Link href="/body" className="flex items-center justify-between p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
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

---

## Секция 7: i18n

### `messages/en.json` секция `body`

```json
"body": {
  "title": "Body Measurements",
  "linkTitle": "Body Measurements",
  "linkSub": "Track weight, size, body fat",
  "addEntry": "Add Measurement",
  "save": "Save",
  "saved": "Saved!",
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

### `messages/ru.json` секция `body`

```json
"body": {
  "title": "Замеры тела",
  "linkTitle": "Замеры тела",
  "linkSub": "Вес, объёмы, процент жира",
  "addEntry": "Добавить замер",
  "save": "Сохранить",
  "saved": "Сохранено!",
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

---

## Файловая карта

| Файл | Действие |
|---|---|
| `messages/en.json` | Добавить `body.*` секцию |
| `messages/ru.json` | То же на русском |
| `supabase/migrations/20260513180000_body_measurements.sql` | Создать |
| `src/lib/types/models.ts` | Добавить `BodyMeasurement` + `MeasurementField` |
| `src/lib/db/body-measurements.ts` | Создать |
| `src/app/(app)/body/actions.ts` | Создать |
| `src/app/(app)/body/page.tsx` | Создать |
| `src/components/body/MetricSparkline.tsx` | Создать |
| `src/components/body/MetricCard.tsx` | Создать |
| `src/components/body/CurrentSnapshot.tsx` | Создать |
| `src/components/body/MeasurementForm.tsx` | Создать |
| `src/components/body/BmiCard.tsx` | Создать |
| `src/components/body/MeasurementHistory.tsx` | Создать |
| `src/app/(app)/profile/page.tsx` | Добавить ссылку на `/body` |
