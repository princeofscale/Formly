# AGENTS.md

## Project

Formly is a mobile-first gym tracker and PWA. It records workouts, analyzes progress, supports offline workout completion, sends push notifications, and produces Mistral-powered coaching insights.

## Stack and structure

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- Supabase/PostgreSQL with RLS; migrations live in `supabase/migrations/`.
- Routes live in `src/app/`; reusable UI in `src/components/`.
- Business logic belongs in `src/lib/services/`; database access belongs in `src/lib/db/`.
- Shared models belong in `src/lib/types/`; translations live in `messages/`.
- Tests are colocated as `*.test.ts` or `*.test.tsx`.

Prefer small functions and composition. Add a class only when stateful domain behavior genuinely benefits from one; do not create speculative abstractions or repositories around the existing Supabase data layer.

## Commands

```bash
npm install
npm run dev
npm run format:check
npm run lint
npm run typecheck
npm run knip
npm run ts-prune
npm run test
npm run build
```

Run the checks relevant to every changed area. Before release, run the full validation set used by `.github/workflows/ci.yml`.

## Invariants

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `MISTRAL_API_KEY`, VAPID private keys, or Vercel tokens to client code or Git.
- Preserve Supabase RLS and user scoping in every data query.
- Add database changes as new migrations; never rewrite an applied migration.
- Keep auth pages cheap to render: no continuous full-screen animation, moving blur, or pointer-driven background effects.
- Preserve the IndexedDB name `trainingar-offline`; changing it would strand existing users' queued offline data.
- Keep Russian and English message keys in sync.
- Maintain mobile and offline behavior when changing workout flows.

## Change log and releases

- Every code, UI, dependency, infrastructure, documentation, or security change must be recorded under `Unreleased` in `changelog.md` using Keep a Changelog categories.
- Use semantic versions. Release tags have the form `vX.Y.Z` and trigger the production Vercel workflow.
- Keep `package.json`, `package-lock.json`, the README version badge, and `changelog.md` aligned for each release.
- Do not commit `.env*`, `.vercel/`, generated build output, or the ignored `docs/` workspace.
