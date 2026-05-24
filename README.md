# TrainingAR

Современный AI-фитнес трекер для отслеживания тренировок, анализа прогресса и получения персональных рекомендаций на основе тренировочных данных.

## Возможности

### Тренировки

- Создание и ведение тренировок
- Упражнения, подходы, вес, повторения, RPE, отдых
- Таймер отдыха
- Подсказки с прошлых тренировок
- Автоматическое определение новых рекордов
- Повторение прошлых тренировок
- Шаблоны тренировок

### Аналитика и прогресс

- Отслеживание тренировочного объёма
- Графики прогресса
- Статистика 1RM
- Серии тренировок (streaks)
- Анализ активности мышечных групп
- История тренировок
- Экспорт тренировок в CSV

### AI-функции

- AI-анализ последних тренировок
- Персональные рекомендации
- Советы по нагрузке и восстановлению
- Генерация coaching insights через Mistral AI

### Профиль

- Вес, рост, возраст
- Дата начала тренировок
- Язык интерфейса
- Push-уведомления
- Настройки расписания

### Интерфейс

- Поддержка русского и английского языков
- Адаптивный UI
- Bottom navigation
- Современный интерфейс на shadcn/ui

---

# Технологии

## Frontend

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- next-intl

## Backend / Database

- Supabase
- PostgreSQL
- Row Level Security (RLS)

## AI

- Mistral AI

## Quality & Tooling

- ESLint
- Prettier
- Husky
- Vitest
- Knip
- ts-prune
- CodeQL
- gitleaks
- RenovateBot
- pre-commit.ci

---

# Установка и запуск

## 1. Клонирование репозитория

```bash
git clone https://github.com/princeofscale/TrainingAR.git
cd TrainingAR
```

## 2. Установка зависимостей

```bash
npm install
```

## 3. Создание env-файла

```bash
cp .env.local.example .env.local
```

Заполни `.env.local` своими ключами:

Supabase URL
Supabase Anon Key
Supabase Service Role Key
Mistral API Key
VAPID keys (опционально)

## База данных

Применение миграций:

```bash
supabase db push
```

## Запуск проекта

Режим разработки:

```bash
npm run dev
```

Открыть:

`http://localhost:3000`
