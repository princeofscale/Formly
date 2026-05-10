# UI Redesign + i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Редизайн в Bold-спортивном стиле (оранжевый акцент, угловатый, крупная типографика) + локализация RU/EN через next-intl + новые компоненты на страницах Auth, Dashboard, Profile.

**Architecture:** Итеративный подход: сначала дизайн-система (CSS переменные), затем next-intl без изменения URL (cookie-based locale), затем страницы по одной. Нет новых маршрутов — только переработка существующих.

**Tech Stack:** Next.js 16.2.6, next-intl 3.x, Tailwind v4, shadcn/ui, Supabase SSR

---

## Карта файлов

**Создать:**
```
messages/ru.json
messages/en.json
src/i18n/request.ts
src/components/auth/LocaleSwitcher.tsx
src/components/profile/ProfileAvatar.tsx
src/components/profile/LanguageSelector.tsx
src/components/dashboard/WeeklyStats.tsx
supabase/migrations/20260510000001_add_locale.sql
```

**Изменить:**
```
next.config.ts                          — добавить withNextIntl плагин
src/app/globals.css                     — amber primary, меньший radius
src/app/layout.tsx                      — добавить NextIntlClientProvider, кириллица в шрифте
src/app/(auth)/layout.tsx               — сплит-экран
src/app/(auth)/login/page.tsx           — i18n + новый дизайн
src/app/(auth)/register/page.tsx        — i18n + новый дизайн
src/app/(app)/dashboard/page.tsx        — WeeklyStats + теги упражнений
src/app/(app)/profile/page.tsx          — ProfileAvatar + LanguageSelector
src/app/(app)/profile/actions.ts        — сохранение locale
src/lib/types/models.ts                 — поле locale в Profile
```

---

## Task 1: Дизайн-система — CSS переменные

**Files:**
- Modify: `src/app/globals.css` (строки 86–118, блок `.dark`)

- [ ] **Шаг 1: Обновить .dark в globals.css**

Найти блок `.dark { ... }` и заменить строки `--primary` и `--primary-foreground`, а также добавить уменьшенный `--radius` в `:root`:

В блоке `.dark` заменить:
```css
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
```
На:
```css
  --primary: oklch(0.795 0.184 86.047);     /* amber-500 */
  --primary-foreground: oklch(0.1 0 0);      /* near black */
```

В блоке `:root` заменить:
```css
  --radius: 0.625rem;
```
На:
```css
  --radius: 0.25rem;
```

- [ ] **Шаг 2: Запустить сборку и проверить**

```bash
cd TrainingAR && npm run build 2>&1 | tail -10
```
Ожидание: успешная сборка без TypeScript ошибок.

- [ ] **Шаг 3: Запустить тесты**

```bash
npm test
```
Ожидание: 35 тестов проходят.

- [ ] **Шаг 4: Коммит**

```bash
git add src/app/globals.css
git commit -m "feat: amber primary accent + reduced border radius for sport design"
```

---

## Task 2: Установка и настройка next-intl

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/layout.tsx`
- Create: `src/i18n/request.ts`

- [ ] **Шаг 1: Установить next-intl**

```bash
npm install next-intl
```
Ожидание: пакет добавлен без ошибок.

- [ ] **Шаг 2: Создать src/i18n/request.ts**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('locale')?.value ?? 'ru') as 'ru' | 'en'

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Шаг 3: Обновить next.config.ts**

```typescript
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {}

export default withNextIntl(nextConfig)
```

- [ ] **Шаг 4: Обновить src/app/layout.tsx**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  title: 'GymLog',
  description: 'Track your training progress',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 min-h-screen`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Шаг 5: Запустить сборку**

```bash
npm run build 2>&1 | tail -15
```
Ожидание: сборка успешна (может быть warning о missing messages — это нормально до Task 3).

- [ ] **Шаг 6: Коммит**

```bash
git add next.config.ts src/i18n/request.ts src/app/layout.tsx package.json package-lock.json
git commit -m "feat: setup next-intl with cookie-based locale (no URL changes)"
```

---

## Task 3: Файлы переводов

**Files:**
- Create: `messages/ru.json`
- Create: `messages/en.json`

- [ ] **Шаг 1: Создать messages/ru.json**

```json
{
  "auth": {
    "slogan": "Каждый подход приближает тебя к цели",
    "features": {
      "log": "Логируй тренировки за секунды",
      "track": "Отслеживай личные рекорды",
      "ai": "AI-рекомендации по прогрессии"
    },
    "login": {
      "title": "ВОЙТИ",
      "subtitle": "Рады снова видеть тебя",
      "submit": "ВОЙТИ",
      "submitting": "Входим...",
      "noAccount": "Нет аккаунта?",
      "registerLink": "Зарегистрироваться"
    },
    "register": {
      "title": "РЕГИСТРАЦИЯ",
      "subtitle": "Начни отслеживать прогресс",
      "submit": "СОЗДАТЬ АККАУНТ",
      "submitting": "Создаём...",
      "hasAccount": "Уже есть аккаунт?",
      "loginLink": "Войти"
    },
    "fields": {
      "email": "Email",
      "password": "Пароль",
      "passwordPlaceholder": "Мин. 8 символов"
    }
  },
  "nav": {
    "home": "Главная",
    "history": "История",
    "library": "Библиотека",
    "analytics": "Аналитика",
    "profile": "Профиль",
    "signOut": "Выйти"
  },
  "dashboard": {
    "title": "Дашборд",
    "startWorkout": "ТРЕНИРОВКА",
    "week": {
      "tonnage": "кг тоннаж",
      "sessions": "тренировок",
      "bestE1rm": "лучший e1ПМ"
    },
    "today": {
      "trainingDay": "День тренировки",
      "restDay": "День отдыха",
      "next": "Следующая",
      "days": {
        "1": "Пн", "2": "Вт", "3": "Ср", "4": "Чт", "5": "Пт", "6": "Сб", "7": "Вс"
      },
      "noSchedule": "Расписание не задано"
    },
    "recentTraining": "Последние тренировки",
    "noWorkouts": "Пока нет тренировок. Начни первую!",
    "muscleActivity": "Активность мышц (7 дней)",
    "logWorkoutsHeatmap": "Залогируй тренировки чтобы увидеть хитмап."
  },
  "profile": {
    "title": "ПРОФИЛЬ",
    "stats": {
      "bmi": "ИМТ",
      "trainingAge": "Стаж",
      "location": "Локация"
    },
    "form": {
      "editProfile": "Редактировать профиль",
      "weight": "Вес (кг)",
      "height": "Рост (см)",
      "age": "Возраст",
      "trainingSince": "Тренируюсь с",
      "location": "Локация",
      "locationSelect": "Выбрать...",
      "locationGym": "Зал",
      "locationHome": "Дома",
      "locationBoth": "Оба",
      "schedule": "Дни тренировок",
      "save": "СОХРАНИТЬ"
    },
    "language": "Язык интерфейса",
    "signOut": "Выйти",
    "deleteAccount": "Удалить аккаунт",
    "days": {
      "1": "ПН", "2": "ВТ", "3": "СР", "4": "ЧТ", "5": "ПТ", "6": "СБ", "7": "ВС"
    },
    "daysFull": {
      "1": "Понедельник", "2": "Вторник", "3": "Среда",
      "4": "Четверг", "5": "Пятница", "6": "Суббота", "7": "Воскресенье"
    }
  }
}
```

- [ ] **Шаг 2: Создать messages/en.json**

```json
{
  "auth": {
    "slogan": "Every rep gets you closer",
    "features": {
      "log": "Log workouts in seconds",
      "track": "Track personal records",
      "ai": "AI-powered progression tips"
    },
    "login": {
      "title": "SIGN IN",
      "subtitle": "Welcome back",
      "submit": "SIGN IN",
      "submitting": "Signing in...",
      "noAccount": "No account?",
      "registerLink": "Register"
    },
    "register": {
      "title": "REGISTER",
      "subtitle": "Start tracking your progress",
      "submit": "CREATE ACCOUNT",
      "submitting": "Creating...",
      "hasAccount": "Already have an account?",
      "loginLink": "Sign in"
    },
    "fields": {
      "email": "Email",
      "password": "Password",
      "passwordPlaceholder": "Min. 8 characters"
    }
  },
  "nav": {
    "home": "Home",
    "history": "History",
    "library": "Library",
    "analytics": "Analytics",
    "profile": "Profile",
    "signOut": "Sign out"
  },
  "dashboard": {
    "title": "Dashboard",
    "startWorkout": "WORKOUT",
    "week": {
      "tonnage": "kg tonnage",
      "sessions": "sessions",
      "bestE1rm": "best e1RM"
    },
    "today": {
      "trainingDay": "Training Day",
      "restDay": "Rest Day",
      "next": "Next",
      "days": {
        "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun"
      },
      "noSchedule": "No schedule set"
    },
    "recentTraining": "Recent Training",
    "noWorkouts": "No workouts yet. Start your first session!",
    "muscleActivity": "Muscle Activity (7 days)",
    "logWorkoutsHeatmap": "Log workouts to see your muscle heatmap."
  },
  "profile": {
    "title": "PROFILE",
    "stats": {
      "bmi": "BMI",
      "trainingAge": "Training age",
      "location": "Location"
    },
    "form": {
      "editProfile": "Edit Profile",
      "weight": "Weight (kg)",
      "height": "Height (cm)",
      "age": "Age",
      "trainingSince": "Training since",
      "location": "Location",
      "locationSelect": "Select...",
      "locationGym": "Gym",
      "locationHome": "Home",
      "locationBoth": "Both",
      "schedule": "Training days",
      "save": "SAVE"
    },
    "language": "Interface language",
    "signOut": "Sign out",
    "deleteAccount": "Delete account",
    "days": {
      "1": "MON", "2": "TUE", "3": "WED", "4": "THU", "5": "FRI", "6": "SAT", "7": "SUN"
    },
    "daysFull": {
      "1": "Monday", "2": "Tuesday", "3": "Wednesday",
      "4": "Thursday", "5": "Friday", "6": "Saturday", "7": "Sunday"
    }
  }
}
```

- [ ] **Шаг 3: Запустить сборку**

```bash
npm run build 2>&1 | tail -10
```
Ожидание: успешная сборка.

- [ ] **Шаг 4: Коммит**

```bash
git add messages/
git commit -m "feat: add RU/EN translation files"
```

---

## Task 4: LocaleSwitcher компонент

**Files:**
- Create: `src/components/auth/LocaleSwitcher.tsx`

- [ ] **Шаг 1: Создать LocaleSwitcher.tsx**

```tsx
// src/components/auth/LocaleSwitcher.tsx
'use client'

interface Props {
  current: string
}

export function LocaleSwitcher({ current }: Props) {
  function setLocale(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  return (
    <div className="flex gap-1 rounded-sm overflow-hidden border border-zinc-700">
      {(['ru', 'en'] as const).map(loc => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
            current === loc
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Шаг 2: Коммит**

```bash
git add src/components/auth/LocaleSwitcher.tsx
git commit -m "feat: LocaleSwitcher component (cookie-based, reloads page)"
```

---

## Task 5: Auth Layout — сплит-экран

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Шаг 1: Переписать src/app/(auth)/layout.tsx**

```tsx
// src/app/(auth)/layout.tsx
import { Dumbbell, TrendingUp, Brain } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { LocaleSwitcher } from '@/components/auth/LocaleSwitcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const t = await getTranslations('auth')

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Левая панель — только на md+ */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-zinc-900 to-black border-r border-amber-500/20">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-amber-500" />
          <span className="font-black text-xl tracking-wider">GYMLOG</span>
        </div>

        <div className="space-y-10">
          <p className="text-4xl font-black leading-tight">
            {t('slogan')}
          </p>
          <div className="space-y-5">
            <div className="flex items-center gap-3 text-zinc-400">
              <Dumbbell className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-sm">{t('features.log')}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <TrendingUp className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-sm">{t('features.track')}</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400">
              <Brain className="h-5 w-5 text-amber-500 shrink-0" />
              <span className="text-sm">{t('features.ai')}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-700">© 2026 GymLog</p>
      </div>

      {/* Правая панель — форма */}
      <div className="flex flex-col min-h-screen">
        <div className="flex justify-end p-4">
          <LocaleSwitcher current={locale} />
        </div>
        <div className="flex-1 flex items-center justify-center px-8 pb-12">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Шаг 2: Переписать src/app/(auth)/login/page.tsx**

```tsx
// src/app/(auth)/login/page.tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction } from './actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)
  const t = useTranslations('auth.login')
  const tf = useTranslations('auth.fields')

  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-wider">{t('title')}</h1>
        <p className="text-zinc-400 mt-2 text-sm">{t('subtitle')}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{tf('email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500 h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tf('password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500 h-11"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}
        <Button
          type="submit"
          className="w-full h-12 uppercase tracking-wider font-bold text-sm"
          disabled={pending}
        >
          {pending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        {t('noAccount')}{' '}
        <Link href="/register" className="text-amber-500 hover:text-amber-400 font-medium">
          {t('registerLink')}
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Шаг 3: Переписать src/app/(auth)/register/page.tsx**

```tsx
// src/app/(auth)/register/page.tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerAction } from './actions'

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, null)
  const t = useTranslations('auth.register')
  const tf = useTranslations('auth.fields')

  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-wider">{t('title')}</h1>
        <p className="text-zinc-400 mt-2 text-sm">{t('subtitle')}</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{tf('email')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            className="bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500 h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tf('password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={tf('passwordPlaceholder')}
            required
            className="bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500 h-11"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}
        <Button
          type="submit"
          className="w-full h-12 uppercase tracking-wider font-bold text-sm"
          disabled={pending}
        >
          {pending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        {t('hasAccount')}{' '}
        <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Шаг 4: Запустить сборку**

```bash
npm run build 2>&1 | tail -15
```
Ожидание: успешная сборка, все 12 маршрутов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/app/(auth)/
git commit -m "feat: auth pages — split screen layout, i18n, amber CTA"
```

---

## Task 6: Dashboard — WeeklyStats + обновление страницы

**Files:**
- Create: `src/components/dashboard/WeeklyStats.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/dashboard/ScheduleStatus.tsx`

- [ ] **Шаг 1: Создать src/components/dashboard/WeeklyStats.tsx**

```tsx
// src/components/dashboard/WeeklyStats.tsx
interface Props {
  tonnage: number
  sessions: number
  bestE1rm: number | null
  labels: { tonnage: string; sessions: string; bestE1rm: string }
}

export function WeeklyStats({ tonnage, sessions, bestE1rm, labels }: Props) {
  return (
    <div className="grid grid-cols-3 rounded-sm overflow-hidden border border-zinc-800">
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-zinc-900">
        <span className="font-mono text-2xl font-bold text-amber-500">
          {tonnage.toFixed(0)}
        </span>
        <span className="text-xs text-zinc-500 mt-1 text-center">{labels.tonnage}</span>
      </div>
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-zinc-900 border-x border-zinc-800">
        <span className="font-mono text-2xl font-bold text-amber-500">{sessions}</span>
        <span className="text-xs text-zinc-500 mt-1 text-center">{labels.sessions}</span>
      </div>
      <div className="flex flex-col items-center justify-center py-4 px-2 bg-zinc-900">
        <span className="font-mono text-2xl font-bold text-amber-500">
          {bestE1rm ? `${bestE1rm.toFixed(0)}` : '—'}
        </span>
        <span className="text-xs text-zinc-500 mt-1 text-center">{labels.bestE1rm}</span>
      </div>
    </div>
  )
}
```

- [ ] **Шаг 2: Обновить src/components/dashboard/ScheduleStatus.tsx**

```tsx
// src/components/dashboard/ScheduleStatus.tsx
import { Dumbbell, Moon } from 'lucide-react'

interface Props {
  schedule: number[]
  labels: {
    trainingDay: string
    restDay: string
    next: string
    noSchedule: string
    days: Record<string, string>
  }
}

export function ScheduleStatus({ schedule, labels }: Props) {
  const todayISO = new Date().getDay() || 7
  const isGymDay = schedule.includes(todayISO)

  // Find next training day
  let nextDayLabel = ''
  if (!isGymDay && schedule.length > 0) {
    const sorted = [...schedule].sort((a, b) => a - b)
    const next = sorted.find(d => d > todayISO) ?? sorted[0]
    nextDayLabel = `${labels.next}: ${labels.days[String(next)]}`
  }

  return (
    <div className={`flex items-center gap-3 p-4 rounded-sm border-l-4 ${
      isGymDay
        ? 'bg-green-900/20 border-l-green-500 border border-green-900/50'
        : 'bg-zinc-900 border-l-zinc-600 border border-zinc-800'
    }`}>
      {isGymDay
        ? <Dumbbell className="h-5 w-5 text-green-400 shrink-0" />
        : <Moon className="h-5 w-5 text-zinc-500 shrink-0" />
      }
      <div>
        <p className="font-bold text-sm uppercase tracking-wide">
          {isGymDay ? labels.trainingDay : labels.restDay}
        </p>
        {!isGymDay && (
          <p className="text-xs text-zinc-500 mt-0.5">
            {schedule.length === 0 ? labels.noSchedule : nextDayLabel}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Шаг 3: Переписать src/app/(app)/dashboard/page.tsx**

```tsx
// src/app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dumbbell, Plus } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ScheduleStatus } from '@/components/dashboard/ScheduleStatus'
import { MuscleHeatmap } from '@/components/dashboard/MuscleHeatmap'
import { WeeklyStats } from '@/components/dashboard/WeeklyStats'
import { getWeeklyMuscleVolume } from '@/lib/services/analytics.service'

export default async function DashboardPage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('dashboard')

  const since7days = new Date()
  since7days.setDate(since7days.getDate() - 7)

  const [sessionsResult, profileResult, weekResult, prResult] = await Promise.all([
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
  ])

  const sessions = sessionsResult.data ?? []
  const schedule: number[] = profileResult.data?.training_schedule ?? []
  const weekTonnage = (weekResult.data ?? []).reduce((s, r) => s + (r.total_volume_kg ?? 0), 0)
  const weekSessions = (weekResult.data ?? []).length
  const bestE1rm = prResult.data?.calculated_1rm ?? null
  const muscleVolumes = await getWeeklyMuscleVolume(supabase, user.id, 1)

  // Get exercise names for each session (first 3 distinct per session)
  const sessionIds = sessions.map(s => s.id)
  const exerciseTagsMap: Record<string, string[]> = {}
  if (sessionIds.length > 0) {
    const { data: setsData } = await supabase
      .from('set_entries')
      .select('session_id, exercises(name)')
      .in('session_id', sessionIds)
    
    for (const row of setsData ?? []) {
      const name = (row.exercises as { name: string } | null)?.name
      if (!name) continue
      if (!exerciseTagsMap[row.session_id]) exerciseTagsMap[row.session_id] = []
      if (!exerciseTagsMap[row.session_id].includes(name) && exerciseTagsMap[row.session_id].length < 3) {
        exerciseTagsMap[row.session_id].push(name)
      }
    }
  }

  const dayLabels = {
    '1': t('today.days.1'), '2': t('today.days.2'), '3': t('today.days.3'),
    '4': t('today.days.4'), '5': t('today.days.5'), '6': t('today.days.6'), '7': t('today.days.7'),
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black uppercase tracking-wider">{t('title')}</h1>
        <Link
          href="/workout/new"
          className={buttonVariants({ className: 'uppercase tracking-wider font-bold' })}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('startWorkout')}
        </Link>
      </div>

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

      <ScheduleStatus
        schedule={schedule}
        labels={{
          trainingDay: t('today.trainingDay'),
          restDay: t('today.restDay'),
          next: t('today.next'),
          noSchedule: t('today.noSchedule'),
          days: dayLabels,
        }}
      />

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold">
            <Dumbbell className="h-4 w-4 text-amber-500" />
            {t('recentTraining')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map(s => {
                const date = new Date(s.started_at)
                const tags = exerciseTagsMap[s.id] ?? []
                return (
                  <Link key={s.id} href={`/history/${s.id}`} className="block group">
                    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 group-hover:border-amber-500/30 transition-colors">
                      <div>
                        <p className="font-mono text-sm font-bold">
                          {date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        {tags.length > 0 && (
                          <p className="text-xs text-zinc-500 mt-0.5">{tags.join(' · ')}</p>
                        )}
                      </div>
                      <span className="text-sm text-amber-500 font-mono font-bold">
                        {(s.total_volume_kg ?? 0).toFixed(0)} кг
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{t('noWorkouts')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider font-bold">
            {t('muscleActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MuscleHeatmap muscleVolumes={muscleVolumes} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Шаг 4: Запустить сборку**

```bash
npm run build 2>&1 | tail -15
```
Ожидание: успешная сборка.

- [ ] **Шаг 5: Коммит**

```bash
git add src/app/(app)/dashboard/page.tsx src/components/dashboard/WeeklyStats.tsx src/components/dashboard/ScheduleStatus.tsx
git commit -m "feat: dashboard redesign — weekly stats, session tags, i18n"
```

---

## Task 7: Profile — Avatar + LanguageSelector + locale save

**Files:**
- Create: `src/components/profile/ProfileAvatar.tsx`
- Create: `src/components/profile/LanguageSelector.tsx`
- Modify: `src/app/(app)/profile/page.tsx`
- Modify: `src/app/(app)/profile/actions.ts`
- Modify: `src/lib/types/models.ts`

- [ ] **Шаг 1: Создать src/components/profile/ProfileAvatar.tsx**

```tsx
// src/components/profile/ProfileAvatar.tsx
interface Props {
  email: string
}

export function ProfileAvatar({ email }: Props) {
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
        <span className="text-black font-black text-2xl">{initials}</span>
      </div>
      <p className="text-zinc-400 text-sm">{email}</p>
    </div>
  )
}
```

- [ ] **Шаг 2: Создать src/components/profile/LanguageSelector.tsx**

```tsx
// src/components/profile/LanguageSelector.tsx
'use client'

interface Props {
  current: string
  label: string
}

export function LanguageSelector({ current, label }: Props) {
  function setLocale(locale: string) {
    document.cookie = `locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    window.location.reload()
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{label}</p>
      <div className="flex gap-2">
        {(['ru', 'en'] as const).map(loc => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`px-5 py-2 text-sm font-bold uppercase rounded-sm transition-colors ${
              current === loc
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {loc === 'ru' ? 'РУС' : 'ENG'}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Шаг 3: Добавить locale в Profile тип**

В `src/lib/types/models.ts` найти интерфейс `Profile` и добавить поле:

```typescript
export interface Profile {
  id: string
  unit_system: UnitSystem
  weight_kg: number | null
  height_cm: number | null
  body_fat_pct: number | null
  age: number | null
  training_since: string | null
  training_location: TrainingLocation | null
  training_schedule: number[]
  locale: string | null        // ← добавить это поле
  created_at: string
}
```

- [ ] **Шаг 4: Обновить src/app/(app)/profile/actions.ts**

Добавить поле `locale` в схему и сохранение:

```typescript
// src/app/(app)/profile/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

const profileSchema = z.object({
  weight_kg: z.coerce.number().positive().optional(),
  height_cm: z.coerce.number().positive().optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  training_since: z.string().optional(),
  training_location: z.enum(['gym', 'home', 'both']).optional(),
  training_schedule: z.array(z.coerce.number().int().min(1).max(7)).default([]),
  locale: z.enum(['ru', 'en']).optional(),
})

export async function updateProfileAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const raw = {
    weight_kg: formData.get('weight_kg') || undefined,
    height_cm: formData.get('height_cm') || undefined,
    age: formData.get('age') || undefined,
    training_since: formData.get('training_since') || undefined,
    training_location: formData.get('training_location') || undefined,
    training_schedule: formData.getAll('training_schedule'),
    locale: formData.get('locale') || undefined,
  }

  const parsed = profileSchema.parse(raw)

  const { error } = await supabase
    .from('profiles')
    .update(parsed)
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  // Sync locale cookie with Supabase value
  if (parsed.locale) {
    const cookieStore = await cookies()
    cookieStore.set('locale', parsed.locale, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
}
```

- [ ] **Шаг 5: Переписать src/app/(app)/profile/page.tsx**

```tsx
// src/app/(app)/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getTranslations, getLocale } from 'next-intl/server'
import { calculateBMI, bmiCategory } from '@/lib/utils/bmi'
import { updateProfileAction } from './actions'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { LanguageSelector } from '@/components/profile/LanguageSelector'
import { signOutAction } from '@/app/(app)/actions'
import type { Profile } from '@/lib/types/models'

export default async function ProfilePage() {
  const { user } = await verifySession()
  const supabase = await createClient()
  const t = await getTranslations('profile')
  const locale = await getLocale()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile as Profile | null
  const bmi = p?.weight_kg && p?.height_cm ? calculateBMI(p.weight_kg, p.height_cm) : null
  const bmiCat = bmi ? bmiCategory(bmi) : null
  const trainingAge = p?.training_since
    ? Math.round((Date.now() - new Date(p.training_since).getTime()) / (365.25 * 24 * 3600 * 1000) * 10) / 10
    : null

  const dayKeys = ['1','2','3','4','5','6','7'] as const

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black uppercase tracking-wider">{t('title')}</h1>

      <ProfileAvatar email={user.email ?? ''} />

      {/* Стат-полоса */}
      <div className="grid grid-cols-3 rounded-sm overflow-hidden border border-zinc-800">
        <div className="flex flex-col items-center justify-center py-3 bg-zinc-900">
          <span className="font-mono text-xl font-bold">{bmi ? bmi.toFixed(1) : '—'}</span>
          <span className="text-xs text-zinc-500 mt-0.5">{t('stats.bmi')}</span>
          {bmiCat && <span className="text-xs text-zinc-600">{bmiCat}</span>}
        </div>
        <div className="flex flex-col items-center justify-center py-3 bg-zinc-900 border-x border-zinc-800">
          <span className="font-mono text-xl font-bold">{trainingAge ? `${trainingAge}y` : '—'}</span>
          <span className="text-xs text-zinc-500 mt-0.5">{t('stats.trainingAge')}</span>
        </div>
        <div className="flex flex-col items-center justify-center py-3 bg-zinc-900">
          <span className="font-mono text-xl font-bold capitalize">{p?.training_location ?? '—'}</span>
          <span className="text-xs text-zinc-500 mt-0.5">{t('stats.location')}</span>
        </div>
      </div>

      {/* Форма редактирования */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider font-bold">
            {t('form.editProfile')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProfileAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('form.weight')}</Label>
                <Input name="weight_kg" type="number" step="0.1"
                  defaultValue={p?.weight_kg ?? ''}
                  className="mt-1 bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500" />
              </div>
              <div>
                <Label>{t('form.height')}</Label>
                <Input name="height_cm" type="number" step="0.1"
                  defaultValue={p?.height_cm ?? ''}
                  className="mt-1 bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500" />
              </div>
              <div>
                <Label>{t('form.age')}</Label>
                <Input name="age" type="number"
                  defaultValue={p?.age ?? ''}
                  className="mt-1 bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500" />
              </div>
              <div>
                <Label>{t('form.trainingSince')}</Label>
                <Input name="training_since" type="date"
                  defaultValue={p?.training_since ?? ''}
                  className="mt-1 bg-zinc-800 border-zinc-700 focus-visible:ring-amber-500" />
              </div>
            </div>

            <div>
              <Label>{t('form.location')}</Label>
              <select
                name="training_location"
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                defaultValue={p?.training_location ?? ''}
              >
                <option value="">{t('form.locationSelect')}</option>
                <option value="gym">{t('form.locationGym')}</option>
                <option value="home">{t('form.locationHome')}</option>
                <option value="both">{t('form.locationBoth')}</option>
              </select>
            </div>

            <div>
              <Label>{t('form.schedule')}</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {dayKeys.map(d => (
                  <label key={d} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name="training_schedule"
                      value={d}
                      defaultChecked={(p?.training_schedule ?? []).includes(Number(d))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-10 flex items-center justify-center rounded-sm border border-zinc-700 peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:text-black text-xs font-bold transition-colors">
                      {t(`days.${d}`)}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Sync current locale to Supabase on profile save */}
            <input type="hidden" name="locale" value={locale} />
            <Button
              type="submit"
              className="w-full uppercase tracking-wider font-bold h-11"
            >
              {t('form.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Переключатель языка */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4">
          <LanguageSelector current={locale} label={t('language')} />
        </CardContent>
      </Card>

      {/* Опасная зона */}
      <div className="border-t border-zinc-800 pt-4 flex gap-3">
        <form action={signOutAction} className="flex-1">
          <Button variant="ghost" type="submit" className="w-full uppercase tracking-wider text-sm">
            {t('signOut')}
          </Button>
        </form>
        <Button variant="destructive" className="flex-1 uppercase tracking-wider text-sm" disabled>
          {t('deleteAccount')}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Шаг 6: Запустить сборку**

```bash
npm run build 2>&1 | tail -15
```
Ожидание: успешная сборка.

- [ ] **Шаг 7: Коммит**

```bash
git add src/components/profile/ src/app/(app)/profile/ src/lib/types/models.ts
git commit -m "feat: profile redesign — avatar, language selector, i18n, amber schedule days"
```

---

## Task 8: DB Migration + финальная верификация

**Files:**
- Create: `supabase/migrations/20260510000001_add_locale.sql`

- [ ] **Шаг 1: Создать миграцию**

```sql
-- supabase/migrations/20260510000001_add_locale.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'ru';
```

- [ ] **Шаг 2: Запустить тесты**

```bash
npm test
```
Ожидание: 35 тестов проходят.

- [ ] **Шаг 3: Финальная сборка**

```bash
npm run build 2>&1 | tail -20
```
Ожидание: все 12 маршрутов, 0 ошибок TypeScript.

- [ ] **Шаг 4: Запушить на GitHub (Vercel задеплоит)**

```bash
git push origin main
```

- [ ] **Шаг 5: Применить миграцию в Supabase (выполнить вручную)**

В Supabase Dashboard → SQL Editor выполнить:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'ru';
```

- [ ] **Шаг 6: Итоговый коммит**

```bash
git add supabase/migrations/20260510000001_add_locale.sql
git commit -m "feat: add locale column to profiles"
git push origin main
```
