# TrainingAR

TrainingAR is a bilingual workout tracker for logging training sessions, tracking progress, and getting AI coaching signals from recent workout data.

## Features

- Workout logging with exercises, sets, weight, reps, RPE, rest time, notes, and mood
- Active workout flow with rest timer, last-session hints, personal record detection, and template updates
- Dashboard with weekly volume, streak status, recent workouts, AI coach insights, and muscle activity periods
- Progress page with 1RM charts, monthly volume, body weight, and height synced with the profile
- Exercise library with localized names, instructions, images, notes, and YouTube technique links
- Workout history, session details, deletion, repeat flow, and CSV export
- Profile settings for weight, height, age, training start date, location, schedule, language, and push notifications
- Bottom navigation for Dashboard, Workouts, Progress, Plan, and Profile
- Russian and English UI via next-intl

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth, PostgreSQL, and RLS policies
- next-intl v4
- Tailwind CSS and shadcn/ui
- Mistral AI for training recommendations
- Vitest and Testing Library

## Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.local.example .env.local
```

Fill in the Supabase keys, Mistral key, and optional VAPID push keys in `.env.local`.

Apply database migrations:

```bash
supabase db push
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev      # start local Next.js server
npm run build    # production build
npm run lint     # lint the project
npm test         # run unit tests
```

## Project Structure

```text
src/
  app/(app)/          authenticated app routes
    dashboard/        main dashboard
    workout/          workout creation and active session
    history/          completed sessions
    progress/         charts and body metrics
    records/          personal records
    profile/          user settings
  components/
    dashboard/        dashboard widgets and muscle activity
    progress/         progress charts and body metrics
    workout/          workout logging UI
    profile/          profile settings widgets
  lib/
    db/               Supabase query helpers
    services/         analytics, AI insights, PR detection
    types/            shared model types
    utils/            BMI, 1RM, plates, formatting helpers
  messages/           English and Russian translations
supabase/
  migrations/         database schema changes and RLS policies
```

## Notes

- Server actions verify the current user session before mutating data.
- Supabase RLS keeps user-owned data scoped by `user_id`.
- AI recommendations use `MISTRAL_API_KEY`.
- Achievements and body measurement pages were removed; profile and progress now own body weight and height.
