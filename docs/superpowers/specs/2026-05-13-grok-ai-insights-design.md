# Grok AI Insights — Design Spec

**Дата:** 2026-05-13  
**Статус:** Утверждено

---

## Цель

Добавить AI-карточку на дашборд, которая раз в день через Grok API анализирует данные тренировок и выдаёт: что тренировать сегодня, прогрессию по упражнениям, прогноз 1ПМ, предупреждение о перетренированности.

---

## Решения

| Параметр | Решение |
|---|---|
| AI провайдер | Grok (xAI) через OpenAI-совместимый SDK, `baseURL: https://api.x.ai/v1`, модель `grok-3-mini` |
| Частота | Раз в день — кэш в Supabase таблице `ai_insights` |
| UI | Развёрнутая карточка с 3 секциями: Сегодня / Прогрессия / Прогноз |
| Язык ответа | Определяется `locale` пользователя (ru/en) |
| Триггер | Первый визит дня на дашборд → skeleton + генерация; последующие визиты → готовые данные из БД |

---

## Секция 1: База данных и типы

### Миграция `supabase/migrations/20260513120000_ai_insights.sql`

```sql
create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  content jsonb not null,
  generated_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table ai_insights enable row level security;

create policy "users see own insights" on ai_insights
  for all using (auth.uid() = user_id);
```

### Новые типы в `src/lib/types/models.ts`

```ts
export interface AIInsightItem {
  type: 'today' | 'progression' | 'prediction' | 'warning'
  title: string
  body: string
  detail?: string
}

export interface AIInsights {
  items: AIInsightItem[]
  generated_at: string
}
```

---

## Секция 2: Grok Service

### Новая зависимость
```bash
npm install openai
```

### Переменная окружения
`.env.local` и `.env.local.example`:
```
XAI_API_KEY=your_key_here
```

### Файл `src/lib/services/grok.service.ts`

```ts
import OpenAI from 'openai'
import type { MuscleVolume, VolumeLandmark, ProgressionSuggestion, AIInsights, AIInsightItem } from '@/lib/types/models'

interface GrokContext {
  locale: 'ru' | 'en'
  profile: { age: number | null; training_since: string | null; goal: string | null }
  weekly_volumes: MuscleVolume[]
  volume_landmarks: VolumeLandmark[]
  recent_sessions: { date: string; volume_kg: number }[]
  top_prs: { exercise: string; e1rm: number }[]
  progression_opportunities: ProgressionSuggestion[]
}

export async function generateInsights(ctx: GrokContext): Promise<AIInsights> {
  const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  })

  const systemPrompt = `You are a personal fitness coach AI. Analyze the user's training data and return a JSON array of insight items.
Each item must have: type ("today"|"progression"|"prediction"|"warning"), title (short), body (1-2 sentences), optional detail.
Return 4-6 items: one "today", 1-2 "progression", one "prediction", optionally one "warning".
Respond in ${ctx.locale === 'ru' ? 'Russian' : 'English'}.
Return ONLY valid JSON array, no markdown, no explanation.`

  const userPrompt = JSON.stringify({
    weekly_volumes: ctx.weekly_volumes,
    volume_landmarks: ctx.volume_landmarks,
    recent_sessions: ctx.recent_sessions,
    top_prs: ctx.top_prs,
    progression_opportunities: ctx.progression_opportunities,
    profile: ctx.profile,
  })

  const response = await client.chat.completions.create({
    model: 'grok-3-mini',
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? '[]'
  const items: AIInsightItem[] = JSON.parse(raw)

  return {
    items,
    generated_at: new Date().toISOString(),
  }
}
```

**Параметры вызова:** temperature 0.3 (детерминированные советы), max_tokens 800 (достаточно для 4-6 элементов).

---

## Секция 3: DB функции, Server Action, Dashboard

### Файл `src/lib/db/ai-insights.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIInsights } from '@/lib/types/models'

export async function getTodayInsights(
  supabase: SupabaseClient,
  userId: string
): Promise<AIInsights | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('ai_insights')
    .select('content')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  return data?.content as AIInsights | null
}

export async function saveInsights(
  supabase: SupabaseClient,
  userId: string,
  insights: AIInsights
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  await supabase
    .from('ai_insights')
    .upsert({ user_id: userId, date: today, content: insights }, { onConflict: 'user_id,date' })
}
```

### Файл `src/app/(app)/dashboard/actions.ts`

```ts
'use server'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { generateInsights } from '@/lib/services/grok.service'
import { saveInsights } from '@/lib/db/ai-insights'
import { getWeeklyMuscleVolume, getVolumeLandmarks } from '@/lib/services/analytics.service'
import type { AIInsights } from '@/lib/types/models'

export async function refreshAIInsightsAction(): Promise<AIInsights> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const locale = (await getLocale()) as 'ru' | 'en'

  // Собираем контекст
  const [weeklyVolumes, profileResult, sessionsResult, prsResult] = await Promise.all([
    getWeeklyMuscleVolume(supabase, user.id),
    supabase.from('profiles').select('age, training_since').eq('id', user.id).single(),
    supabase
      .from('workout_sessions')
      .select('started_at, total_volume_kg')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(7),
    supabase
      .from('set_entries')
      .select('calculated_1rm, exercises(name, name_ru)')
      .eq('user_id', user.id)
      .not('calculated_1rm', 'is', null)
      .order('calculated_1rm', { ascending: false })
      .limit(5),
  ])

  const volumeLandmarks = getVolumeLandmarks(weeklyVolumes)
  const profile = profileResult.data
  const goal = typeof window === 'undefined'
    ? null
    : localStorage.getItem('gymlog_goal')

  const insights = await generateInsights({
    locale,
    profile: { age: profile?.age ?? null, training_since: profile?.training_since ?? null, goal },
    weekly_volumes: weeklyVolumes,
    volume_landmarks: volumeLandmarks,
    recent_sessions: (sessionsResult.data ?? []).map(s => ({
      date: s.started_at.slice(0, 10),
      volume_kg: s.total_volume_kg,
    })),
    top_prs: (prsResult.data ?? []).map(r => {
      const ex = r.exercises as { name: string; name_ru?: string | null } | null
      return {
        exercise: (locale === 'ru' ? ex?.name_ru ?? ex?.name : ex?.name) ?? '',
        e1rm: r.calculated_1rm ?? 0,
      }
    }),
    progression_opportunities: [],
  })

  await saveInsights(supabase, user.id, insights)
  return insights
}
```

**Примечание:** `localStorage` недоступен на сервере — `goal` будет `null` на сервере. Это приемлемо: Grok работает и без цели.

### Изменение `src/app/(app)/dashboard/page.tsx`

Добавить к `Promise.all`:
```ts
getTodayInsights(supabase, user.id)  // → initialInsights
```

Передать в JSX:
```tsx
<AIInsightsCard initialInsights={initialInsights} locale={locale} />
```

---

## Секция 4: UI Компонент

### Файл `src/components/dashboard/AIInsightsCard.tsx`

**Props:**
```ts
interface Props {
  initialInsights: AIInsights | null
  locale: string
}
```

**Состояния:**
- `loading` (`initialInsights === null` и идёт генерация): стеклянный skeleton + "AI анализирует данные..."
- `error`: карточка с предупреждением + кнопка "Повторить"
- `ready`: полная карточка

**Логика монтирования:**
```ts
useEffect(() => {
  if (!initialInsights) {
    // Запустить refreshAIInsightsAction() автоматически
    startTransition(async () => {
      const result = await refreshAIInsightsAction()
      setInsights(result)
    })
  }
}, [])
```

**Маппинг типов → цвета:**
```ts
// Метки через useTranslations('aiInsights.types') — ключи добавляются в en.json / ru.json
const SECTION_COLORS = {
  today:       { border: '#f59e0b', color: '#fbbf24' },
  progression: { border: '#a78bfa', color: '#c4b5fd' },
  prediction:  { border: '#4ade80', color: '#86efac' },
  warning:     { border: '#f87171', color: '#fca5a5' },
}
```

**Кнопка обновления `↻`:**
- `onClick`: `refreshAIInsightsAction()` + `setInsights(result)`
- Показывает spinner пока `isPending`
- Доступна только в состоянии `ready`

**Структура JSX:**
```
<Card>
  <CardHeader>
    ✦ AI ТРЕНЕР  |  обновлено HH:MM  |  ↻ кнопка
  </CardHeader>
  <CardContent>
    {items.map(item => (
      <div border-left={SECTION_STYLE[item.type].border}>
        <label>{SECTION_STYLE[item.type].label}</label>
        <title>{item.title}</title>
        <body>{item.body}</body>
        {item.detail && <detail>{item.detail}</detail>}
      </div>
    ))}
  </CardContent>
</Card>
```

---

## Файловая карта

| Файл | Действие |
|---|---|
| `supabase/migrations/20260513120000_ai_insights.sql` | Создать |
| `src/lib/types/models.ts` | Добавить `AIInsightItem`, `AIInsights` |
| `src/lib/db/ai-insights.ts` | Создать |
| `src/lib/services/grok.service.ts` | Создать |
| `src/app/(app)/dashboard/actions.ts` | Создать |
| `src/components/dashboard/AIInsightsCard.tsx` | Создать |
| `src/app/(app)/dashboard/page.tsx` | Добавить `getTodayInsights` + `<AIInsightsCard>` |
| `messages/en.json` | Добавить `aiInsights.*` ключи |
| `messages/ru.json` | Добавить `aiInsights.*` ключи |
| `.env.local.example` | Добавить `XAI_API_KEY` |
| `package.json` | `npm install openai` |
