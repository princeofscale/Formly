# GymLog — полный рефакторинг UI

**Дата:** 2026-05-12  
**Статус:** Утверждено

---

## Дизайн-решения

| Параметр | Решение |
|---|---|
| Визуальное направление | Gradient Premium (glassmorphism, скруглённые карточки, градиенты) |
| Фон | Aurora — `#050510` + 3 анимированных CSS-blob (индиго, янтарь, розовый) |
| Навигация | Icon Sidebar (56px, sticky) — мобил: bottom bar из тех же иконок |
| Новые функции | Онбординг при первом входе, анимации переходов |
| Подход | Послойный (дизайн-система → layout → страницы → фичи) |

---

## Секция 1: Баги

### 1.1 "Email not confirmed" не переводится

- **Файл:** `src/app/(auth)/login/actions.ts`
- **Причина:** `loginAction` возвращает `error.message` из Supabase напрямую — сырой английский текст
- **Исправление:**
  - Добавить ключ `auth.errors.emailNotConfirmed` в `messages/en.json` и `messages/ru.json`
  - В `loginAction` маппить известные сообщения Supabase на i18n-ключи перед возвратом
  - Login-страница рендерит переведённую строку вместо `state.error` напрямую

### 1.2 Краш при RPE 12 / -1

- **Файл:** `src/components/workout/SetRow.tsx`, `src/app/(app)/workout/[id]/actions.ts`
- **Причина:** `<input type="number">` позволяет ввести любое значение вручную, минуя `min={1} max={10}` степпера. БД constraint `rpe >= 1 AND rpe <= 10` отклоняет запрос → `throw new Error` → 500
- **Исправление:**
  - В `saveSetAction` валидировать RPE: если `rpe !== undefined && (rpe < 1 || rpe > 10)` — вернуть `{ error: 'rpe_out_of_range' }` вместо броска исключения
  - Добавить `min="1" max="10"` атрибуты на `<input>` в Stepper
  - Добавить ключ `workout.errors.rpeOutOfRange` в оба файла переводов

---

## Секция 2: Дизайн-система

### 2.1 Aurora-фон

- **Файл:** `src/app/globals.css`
- Фон `body`: `#050510`
- Три абсолютно позиционированных pseudo-элемента в `<body>` (или компонент `AuroraBackground`):
  - Blob 1: индиго `rgba(99,102,241,0.35)`, top-left, `@keyframes aurora-float` 20s
  - Blob 2: янтарь `rgba(245,158,11,0.25)`, bottom-right, задержка 7s
  - Blob 3: розовый `rgba(236,72,153,0.2)`, top-right, задержка 13s
- `@keyframes aurora-float`: плавное движение `translate(±30px, ±20px)` + `aurora-pulse` (opacity 0.6→1.0, 8s)

### 2.2 CSS-токены `.dark`

```css
--background: #050510
--card: rgba(255,255,255,0.06)          /* + backdrop-blur */
--border: rgba(255,255,255,0.10)
--radius: 0.75rem                        /* было 0.25rem */
--primary: oklch(0.795 0.184 86.047)    /* amber-500, без изменений */
```

### 2.3 Глобальный стиль карточек

В `globals.css` добавляется утилита `.glass-card`:
```css
.glass-card {
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: var(--radius);
}
```

---

## Секция 3: Навигация

### 3.1 Icon Sidebar

- **Файл:** `src/app/(app)/layout.tsx` — полная перезапись
- Layout: `grid grid-cols-[56px_1fr] min-h-screen`
- Sidebar: `w-14 fixed h-screen flex flex-col items-center py-4 gap-4 bg-white/4 backdrop-blur border-r border-white/8`
- Логотип вверху: градиентная иконка гантели (янтарь→красный)
- Иконки: Home, History, Records, Analytics, Library (с tooltip при hover)
- Активная иконка: `text-amber-500` + `before:` полоска-индикатор слева 2px
- Profile внизу (`mt-auto`)
- Кнопка "Выйти" → переезжает в `profile/page.tsx`

### 3.2 Мобильная адаптация

- На `< md`: sidebar скрывается, появляется `fixed bottom-0` bar с теми же иконками
- Реализация: тот же компонент `AppNav`, разные классы через `hidden md:flex` / `flex md:hidden`

---

## Секция 4: Страницы

Все страницы: плоские `bg-zinc-900 border-zinc-800 rounded-sm` → `.glass-card`.

### Dashboard
- Приветственный блок: имя пользователя + дата
- Карточки статистики: цветные accent-border (тоннаж=янтарь, сессии=индиго, 1ПМ=зелёный)
- CTA "ТРЕНИРОВКА": `bg-gradient-to-r from-amber-500 to-red-500`, полная ширина, высота 56px
- Muscle heatmap и последние тренировки: только стиль, без структурных изменений

### Workout
- SetRow степперы: `.glass-card` фон
- Кнопка сохранения: amber при `canSave`, с `transition-all`
- PRBadge: `animate-in zoom-in-50 duration-300` при появлении
- RestTimer: градиентная обводка прогресс-круга

### Auth (Login / Register)
- Левая панель: Aurora-фон вместо `from-zinc-900 to-black`
- Правая панель (форма): `.glass-card` поверх Aurora

### History / Records / Analytics / Library / Profile
- Только стиль карточек и таблиц — структура без изменений

---

## Секция 5: Онбординг

### Условие показа
В `(app)/layout.tsx`: если `profile.weight_kg IS NULL`, рендерить `<OnboardingModal>` поверх контента.

### Шаги

**Шаг 1 — Цель** (обязательный)
- 3 кнопки: "Набрать массу", "Похудеть", "Развить силу"
- Сохраняется в `localStorage('gymlog_goal')`

**Шаг 2 — Данные** (пропускаемый)
- Поля: вес (кг), рост (см), возраст
- Вызывает существующий `updateProfileAction`

**Шаг 3 — Расписание** (пропускаемый)
- Чекбоксы дней недели
- Вызывает существующий `updateProfileAction`

### Дизайн
- `.glass-card` с `backdrop-blur-xl`, тёмный оверлей за ним
- Прогресс-бар: 3 точки вверху
- Кнопки: "Далее" (amber) / "Пропустить" (ghost) / "Начать" (amber, последний шаг)
- Шаги переключаются анимацией `slide-in-from-right` / `slide-out-to-left`

### Повторный показ
Не показывается если `profile.weight_kg IS NOT NULL` ИЛИ `localStorage('gymlog_onboarded') === 'true'`.

---

## Секция 6: Анимации

**Зависимости:** `tw-animate-css` (уже установлен), только CSS

### Page transitions
- `<PageWrapper>` — клиентский компонент в `(app)/layout.tsx`
- Классы: `animate-in fade-in duration-300` на `{children}`

### Skeleton-загрузки
- `dashboard/loading.tsx`, `history/loading.tsx`, `records/loading.tsx` — новые файлы
- Стеклянные блоки с `animate-pulse` в пропорциях реального контента

### Micro-animations
| Элемент | Анимация |
|---|---|
| SetRow сохранён → новый ряд появляется | `animate-in fade-in slide-in-from-bottom-2 duration-200` |
| PRBadge появление | `animate-in zoom-in-50 duration-300` |
| Карточки дашборда | `animate-in fade-in slide-in-from-bottom-4` + stagger `delay-[0/75/150ms]` |
| Онбординг шаг вперёд | `slide-in-from-right-4` |
| Онбординг шаг назад | `slide-in-from-left-4` |

### Aurora CSS-анимации
```css
@keyframes aurora-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(30px, -20px) scale(1.05); }
  66%       { transform: translate(-20px, 15px) scale(0.95); }
}
@keyframes aurora-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1.0; }
}
```

---

## Файлы затронутые рефакторингом

| Файл | Изменение |
|---|---|
| `src/app/globals.css` | Aurora-фон, новые токены, `.glass-card`, keyframes |
| `src/app/(app)/layout.tsx` | Icon Sidebar, PageWrapper, OnboardingModal |
| `src/app/(auth)/layout.tsx` | Aurora-фон |
| `src/app/(auth)/login/actions.ts` | Маппинг ошибок Supabase |
| `src/app/(auth)/login/page.tsx` | Рендер переведённой ошибки |
| `src/app/(app)/workout/[id]/actions.ts` | Валидация RPE |
| `src/components/workout/SetRow.tsx` | `min`/`max` на input, обработка ошибки RPE |
| `src/components/workout/PRBadge.tsx` | Анимация появления |
| `src/app/(app)/dashboard/page.tsx` | Новый стиль, stagger-анимации |
| `src/app/(app)/dashboard/loading.tsx` | Новый файл — skeleton |
| `src/app/(app)/history/loading.tsx` | Новый файл — skeleton |
| `src/app/(app)/records/loading.tsx` | Новый файл — skeleton |
| `src/components/OnboardingModal.tsx` | Новый компонент |
| `messages/ru.json` | Новые ключи ошибок |
| `messages/en.json` | Новые ключи ошибок |
