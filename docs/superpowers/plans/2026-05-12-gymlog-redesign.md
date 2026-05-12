# GymLog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Рефакторинг GymLog — исправление двух багов, Aurora-фон, стеклянный дизайн, боковая навигация, онбординг и анимации.

**Architecture:** Послойный подход: сначала переводы и баги, затем дизайн-система (CSS), затем навигация, затем страницы, затем новые компоненты. Каждый шаг оставляет приложение в рабочем состоянии.

**Tech Stack:** Next.js 16 App Router, Supabase, next-intl v4, Tailwind CSS, shadcn/ui, tw-animate-css

---

## Файловая карта

| Файл | Действие | Описание |
|---|---|---|
| `messages/en.json` | Modify | Добавить ключи ошибок и онбординга |
| `messages/ru.json` | Modify | То же на русском |
| `src/app/(auth)/login/actions.ts` | Modify | Маппинг ошибок Supabase → i18n ключи |
| `src/app/(auth)/login/page.tsx` | Modify | Рендер переведённой ошибки |
| `src/components/workout/SetRow.tsx` | Modify | Клamp RPE + min/max на input |
| `src/app/globals.css` | Modify | Aurora-фон, токены, .glass-card, keyframes |
| `src/app/layout.tsx` | Modify | Aurora blobs в body, убрать bg-zinc-950 |
| `src/components/ui/card.tsx` | Modify | Добавить backdrop-blur-md |
| `src/components/AppNav.tsx` | Create | Sidebar (desktop) + bottom bar (mobile) |
| `src/app/(app)/layout.tsx` | Rewrite | Grid с sidebar, убрать хедер, подключить онбординг |
| `src/app/(auth)/layout.tsx` | Modify | Aurora-фон вместо from-zinc-900 |
| `src/app/(app)/dashboard/page.tsx` | Modify | Стеклянные карточки, градиентная CTA, stagger |
| `src/app/(app)/dashboard/loading.tsx` | Create | Skeleton |
| `src/app/(app)/history/loading.tsx` | Create | Skeleton |
| `src/app/(app)/records/loading.tsx` | Create | Skeleton |
| `src/components/workout/PRBadge.tsx` | Modify | Обновлённая анимация и стиль |
| `src/components/PageWrapper.tsx` | Create | Обёртка с fade-in анимацией |
| `src/components/OnboardingModal.tsx` | Create | 3-шаговый онбординг |

---

## Task 1: Добавить i18n ключи

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/ru.json`

- [ ] **Шаг 1: Добавить ключи ошибок и онбординга в `messages/en.json`**

В секцию `"auth"` добавить после `"fields"`:
```json
"errors": {
  "emailNotConfirmed": "Email not confirmed. Check your inbox.",
  "invalidCredentials": "Invalid email or password.",
  "default": "An error occurred. Please try again."
}
```

В секцию `"workout"` добавить после `"setLabel"`:
```json
"rpeOutOfRange": "Effort must be between 1 and 10."
```

После всех существующих секций добавить:
```json
"onboarding": {
  "step1Title": "What's your goal?",
  "goal": {
    "mass": "Build Muscle",
    "lean": "Lose Fat",
    "strength": "Build Strength"
  },
  "step2Title": "Your stats",
  "step3Title": "Training days",
  "next": "Next",
  "skip": "Skip",
  "start": "Let's go!"
}
```

- [ ] **Шаг 2: Добавить те же ключи в `messages/ru.json`**

В секцию `"auth"` после `"fields"`:
```json
"errors": {
  "emailNotConfirmed": "Email не подтверждён. Проверьте почту.",
  "invalidCredentials": "Неверный email или пароль.",
  "default": "Произошла ошибка. Попробуйте ещё раз."
}
```

В секцию `"workout"` после `"setLabel"`:
```json
"rpeOutOfRange": "Усилие должно быть от 1 до 10."
```

После всех существующих секций добавить:
```json
"onboarding": {
  "step1Title": "Какая цель?",
  "goal": {
    "mass": "Набрать массу",
    "lean": "Похудеть",
    "strength": "Развить силу"
  },
  "step2Title": "Ваши данные",
  "step3Title": "Дни тренировок",
  "next": "Далее",
  "skip": "Пропустить",
  "start": "Начнём!"
}
```

- [ ] **Шаг 3: Проверить**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en.json OK')"
node -e "JSON.parse(require('fs').readFileSync('messages/ru.json','utf8')); console.log('ru.json OK')"
```

Ожидаемый вывод: `en.json OK` и `ru.json OK`

- [ ] **Шаг 4: Commit**

```bash
git add messages/en.json messages/ru.json
git commit -m "feat: add i18n keys for auth errors, RPE validation and onboarding"
```

---

## Task 2: Исправить баг "Email not confirmed"

**Files:**
- Modify: `src/app/(auth)/login/actions.ts`
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Шаг 1: Обновить `src/app/(auth)/login/actions.ts`**

Полная замена файла:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const SUPABASE_ERROR_MAP: Record<string, string> = {
  'Email not confirmed': 'auth.errors.emailNotConfirmed',
  'Invalid login credentials': 'auth.errors.invalidCredentials',
}

function mapAuthError(message: string): string {
  return SUPABASE_ERROR_MAP[message] ?? 'auth.errors.default'
}

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { errorKey: 'auth.errors.invalidCredentials' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) return { errorKey: mapAuthError(error.message) }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
```

- [ ] **Шаг 2: Обновить `src/app/(auth)/login/page.tsx`**

Заменить строку `{state?.error && ...}` на перевод через ключ:

```tsx
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
  const te = useTranslations()

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
            className="bg-white/5 border-white/10 focus-visible:ring-amber-500 h-11 backdrop-blur-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{tf('password')}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="bg-white/5 border-white/10 focus-visible:ring-amber-500 h-11 backdrop-blur-sm"
          />
        </div>
        {state?.errorKey && (
          <p className="text-sm text-red-400">{te(state.errorKey)}</p>
        )}
        <Button
          type="submit"
          className="w-full h-12 uppercase tracking-wider font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 border-0"
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

- [ ] **Шаг 3: Проверить TypeScript**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npx tsc --noEmit 2>&1 | head -30
```

Ожидаем: нет ошибок в этих файлах.

- [ ] **Шаг 4: Commit**

```bash
git add src/app/(auth)/login/actions.ts src/app/(auth)/login/page.tsx
git commit -m "fix: translate Supabase auth errors via i18n key mapping"
```

---

## Task 3: Исправить баг RPE (краш при значении 12 или -1)

**Files:**
- Modify: `src/components/workout/SetRow.tsx`

- [ ] **Шаг 1: Обновить `handleSave` и добавить min/max атрибуты в `src/components/workout/SetRow.tsx`**

Заменить функцию `handleSave` и строку с RPE-Stepper:

```tsx
// Заменить handleSave:
function handleSave() {
  const w = parseFloat(weight)
  const r = parseInt(reps)
  if (!w || !r) return
  // Клампим RPE на клиенте — DB constraint rpe >= 1 AND rpe <= 10
  const rpeVal = rpe ? Math.max(1, Math.min(10, parseFloat(rpe))) : undefined
  startTransition(async () => {
    const { set, prResult } = await saveSetAction({
      sessionId, exerciseId, setNumber,
      weightKg: w, reps: r,
      rpe: rpeVal,
    })
    onSaved(set, prResult)
  })
}
```

Найти в Stepper строку `<input type="number"` и добавить `min` и `max` атрибуты. В компоненте `Stepper` обновить JSX:

```tsx
<input
  type="number"
  inputMode="decimal"
  min={min}
  max={max}
  value={value}
  onChange={e => onChange(e.target.value)}
  placeholder={optional ? '—' : ''}
  className="w-full text-center font-mono font-bold text-base bg-transparent border-none outline-none text-white placeholder:text-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
/>
```

- [ ] **Шаг 2: Проверить TypeScript**

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/workout/SetRow.tsx
git commit -m "fix: clamp RPE to [1,10] before saving to prevent DB constraint violation"
```

---

## Task 4: Aurora CSS дизайн-система

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/ui/card.tsx`

- [ ] **Шаг 1: Обновить `src/app/globals.css`**

Заменить блок `.dark { ... }` на:

```css
.dark {
  --background: #050510;
  --foreground: oklch(0.985 0 0);
  --card: rgba(255, 255, 255, 0.06);
  --card-foreground: oklch(0.985 0 0);
  --popover: rgba(20, 20, 40, 0.95);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.795 0.184 86.047);
  --primary-foreground: oklch(0.1 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: rgba(255, 255, 255, 0.10);
  --input: rgba(255, 255, 255, 0.10);
  --ring: oklch(0.556 0 0);
  --radius: 0.75rem;
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: rgba(255, 255, 255, 0.04);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.795 0.184 86.047);
  --sidebar-primary-foreground: oklch(0.1 0 0);
  --sidebar-accent: rgba(255, 255, 255, 0.06);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: rgba(255, 255, 255, 0.08);
  --sidebar-ring: oklch(0.556 0 0);
}
```

В конец файла `globals.css` добавить:

```css
/* Aurora background blobs */
.aurora-blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
  will-change: transform, opacity;
}

.aurora-blob-1 {
  width: 600px;
  height: 400px;
  top: -5%;
  left: -10%;
  background: radial-gradient(ellipse, rgba(99, 102, 241, 0.35), transparent 70%);
  animation: aurora-float 20s ease-in-out infinite, aurora-pulse 8s ease-in-out infinite;
}

.aurora-blob-2 {
  width: 500px;
  height: 350px;
  bottom: -5%;
  right: -10%;
  background: radial-gradient(ellipse, rgba(245, 158, 11, 0.22), transparent 70%);
  animation: aurora-float 20s ease-in-out infinite 7s, aurora-pulse 8s ease-in-out infinite 2s;
}

.aurora-blob-3 {
  width: 400px;
  height: 300px;
  top: 35%;
  right: 5%;
  background: radial-gradient(ellipse, rgba(236, 72, 153, 0.18), transparent 70%);
  animation: aurora-float 20s ease-in-out infinite 13s, aurora-pulse 8s ease-in-out infinite 4s;
}

@keyframes aurora-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(30px, -20px) scale(1.05); }
  66%       { transform: translate(-20px, 15px) scale(0.95); }
}

@keyframes aurora-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1.0; }
}

/* Glass card utility */
.glass-card {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: var(--radius);
}
```

- [ ] **Шаг 2: Обновить `src/app/layout.tsx`** — убрать `bg-zinc-950`, добавить aurora blobs

```tsx
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
      <body className={`${inter.className} text-zinc-50 min-h-screen relative`}>
        {/* Aurora background */}
        <div className="aurora-blob aurora-blob-1" aria-hidden="true" />
        <div className="aurora-blob aurora-blob-2" aria-hidden="true" />
        <div className="aurora-blob aurora-blob-3" aria-hidden="true" />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Шаг 3: Добавить backdrop-blur в `src/components/ui/card.tsx`**

Найти строку с `className={cn(` в функции `Card` и добавить `backdrop-blur-md` в строку классов:

```tsx
className={cn(
  "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card backdrop-blur-md py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  className
)}
```

- [ ] **Шаг 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/ui/card.tsx
git commit -m "feat: Aurora CSS design system — dark tokens, glass cards, animated blobs"
```

---

## Task 5: AppNav — боковая панель

**Files:**
- Create: `src/components/AppNav.tsx`

- [ ] **Шаг 1: Создать `src/components/AppNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, History, Trophy, BarChart2, BookOpen, User } from 'lucide-react'
import { useTranslations } from 'next-intl'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Dumbbell, key: 'home' },
  { href: '/history', icon: History, key: 'history' },
  { href: '/records', icon: Trophy, key: 'records' },
  { href: '/analytics', icon: BarChart2, key: 'analytics' },
  { href: '/exercise-library', icon: BookOpen, key: 'library' },
] as const

export function AppNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex fixed left-0 top-0 h-screen w-14 flex-col items-center py-4 gap-1 z-20"
        style={{ background: 'rgba(5,5,16,0.7)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Logo */}
        <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
          <Dumbbell className="h-4 w-4 text-white" />
        </div>

        {/* Main nav */}
        <div className="flex flex-col items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                title={t(key)}
                className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group ${
                  active
                    ? 'text-amber-500 bg-amber-500/15'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/8'
                }`}
              >
                {active && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-500 rounded-r-full" />
                )}
                <Icon className="h-5 w-5" />
              </Link>
            )
          })}
        </div>

        {/* Profile */}
        <Link
          href="/profile"
          title={t('profile')}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
            pathname.startsWith('/profile')
              ? 'text-amber-500 bg-amber-500/15'
              : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/8'
          }`}
        >
          <User className="h-5 w-5" />
        </Link>
      </nav>

      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-20 px-2"
        style={{ background: 'rgba(5,5,16,0.85)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, key }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 transition-colors py-1 px-1.5 ${
                active ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{t(key)}</span>
            </Link>
          )
        })}
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-0.5 transition-colors py-1 px-1.5 ${
            pathname.startsWith('/profile') ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] font-medium">{t('profile')}</span>
        </Link>
      </nav>
    </>
  )
}
```

- [ ] **Шаг 2: Проверить TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/AppNav.tsx
git commit -m "feat: add AppNav — icon sidebar (desktop) + bottom bar (mobile)"
```

---

## Task 6: Переписать `(app)/layout.tsx`

**Files:**
- Rewrite: `src/app/(app)/layout.tsx`

- [ ] **Шаг 1: Полная замена `src/app/(app)/layout.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { AppNav } from '@/components/AppNav'
import { OnboardingModal } from '@/components/OnboardingModal'
import { signOutAction } from './actions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await verifySession()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('weight_kg, height_cm')
    .eq('id', user.id)
    .single()

  const needsOnboarding = !profile?.weight_kg && !profile?.height_cm

  return (
    <div className="min-h-screen flex">
      <AppNav />

      {/* Main content — отступ слева на десктопе под sidebar, снизу на мобиле под bottom bar */}
      <main className="flex-1 md:ml-14 pb-20 md:pb-0 relative z-10">
        <div className="container max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {needsOnboarding && <OnboardingModal signOutAction={signOutAction} />}
    </div>
  )
}
```

> **Примечание:** `signOutAction` нужен онбордингу для кнопки "Выйти" (если пользователь хочет выйти во время онбординга). Это опционально — можно убрать проп и не показывать кнопку.

- [ ] **Шаг 2: Проверить TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Шаг 3: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "feat: replace header+bottom-nav layout with AppNav sidebar grid"
```

---

## Task 7: Редизайн Auth-страниц

**Files:**
- Modify: `src/app/(auth)/layout.tsx`

- [ ] **Шаг 1: Обновить `src/app/(auth)/layout.tsx`**

Заменить `bg-gradient-to-br from-zinc-900 to-black` на Aurora-стиль на левой панели:

```tsx
import { Dumbbell, TrendingUp, Brain } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import { LocaleSwitcher } from '@/components/auth/LocaleSwitcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const t = await getTranslations('auth')

  return (
    <div className="min-h-screen grid md:grid-cols-2 relative z-10">
      {/* Левая панель */}
      <div
        className="hidden md:flex flex-col justify-between p-12 border-r"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(5,5,16,0.5)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-xl tracking-wider">GYMLOG</span>
        </div>

        <div className="space-y-10">
          <p className="text-4xl font-black leading-tight">{t('slogan')}</p>
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

- [ ] **Шаг 2: Commit**

```bash
git add src/app/(auth)/layout.tsx
git commit -m "feat: auth layout — glass left panel with Aurora background"
```

---

## Task 8: Редизайн Dashboard

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Шаг 1: Заменить стили карточек и добавить градиентную CTA**

Найти и заменить все вхождения `className="bg-zinc-900 border-zinc-800"` на пустую строку (Card теперь стеклянный через токены).

Заменить блок с заголовком (строки 86-113 в текущем файле) на:

```tsx
<div className="space-y-5">
  {/* Заголовок */}
  <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-300">
    <h1 className="text-3xl font-black uppercase tracking-wider">{t('title')}</h1>
  </div>

  {/* CTA Тренировка */}
  <Link
    href="/workout/new"
    className="flex items-center justify-center gap-3 w-full h-14 rounded-xl font-black text-base uppercase tracking-wider text-black transition-all hover:opacity-90 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-300 delay-75"
    style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}
  >
    <Dumbbell className="h-5 w-5" />
    {t('startWorkout')}
  </Link>
```

Заменить два `<Card className="bg-zinc-900 border-zinc-800">` (карточки "Последние тренировки" и "Активность мышц") на:

```tsx
<Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-150">
```

и

```tsx
<Card className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-[225ms]">
```

Убрать ненужные импорты `Plus`, `Trophy`, `User` и ссылки на `/records` и `/profile` из хедера (они теперь в сайдбаре).

- [ ] **Шаг 2: Проверить TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Шаг 3: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: dashboard redesign — gradient CTA, glass cards, stagger animations"
```

---

## Task 9: Скелеты загрузки

**Files:**
- Create: `src/app/(app)/dashboard/loading.tsx`
- Create: `src/app/(app)/history/loading.tsx`
- Create: `src/app/(app)/records/loading.tsx`

- [ ] **Шаг 1: Создать `src/app/(app)/dashboard/loading.tsx`**

```tsx
export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="h-9 w-32 rounded-xl bg-white/5 animate-pulse" />
      <div className="h-14 w-full rounded-xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map(i => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
      <div className="h-48 rounded-xl bg-white/5 animate-pulse" />
    </div>
  )
}
```

- [ ] **Шаг 2: Создать `src/app/(app)/history/loading.tsx`**

```tsx
export default function HistoryLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-24 rounded-xl bg-white/5 animate-pulse" />
      {[0,1,2,3].map(i => (
        <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}
```

- [ ] **Шаг 3: Создать `src/app/(app)/records/loading.tsx`**

```tsx
export default function RecordsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-36 rounded-xl bg-white/5 animate-pulse" />
      {[0,1,2,3,4].map(i => (
        <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}
```

- [ ] **Шаг 4: Commit**

```bash
git add src/app/(app)/dashboard/loading.tsx src/app/(app)/history/loading.tsx src/app/(app)/records/loading.tsx
git commit -m "feat: add skeleton loading pages for dashboard, history, records"
```

---

## Task 10: PageWrapper анимация переходов

**Files:**
- Create: `src/components/PageWrapper.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Шаг 1: Создать `src/components/PageWrapper.tsx`**

```tsx
'use client'

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  )
}
```

- [ ] **Шаг 2: Обернуть `{children}` в `(app)/layout.tsx`**

В `src/app/(app)/layout.tsx` импортировать и использовать:

```tsx
import { PageWrapper } from '@/components/PageWrapper'

// Внутри JSX заменить {children} на:
<PageWrapper>{children}</PageWrapper>
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/PageWrapper.tsx src/app/(app)/layout.tsx
git commit -m "feat: page transition fade-in animation via PageWrapper"
```

---

## Task 11: OnboardingModal

**Files:**
- Create: `src/components/OnboardingModal.tsx`

- [ ] **Шаг 1: Создать `src/components/OnboardingModal.tsx`**

```tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Dumbbell, Target, Zap } from 'lucide-react'
import { updateProfileAction } from '@/app/(app)/profile/actions'

interface Props {
  signOutAction?: () => Promise<void>
}

export function OnboardingModal({ signOutAction }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [schedule, setSchedule] = useState<number[]>([])
  const [, startTransition] = useTransition()
  const t = useTranslations('onboarding')

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('gymlog_onboarded')) {
      setVisible(true)
    }
  }, [])

  function finish() {
    localStorage.setItem('gymlog_onboarded', 'true')
    setVisible(false)
  }

  function handleDataSave() {
    if (weight || height || age) {
      startTransition(async () => {
        const fd = new FormData()
        if (weight) fd.append('weight_kg', weight)
        if (height) fd.append('height_cm', height)
        if (age) fd.append('age', age)
        await updateProfileAction(fd)
      })
    }
    setStep(2)
  }

  function handleScheduleSave() {
    startTransition(async () => {
      const fd = new FormData()
      schedule.forEach(d => fd.append('training_schedule', String(d)))
      await updateProfileAction(fd)
      finish()
    })
  }

  function toggleDay(day: number) {
    setSchedule(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  if (!visible) return null

  const DAYS = [
    { n: 1, label: 'Пн' }, { n: 2, label: 'Вт' }, { n: 3, label: 'Ср' },
    { n: 4, label: 'Чт' }, { n: 5, label: 'Пт' }, { n: 6, label: 'Сб' }, { n: 7, label: 'Вс' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm mx-4 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300"
        style={{ background: 'rgba(10,10,30,0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1rem' }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {[0,1,2].map(i => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-amber-500 w-6' : i < step ? 'bg-amber-500/50' : 'bg-white/20'}`}
            />
          ))}
        </div>

        {/* Step 0 — Цель */}
        {step === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-center">{t('step1Title')}</h2>
            <div className="space-y-2">
              {([
                { key: 'mass', icon: Dumbbell },
                { key: 'lean', icon: Zap },
                { key: 'strength', icon: Target },
              ] as const).map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    localStorage.setItem('gymlog_goal', key)
                    setStep(1)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/40 text-left"
                >
                  <Icon className="h-5 w-5 text-amber-500 shrink-0" />
                  <span className="font-semibold">{t(`goal.${key}`)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Данные */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-center">{t('step2Title')}</h2>
            <div className="space-y-3">
              {[
                { label: 'Вес (кг)', value: weight, onChange: setWeight, placeholder: '80' },
                { label: 'Рост (см)', value: height, onChange: setHeight, placeholder: '180' },
                { label: 'Возраст', value: age, onChange: setAge, placeholder: '25' },
              ].map(({ label, value, onChange, placeholder }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs text-zinc-400 font-medium">{label}</label>
                  <input
                    type="number"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-11 px-3 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 outline-none text-white font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={finish} className="flex-1 h-11 rounded-xl text-zinc-400 hover:text-zinc-200 text-sm transition-colors border border-white/10 hover:border-white/20">
                {t('skip')}
              </button>
              <button
                onClick={handleDataSave}
                className="flex-1 h-11 rounded-xl font-bold text-black text-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Расписание */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-black text-center">{t('step3Title')}</h2>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(({ n, label }) => (
                <button
                  key={n}
                  onClick={() => toggleDay(n)}
                  className={`h-10 rounded-lg text-xs font-bold transition-all ${
                    schedule.includes(n)
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={finish} className="flex-1 h-11 rounded-xl text-zinc-400 hover:text-zinc-200 text-sm transition-colors border border-white/10 hover:border-white/20">
                {t('skip')}
              </button>
              <button
                onClick={handleScheduleSave}
                className="flex-1 h-11 rounded-xl font-bold text-black text-sm transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
              >
                {t('start')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Шаг 2: Проверить TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Шаг 3: Commit**

```bash
git add src/components/OnboardingModal.tsx
git commit -m "feat: OnboardingModal — 3-step goal/stats/schedule flow with animations"
```

---

## Task 12: Убрать zinc-overrides со всех страниц + PRBadge

**Files:**
- Modify: все `src/app/(app)/*/page.tsx` и связанные компоненты
- Modify: `src/components/workout/PRBadge.tsx`

- [ ] **Шаг 1: Заменить явные zinc-переопределения на всех страницах**

Выполнить в корне проекта:
```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
grep -r 'bg-zinc-900 border-zinc-800' src/app src/components --include="*.tsx" -l
```

Для каждого найденного файла заменить `className="bg-zinc-900 border-zinc-800"` на `className=""` (пустой) или убрать className полностью — Card через токены получит стеклянный фон автоматически.

Также найти и заменить:
```bash
grep -r 'bg-zinc-900' src/app src/components --include="*.tsx" -l
```
Заменить `bg-zinc-900` → `bg-white/5` (для не-Card элементов), `border-zinc-800` → `border-white/10`.

- [ ] **Шаг 2: Обновить `src/components/workout/PRBadge.tsx`**

PRBadge уже имеет `animate-in zoom-in-75 duration-300`. Обновить стиль под новый дизайн:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import type { PRResult } from '@/lib/types/models'

export function PRBadge({ pr }: { pr: PRResult }) {
  const t = useTranslations('workout')
  if (!pr.is_pr) return null
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black animate-in zoom-in-75 duration-300"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#000', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}
    >
      {pr.previous_1rm
        ? t('prImproved', { pct: pr.improvement_pct?.toFixed(1) ?? '0' })
        : t('firstSet')}
    </span>
  )
}
```

- [ ] **Шаг 3: Commit**

```bash
git add -A
git commit -m "feat: remove zinc color overrides site-wide, update PRBadge gradient style"
```

---

## Task 13: Финальный TypeScript check и smoke-test

- [ ] **Шаг 1: Финальная проверка TypeScript**  

```bash
cd "C:/Users/User/Desktop/Новая папка/TrainingAR"
npx tsc --noEmit
```

Ожидаем: 0 ошибок. Если есть — исправить перед деплоем.

- [ ] **Шаг 2: Сборка**

```bash
npx next build 2>&1 | tail -20
```

Ожидаем: `✓ Compiled successfully` без ошибок.

- [ ] **Шаг 3: Итоговый commit (если были мелкие правки)**

```bash
git add -A
git status
# Если есть незакоммиченные изменения:
git commit -m "fix: resolve TypeScript issues after redesign"
```

---

## Чеклист готовности

- [ ] Баг "Email not confirmed" — переведён на текущий язык
- [ ] Баг RPE 12/-1 — больше не крашит сайт
- [ ] Aurora-фон виден на всех страницах
- [ ] Карточки стеклянные с backdrop-blur
- [ ] Sidebar виден на десктопе, bottom bar на мобиле
- [ ] Кнопка "Выйти" убрана из хедера (хедера больше нет)
- [ ] Dashboard — градиентная CTA-кнопка, stagger-анимации
- [ ] Skeleton-загрузки работают при навигации
- [ ] При первом входе появляется OnboardingModal
- [ ] После прохождения онбординга — больше не показывается
- [ ] Page transitions — плавный fade при переходах
