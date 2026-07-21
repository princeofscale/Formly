# Офлайн-режим «Тренировка неубиваема»

**Дата:** 2026-07-19 · **Статус:** утверждён

## Цель

Активная тренировка должна переживать потерю сети в зале: перезагрузку страницы,
сворачивание PWA, логирование сетов и завершение тренировки — всё работает офлайн
и синхронизируется при появлении сети. Остальные разделы офлайн показывают честную
заглушку вместо браузерной ошибки.

## Что уже есть (не трогаем)

- `public/sw.js`: PWA-инсталляция, web-push, rest-timer уведомления. `fetch`-хендлер пуст.
- `src/lib/utils/offline-queue.ts`: IndexedDB (`trainingar-offline`, v1, store `set_queue`) — очередь сетов.
- `SetRow`: при сетевой ошибке кладёт сет в очередь + оптимистичный `offline_${queueId}` в стейте.
- `OfflineSyncWatcher` (внутри `WorkoutClient`): сливает очередь через `POST /api/sets/queue`
  при `online`, пилюля-индикатор, `router.refresh()` после полного слива.
- `/api/sets/queue`: `verifySession` + валидаторы + зеркало `saveSetAction` (PR, цели, push).

## Дыры, которые закрываем

1. Перезагрузка/холодный старт без сети → мёртвый экран (ничего не кэшируется).
2. Завершение тренировки офлайн → ошибка, не встаёт в очередь.
3. После перезагрузки заочередённые сеты пропадают из UI (лежат в IDB, но не рендерятся).
4. Навигация в другие разделы офлайн → браузерная ошибка вместо заглушки.

## Вне скоупа

Офлайн-чтение остальных разделов (dashboard, history, …), старт новой тренировки офлайн
(`startWorkout` — server action, требует сети), кэширование картинок/фото (signed URLs,
cross-origin), Serwist/precache-манифест.

---

## 1. Кэширование в `public/sw.js`

Кэши: `tar-static-v1`, `tar-pages-v1`; единая константа `CACHE_VERSION`, бамп при изменении
правил. На `activate` — удаление кэшей не из актуального списка.

Правила `fetch` (только GET, только same-origin; всё остальное — мимо SW):

| Запрос | Стратегия |
|---|---|
| `/_next/static/*`, `/fonts/*`, `/icon*`, `/manifest*` | cache-first (иммутабельные, хэш в имени) |
| Документ-навигация (`mode === 'navigate'`) на `/workout/<uuid>` | network-first, таймаут ~3.5 с (AbortController) → фолбэк на кэш этой URL; успешный 200 клонируется в `tar-pages-v1` |
| Документ-навигация на любой другой путь | network-only → при провале отдать прекэшированную `/offline` |
| Запросы с заголовком `RSC` (client-side навигации/префетчи) | мимо SW, network-only — кэшировать нельзя, протухший payload отравляет клиентский роутер |
| `/api/*`, POST, cross-origin (Supabase) | мимо SW |

`/offline` — единственный precache на `install`.

## 2. Завершение тренировки офлайн

- `offline-queue.ts`: `DB_VERSION` → 2, новый store `finish_queue` (`keyPath: 'id'`).
  Payload: `{ sessionId: string }` — этого достаточно: тоннаж сервер пересчитывает из сетов
  на момент слива. API: `enqueueFinish(sessionId)`, `getQueuedFinishes()`, `removeQueuedFinish(id)`.
  Дубликаты: `enqueueFinish` не добавляет запись, если finish для этого `sessionId` уже в очереди.
- Новый endpoint `POST /api/workouts/finish-queue` (по образцу `/api/sets/queue`):
  `verifySession` → `validateUuid(sessionId)` → явная проверка `session.user_id === user.id` →
  **идемпотентность**: если `finished_at` уже стоит — вернуть `{ ok: true }` (не ошибка, важно
  для повторных сливов) → иначе пересчитать `totalVolume` (фильтр `is_warmup`, как в
  `finishWorkoutAction`) → `finishSession` → `revalidatePath('/dashboard', '/history')`.
- `FinishWorkoutButton`: try `finishWorkoutAction` → catch по паттерну `offlineSignal` из
  `SetRow` (проверка `navigator.onLine` / `TypeError fetch|network`) → `enqueueFinish` →
  событие `formly:set-queued` → колбэк `onQueued` наверх в `WorkoutClient`, который
  показывает состояние «Тренировка завершена · синхронизируется» (экран остаётся, редиректа нет).
  Примечание: `redirect()` внутри server action бросает управляемый `NEXT_REDIRECT` — его
  нельзя принимать за сетевую ошибку; ловим только реальные сетевые сбои.
- `OfflineSyncWatcher`: порядок слива — **сначала все сеты, затем finish-записи**
  (сервер должен видеть полный список сетов при пересчёте тоннажа). При любом провале —
  остановка (как сейчас), повтор на следующем `online`. После полного слива существующий
  `router.refresh()` приводит к серверному редиректу на `/history/<id>` (страница
  завершённой сессии сама редиректит).

## 3. Merge очереди в UI при перезагрузке

- Новая чистая функция `mergeQueuedSets(serverSets, queuedRecords, sessionId)` в
  `src/lib/utils/offline-merge.ts`: фильтр по `sessionId`, преобразование в синтетические
  `SetEntry` (`id: offline_${queueId}`, `calculated_1rm` через `calculate1RM`), дедуп по паре
  `(exerciseId, setNumber)` против серверных сетов (частичный слив между рендером и mount).
- `WorkoutClient` на mount: `getQueuedSets()` → merge → добавить в стейт упражнений
  (упражнение может отсутствовать в списке — тогда подтянуть из `allExercises`).
- Там же: `getQueuedFinishes()` — если есть finish этой сессии, сразу показать состояние
  «завершена, ждёт синхронизации» (то же, что в §2).

## 4. Страница `/offline`

`src/app/offline/page.tsx` — статичная, без `verifySession`, вне групп `(app)`/`(auth)`,
в TAR-стиле: иконка, «Нет сети — твои данные в безопасности», кнопка «Повторить»
(`location.reload()`). Прекэшируется на `install`, отдаётся как фолбэк навигаций (§1).

## Краевые случаи

- **IDB недоступна** (приватный режим старого Safari) — как сейчас: тихо игнорируем, офлайн-фич нет.
- **Кэшированная страница workout протухла** (нет свежих сетов) — merge из §3 достраивает
  картину; сеты, слитые на сервер до перезагрузки, уже в HTML свежих кэшей; повторный визит
  онлайн перезаписывает кэш.
- **Пользователь разлогинился** → кэшированный `/workout/<id>` мог бы показаться чужому
  человеку за тем же устройством. Приемлемо для пет-проекта (личное устройство), отмечено осознанно.
- **Обновление SW**: `skipWaiting` + `clients.claim` уже есть; бамп `CACHE_VERSION` сносит
  старые кэши на `activate`.

## Верификация

- Юнит-тесты: `mergeQueuedSets` (дедуп, чужие сессии, пустая очередь), `enqueueFinish`
  (дубликаты), миграция IDB v1→v2 (существующий store не теряется) — через `fake-indexeddb`,
  если он уже в dev-зависимостях, иначе мок.
- Typecheck, lint, полный `vitest`, `next build`.
- Ручной прогон (DevTools → Network → Offline): перезагрузка страницы тренировки → рендер из
  кэша с заочередёнными сетами → лог нового сета → finish → Online → автослив → редирект на
  history; навигация на `/dashboard` офлайн → заглушка `/offline`.

## Затрагиваемые файлы

| Файл | Изменение |
|---|---|
| `public/sw.js` | +кэширование (§1), precache `/offline` |
| `src/lib/utils/offline-queue.ts` | v2, `finish_queue`, API finish |
| `src/lib/utils/offline-merge.ts` | новый, `mergeQueuedSets` |
| `src/app/api/workouts/finish-queue/route.ts` | новый endpoint |
| `src/components/workout/FinishWorkoutButton.tsx` | офлайн-ветка |
| `src/components/workout/OfflineSyncWatcher.tsx` | слив finish после сетов |
| `src/components/workout/WorkoutClient.tsx` | merge на mount, состояние «ждёт синка» |
| `src/app/offline/page.tsx` | новый, заглушка |
| `messages/ru.json`, `messages/en.json` | ключи `offline.*` для новых состояний |
