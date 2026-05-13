# MuscleHeatmap v2 — Design Spec

**Дата:** 2026-05-13  
**Статус:** Утверждено

---

## Цель

Заменить `react-body-highlighter` (кривые пропорции, обрезанные ноги, руки-палки) на кастомный SVG-компонент с нормальной анатомической фигурой + radar chart для визуализации баланса нагрузки.

---

## Решения

| Параметр | Решение |
|---|---|
| Библиотека тела | `react-body-highlighter` удаляется, замена — кастомный SVG |
| Фигура | Реалистичные пропорции: полные руки (плечо + предплечье), ноги до низа |
| Стиль | Без подписей — цвет кодирует интенсивность |
| Дополнение | Radar chart (6 групп) на чистом SVG справа от тела |
| Props | Не меняются: `muscleVolumes`, `muscleLabels`, `clickHint`, `setsLabel` |

---

## Секция 1: Структура компонента

**Файл:** `src/components/dashboard/MuscleHeatmap.tsx` — полная перезапись.

**Удалить из `package.json`:** `react-body-highlighter`

**Лэйаут:**

```
<div class="space-y-4">
  <div class="flex gap-4 items-start">
    <!-- Левая колонка: тело -->
    <div class="flex-shrink-0 space-y-2">
      <Переключатель [Спереди] [Сзади]>
      <SVG-тело (65×138)>
    </div>
    <!-- Правая колонка: radar -->
    <div class="flex-1 space-y-1">
      <p class="text-[9px]">Баланс нагрузки</p>
      <RadarChart SVG (110×110)>
    </div>
  </div>
  <!-- Тег выбранной мышцы при клике -->
  <div class="min-h-[32px]">...</div>
</div>
```

---

## Секция 2: SVG-тело

### Нейтральный цвет
Неактивные зоны: `#3f3f50` (серо-фиолетовый в тон Aurora-фона)

### Цветовая шкала
```ts
const HIGHLIGHT_COLORS = ['#fde68a', '#fbbf24', '#d97706', '#b45309', '#92400e']
// setsToFrequency(sets) → index 0-4
```

### Вид спереди — интерактивные зоны

| Зона | Мышца | Элемент |
|---|---|---|
| Грудь левая | `chest` | `<ellipse cx="23" cy="41">` |
| Грудь правая | `chest` | `<ellipse cx="42" cy="41">` |
| Дельта левая | `front_delts` / `side_delts` | `<ellipse cx="10" cy="30">` |
| Дельта правая | `front_delts` / `side_delts` | `<ellipse cx="55" cy="30">` |
| Бицепс левый | `biceps` | `<path>` вдоль плечевой |
| Бицепс правый | `biceps` | `<path>` |
| Предплечье лев. | `forearms` | `<path>` |
| Предплечье пр. | `forearms` | `<path>` |
| Пресс (6 rect) | `core` | `<rect>` 2×3 сетка |
| Квадрицепс лев. | `quads` | `<path>` вдоль бедра |
| Квадрицепс пр. | `quads` | `<path>` |
| Икры лев. | `calves` | `<path>` |
| Икры пр. | `calves` | `<path>` |

### Вид сзади — интерактивные зоны

| Зона | Мышца | Элемент |
|---|---|---|
| Трапеции | `traps` | `<path>` треугольник |
| Широчайшие лев. | `lats` | `<path>` |
| Широчайшие пр. | `lats` | `<path>` |
| Спина (фон) | `back` | `<path>` |
| Задние дельты | `rear_delts` | `<ellipse>` |
| Трицепс лев. | `triceps` | `<path>` |
| Трицепс пр. | `triceps` | `<path>` |
| Ягодицы лев. | `glutes` | `<ellipse>` |
| Ягодицы пр. | `glutes` | `<ellipse>` |
| Бицепс бедра лев. | `hamstrings` | `<path>` |
| Бицепс бедра пр. | `hamstrings` | `<path>` |

### Пропорции тела (viewBox="0 0 65 138")
- Голова: `<ellipse cx="32.5" cy="11" rx="10" ry="10.5">`
- Шея: `<rect x="29" y="21" width="7" height="6">`
- Торс с сужением в талии: `<path d="M17 26.5 Q11 30 10 50 L10 74 Q10 78 17 79 L48 79 Q55 78 55 74 L55 50 Q54 30 48 26.5 ...">`
- Плечо+предплечье: 2 отдельных `<path>` с `stroke-linecap="round"` — плечо шире, предплечье уже
- Ноги: `<path>` доходят до y=137 (полная высота viewBox)

### Взаимодействие
- `onClick` на каждую зону → `setSelected({ name: muscle, sets: total_sets })`
- Неактивные зоны: `fill={neutralColor}` + `cursor-default`
- Активные: `fill={HIGHLIGHT_COLORS[freq-1]}` + `cursor-pointer`
- Hover: `opacity` 0.8→1.0 через CSS `hover:opacity-100`

---

## Секция 3: Radar Chart

**Реализация:** чистый SVG, без библиотек.  
**Размер:** `viewBox="-60 -60 120 120"`, рендерится в `110×110px`.

### 6 осей — агрегация мышц

```ts
const RADAR_GROUPS = [
  { key: 'push',    label: 'Грудь/Пл',  muscles: ['chest', 'front_delts', 'side_delts'] },
  { key: 'back',    label: 'Спина',     muscles: ['back', 'lats', 'traps', 'rear_delts'] },
  { key: 'arms',    label: 'Руки',      muscles: ['biceps', 'triceps', 'forearms'] },
  { key: 'core',    label: 'Пресс',     muscles: ['core'] },
  { key: 'legs',    label: 'Ноги',      muscles: ['quads', 'hamstrings', 'calves'] },
  { key: 'glutes',  label: 'Ягодицы',   muscles: ['glutes'] },
]
```

### Нормализация
```ts
// Сумма подходов по группе
const groupSets = group.muscles.reduce((sum, m) =>
  sum + (muscleVolumes.find(mv => mv.muscle === m)?.total_sets ?? 0), 0)

// Максимум среди всех групп = радиус 45
const maxSets = Math.max(...groups.map(g => g.sets), 1)
const r = (groupSets / maxSets) * 45
```

### SVG-элементы
- Сетка: 3 шестиугольника (`r = 15, 30, 45`), `stroke="rgba(255,255,255,0.06)"`
- Оси: 6 линий от центра, `stroke="rgba(255,255,255,0.08)"`
- Данные: `<polygon>` из 6 точек, `fill="rgba(245,158,11,0.2)"`, `stroke="#f59e0b"` 1.5px
- Точки: `<circle r="3" fill="#f59e0b">` на каждой вершине
- Подписи: `<text>` 6.5px, `fill="rgba(255,255,255,0.5)"`

### Пустое состояние
Если все `groupSets === 0` → polygon рисуется с r=0 (точка в центре). Компонент не скрывается.

---

## Секция 4: Интерфейс и переключатель

### Переключатель вид

```tsx
type View = 'front' | 'back'
const [view, setView] = useState<View>('front')
```

Кнопки (2 шт):
- Активная: `bg-amber-500/20 border border-amber-500/40 text-amber-400`
- Неактивная: `bg-white/5 border border-white/10 text-zinc-500 hover:text-zinc-300`
- Размер: `h-6 px-2.5 text-[9px] rounded-md`

### Тег выбранной мышцы

```tsx
// Под телом, min-h-[32px]
{selected ? (
  <div class="flex items-center gap-2 bg-white/10 border border-amber-500/40 rounded px-3 py-1.5 text-sm">
    <span class="font-semibold text-amber-400">{muscleLabels[selected.name]}</span>
    <span class="text-zinc-400">—</span>
    <span class="font-mono text-white">{selected.sets}</span>
    <span class="text-zinc-400">{setsLabel}</span>
  </div>
) : (
  <p class="text-xs text-zinc-500">{clickHint}</p>
)}
```

### Пустое состояние (нет данных)
Тело рисуется с нейтральными цветами. Radar — пустой. Подпись `clickHint` вместо тега.

---

## Файлы затронутые

| Файл | Изменение |
|---|---|
| `src/components/dashboard/MuscleHeatmap.tsx` | Полная перезапись |
| `package.json` | Удалить `react-body-highlighter` |
| `package-lock.json` | Обновится после `npm uninstall` |
