# PWA Install — Design + Plan

**Дата:** 2026-05-14  
**Статус:** Утверждено

---

## Цель

Превратить GymLog в установимое PWA. Пользователь видит prompt "Установить приложение" → один клик → иконка GymLog на главном экране, открывается как нативное приложение (без браузерной полосы).

Push-уведомления — отдельная фаза 2 (требует web-push, VAPID, cron-инфраструктуру).

---

## Архитектура

Используем Next.js 16 встроенные паттерны:

- `src/app/manifest.ts` экспортирует `MetadataRoute.Manifest` — Web Manifest генерируется автоматически
- `src/app/icon.tsx` и `src/app/apple-icon.tsx` используют `ImageResponse` для генерации PNG иконок налету — никаких файлов изображений в репо
- `public/sw.js` — минимальный service worker (нужен Chrome для install)
- `src/components/InstallPrompt.tsx` — клиентский компонент в root layout, ловит `beforeinstallprompt` и показывает кастомный prompt

---

## Файлы

| Файл | Действие |
|---|---|
| `src/app/manifest.ts` | Создать |
| `src/app/icon.tsx` | Создать |
| `src/app/apple-icon.tsx` | Создать |
| `public/sw.js` | Создать (минимальный) |
| `src/components/ServiceWorkerRegister.tsx` | Создать |
| `src/components/InstallPrompt.tsx` | Создать |
| `src/app/layout.tsx` | Добавить SW registration + InstallPrompt |
| `messages/en.json`, `messages/ru.json` | Добавить `install.*` секцию |

---

## Web Manifest (`src/app/manifest.ts`)

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GymLog',
    short_name: 'GymLog',
    description: 'Track workouts, log progress, hit PRs',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#050510',
    theme_color: '#050510',
    icons: [
      { src: '/icon', sizes: '256x256', type: 'image/png' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

## Icon (`src/app/icon.tsx`)

Генерируется через `ImageResponse` — gradient quadrant + dumbbell glyph. Размер 256×256 по умолчанию, Next.js серверит для всех запрашиваемых размеров.

Логотип: квадрат с gradient `#f59e0b → #ef4444`, белая иконка гантели (Unicode "🏋️" или нарисованная SVG-путём) по центру.

## Apple icon (`src/app/apple-icon.tsx`)

Аналогично, размер 180×180. Без maskable purpose.

## Service Worker (`public/sw.js`)

Минимальный SW — просто регистрируется, чтобы Chrome засчитал PWA как установимое. Никакого offline-caching пока (это отдельная задача — нужно решить какой кэш-стратегию использовать).

```js
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
```

## Service Worker Register

Клиентский компонент в root layout. Регистрирует `/sw.js` после первого рендера.

```tsx
'use client'
import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
```

Регистрация только в production — в dev SW мешает hot reload.

## Install Prompt

Клиентский компонент. Поведение:

1. На mount — слушает событие `beforeinstallprompt` (Chrome/Edge/Android)
2. Когда событие пришло — сохраняет `BeforeInstallPromptEvent` в state, показывает кастомную карточку
3. iOS detection: `/iPad|iPhone|iPod/.test(navigator.userAgent) && !navigator.standalone` → показывает iOS-инструкцию ("Поделиться → На экран Домой")
4. Пользователь нажимает "Установить" → вызывается `event.prompt()`, после `userChoice` карточка скрывается
5. Пользователь нажимает "Позже" → запись в `localStorage('gymlog_install_dismissed', 'true')`, карточка больше не появляется
6. Если уже установлено (`window.matchMedia('(display-mode: standalone)').matches`) — карточка не показывается

UI: стеклянная карточка `fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80` — над bottom-nav на мобиле, в правом нижнем углу на десктопе.

Структура:
```
✦ icon          [Установить GymLog на главный]
                [экран — быстрый доступ как у любого приложения]
                [Установить]  [Позже]
```

## i18n

```json
"install": {
  "title": "Install GymLog",
  "subtitle": "Add to your home screen for quick access",
  "cta": "Install",
  "later": "Later",
  "iosInstructions": "Tap Share → Add to Home Screen"
}
```

Russian: "Установи GymLog", "Добавь на главный экран...", "Установить", "Позже", "Нажми «Поделиться» → «На экран «Домой»".

---

## План выполнения

1. Создать `src/app/manifest.ts`
2. Создать `src/app/icon.tsx` + `src/app/apple-icon.tsx`
3. Создать `public/sw.js`
4. Создать `ServiceWorkerRegister.tsx` + `InstallPrompt.tsx`
5. Подключить в root `layout.tsx`
6. Добавить i18n ключи
7. TS check + build + push
