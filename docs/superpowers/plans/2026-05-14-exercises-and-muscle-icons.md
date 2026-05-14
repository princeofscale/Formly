# Bodybuilding Exercises + Muscle Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to execute this plan task-by-task.

**Goal:** Добавить 35 bodybuilding-упражнений + русские названия к существующим, создать SVG-компонент `<MuscleIcon>` и заменить текстовые badge-фильтры мышц в `/exercise-library` на визуальные карточки в стиле скриншота.

**Architecture:** SQL миграция для seed-данных, самостоятельный SVG-компонент без зависимостей от MuscleHeatmap (YAGNI — не рефакторим работающий код), изменение страницы exercise-library с заменой `<Badge>` на сетку `<MuscleIcon>` карточек.

**Tech Stack:** Next.js 16, Supabase, next-intl v4, Tailwind CSS, pure SVG.

---

## Файловая карта

| Файл | Действие |
|---|---|
| `supabase/migrations/20260514120000_bodybuilding_exercises.sql` | Создать |
| `src/components/exercise/MuscleIcon.tsx` | Создать |
| `src/app/(app)/exercise-library/page.tsx` | Модифицировать |
| `messages/en.json`, `messages/ru.json` | Добавить `exerciseLibrary.targetArea` |

---

## Task 1: Миграция упражнений + i18n

**Files:**
- Create: `supabase/migrations/20260514120000_bodybuilding_exercises.sql`
- Modify: `messages/en.json`, `messages/ru.json`

- [ ] **Шаг 1: Создать миграцию `supabase/migrations/20260514120000_bodybuilding_exercises.sql`**

```sql
-- Add Russian names to existing exercises (no-op for already localized)
update exercises set name_ru = case slug
  when 'barbell-bench-press' then 'Жим лёжа со штангой'
  when 'incline-barbell-bench-press' then 'Жим штанги на наклонной'
  when 'dumbbell-bench-press' then 'Жим гантелей лёжа'
  when 'dumbbell-flyes' then 'Разводка гантелей'
  when 'cable-crossover' then 'Кроссовер'
  when 'barbell-deadlift' then 'Становая тяга'
  when 'pull-up' then 'Подтягивания'
  when 'barbell-row' then 'Тяга штанги в наклоне'
  when 'cable-row' then 'Тяга нижнего блока'
  when 'lat-pulldown' then 'Тяга верхнего блока'
  when 'barbell-overhead-press' then 'Армейский жим'
  when 'dumbbell-overhead-press' then 'Жим гантелей сидя'
  when 'dumbbell-lateral-raise' then 'Махи в стороны'
  when 'face-pull' then 'Тяга к лицу'
  when 'barbell-squat' then 'Приседания со штангой'
  when 'romanian-deadlift' then 'Румынская тяга'
  when 'leg-press' then 'Жим ногами'
  when 'leg-curl' then 'Сгибания ног лёжа'
  when 'leg-extension' then 'Разгибания ног'
  when 'calf-raise' then 'Подъём на носки'
  when 'barbell-curl' then 'Подъём штанги на бицепс'
  when 'dumbbell-curl' then 'Подъём гантелей на бицепс'
  when 'hammer-curl' then 'Молотки'
  when 'tricep-pushdown' then 'Разгибания на блоке'
  when 'skull-crusher' then 'Французский жим'
  when 'close-grip-bench-press' then 'Жим узким хватом'
  when 'plank' then 'Планка'
  when 'crunch' then 'Скручивания'
  when 'ab-wheel-rollout' then 'Ролик пресса'
  else name_ru
end
where name_ru is null;

-- Add new bodybuilding exercises
insert into exercises (name, name_ru, slug, primary_muscle, secondary_muscles, mechanic, equipment) values
('Incline Dumbbell Press', 'Жим гантелей на наклонной', 'incline-dumbbell-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'dumbbell'),
('Decline Barbell Press', 'Жим штанги головой вниз', 'decline-barbell-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'barbell'),
('Machine Chest Press', 'Жим в тренажёре на грудь', 'machine-chest-press', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'machine'),
('Pec Deck', 'Сведения в тренажёре «бабочка»', 'pec-deck', 'chest', array[]::muscle_group[], 'isolation', 'machine'),
('Dips', 'Отжимания на брусьях', 'dips', 'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'bodyweight'),
('One-Arm Dumbbell Row', 'Тяга гантели одной рукой', 'one-arm-dumbbell-row', 'back', array['lats','biceps','rear_delts']::muscle_group[], 'compound', 'dumbbell'),
('T-Bar Row', 'Тяга Т-грифа', 't-bar-row', 'back', array['lats','biceps']::muscle_group[], 'compound', 'barbell'),
('Hyperextension', 'Гиперэкстензия', 'hyperextension', 'back', array['glutes','hamstrings']::muscle_group[], 'isolation', 'bodyweight'),
('Barbell Shrug', 'Шраги со штангой', 'barbell-shrug', 'traps', array[]::muscle_group[], 'isolation', 'barbell'),
('Arnold Press', 'Жим Арнольда', 'arnold-press', 'front_delts', array['side_delts','triceps']::muscle_group[], 'compound', 'dumbbell'),
('Bent-Over Reverse Flye', 'Махи в наклоне', 'bent-over-reverse-flye', 'rear_delts', array['traps']::muscle_group[], 'isolation', 'dumbbell'),
('Upright Row', 'Тяга к подбородку', 'upright-row', 'side_delts', array['traps','front_delts']::muscle_group[], 'compound', 'barbell'),
('Front Raise', 'Передние махи гантелями', 'front-raise', 'front_delts', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Preacher Curl', 'Подъём на скамье Скотта', 'preacher-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'barbell'),
('Concentration Curl', 'Концентрированные сгибания', 'concentration-curl', 'biceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Cable Curl', 'Сгибания на блоке', 'cable-curl', 'biceps', array['forearms']::muscle_group[], 'isolation', 'cable'),
('Overhead Tricep Extension', 'Разгибания из-за головы', 'overhead-tricep-extension', 'triceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Bench Dips', 'Обратные отжимания от скамьи', 'bench-dips', 'triceps', array['chest','front_delts']::muscle_group[], 'compound', 'bodyweight'),
('Tricep Kickback', 'Кикбэк гантелью', 'tricep-kickback', 'triceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Front Squat', 'Фронтальные приседания', 'front-squat', 'quads', array['glutes','core']::muscle_group[], 'compound', 'barbell'),
('Walking Lunges', 'Выпады с гантелями', 'walking-lunges', 'quads', array['glutes','hamstrings']::muscle_group[], 'compound', 'dumbbell'),
('Bulgarian Split Squat', 'Болгарские выпады', 'bulgarian-split-squat', 'quads', array['glutes','hamstrings']::muscle_group[], 'compound', 'dumbbell'),
('Hack Squat', 'Хак-приседания', 'hack-squat', 'quads', array['glutes']::muscle_group[], 'compound', 'machine'),
('Stiff-Leg Deadlift', 'Становая на прямых ногах', 'stiff-leg-deadlift', 'hamstrings', array['glutes','back']::muscle_group[], 'compound', 'barbell'),
('Seated Leg Curl', 'Сгибания ног сидя', 'seated-leg-curl', 'hamstrings', array[]::muscle_group[], 'isolation', 'machine'),
('Hip Thrust', 'Ягодичный мостик', 'hip-thrust', 'glutes', array['hamstrings']::muscle_group[], 'compound', 'barbell'),
('Cable Glute Kickback', 'Отведение ноги назад на блоке', 'cable-glute-kickback', 'glutes', array['hamstrings']::muscle_group[], 'isolation', 'cable'),
('Sumo Squat', 'Приседания сумо', 'sumo-squat', 'glutes', array['quads','hamstrings']::muscle_group[], 'compound', 'barbell'),
('Standing Calf Raise', 'Подъём на носки стоя', 'standing-calf-raise', 'calves', array[]::muscle_group[], 'isolation', 'machine'),
('Seated Calf Raise', 'Подъём на носки сидя', 'seated-calf-raise', 'calves', array[]::muscle_group[], 'isolation', 'machine'),
('Hanging Leg Raise', 'Подъём ног в висе', 'hanging-leg-raise', 'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Bicycle Crunch', 'Велосипед', 'bicycle-crunch', 'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Lying Leg Raise', 'Подъём ног лёжа', 'lying-leg-raise', 'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Wrist Curl', 'Сгибания запястий', 'wrist-curl', 'forearms', array[]::muscle_group[], 'isolation', 'barbell'),
('Reverse Wrist Curl', 'Разгибания запястий', 'reverse-wrist-curl', 'forearms', array[]::muscle_group[], 'isolation', 'barbell')
on conflict (slug) do nothing;
```

- [ ] **Шаг 2: Добавить i18n ключ `exerciseLibrary.targetArea` в `messages/en.json`**

В секцию `"exerciseLibrary"` после `"title"`:

```json
"targetArea": "Target Area",
```

- [ ] **Шаг 3: Добавить тот же ключ в `messages/ru.json`**

```json
"targetArea": "Область внимания",
```

- [ ] **Шаг 4: Проверка**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en OK')"
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); console.log('ru OK')"
```

- [ ] **Шаг 5: Commit**

```bash
git add supabase/migrations/20260514120000_bodybuilding_exercises.sql messages/en.json messages/ru.json
git commit -m "feat: add 35 bodybuilding exercises with Russian names + targetArea i18n"
```

---

## Task 2: MuscleIcon SVG component

**Files:**
- Create: `src/components/exercise/MuscleIcon.tsx`

- [ ] **Шаг 1: Создать `src/components/exercise/MuscleIcon.tsx`**

```tsx
'use client'

import type { MuscleGroup } from '@/lib/types/models'

const ACTIVE = '#f59e0b'
const NEUTRAL = '#3f3f50'
const BODY = '#2a2a3a'
const OUTLINE = '#3f3f50'

const FRONT_MUSCLES: Set<MuscleGroup> = new Set([
  'chest', 'biceps', 'forearms', 'core', 'quads', 'calves', 'front_delts', 'side_delts',
])

interface Props {
  muscle: MuscleGroup
  size?: number
  active?: boolean
}

export function MuscleIcon({ muscle, size = 64, active = true }: Props) {
  const isBack = !FRONT_MUSCLES.has(muscle)
  const fill = (m: MuscleGroup | MuscleGroup[]) => {
    const matches = Array.isArray(m) ? m.includes(muscle) : m === muscle
    return matches && active ? ACTIVE : NEUTRAL
  }
  const height = Math.round((size * 138) / 65)

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 65 138"
      className="overflow-visible"
      aria-hidden="true"
    >
      {/* Head */}
      <ellipse cx="32.5" cy="11" rx="10" ry="10.5" fill={BODY} stroke={OUTLINE} strokeWidth="1.2" />
      {/* Neck */}
      <rect x="29" y="21" width="7" height="6" rx="2" fill={BODY} stroke={OUTLINE} strokeWidth="1" />
      {/* Torso */}
      <path
        d="M17 27 Q11 31 10 51 L10 75 Q10 79 17 79 L48 79 Q55 79 55 75 L55 51 Q54 31 48 27 Q42 24 32.5 24 Q23 24 17 27Z"
        fill={BODY}
        stroke={OUTLINE}
        strokeWidth="1.2"
      />

      {/* Arms — background outline */}
      <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke={BODY} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke={BODY} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87" stroke={BODY} strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87" stroke={BODY} strokeWidth="10" strokeLinecap="round" fill="none" />

      {/* Legs — background outline */}
      <path d="M21 79 Q18 98 18 114 Q18 127 19 137" stroke={BODY} strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M44 79 Q47 98 47 114 Q47 127 46 137" stroke={BODY} strokeWidth="15" strokeLinecap="round" fill="none" />

      {/* Forearms (visible both sides) */}
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87" stroke={fill('forearms')} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87" stroke={fill('forearms')} strokeWidth="8" strokeLinecap="round" fill="none" />

      {/* Calves (visible both sides) */}
      <path d="M18 116 Q18 127 19 137" stroke={fill('calves')} strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M47 116 Q47 127 46 137" stroke={fill('calves')} strokeWidth="11" strokeLinecap="round" fill="none" />

      {isBack ? (
        <>
          {/* Triceps */}
          <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke={fill('triceps')} strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke={fill('triceps')} strokeWidth="11" strokeLinecap="round" fill="none" />
          {/* Hamstrings */}
          <path d="M21 79 Q18 98 18 112" stroke={fill('hamstrings')} strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M44 79 Q47 98 47 112" stroke={fill('hamstrings')} strokeWidth="13" strokeLinecap="round" fill="none" />
          {/* Rear delts */}
          <ellipse cx="10" cy="30" rx="8" ry="6.5" fill={fill('rear_delts')} />
          <ellipse cx="55" cy="30" rx="8" ry="6.5" fill={fill('rear_delts')} />
          {/* Back (general body) */}
          <path d="M19 28 Q13 46 13 68 L52 68 Q52 46 46 28 Z" fill={fill('back')} />
          {/* Lats */}
          <path d="M10 33 Q7 50 10 70" stroke={fill('lats')} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M55 33 Q58 50 55 70" stroke={fill('lats')} strokeWidth="7" strokeLinecap="round" fill="none" />
          {/* Traps */}
          <path d="M17 27 Q32.5 21 48 27 Q40 34 32.5 35 Q25 34 17 27Z" fill={fill('traps')} />
          {/* Glutes */}
          <ellipse cx="23" cy="80" rx="9.5" ry="7" fill={fill('glutes')} />
          <ellipse cx="42" cy="80" rx="9.5" ry="7" fill={fill('glutes')} />
        </>
      ) : (
        <>
          {/* Biceps */}
          <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke={fill('biceps')} strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke={fill('biceps')} strokeWidth="11" strokeLinecap="round" fill="none" />
          {/* Quads */}
          <path d="M21 79 Q18 98 18 112" stroke={fill('quads')} strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M44 79 Q47 98 47 112" stroke={fill('quads')} strokeWidth="13" strokeLinecap="round" fill="none" />
          {/* Front/Side delts share the shoulder spot */}
          <ellipse cx="10" cy="30" rx="8" ry="6.5" fill={fill(['front_delts', 'side_delts'])} />
          <ellipse cx="55" cy="30" rx="8" ry="6.5" fill={fill(['front_delts', 'side_delts'])} />
          {/* Chest */}
          <ellipse cx="23" cy="42" rx="10.5" ry="8" fill={fill('chest')} />
          <ellipse cx="42" cy="42" rx="10.5" ry="8" fill={fill('chest')} />
          {/* Abs (core) */}
          <g>
            <rect x="27" y="52" width="5" height="4.5" rx="1.5" fill={fill('core')} />
            <rect x="33" y="52" width="5" height="4.5" rx="1.5" fill={fill('core')} />
            <rect x="27" y="58" width="5" height="4.5" rx="1.5" fill={fill('core')} opacity="0.85" />
            <rect x="33" y="58" width="5" height="4.5" rx="1.5" fill={fill('core')} opacity="0.85" />
            <rect x="27" y="64" width="5" height="4.5" rx="1.5" fill={fill('core')} opacity="0.7" />
            <rect x="33" y="64" width="5" height="4.5" rx="1.5" fill={fill('core')} opacity="0.7" />
          </g>
        </>
      )}
    </svg>
  )
}
```

- [ ] **Шаг 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/exercise/MuscleIcon.tsx
git commit -m "feat: add MuscleIcon SVG component with front/back muscle highlighting"
```

---

## Task 3: Интеграция в exercise-library

**Files:**
- Modify: `src/app/(app)/exercise-library/page.tsx`

- [ ] **Шаг 1: Заменить файл `src/app/(app)/exercise-library/page.tsx` целиком**

```tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getExercises } from '@/lib/db/exercises'
import { Badge } from '@/components/ui/badge'
import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import { ExerciseCard } from '@/components/exercise/ExerciseCard'
import { MuscleIcon } from '@/components/exercise/MuscleIcon'
import { Check } from 'lucide-react'
import Link from 'next/link'
import type { MuscleGroup, Equipment } from '@/lib/types/models'
import { getTranslations, getLocale } from 'next-intl/server'

const PRIMARY_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'front_delts', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'core', 'calves',
]
const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']

export default async function ExerciseLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ muscle?: string; equipment?: string }>
}) {
  const { muscle, equipment } = await searchParams
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('exerciseLibrary')
  const tHistory = await getTranslations('history')
  const locale = await getLocale()

  const exercises = await getExercises(supabase, user.id, {
    muscle: muscle as MuscleGroup | undefined,
    equipment: equipment as Equipment | undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <ExerciseForm />
      </div>

      {/* Target area picker — visual muscle icons */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          {t('targetArea')}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PRIMARY_MUSCLE_GROUPS.map(m => {
            const isActive = muscle === m
            const params = new URLSearchParams()
            if (!isActive) params.set('muscle', m)
            if (equipment) params.set('equipment', equipment)
            const href = params.toString() ? `/exercise-library?${params.toString()}` : '/exercise-library'

            return (
              <Link
                key={m}
                href={href}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'
                }`}
              >
                {isActive && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                    <Check className="h-3 w-3 text-black" strokeWidth={3} />
                  </div>
                )}
                <MuscleIcon muscle={m} size={48} active={isActive} />
                <div className={`text-[10px] font-bold text-center ${isActive ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {tHistory(`muscleLabel.${m}`)}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Equipment filter — text badges */}
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT.map(e => (
          <Link key={e} href={`/exercise-library?${muscle ? `muscle=${muscle}&` : ''}equipment=${e}`}>
            <Badge variant={equipment === e ? 'default' : 'outline'} className="cursor-pointer">
              {t(`equipment.${e}`)}
            </Badge>
          </Link>
        ))}
        {(muscle || equipment) && (
          <Link href="/exercise-library">
            <Badge variant="destructive" className="cursor-pointer">{t('clearFilter')}</Badge>
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            displayName={locale === 'ru' ? (ex.name_ru ?? ex.name) : ex.name}
            muscleLabel={tHistory(`muscleLabel.${ex.primary_muscle}`)}
            equipmentLabel={t(`equipment.${ex.equipment}`)}
            customLabel={t('custom')}
            locale={locale}
          />
        ))}
        {exercises.length === 0 && (
          <p className="text-zinc-500 text-center py-8">{t('noExercises')}</p>
        )}
      </div>
    </div>
  )
}
```

Ключевые отличия от старой версии:
- Удалён список `MUSCLES` со всеми 15 группами (теперь `PRIMARY_MUSCLE_GROUPS` с 10 основными)
- Добавлен заголовок секции "Target Area"
- Текстовые `<Badge>` для мышц заменены на `<Link>` карточки с `<MuscleIcon>` и галочкой при активации
- Логика toggle: клик на активную мышцу убирает фильтр

- [ ] **Шаг 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Шаг 3: Commit**

```bash
git add src/app/\(app\)/exercise-library/page.tsx
git commit -m "feat: replace text muscle filters with visual MuscleIcon cards in exercise-library"
```

---

## Task 4: TypeScript + build + push

- [ ] **Шаг 1: Финальный TS check**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Шаг 2: Vitest**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: 42/42 passed.

- [ ] **Шаг 3: Build**

```bash
npx next build 2>&1 | tail -20
```

Expected: success, `/exercise-library` route present.

- [ ] **Шаг 4: Push**

```bash
git push origin main
```

---

## Чеклист готовности

- [ ] Миграция содержит UPDATE для русских названий + INSERT 35 новых упражнений с `on conflict do nothing`
- [ ] `targetArea` i18n ключ в обоих файлах
- [ ] `MuscleIcon` компонент рендерит front/back вид в зависимости от мышцы
- [ ] Каждая из 15 мышечных групп подсвечивается правильно (chest, biceps, front_delts, side_delts, core, quads, calves, forearms спереди; back, lats, traps, rear_delts, triceps, hamstrings, glutes сзади)
- [ ] Exercise-library показывает 10 основных групп визуально с галочкой при активации
- [ ] Toggle: клик на активную мышцу снимает фильтр
- [ ] TypeScript: 0 ошибок, build: успех
