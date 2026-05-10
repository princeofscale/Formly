# GymLog — Design Spec
Date: 2026-05-09

## Overview
Free, open-source workout tracking web app with professional-grade analytics. Replaces paid fitness apps (Strong, Hevy) with a self-hosted, extensible alternative. Full cycle: logging sets in the gym + post-workout analytics.

## Tech Stack
- **Framework:** Next.js 16 + TypeScript (strict mode)
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Styling:** Tailwind CSS + shadcn/ui (dark theme default)
- **Charts:** Recharts
- **Muscle map:** react-body-highlighter
- **Forms:** Zod + React Hook Form
- **Tests:** Vitest
- **Hosting:** Vercel (auto-deploy from GitHub main)

## Architecture
Layered architecture — UI, API contract, business logic, and data access are fully separated.

```
src/
  app/                    ← Next.js pages (UI only)
    (auth)/               ← /login, /register
    (app)/                ← protected pages
      dashboard/
      workout/[id]/
      history/
      analytics/
      profile/
    api/                  ← Route Handlers (Next.js App Router convention)
      workouts/
      exercises/
      sets/
      analytics/
  lib/
    services/             ← business logic (WorkoutService, AnalyticsService, PRService, ProgressionService)
    db/                   ← Supabase queries (WorkoutRepository, SetRepository, ExerciseRepository)
    utils/                ← pure functions: calculate1RM, calculateMuscleVolume, calculateBMI
    types/                ← TypeScript types + Zod schemas
  components/
    ui/                   ← shadcn components
    workout/              ← SetLogger, RestTimer, PlateCalculator, LastTimeHint
    analytics/            ← ProgressChart, MuscleHeatmap, VolumeLandmarks
```

## Database Schema

```sql
profiles
  id uuid (FK → auth.users)
  unit_system: 'metric' | 'imperial'
  weight_kg float, height_cm float
  body_fat_pct float (nullable)
  age int
  training_since date
  training_location: 'gym' | 'home' | 'both'
  training_schedule int[]   -- [1,3,5] = Mon,Wed,Fri (ISO weekday, 1=Mon)
  created_at timestamptz

exercises
  id uuid
  name text, slug text
  primary_muscle muscle_group_enum
  secondary_muscles muscle_group_enum[]
  mechanic: 'compound' | 'isolation'
  equipment: 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other'
  is_custom bool
  created_by uuid (FK → profiles, nullable)

workout_sessions
  id uuid
  user_id uuid (FK → profiles)
  started_at timestamptz, finished_at timestamptz (nullable)
  notes text (nullable)
  mood_score int (1–5, nullable)
  total_volume_kg float  -- denormalized for fast analytics

set_entries
  id uuid
  session_id uuid (FK → workout_sessions)
  exercise_id uuid (FK → exercises)
  set_number int
  weight_kg float, reps int
  rpe float (1–10, nullable)
  calculated_1rm float   -- computed on save
  rest_seconds int (nullable)
  created_at timestamptz
```

**Indexes:** `set_entries(user_id, exercise_id, created_at)` for fast exercise history queries.

**RLS:** Users read/write only their own `workout_sessions` and `set_entries`. `exercises` readable by all; custom exercises readable only by creator.

**Computed (not stored):**
- BMI = `weight_kg / (height_cm/100)²`
- Training age = `today - training_since`

## Pages

### Dashboard (`/dashboard`)
- Today's status: training day or rest (from schedule)
- Last 3 sessions: date, volume, muscles trained
- 7-day muscle heatmap (anatomical body map)
- "Start Workout" CTA button

### Active Workout (`/workout/[id]`)
- Exercise search + add from library
- Per-exercise: Last Time Hint ("last time: 80kg × 8")
- Set input: weight + reps + RPE (optional)
- After save: auto-start rest timer
- Quick input: +2.5kg / -2.5kg, +1 / -1 rep buttons
- Plate calculator: how much to load per side of the bar
- PR highlight: if current calculated 1RM > historical best

### History (`/history`)
- Chronological session list
- Click → detail view: all exercises, sets, total volume

### Analytics (`/analytics`)
- e1RM trend chart per exercise (Recharts line chart)
- Monthly total tonnage chart (bar chart)
- Muscle group volume distribution (last 4 weeks)
- Volume Landmarks per muscle: MV / MEV–MRV / MRV+

### Profile (`/profile`)
- Edit: weight, height, age, training_since, location, schedule
- Auto-display: BMI, training age
- Manage custom exercises

## Business Logic

All logic lives in `lib/utils/` and `lib/services/` as pure, framework-independent functions.

### 1RM Calculation (`lib/utils/one-rep-max.ts`)
- Brzycki (reps < 10): `weight / (1.0278 - 0.0278 × reps)`
- Epley (reps ≥ 10): `weight × (1 + 0.0333 × reps)`
- Auto-selects formula by rep count
- Called on every set save; result stored in `set_entries.calculated_1rm`

### Muscle Volume (`lib/utils/muscle-volume.ts`)
- Primary muscle: 1.0 sets credit
- Each secondary muscle: 0.5 sets credit
- Summed per session and per week → heatmap + Volume Landmarks

### Volume Landmarks (`lib/services/analytics.service.ts`)
- MV < 6 sets/week → yellow warning (stagnation risk)
- MEV–MRV 12–20 sets/week → green (optimal)
- MRV+ ≥ 25 sets/week → red warning (overtraining risk)

### PR Detection (`lib/services/pr.service.ts`)
- On set save: compare `calculated_1rm` against all-time max for that exercise
- If higher: trigger in-app notification

### Double Progression (`lib/services/progression.service.ts`)
- After session: if all sets of an exercise hit the top of the rep range → suggest +2.5–5% weight next time
- Non-intrusive: shown as suggestion after finishing workout

## Testing
Vitest unit tests for all pure functions:
- `calculate1RM` — boundary cases: 1 rep, 10 reps, formula switching
- `calculateMuscleVolume` — correct primary/secondary weighting
- `detectPR` — correct historical comparison
- `getProgressionSuggestion` — double progression logic

No UI or integration tests in MVP.

## Deployment
```
GitHub → Vercel (auto-deploy on push to main)
Supabase: separate dev + prod projects
.env.local: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
```
Migrations via Supabase CLI (`supabase db push`), stored in `supabase/migrations/`.

## Development Phases
1. Infrastructure: Next.js 16 + Supabase + auth + Vercel deploy
2. Exercise library + DB schema + RLS migrations
3. Active workout: set logging, rest timer, Last Time Hints
4. Calculations: 1RM, PR detector, muscle volumes
5. Dashboard + muscle heatmap
6. Analytics: charts, Volume Landmarks
7. Profile + double progression suggestions
