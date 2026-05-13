# Grok AI Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить AI-карточку на дашборд, которая раз в день через Grok API выдаёт персональные рекомендации: что тренировать, прогрессию по упражнениям, прогноз 1ПМ, предупреждение о перетренированности.

**Architecture:** Server Action собирает контекст (недельные объёмы, PRs, история сессий, профиль) и вызывает Grok API через OpenAI-совместимый SDK. Результат кэшируется в Supabase таблице `ai_insights` (одна запись на пользователя в день). Клиентский компонент `AIInsightsCard` запрашивает данные при монтировании если кэша нет, иначе показывает готовое.

**Tech Stack:** Next.js 16 App Router, Supabase, openai npm package (xAI Grok), next-intl v4, Tailwind CSS

---

## Файловая карта

| Файл | Действие |
|---|---|
| `messages/en.json` | Добавить `aiInsights.*` ключи |
| `messages/ru.json` | Добавить `aiInsights.*` ключи |
| `.env.local.example` | Добавить `XAI_API_KEY` |
| `supabase/migrations/20260513120000_ai_insights.sql` | Создать |
| `src/lib/types/models.ts` | Добавить `AIInsightItem`, `AIInsights` |
| `src/lib/db/ai-insights.ts` | Создать |
| `src/lib/services/grok.service.ts` | Создать |
| `src/app/(app)/dashboard/actions.ts` | Создать |
| `src/components/dashboard/AIInsightsCard.tsx` | Создать |
| `src/app/(app)/dashboard/page.tsx` | Изменить — добавить insights fetch + компонент |

---

## Task 1: i18n ключи и env var

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`
- Modify: `.env.local.example`

- [ ] **Шаг 1: Добавить ключи в `messages/en.json`**

После секции `"workout"` добавить новую секцию:

```json
"aiInsights": {
  "title": "AI Coach",
  "updating": "AI is analyzing your training data...",
  "updated": "updated",
  "refresh": "Refresh",
  "error": "Failed to load AI recommendations",
  "retry": "Try again",
  "types": {
    "today": "TODAY",
    "progression": "PROGRESSION",
    "prediction": "1RM FORECAST",
    "warning": "WARNING"
  }
}
```

- [ ] **Шаг 2: Добавить ключи в `messages/ru.json`**

```json
"aiInsights": {
  "title": "AI Тренер",
  "updating": "AI анализирует данные тренировок...",
  "updated": "обновлено",
  "refresh": "Обновить",
  "error": "Не удалось загрузить рекомендации",
  "retry": "Повторить",
  "types": {
    "today": "СЕГОДНЯ",
    "progression": "ПРОГРЕССИЯ",
    "prediction": "ПРОГНОЗ 1ПМ",
    "warning": "ВНИМАНИЕ"
  }
}
```

- [ ] **Шаг 3: Добавить `XAI_API_KEY` в `.env.local.example`**

Найти конец файла и добавить:

```
# Grok AI (xAI) — get key from https://console.x.ai
# Used for daily AI training recommendations
XAI_API_KEY=xai-your-key-here
```

- [ ] **Шаг 4: Проверить JSON валидность**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en OK')"
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); console.log('ru OK')"
```

Ожидаем: `en OK` и `ru OK`.

- [ ] **Шаг 5: Commit**

```bash
git add messages/en.json messages/ru.json .env.local.example
git commit -m "feat: add aiInsights i18n keys and XAI_API_KEY env placeholder"
```

---

## Task 2: Миграция БД + типы

**Files:**
- Create: `supabase/migrations/20260513120000_ai_insights.sql`
- Modify: `src/lib/types/models.ts`

- [ ] **Шаг 1: Создать миграцию `supabase/migrations/20260513120000_ai_insights.sql`**

```sql
-- AI insights cache: one row per user per day
create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  content jsonb not null,
  generated_at timestamptz not null default now(),
  unique(user_id, date)
);

alter table ai_insights enable row level security;

create policy "users see own insights"
  on ai_insights
  for all
  using (auth.uid() = user_id);

create index ai_insights_user_date on ai_insights(user_id, date desc);
```

- [ ] **Шаг 2: Добавить типы в `src/lib/types/models.ts`**

В конец файла (после `VolumeLandmark`) добавить:

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

- [ ] **Шаг 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Ожидаем: 0 ошибок.

- [ ] **Шаг 4: Commit**

```bash
git add supabase/migrations/20260513120000_ai_insights.sql src/lib/types/models.ts
git commit -m "feat: add ai_insights table migration and AIInsights types"
```

---

## Task 3: DB функции

**Files:**
- Create: `src/lib/db/ai-insights.ts`

- [ ] **Шаг 1: Создать `src/lib/db/ai-insights.ts`**

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
    .maybeSingle()
  return (data?.content as AIInsights) ?? null
}

export async function saveInsights(
  supabase: SupabaseClient,
  userId: string,
  insights: AIInsights
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('ai_insights')
    .upsert(
      { user_id: userId, date: today, content: insights, generated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
  if (error) throw new Error(error.message)
}
```

- [ ] **Шаг 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/lib/db/ai-insights.ts
git commit -m "feat: add ai_insights DB functions (get/save)"
```

---

## Task 4: Установить openai + Grok сервис

**Files:**
- Modify: `package.json` (npm install)
- Create: `src/lib/services/grok.service.ts`

- [ ] **Шаг 1: Установить openai SDK**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npm install openai
```

Ожидаем: `openai` появляется в `package.json` → `dependencies`.

- [ ] **Шаг 2: Создать `src/lib/services/grok.service.ts`**

```ts
import OpenAI from 'openai'
import type {
  MuscleVolume,
  VolumeLandmark,
  ProgressionSuggestion,
  AIInsights,
  AIInsightItem,
} from '@/lib/types/models'

export interface GrokContext {
  locale: 'ru' | 'en'
  profile: {
    age: number | null
    training_since: string | null
    goal: string | null
  }
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

  const systemPrompt = `You are a personal fitness coach AI for a workout tracking app.
Analyze the user's training data and return a JSON array of insight objects.

Each object must have:
- type: "today" | "progression" | "prediction" | "warning"
- title: short headline (max 6 words)
- body: 1-2 sentences of advice or information
- detail: optional short string with numbers/specifics

Return 4-6 items: exactly one "today", one or two "progression", one "prediction", optionally one "warning" (only if overtraining signs are present).
Respond entirely in ${ctx.locale === 'ru' ? 'Russian' : 'English'}.
Return ONLY a valid JSON array. No markdown. No explanation outside the JSON.`

  const userPrompt = JSON.stringify({
    profile: ctx.profile,
    weekly_volumes: ctx.weekly_volumes,
    volume_landmarks: ctx.volume_landmarks,
    recent_sessions: ctx.recent_sessions,
    top_prs: ctx.top_prs,
    progression_opportunities: ctx.progression_opportunities,
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

  let items: AIInsightItem[]
  try {
    items = JSON.parse(raw)
    if (!Array.isArray(items)) throw new Error('not an array')
  } catch {
    throw new Error(`Grok returned invalid JSON: ${raw.slice(0, 200)}`)
  }

  return {
    items,
    generated_at: new Date().toISOString(),
  }
}
```

- [ ] **Шаг 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 4: Commit**

```bash
git add src/lib/services/grok.service.ts package.json package-lock.json
git commit -m "feat: add Grok AI service with OpenAI-compatible client"
```

---

## Task 5: Server Action

**Files:**
- Create: `src/app/(app)/dashboard/actions.ts`

- [ ] **Шаг 1: Создать `src/app/(app)/dashboard/actions.ts`**

```ts
'use server'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { generateInsights } from '@/lib/services/grok.service'
import { saveInsights } from '@/lib/db/ai-insights'
import { getWeeklyMuscleVolume, getVolumeLandmarks } from '@/lib/services/analytics.service'
import type { AIInsights } from '@/lib/types/models'

export async function refreshAIInsightsAction(goal?: string): Promise<AIInsights> {
  const { user } = await verifySession()
  const supabase = await createClient()
  const rawLocale = await getLocale()
  const locale = rawLocale === 'ru' ? 'ru' : 'en'

  const [weeklyVolumes, profileResult, sessionsResult, prsResult] = await Promise.all([
    getWeeklyMuscleVolume(supabase, user.id),
    supabase
      .from('profiles')
      .select('age, training_since')
      .eq('id', user.id)
      .single(),
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

  const insights = await generateInsights({
    locale,
    profile: {
      age: profileResult.data?.age ?? null,
      training_since: profileResult.data?.training_since ?? null,
      goal: goal ?? null,
    },
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

- [ ] **Шаг 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/app/\(app\)/dashboard/actions.ts
git commit -m "feat: add refreshAIInsightsAction server action"
```

---

## Task 6: AIInsightsCard компонент

**Files:**
- Create: `src/components/dashboard/AIInsightsCard.tsx`

- [ ] **Шаг 1: Создать `src/components/dashboard/AIInsightsCard.tsx`**

```tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, Sparkles, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { refreshAIInsightsAction } from '@/app/(app)/dashboard/actions'
import type { AIInsights, AIInsightItem } from '@/lib/types/models'

const SECTION_COLORS: Record<AIInsightItem['type'], { border: string; color: string }> = {
  today:       { border: '#f59e0b', color: '#fbbf24' },
  progression: { border: '#a78bfa', color: '#c4b5fd' },
  prediction:  { border: '#4ade80', color: '#86efac' },
  warning:     { border: '#f87171', color: '#fca5a5' },
}

interface Props {
  initialInsights: AIInsights | null
}

export function AIInsightsCard({ initialInsights }: Props) {
  const t = useTranslations('aiInsights')
  const [insights, setInsights] = useState<AIInsights | null>(initialInsights)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function runGeneration() {
    const goal = typeof window !== 'undefined'
      ? localStorage.getItem('gymlog_goal') ?? undefined
      : undefined

    setError(null)
    startTransition(async () => {
      try {
        const result = await refreshAIInsightsAction(goal)
        setInsights(result)
      } catch (e) {
        setError(t('error'))
      }
    })
  }

  useEffect(() => {
    if (!initialInsights) {
      runGeneration()
    }
  }, [])

  const updatedTime = insights?.generated_at
    ? new Date(insights.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[300ms]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #8b5cf6)' }}
            >
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="uppercase tracking-wider font-bold text-xs">{t('title')}</span>
          </div>
          <div className="flex items-center gap-2">
            {updatedTime && !isPending && (
              <span className="text-[9px] text-zinc-600 font-mono">
                {t('updated')} {updatedTime}
              </span>
            )}
            {insights && (
              <button
                onClick={runGeneration}
                disabled={isPending}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors disabled:opacity-40"
                title={t('refresh')}
              >
                <RefreshCw className={`h-3 w-3 text-zinc-500 ${isPending ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Loading state */}
        {isPending && !insights && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 animate-pulse">{t('updating')}</p>
            {[0, 1, 2].map(i => (
              <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isPending && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button
              onClick={runGeneration}
              className="text-[10px] text-red-400 hover:text-red-300 underline"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* Insights */}
        {insights && !error && (
          <div className="space-y-2.5">
            {insights.items.map((item, i) => {
              const style = SECTION_COLORS[item.type] ?? SECTION_COLORS.today
              return (
                <div
                  key={i}
                  className="pl-3 space-y-0.5"
                  style={{ borderLeft: `2px solid ${style.border}` }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: style.color }}
                  >
                    {t(`types.${item.type}`)}
                  </p>
                  <p className="text-sm font-semibold text-white leading-tight">{item.title}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.body}</p>
                  {item.detail && (
                    <p className="text-[10px] font-mono text-zinc-500">{item.detail}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Refresh spinner overlay (while refreshing existing insights) */}
        {isPending && insights && (
          <p className="text-[10px] text-zinc-600 text-center animate-pulse">{t('updating')}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Шаг 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/dashboard/AIInsightsCard.tsx
git commit -m "feat: add AIInsightsCard component with loading/error/ready states"
```

---

## Task 7: Интеграция в Dashboard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Шаг 1: Добавить импорты в `dashboard/page.tsx`**

В начало файла добавить:
```ts
import { getTodayInsights } from '@/lib/db/ai-insights'
import { AIInsightsCard } from '@/components/dashboard/AIInsightsCard'
```

- [ ] **Шаг 2: Добавить `getTodayInsights` к параллельным запросам**

Найти `const [sessionsResult, profileResult, weekResult, prResult] = await Promise.all([` и заменить на:

```ts
const [sessionsResult, profileResult, weekResult, prResult, initialInsights] = await Promise.all([
  supabase
    .from('workout_sessions')
    .select('id, started_at, total_volume_kg, finished_at')
    .eq('user_id', user.id)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(3),
  supabase
    .from('profiles')
    .select('training_schedule')
    .eq('id', user.id)
    .single(),
  supabase
    .from('workout_sessions')
    .select('total_volume_kg')
    .eq('user_id', user.id)
    .not('finished_at', 'is', null)
    .gte('started_at', since7days.toISOString()),
  supabase
    .from('set_entries')
    .select('calculated_1rm')
    .eq('user_id', user.id)
    .not('calculated_1rm', 'is', null)
    .order('calculated_1rm', { ascending: false })
    .limit(1)
    .maybeSingle(),
  getTodayInsights(supabase, user.id),
])
```

- [ ] **Шаг 3: Добавить `<AIInsightsCard>` в JSX**

Найти блок `<WeeklyStats .../>` и добавить `<AIInsightsCard>` после него:

```tsx
<WeeklyStats
  tonnage={weekTonnage}
  sessions={weekSessions}
  bestE1rm={bestE1rm}
  labels={{
    tonnage: t('week.tonnage'),
    sessions: t('week.sessions'),
    bestE1rm: t('week.bestE1rm'),
  }}
/>

<AIInsightsCard initialInsights={initialInsights} />
```

- [ ] **Шаг 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 5: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: integrate AIInsightsCard into dashboard with daily cache check"
```

---

## Task 8: Финальная проверка и push

- [ ] **Шаг 1: Полный TypeScript check**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npx tsc --noEmit 2>&1
```

Ожидаем: 0 ошибок.

- [ ] **Шаг 2: Проверить что `XAI_API_KEY` не попал в git**

```bash
grep -r "XAI_API_KEY" .env.local 2>/dev/null && echo "CHECK: .env.local should NOT be committed"
grep "XAI_API_KEY" .gitignore || echo "NOTE: .env* is in .gitignore already"
```

В проекте `.gitignore` уже содержит `.env*` — `.env.local` не будет закоммичен.

- [ ] **Шаг 3: Добавить `XAI_API_KEY` в `.env.local` для локальной разработки**

```bash
echo "XAI_API_KEY=xai-ваш-реальный-ключ" >> .env.local
```

> **Замени `xai-ваш-реальный-ключ`** на настоящий ключ с https://console.x.ai

- [ ] **Шаг 4: Push**

```bash
git push origin main
```

---

## Чеклист готовности

- [ ] i18n ключи `aiInsights.*` в обоих файлах
- [ ] Таблица `ai_insights` создана в миграции с RLS
- [ ] Типы `AIInsightItem`, `AIInsights` в `models.ts`
- [ ] `getTodayInsights` и `saveInsights` в `src/lib/db/ai-insights.ts`
- [ ] `generateInsights` в `grok.service.ts` — парсит JSON, бросает при ошибке
- [ ] `refreshAIInsightsAction` — собирает контекст, вызывает Grok, сохраняет
- [ ] `AIInsightsCard` — три состояния: loading/error/ready, кнопка обновления
- [ ] Dashboard: `getTodayInsights` в `Promise.all`, `<AIInsightsCard>` в JSX
- [ ] TypeScript: 0 ошибок
- [ ] `XAI_API_KEY` в `.env.local`, НЕ в git
