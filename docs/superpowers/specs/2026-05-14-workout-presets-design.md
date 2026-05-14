# Workout Presets — Design + Plan

**Дата:** 2026-05-14  
**Статус:** Утверждено пользователем

---

## Цель

Добавить 4 готовые программы тренировок на странице `/workout/new`. Клик по дню программы → создаётся пользовательский шаблон (если ещё не создан) и стартует сессия.

---

## Программы (12 тренировок)

Все программы используют существующие slug'и упражнений. Названия — generic фитнес-терминология.

### 1. Фулбади (3×/нед, чередовать A/B)

**A:** `barbell-squat`, `barbell-bench-press`, `barbell-row`, `barbell-overhead-press`, `barbell-curl`, `plank`  
**B:** `barbell-deadlift`, `incline-dumbbell-press`, `lat-pulldown`, `dumbbell-lateral-raise`, `tricep-pushdown`, `calf-raise`

### 2. Верх / Низ (4×/нед)

**Верх:** `barbell-bench-press`, `barbell-row`, `barbell-overhead-press`, `lat-pulldown`, `barbell-curl`, `tricep-pushdown`  
**Низ:** `barbell-squat`, `romanian-deadlift`, `leg-press`, `leg-curl`, `standing-calf-raise`, `hanging-leg-raise`

### 3. Жим / Тяга / Ноги (3-6×/нед)

**Push:** `barbell-bench-press`, `incline-dumbbell-press`, `barbell-overhead-press`, `dumbbell-lateral-raise`, `tricep-pushdown`, `skull-crusher`  
**Pull:** `pull-up`, `barbell-row`, `one-arm-dumbbell-row`, `lat-pulldown`, `barbell-curl`, `hammer-curl`  
**Legs:** `barbell-squat`, `romanian-deadlift`, `leg-press`, `leg-curl`, `standing-calf-raise`, `hanging-leg-raise`

### 4. 5-дневный сплит (по группе мышц)

**Грудь:** `barbell-bench-press`, `incline-dumbbell-press`, `dumbbell-flyes`, `cable-crossover`, `dips`, `pec-deck`  
**Спина:** `pull-up`, `barbell-row`, `one-arm-dumbbell-row`, `lat-pulldown`, `t-bar-row`, `hyperextension`  
**Плечи:** `barbell-overhead-press`, `arnold-press`, `dumbbell-lateral-raise`, `bent-over-reverse-flye`, `front-raise`, `barbell-shrug`  
**Руки:** `barbell-curl`, `hammer-curl`, `preacher-curl`, `tricep-pushdown`, `skull-crusher`, `overhead-tricep-extension`  
**Ноги:** `barbell-squat`, `romanian-deadlift`, `leg-press`, `leg-extension`, `leg-curl`, `standing-calf-raise`

---

## Архитектура

**Никаких новых таблиц.** Используется существующая `workout_templates` через пользовательские шаблоны.

**Поток:**
1. Пользователь видит карточки 4 программ на `/workout/new`
2. Раскрывает программу — видит список дней
3. Клик "Начать" на дне → server action:
   - Lookup exercise UUIDs по slug'ам из preset'а
   - Создаёт `workout_templates` запись (с именем "Фулбади · A", если такого ещё нет — иначе использует существующий)
   - Стартует сессию через существующий paterns: `getActiveSession` или `createSession`
   - Redirect на `/workout/<id>?template=<id>`

---

## Файлы

| Файл | Действие |
|---|---|
| `src/lib/constants/workout-presets.ts` | Создать — константы PRESETS |
| `src/app/(app)/workout/new/actions.ts` | Добавить `startFromPresetAction` |
| `src/components/workout/PresetPrograms.tsx` | Создать — UI карточек программ |
| `src/app/(app)/workout/new/page.tsx` | Модифицировать — добавить `<PresetPrograms>` |
| `messages/en.json`, `messages/ru.json` | Добавить `presets.*` секцию |

---

## Шаги выполнения

1. Константы PRESETS (типы + данные)
2. i18n ключи (en + ru)
3. Server action `startFromPresetAction`
4. UI компонент `PresetPrograms`
5. Интеграция в `workout/new/page.tsx`
6. TS check + commit + push
