# Calendar + Streaks + Achievements — Design Spec

**Дата:** 2026-05-13  
**Статус:** Утверждено

---

## Цель

Добавить пакет фич удержания пользователей: календарь-heatmap последних 12 недель, текущий и лучший стрик, систему достижений (бейджи за вехи) с тостами при разблокировке.

---

## Решения

| Параметр | Решение |
|---|---|
| Логика стрика | По дням `training_schedule` — дни отдыха не ломают стрик |
| Календарь | 12 недель × 7 дней, компактный виджет на дашборде |
| Достижения | Таблица `achievements`, детекция при завершении тренировки, тост после редиректа |
| Сессии и тоннаж | Считаются on-the-fly из существующих данных (без денормализации) |

---

## Секция 1: База данных и типы

### Миграция `supabase/migrations/20260513150000_achievements.sql`

```sql
create table achievements (
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table achievements enable row level security;

create policy "users see own achievements"
  on achievements
  for all
  using (auth.uid() = user_id);
```

### Типы в `src/lib/types/models.ts`

```ts
export type AchievementCode =
  | 'first_workout'
  | 'sessions_10' | 'sessions_50' | 'sessions_100'
  | 'tonnage_1000' | 'tonnage_10000' | 'tonnage_100000'
  | 'streak_7' | 'streak_30'
  | 'first_pr'

export interface Achievement {
  code: AchievementCode
  unlocked_at: string
}

export interface StreakInfo {
  current: number
  longest: number
  last_workout_date: string | null
}

export interface DayActivity {
  date: string  // YYYY-MM-DD
  sets: number
}
```

---

## Секция 2: Стрик и календарь

### Файл `src/lib/db/streak.ts`

**Функции:**

`getFinishedSessionDates(supabase, userId): Promise<string[]>`
- Возвращает массив `YYYY-MM-DD` всех завершённых сессий (только дата, без времени)
- Запрос: `SELECT started_at FROM workout_sessions WHERE user_id=? AND finished_at IS NOT NULL ORDER BY started_at DESC`
- Маппинг: `s.started_at.slice(0, 10)`

`getCalendarActivity(supabase, userId, days=84): Promise<DayActivity[]>`
- Запрос: `SELECT created_at FROM set_entries WHERE user_id=? AND created_at >= NOW() - INTERVAL 'N days'`
- Группировка в памяти по дате, подсчёт `sets`
- Заполнение пустых дней `sets: 0` для всех 84 дней
- Сортировка по дате ASC

### Файл `src/lib/services/streak.service.ts`

`calculateStreak(workoutDates: string[], trainingSchedule: number[]): StreakInfo`

```ts
// workoutDates — отсортированный массив YYYY-MM-DD дат завершённых сессий (DESC)
// trainingSchedule — массив дней недели 1-7 (Пн-Вс)
```

Алгоритм (фрагмент):
1. Преобразовать `workoutDates` в `Set<string>` для O(1) lookup
2. Преобразовать `trainingSchedule` в `Set<number>` (ISO day-of-week, 1-7)
3. Для **current**: идти назад с сегодняшнего дня
   - Если день == сегодня и его нет в `workoutSet` — это не прерывание (день ещё не закончен)
   - Если день в `scheduleSet` (тренировочный):
     - Если есть в `workoutSet` → `current++`
     - Иначе → break (стрик прерван)
   - Если день НЕ в `scheduleSet` (отдых) → пропускаем без изменения
4. Для **longest**: проход по `workoutDates` (или альтернативный алгоритм), запоминается максимум
5. Edge case: если `trainingSchedule.length === 0` → используем "consecutive calendar days with workout" для `longest`, `current = 0`

`last_workout_date`: первый элемент `workoutDates` (DESC) или `null`.

### Интеграция в `dashboard/page.tsx`

Добавить к `Promise.all`:
- `getFinishedSessionDates(supabase, user.id)` → `workoutDates`
- `getCalendarActivity(supabase, user.id)` → `activity`
- Уже есть `profileResult` с `training_schedule`

После Promise.all:
```ts
const streak = calculateStreak(workoutDates, schedule)
```

Передаётся в `<StreakCard streak={streak} activity={activity} />`.

---

## Секция 3: Достижения

### Файл `src/lib/db/achievements.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Achievement, AchievementCode } from '@/lib/types/models'

export async function getAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<Achievement[]> {
  const { data } = await supabase
    .from('achievements')
    .select('code, unlocked_at')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
  return (data as Achievement[]) ?? []
}

export async function getUnlockedCodes(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<AchievementCode>> {
  const { data } = await supabase
    .from('achievements')
    .select('code')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.code as AchievementCode))
}

export async function insertAchievements(
  supabase: SupabaseClient,
  userId: string,
  codes: AchievementCode[]
): Promise<Achievement[]> {
  if (codes.length === 0) return []
  const rows = codes.map(code => ({ user_id: userId, code }))
  const { data, error } = await supabase
    .from('achievements')
    .insert(rows)
    .select('code, unlocked_at')
  if (error) throw new Error(error.message)
  return (data as Achievement[]) ?? []
}
```

### Файл `src/lib/services/achievements.service.ts`

**Метаданные достижений** (icon, category):

```ts
import type { AchievementCode } from '@/lib/types/models'

export interface AchievementMeta {
  icon: string
  category: 'sessions' | 'tonnage' | 'streak' | 'pr'
}

export const ACHIEVEMENT_META: Record<AchievementCode, AchievementMeta> = {
  first_workout:  { icon: '🎯', category: 'sessions' },
  sessions_10:    { icon: '💪', category: 'sessions' },
  sessions_50:    { icon: '🔥', category: 'sessions' },
  sessions_100:   { icon: '👑', category: 'sessions' },
  tonnage_1000:   { icon: '🏋', category: 'tonnage' },
  tonnage_10000:  { icon: '⚡', category: 'tonnage' },
  tonnage_100000: { icon: '🚀', category: 'tonnage' },
  streak_7:       { icon: '🔥', category: 'streak' },
  streak_30:      { icon: '⚡', category: 'streak' },
  first_pr:       { icon: '🏆', category: 'pr' },
}
```

**Список всех кодов** для итерации:
```ts
export const ALL_ACHIEVEMENT_CODES = Object.keys(ACHIEVEMENT_META) as AchievementCode[]
```

**Правила** (без типа `UserStats` — функция принимает агрегаты напрямую):

```ts
function evaluateRules(stats: {
  totalSessions: number
  totalTonnage: number
  currentStreak: number
  hasPR: boolean
}): AchievementCode[] {
  const earned: AchievementCode[] = []
  if (stats.totalSessions >= 1) earned.push('first_workout')
  if (stats.totalSessions >= 10) earned.push('sessions_10')
  if (stats.totalSessions >= 50) earned.push('sessions_50')
  if (stats.totalSessions >= 100) earned.push('sessions_100')
  if (stats.totalTonnage >= 1000) earned.push('tonnage_1000')
  if (stats.totalTonnage >= 10000) earned.push('tonnage_10000')
  if (stats.totalTonnage >= 100000) earned.push('tonnage_100000')
  if (stats.currentStreak >= 7) earned.push('streak_7')
  if (stats.currentStreak >= 30) earned.push('streak_30')
  if (stats.hasPR) earned.push('first_pr')
  return earned
}
```

**Функция детекции:**

```ts
export async function detectAndSaveAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<Achievement[]> {
  // 1. Агрегаты одним запросом
  const [sessionsResult, profileResult, prResult] = await Promise.all([
    supabase.from('workout_sessions')
      .select('total_volume_kg', { count: 'exact' })
      .eq('user_id', userId)
      .not('finished_at', 'is', null),
    supabase.from('profiles')
      .select('training_schedule')
      .eq('id', userId)
      .single(),
    supabase.from('set_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('calculated_1rm', 'is', null),
  ])

  const totalSessions = sessionsResult.count ?? 0
  const totalTonnage = (sessionsResult.data ?? []).reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const hasPR = (prResult.count ?? 0) > 0
  const schedule = profileResult.data?.training_schedule ?? []

  // 2. Стрик
  const workoutDates = await getFinishedSessionDates(supabase, userId)
  const streak = calculateStreak(workoutDates, schedule)

  // 3. Применить правила
  const eligible = evaluateRules({
    totalSessions,
    totalTonnage,
    currentStreak: streak.current,
    hasPR,
  })

  // 4. Фильтровать уже разблокированные
  const unlocked = await getUnlockedCodes(supabase, userId)
  const newCodes = eligible.filter(c => !unlocked.has(c))

  // 5. Сохранить и вернуть
  return insertAchievements(supabase, userId, newCodes)
}
```

### Интеграция в `finishWorkoutAction`

В `src/app/(app)/workout/[id]/actions.ts`:

```ts
export async function finishWorkoutAction(sessionId: string): Promise<void> {
  // ... существующий код: finishSession() ...

  // Новое:
  const newAchievements = await detectAndSaveAchievements(supabase, user.id)

  revalidatePath('/dashboard')
  revalidatePath('/history')

  const codes = newAchievements.map(a => a.code).join(',')
  const params = codes ? '?finished=1&unlocked=' + encodeURIComponent(codes) : '?finished=1'
  redirect('/history/' + sessionId + params)
}
```

---

## Секция 4: UI — Дашборд

### Файл `src/components/dashboard/StreakCard.tsx`

**Props:**
```ts
interface Props {
  streak: StreakInfo
  activity: DayActivity[]  // 84 дня, ASC по дате
}
```

**Структура:**

```tsx
<Card className="...">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Flame className="h-6 w-6 text-orange-400" />
        <div>
          <div className="text-4xl font-black text-amber-500 tabular-nums">{streak.current}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{t('streak.label')}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-[9px] text-zinc-600 uppercase">{t('streak.best')}</div>
        <div className="text-sm font-bold text-zinc-300">{streak.longest}</div>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {/* Heatmap: 12 колонок (недели) × 7 строк (дни Пн-Вс) */}
    <CalendarHeatmap activity={activity} />
  </CardContent>
</Card>
```

**Компонент `CalendarHeatmap`** (внутри того же файла):

- Группирует 84 дня в 12 недель × 7 дней
- Сетка: `grid grid-cols-12 gap-1`, каждая колонка — `flex flex-col gap-1`
- Клетка: `w-3 h-3 rounded-sm` (или `w-full aspect-square`)
- Цвет:
  ```ts
  function cellColor(sets: number): string {
    if (sets === 0) return 'bg-white/5'
    if (sets <= 5) return 'bg-amber-500/30'
    if (sets <= 15) return 'bg-amber-500/60'
    return 'bg-amber-500'
  }
  ```
- `title` на hover: `"${date} · ${sets} ${setsLabel}"`
- Сегодняшняя клетка: `ring-1 ring-amber-500/60`

### Интеграция в `dashboard/page.tsx`

Импорты:
```ts
import { getFinishedSessionDates, getCalendarActivity } from '@/lib/db/streak'
import { calculateStreak } from '@/lib/services/streak.service'
import { StreakCard } from '@/components/dashboard/StreakCard'
```

В `Promise.all` добавить 2 запроса (workoutDates, activity). После Promise.all вычислить `streak`. В JSX добавить `<StreakCard streak={streak} activity={activity} />` после `<WeeklyStats>` (перед `<AIInsightsCard>`).

---

## Секция 5: UI — Достижения

### Страница `src/app/(app)/profile/achievements/page.tsx`

Серверный компонент. Получает все достижения пользователя через `getAchievements()`. Рендерит сетку всех `ALL_ACHIEVEMENT_CODES` — каждое либо unlocked (с датой), либо locked (серое, с замком и условием).

**Заголовок:**
```tsx
<h1>{t('title')}</h1>
<p className="text-sm text-zinc-400">{unlocked.length} / {ALL_ACHIEVEMENT_CODES.length} {t('unlocked')}</p>
```

**Карточка достижения** (helper компонент `AchievementCard.tsx`):
- Стеклянная: `.glass-card p-4`
- Иконка-эмодзи большая (`text-4xl`)
- Название из i18n: `t('items.' + code + '.title')`
- Описание из i18n: `t('items.' + code + '.desc')`
- Если разблокировано: дата `"получено 12 мая"` через `toLocaleDateString`
- Если не разблокировано: `opacity-40`, иконка замка `<Lock>`, условие из i18n `t('items.' + code + '.condition')`

**Категории** (цветной accent-border):
- `sessions` → indigo
- `tonnage` → amber
- `streak` → red
- `pr` → green

### Тост о разблокировке

Файл `src/components/AchievementToast.tsx` — клиентский.

**Активация:** на странице `history/[sessionId]/page.tsx` читается `searchParams.unlocked`. Если есть — рендерится `<AchievementToast codes={unlocked.split(',')} />`.

**Структура:**
- `fixed top-4 right-4 z-50`
- Стеклянная карточка с градиентом amber-purple бордером
- Иконка достижения + название
- Если несколько — стек из карточек с задержкой `delay-[Nms]`
- Автоматически исчезает через 5 секунд (через `setTimeout` + state)
- Анимация: `animate-in slide-in-from-right zoom-in-95`

### Ссылка с профиля

В `src/app/(app)/profile/page.tsx` добавить карточку:

```tsx
<Link href="/profile/achievements" className="glass-card p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
  <div className="flex items-center gap-3">
    <Trophy className="h-5 w-5 text-amber-500" />
    <div>
      <div className="font-bold text-sm">{t('achievementsLink')}</div>
      <div className="text-xs text-zinc-500">{unlockedCount} / {totalCount}</div>
    </div>
  </div>
  <ChevronRight className="h-4 w-4 text-zinc-500" />
</Link>
```

---

## Секция 6: i18n

Новые ключи в обоих файлах (`en.json` + `ru.json`):

```json
"streak": {
  "label": "in a row",
  "best": "Best",
  "noWorkouts": "No workouts yet"
},
"achievements": {
  "title": "Achievements",
  "unlocked": "unlocked",
  "achievementsLink": "Achievements",
  "locked": "Locked",
  "received": "received",
  "items": {
    "first_workout":  { "title": "First Step",       "desc": "Complete your first workout",        "condition": "Complete 1 workout" },
    "sessions_10":    { "title": "Getting Started",  "desc": "Complete 10 workouts",                "condition": "Complete 10 workouts" },
    "sessions_50":    { "title": "Half Century",     "desc": "Complete 50 workouts",                "condition": "Complete 50 workouts" },
    "sessions_100":   { "title": "Century",          "desc": "Complete 100 workouts",               "condition": "Complete 100 workouts" },
    "tonnage_1000":   { "title": "1 Ton Lifted",     "desc": "Total volume of 1,000 kg",            "condition": "Lift 1,000 kg total" },
    "tonnage_10000":  { "title": "10 Tons",          "desc": "Total volume of 10,000 kg",           "condition": "Lift 10,000 kg total" },
    "tonnage_100000": { "title": "100 Tons Beast",   "desc": "Total volume of 100,000 kg",          "condition": "Lift 100,000 kg total" },
    "streak_7":       { "title": "Week Warrior",     "desc": "7-workout streak",                    "condition": "7 workouts in a row" },
    "streak_30":      { "title": "Iron Will",        "desc": "30-workout streak",                   "condition": "30 workouts in a row" },
    "first_pr":       { "title": "Record Breaker",   "desc": "Set your first 1RM record",           "condition": "Set a personal record" }
  }
}
```

**Русские эквиваленты** (`messages/ru.json`):
```json
"streak": {
  "label": "подряд",
  "best": "Лучший",
  "noWorkouts": "Тренировок пока нет"
},
"achievements": {
  "title": "Достижения",
  "unlocked": "разблокировано",
  "achievementsLink": "Достижения",
  "locked": "Заблокировано",
  "received": "получено",
  "items": {
    "first_workout":  { "title": "Первый шаг",         "desc": "Заверши первую тренировку",          "condition": "Заверши 1 тренировку" },
    "sessions_10":    { "title": "Начало пути",        "desc": "Заверши 10 тренировок",              "condition": "Заверши 10 тренировок" },
    "sessions_50":    { "title": "Полсотни",           "desc": "Заверши 50 тренировок",              "condition": "Заверши 50 тренировок" },
    "sessions_100":   { "title": "Сотня",              "desc": "Заверши 100 тренировок",             "condition": "Заверши 100 тренировок" },
    "tonnage_1000":   { "title": "Тонна поднята",      "desc": "Суммарный объём 1 000 кг",           "condition": "Подними 1 000 кг суммарно" },
    "tonnage_10000":  { "title": "10 тонн",            "desc": "Суммарный объём 10 000 кг",          "condition": "Подними 10 000 кг суммарно" },
    "tonnage_100000": { "title": "100 тонн",           "desc": "Суммарный объём 100 000 кг",         "condition": "Подними 100 000 кг суммарно" },
    "streak_7":       { "title": "Неделя силы",        "desc": "Серия из 7 тренировок подряд",       "condition": "7 тренировок подряд" },
    "streak_30":      { "title": "Несокрушимая воля", "desc": "Серия из 30 тренировок подряд",      "condition": "30 тренировок подряд" },
    "first_pr":       { "title": "Рекорд!",            "desc": "Установи свой первый рекорд 1ПМ",    "condition": "Установи личный рекорд" }
  }
}
```

---

## Файловая карта

| Файл | Действие |
|---|---|
| `supabase/migrations/20260513150000_achievements.sql` | Создать |
| `src/lib/types/models.ts` | Добавить `Achievement`, `AchievementCode`, `StreakInfo`, `DayActivity` |
| `src/lib/db/streak.ts` | Создать |
| `src/lib/db/achievements.ts` | Создать |
| `src/lib/services/streak.service.ts` | Создать |
| `src/lib/services/achievements.service.ts` | Создать |
| `src/components/dashboard/StreakCard.tsx` | Создать (включает `CalendarHeatmap`) |
| `src/components/AchievementToast.tsx` | Создать |
| `src/app/(app)/profile/achievements/page.tsx` | Создать |
| `src/components/profile/AchievementCard.tsx` | Создать |
| `src/app/(app)/dashboard/page.tsx` | Изменить — добавить streak fetch + `<StreakCard>` |
| `src/app/(app)/profile/page.tsx` | Изменить — добавить ссылку на /profile/achievements |
| `src/app/(app)/workout/[id]/actions.ts` | Изменить — вызвать `detectAndSaveAchievements` в `finishWorkoutAction` |
| `src/app/(app)/history/[sessionId]/page.tsx` | Изменить — рендерить `<AchievementToast>` при наличии `unlocked` в searchParams |
| `messages/en.json` | Добавить `streak.*` и `achievements.*` ключи |
| `messages/ru.json` | То же на русском |
