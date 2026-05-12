@AGENTS.md

# GymLog — project conventions

## Stack
- Next.js 16 App Router (server components, server actions, `searchParams` / `params` are Promises)
- Supabase (PostgreSQL + RLS). Client via `createClient()` from `@/lib/supabase/server` in server context
- next-intl v4: `getTranslations()` / `getLocale()` in server components; `useTranslations()` / `useLocale()` in client components
- Tailwind CSS + shadcn/ui. Dark theme: zinc-900 surfaces, zinc-800 borders, amber-500 accent, rounded-sm (0.25rem)

## Key patterns

### Auth
Every page/action calls `verifySession()` from `@/lib/dal` first. Never skip it.

### Server actions
All actions live in `actions.ts` files co-located with their route. Always `'use server'` at the top. Pattern:
```ts
export async function myAction(...): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  // ...
}
```

### i18n
- Translation files: `messages/en.json` and `messages/ru.json`
- Always add keys to both files when adding new UI strings
- Never hardcode English strings in components — use `t('key')`
- Localized exercise names: `locale === 'ru' ? (exercise.name_ru ?? exercise.name) : exercise.name`

### Database
- Migrations in `supabase/migrations/` — name as `YYYYMMDDHHMMSS_description.sql`
- Apply with `supabase db push`
- DB query functions live in `src/lib/db/` — never write Supabase queries directly in components or actions

### Types
All shared types in `src/lib/types/models.ts`

## Active session guard
`startWorkoutAction` and `startFromTemplateAction` in `workout/new/actions.ts` redirect to the existing session if one is active — never create a second unfinished session.

## Templates
Stored as JSONB in `workout_templates.exercises`. When a workout was started from a template, `WorkoutClient` receives `sourceTemplate: {id, name}` and shows "Обновить «name»" instead of a name input, calling `updateTemplateAction` to overwrite the exercises array.
