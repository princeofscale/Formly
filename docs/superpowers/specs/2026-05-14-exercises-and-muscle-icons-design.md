# Bodybuilding Exercises + SVG Muscle Icons — Design Spec

**Дата:** 2026-05-14  
**Статус:** Утверждено

---

## Цель

1. Добавить ~35 популярных bodybuilding-упражнений в библиотеку (с русскими названиями)
2. Создать SVG-компонент `<MuscleIcon muscle="..." />` — маленький силуэт тела с подсвеченной целевой мышцей
3. Заменить текстовые badge-фильтры мышц в `/exercise-library` на визуальные иконки в стиле скриншота, который прислал пользователь — но в нашем Aurora-стиле

---

## Секция 1: Миграция упражнений

**Файл** `supabase/migrations/20260514120000_bodybuilding_exercises.sql`

Стратегия — все новые slug'и уникальны и не пересекаются с существующими (проверено: текущий seed имеет 29 упражнений с базовыми slug'ами типа `barbell-bench-press`).

```sql
insert into exercises (name, name_ru, slug, primary_muscle, secondary_muscles, mechanic, equipment) values
-- Chest (грудь) — 5 новых (Barbell Bench Press уже есть)
('Incline Dumbbell Press', 'Жим гантелей на наклонной', 'incline-dumbbell-press',
  'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'dumbbell'),
('Decline Barbell Press', 'Жим штанги головой вниз', 'decline-barbell-press',
  'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'barbell'),
('Machine Chest Press', 'Жим в тренажёре на грудь', 'machine-chest-press',
  'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'machine'),
('Pec Deck', 'Сведения в тренажёре («бабочка»)', 'pec-deck',
  'chest', array[]::muscle_group[], 'isolation', 'machine'),
('Dips', 'Отжимания на брусьях', 'dips',
  'chest', array['triceps','front_delts']::muscle_group[], 'compound', 'bodyweight'),

-- Back (спина) — 4 новых
('One-Arm Dumbbell Row', 'Тяга гантели одной рукой', 'one-arm-dumbbell-row',
  'back', array['lats','biceps','rear_delts']::muscle_group[], 'compound', 'dumbbell'),
('T-Bar Row', 'Тяга Т-грифа', 't-bar-row',
  'back', array['lats','biceps']::muscle_group[], 'compound', 'barbell'),
('Hyperextension', 'Гиперэкстензия', 'hyperextension',
  'back', array['glutes','hamstrings']::muscle_group[], 'isolation', 'bodyweight'),
('Barbell Shrug', 'Шраги со штангой', 'barbell-shrug',
  'traps', array[]::muscle_group[], 'isolation', 'barbell'),

-- Shoulders (плечи) — 4 новых
('Arnold Press', 'Жим Арнольда', 'arnold-press',
  'front_delts', array['side_delts','triceps']::muscle_group[], 'compound', 'dumbbell'),
('Bent-Over Reverse Flye', 'Махи в наклоне', 'bent-over-reverse-flye',
  'rear_delts', array['traps']::muscle_group[], 'isolation', 'dumbbell'),
('Upright Row', 'Тяга к подбородку', 'upright-row',
  'side_delts', array['traps','front_delts']::muscle_group[], 'compound', 'barbell'),
('Front Raise', 'Передние махи гантелями', 'front-raise',
  'front_delts', array[]::muscle_group[], 'isolation', 'dumbbell'),

-- Biceps — 3 новых
('Preacher Curl', 'Подъём на скамье Скотта', 'preacher-curl',
  'biceps', array['forearms']::muscle_group[], 'isolation', 'barbell'),
('Concentration Curl', 'Концентрированные сгибания', 'concentration-curl',
  'biceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Cable Curl', 'Сгибания на блоке', 'cable-curl',
  'biceps', array['forearms']::muscle_group[], 'isolation', 'cable'),

-- Triceps — 3 новых
('Overhead Tricep Extension', 'Разгибания из-за головы', 'overhead-tricep-extension',
  'triceps', array[]::muscle_group[], 'isolation', 'dumbbell'),
('Bench Dips', 'Обратные отжимания от скамьи', 'bench-dips',
  'triceps', array['chest','front_delts']::muscle_group[], 'compound', 'bodyweight'),
('Tricep Kickback', 'Кикбэк гантелью', 'tricep-kickback',
  'triceps', array[]::muscle_group[], 'isolation', 'dumbbell'),

-- Quads (квадрицепс) — 4 новых
('Front Squat', 'Фронтальные приседания', 'front-squat',
  'quads', array['glutes','core']::muscle_group[], 'compound', 'barbell'),
('Lunges', 'Выпады с гантелями', 'walking-lunges',
  'quads', array['glutes','hamstrings']::muscle_group[], 'compound', 'dumbbell'),
('Bulgarian Split Squat', 'Болгарские выпады', 'bulgarian-split-squat',
  'quads', array['glutes','hamstrings']::muscle_group[], 'compound', 'dumbbell'),
('Hack Squat', 'Хак-приседания', 'hack-squat',
  'quads', array['glutes']::muscle_group[], 'compound', 'machine'),

-- Hamstrings (бицепс бедра) — 2 новых
('Stiff-Leg Deadlift', 'Становая на прямых ногах', 'stiff-leg-deadlift',
  'hamstrings', array['glutes','back']::muscle_group[], 'compound', 'barbell'),
('Seated Leg Curl', 'Сгибания ног сидя', 'seated-leg-curl',
  'hamstrings', array[]::muscle_group[], 'isolation', 'machine'),

-- Glutes (ягодицы) — 3 новых
('Hip Thrust', 'Ягодичный мостик', 'hip-thrust',
  'glutes', array['hamstrings']::muscle_group[], 'compound', 'barbell'),
('Cable Glute Kickback', 'Отведение ноги назад на блоке', 'cable-glute-kickback',
  'glutes', array['hamstrings']::muscle_group[], 'isolation', 'cable'),
('Sumo Squat', 'Приседания сумо', 'sumo-squat',
  'glutes', array['quads','hamstrings']::muscle_group[], 'compound', 'barbell'),

-- Calves (икры) — 2 новых
('Standing Calf Raise', 'Подъём на носки стоя', 'standing-calf-raise',
  'calves', array[]::muscle_group[], 'isolation', 'machine'),
('Seated Calf Raise', 'Подъём на носки сидя', 'seated-calf-raise',
  'calves', array[]::muscle_group[], 'isolation', 'machine'),

-- Core (пресс) — 3 новых
('Hanging Leg Raise', 'Подъём ног в висе', 'hanging-leg-raise',
  'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Bicycle Crunch', 'Велосипед', 'bicycle-crunch',
  'core', array[]::muscle_group[], 'isolation', 'bodyweight'),
('Lying Leg Raise', 'Подъём ног лёжа', 'lying-leg-raise',
  'core', array[]::muscle_group[], 'isolation', 'bodyweight'),

-- Forearms (предплечья) — 2 новых
('Wrist Curl', 'Сгибания запястий', 'wrist-curl',
  'forearms', array[]::muscle_group[], 'isolation', 'barbell'),
('Reverse Wrist Curl', 'Разгибания запястий', 'reverse-wrist-curl',
  'forearms', array[]::muscle_group[], 'isolation', 'barbell')

ON CONFLICT (slug) DO NOTHING;
```

**Итого: 35 новых упражнений** + русские названия. Покрывает: грудь, спина, плечи (передние/задние/боковые дельты, трапеции), бицепс, трицепс, квадрицепс, бицепс бедра, ягодицы, икры, пресс, предплечья.

Также добавить русские названия к существующим упражнениям через `UPDATE` (если они ещё не локализованы) — отдельный шаг в миграции:

```sql
update exercises set name_ru = case slug
  when 'barbell-bench-press' then 'Жим лёжа со штангой'
  when 'incline-barbell-bench-press' then 'Жим штанги на наклонной'
  when 'dumbbell-bench-press' then 'Жим гантелей лёжа'
  when 'dumbbell-flyes' then 'Разводка гантелей'
  when 'cable-crossover' then 'Кроссовер'
  when 'barbell-deadlift' then 'Становая тяга'
  when 'pull-up' then 'Подтягивания'
  when 'barbell-row' then 'Тяга штанги в наклоне'
  when 'cable-row' then 'Тяга нижнего блока'
  when 'lat-pulldown' then 'Тяга верхнего блока'
  when 'barbell-overhead-press' then 'Армейский жим'
  when 'dumbbell-overhead-press' then 'Жим гантелей сидя'
  when 'dumbbell-lateral-raise' then 'Махи в стороны'
  when 'face-pull' then 'Тяга к лицу'
  when 'barbell-squat' then 'Приседания со штангой'
  when 'romanian-deadlift' then 'Румынская тяга'
  when 'leg-press' then 'Жим ногами'
  when 'leg-curl' then 'Сгибания ног лёжа'
  when 'leg-extension' then 'Разгибания ног'
  when 'calf-raise' then 'Подъём на носки'
  when 'barbell-curl' then 'Подъём штанги на бицепс'
  when 'dumbbell-curl' then 'Подъём гантелей на бицепс'
  when 'hammer-curl' then 'Молотки'
  when 'tricep-pushdown' then 'Разгибания на блоке'
  when 'skull-crusher' then 'Французский жим'
  when 'close-grip-bench-press' then 'Жим узким хватом'
  when 'plank' then 'Планка'
  when 'crunch' then 'Скручивания'
  when 'ab-wheel-rollout' then 'Ролик пресса'
  else name_ru
end
where name_ru is null;
```

---

## Секция 2: SVG-компонент MuscleIcon

**Файл** `src/components/exercise/MuscleIcon.tsx`

Универсальный компонент: принимает `muscle: MuscleGroup` и опционально размер. Внутри выбирает front/back вид и подсвечивает только нужную мышцу.

```tsx
interface Props {
  muscle: MuscleGroup
  size?: number      // default 64
  active?: boolean   // true → амбер подсветка, false → нейтральный
}
```

**Логика выбора стороны:**

| Сторона | Мышцы |
|---|---|
| Front (вид спереди) | `chest`, `biceps`, `forearms`, `core`, `quads`, `calves`, `front_delts`, `side_delts` |
| Back (вид сзади) | `back`, `lats`, `triceps`, `hamstrings`, `glutes`, `traps`, `rear_delts` |

**Базовое тело:**
- Используем те же SVG-пути что в `MuscleHeatmap.tsx` (голова, шея, торс, руки, ноги)
- ViewBox `0 0 65 138` (как в основном компоненте)
- Базовый цвет неактивных частей — `#2a2a3a` (темнее чем в heatmap, чтобы подсветка контрастнее)

**Активная мышца:**
- Подсвечивается `#f59e0b` (амбер) если `active=true`
- Иначе `#3f3f50` (нейтральный)

**Реализация:**
`MuscleIcon.tsx` — самостоятельный компонент с собственными SVG-путями (упрощёнными для маленького размера). НЕ трогаем `MuscleHeatmap.tsx` — он рабочий, рефакторинг ради DRY рискован (YAGNI). Небольшое дублирование SVG-путей приемлемо.

Внутри `MuscleIcon.tsx`:
- Базовый body (голова, шея, торс, руки, ноги) рисуется один раз
- В зависимости от `muscle` определяется side (front/back)
- Для front-вида рисуем front-arms + front-legs (с бицепсом/квадрицепсом)
- Для back-вида — back-arms + back-legs (с трицепсом/hamstrings) + back-detail (lats, traps)
- Цвет конкретной мышцы: `#f59e0b` если `muscle` совпадает с target, иначе `#3f3f50`

---

## Секция 3: Интеграция в exercise-library

**Файл** `src/app/(app)/exercise-library/page.tsx` — модификация.

Текущий filter из text-badge `<Badge>` заменяется на сетку **визуальных карточек** в стиле скриншота:

```tsx
{/* Заголовок секции */}
<div>
  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">
    {t('targetArea')}
  </h2>
  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
    {PRIMARY_MUSCLE_GROUPS.map(m => {
      const active = muscle === m
      return (
        <Link
          key={m}
          href={...}
          className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            active
              ? 'bg-amber-500/10 border-amber-500/40'
              : 'bg-white/4 border-white/8 hover:bg-white/8'
          } border`}
        >
          {active && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-black" />
            </div>
          )}
          <MuscleIcon muscle={m} size={48} active={active} />
          <div className="text-[10px] font-bold text-center">
            {tHistory(`muscleLabel.${m}`)}
          </div>
        </Link>
      )
    })}
  </div>
</div>
```

`PRIMARY_MUSCLE_GROUPS` — сокращённый список основных групп для UI (вместо всех 15): `['chest', 'back', 'front_delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'core', 'calves']` — 10 штук.

Полный список всех 15 групп остаётся доступным через раскрывающийся блок "Все" (опционально, позже).

**Equipment-фильтр** остаётся текстовым badge'ом — он не нуждается в иконках.

---

## Секция 4: i18n ключи

`exerciseLibrary.targetArea`:
- EN: `"Target Area"`
- RU: `"Область внимания"`

---

## Файловая карта

| Файл | Действие |
|---|---|
| `supabase/migrations/20260514120000_bodybuilding_exercises.sql` | Создать |
| `src/components/exercise/MuscleIcon.tsx` | Создать (самостоятельные SVG-пути) |
| `src/app/(app)/exercise-library/page.tsx` | Модифицировать — визуальные фильтры |
| `messages/en.json` | Добавить `exerciseLibrary.targetArea` |
| `messages/ru.json` | Добавить `exerciseLibrary.targetArea` |
