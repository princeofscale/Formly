<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GymLog — agent guidelines

## Before writing any code
1. Read `CLAUDE.md` for project conventions
2. Check `src/lib/types/models.ts` for existing types — don't redefine
3. Check `src/lib/db/` for existing query functions — don't duplicate

## Next.js 16 specifics
- `params` and `searchParams` in page components are `Promise<{...}>` — always `await` them
- Server actions must have `'use server'` at the file top
- Use `revalidatePath()` after mutations that affect cached pages

## Supabase
- Never write raw Supabase queries in components or actions — always add a function to `src/lib/db/`
- RLS is enforced — all queries are scoped to `user_id` via the authenticated client
- When adding a new table, write a migration in `supabase/migrations/` and add RLS policies

## i18n
- Every new UI string needs a key in both `messages/en.json` AND `messages/ru.json`
- next-intl v4 syntax: `{name}` interpolation in message strings

## Workout flow
- Active session = `workout_sessions` row with `finished_at IS NULL`
- Only one active session per user at a time (enforced in server actions)
- Sets are in `set_entries` — always include `calculated_1rm` (use `calculate1RM()` from `@/lib/utils/one-rep-max`)
