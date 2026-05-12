# GymLog

Personal workout tracker built with Next.js 16, Supabase, and next-intl. Tracks sets, reps, weight, rest periods, and personal records. Supports English and Russian.

## Features

- Log workouts with exercises, sets, weight, reps, and RPE
- Rest timer with haptic feedback and circular progress indicator
- Personal records (1RM tracking) with PR detection
- Workout templates — save and reuse workout structures
- Last-session hints — shows previous sets when starting an exercise
- Exercise library with images and instructions (RU/EN)
- Workout history with volume tracking
- Muscle heatmap — visualizes which muscles were trained this week
- Weekly stats dashboard
- Training schedule
- Russian/English interface

## Stack

- **Next.js 16** — App Router, server components, server actions
- **Supabase** — PostgreSQL database, auth, RLS policies
- **next-intl v4** — i18n (Russian + English)
- **Tailwind CSS** + shadcn/ui
- **Vercel** — deployment

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dev
```

Apply DB migrations:

```bash
supabase db push
```

## Project structure

```
src/
  app/(app)/          # authenticated pages
    dashboard/        # home screen with stats
    workout/          # active workout session
    history/          # past sessions
    records/          # personal records (best 1RM per exercise)
    analytics/        # exercise-specific progress charts
    library/          # exercise catalog
    profile/          # user settings
  components/
    workout/          # ExerciseBlock, SetRow, RestTimer, PRBadge, etc.
    dashboard/        # WeeklyStats, MuscleHeatmap, ScheduleStatus
  lib/
    db/               # Supabase query functions
    services/         # analytics, PR detection
    utils/            # 1RM calculation, plate calculator
  messages/           # en.json, ru.json
```
