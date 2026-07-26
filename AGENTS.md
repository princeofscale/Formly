# AGENTS.md

## Project

Formly is a mobile-first gym tracker and PWA for recording workouts, analyzing progress, completing workouts offline, receiving push notifications, and generating Mistral-powered coaching insights.

Priorities, in order:

1. Protect user data and secrets.
2. Preserve workout, authentication, offline, and synchronization behavior.
3. Keep the mobile experience fast and accessible.
4. Make the smallest correct change.
5. Avoid unnecessary abstractions, dependencies, and broad rewrites.

## Stack

- Node.js 24 and npm.
- Next.js 16 App Router.
- React 19 and TypeScript.
- Tailwind CSS 4 and shadcn/ui.
- Supabase/PostgreSQL with Row Level Security.
- next-intl with Russian and English messages.
- Vitest, ESLint, Prettier, Knip, CodeQL, and gitleaks.
- Vercel deployment, Analytics, and Speed Insights.

## Repository map

- `src/app/`: routes, layouts, pages, route handlers, and framework entry points.
- `src/components/`: reusable UI and feature components.
- `src/lib/services/`: business and application logic.
- `src/lib/db/`: Supabase and database access.
- `src/lib/types/`: shared domain and transport types.
- `messages/`: Russian and English translations.
- `supabase/migrations/`: append-only database migrations.
- `scripts/`: maintenance and import scripts.
- `.github/workflows/`: CI, security, release, and deployment workflows.
- Tests are colocated as `*.test.ts` and `*.test.tsx`.

Follow existing boundaries. Do not move database access into UI components or create speculative repository layers around the existing Supabase data layer.

## Engineering rules

### TypeScript and architecture

- Prefer small functions, explicit data flow, and composition.
- Add a class only when stateful domain behavior clearly benefits from one.
- Do not introduce abstractions for a single use case.
- Reuse existing types and schemas instead of creating nearly identical variants.
- Avoid `any`, unsafe casts, non-null assertions, and silent error swallowing.
- Validate untrusted input at system boundaries.
- Keep public APIs narrow and preserve backward compatibility unless a breaking change is explicitly requested.
- Remove dead code created by the change, but do not perform unrelated cleanup.

### Next.js and React

- Prefer Server Components by default.
- Add `"use client"` only when browser APIs, state, effects, or event handlers require it.
- Never import server-only modules or secrets into client components.
- Keep data loading close to the server boundary and avoid unnecessary client waterfalls.
- Preserve loading, empty, error, and offline states.
- Avoid unnecessary effects and duplicated derived state.
- Keep auth pages inexpensive to render. Do not add continuous full-screen animation, pointer-driven backgrounds, or moving blur effects.
- Maintain keyboard navigation, labels, focus behavior, and reduced-motion support.

### Supabase and security

- Never expose `SUPABASE_SERVICE_ROLE_KEY`, `MISTRAL_API_KEY`, VAPID private keys, Vercel tokens, or other server credentials.
- Treat all client input, route parameters, cookies, headers, and database values as untrusted.
- Preserve Row Level Security and authenticated user scoping in every query.
- Never use the service-role client as a shortcut around missing RLS or incorrect user-scoped queries.
- Keep privileged Supabase clients in server-only modules.
- Do not log secrets, authorization headers, private tokens, or complete sensitive payloads.
- Redact sensitive command output.
- Add database changes as new migrations. Never rewrite an applied migration.
- Review destructive SQL, policy changes, and privilege changes explicitly before applying them.

### Offline behavior

- Preserve the IndexedDB database name `trainingar-offline`.
- Do not change persisted offline schemas, queue semantics, identifiers, or conflict behavior without a migration and compatibility plan.
- Offline mutations must remain retry-safe and must not create duplicate workouts or sets.
- Preserve behavior across refreshes, reconnects, interrupted requests, and partial synchronization.
- Test both online and offline paths when changing workout flows.

### Internationalization

- Put user-facing copy in `messages/`, not directly in components.
- Keep Russian and English keys synchronized.
- Preserve interpolation variables and pluralization rules across locales.
- Do not rename or delete a translation key without updating every consumer.
- Technical logs and internal identifiers do not require translation.

## Git and workspace safety

Before editing:

1. Run `git status --short`.
2. Check the current branch.
3. Identify existing uncommitted changes.
4. Preserve unrelated user work.

Do not pull, checkout, create or delete branches, commit, push, force-push, tag, release, or alter remotes unless the user explicitly requests that action.

Never discard local changes to obtain a clean workspace. Do not use destructive Git commands unless explicitly requested and the consequences are explained.

## GitNexus policy

### Goal

Use GitNexus to reduce broad repository searches and unnecessary file reads. The graph is a navigation aid. Source code and tests remain the final authority.

### When to use it

Use GitNexus before source exploration when the task involves:

- an unfamiliar feature or subsystem;
- multiple files or architectural layers;
- shared or exported functions;
- authentication, RLS, database access, offline synchronization, or secrets;
- API routes and their consumers;
- refactoring, renaming, dependency changes, or blast-radius questions;
- bugs whose source is not already localized.

GitNexus is optional for:

- documentation and comments;
- translation copy with known keys;
- CSS-only or visual-token changes;
- snapshots and test data;
- known single-file configuration changes;
- a private local helper whose complete behavior and caller are already visible.

### Token-efficient exploration

For an unfamiliar concept:

1. Run one focused `query` with `maxTokens` between 1200 and 1800.
2. Select the most relevant execution flow or symbol.
3. Run `context` only for the key symbol, also bounded to 1200–1800 tokens.
4. Read the minimum source files needed to verify the graph result.

Do not fetch all clusters, all processes, or full symbol source unless the task explicitly requires an architecture inventory.

Do not run GitNexus and then repeat the same discovery with broad `grep`, `rg`, `find`, or directory-wide file reads. Use targeted text search only when the graph result is incomplete, ambiguous, or stale.

Prefer one strong query over many slightly different queries. Include the feature, action, and relevant boundary in the search, for example:

```text
offline workout completion synchronization Supabase retry
```

### Impact analysis

Run `impact` before changing:

- an exported or shared function, method, class, type, or schema;
- a function used from multiple files;
- a signature, return shape, side effect, persistence rule, or error contract;
- authentication, authorization, RLS, offline queue, synchronization, or API behavior.

Start with a compact report:

```text
impact({
  target: "symbolName",
  direction: "upstream",
  summaryOnly: true,
  maxDepth: 2,
  maxTokens: 1200
})
```

Expand the result only when:

- risk is MEDIUM, HIGH, CRITICAL, or UNKNOWN;
- the symbol is ambiguous;
- affected processes are unexpected;
- the planned change crosses subsystem boundaries.

Use `target_uid` or `file_path` instead of repeating ambiguous name searches.

Warn the user before proceeding when the result is HIGH or CRITICAL. For UNKNOWN risk, verify with targeted source reads before editing.

### API changes

- Use `route_map` to identify route handlers and their frontend consumers.
- Run `api_impact` before changing an API route, method, request contract, response contract, or status behavior.
- Run `shape_check` when response properties are added, removed, renamed, made optional, or change type.
- Preserve existing error and authorization semantics unless the change explicitly targets them.

### PDG usage

Do not use PDG for routine navigation.

Use `impact` with `mode: "pdg"`, `pdg_query`, or `explain` only for:

- security and taint analysis;
- authorization and guard conditions;
- RLS-sensitive data flow;
- offline synchronization and conflict handling;
- tracing a variable from input to database, network, log, or UI sink;
- debugging control flow where ordinary callers and callees are insufficient.

Use a line anchor when the relevant statement is known. Avoid dumping an entire function-level PDG into context.

### After editing

Run `detect_changes` once after the implementation is complete and before committing or presenting a substantial review.

Use:

```text
detect_changes({ scope: "all" })
```

For a multi-file change, regression review, or release preparation, compare against the default branch:

```text
detect_changes({
  scope: "compare",
  base_ref: "main"
})
```

Do not repeatedly run `detect_changes` after every small edit.

### Index management

- Do not rebuild the index on every source edit.
- Reindex when GitNexus reports staleness, after a commit containing structural changes, or before a graph-heavy review when the index is outdated.
- Preserve this manually maintained `AGENTS.md`.
- Refresh the PDG index and repository-specific skills with:

```bash
node .gitnexus/run.cjs analyze --pdg --skills --skip-agents-md
```

- If the local runner is unavailable, use:

```bash
gitnexus analyze --pdg --skills --skip-agents-md
```

- Use `gitnexus analyze --repair-fts` only when FTS is missing or damaged.
- Do not commit `.gitnexus/`. It is local index storage.
- Generated GitNexus area skills may be regenerated. Do not place permanent project policy inside generated skill files.

## Implementation workflow

For non-trivial work:

1. Clarify the intended behavior from the request and existing code.
2. Inspect workspace state without modifying Git history.
3. Use GitNexus according to the policy above.
4. Read the smallest relevant set of source files and tests.
5. Identify the root cause and affected contracts.
6. Implement the smallest coherent change.
7. Add or update tests for behavior, regression cases, and failure paths.
8. Update translations, documentation, and changelog when affected.
9. Run relevant validation.
10. Run one final GitNexus change-impact check when appropriate.
11. Report the result, exact checks, remaining risks, and anything not verified.

Do not begin with a repository-wide rewrite. Do not replace established patterns solely because another pattern is fashionable.

## Validation

Available commands:

```bash
npm install
npm run format:check
npm run lint
npm run typecheck
npm run knip
npm run test
npm run build
npm run audit
```

Choose checks based on the change:

- Markdown or documentation only: `npm run format:check`.
- TypeScript or React: `npm run lint`, `npm run typecheck`, and relevant tests.
- Shared business logic: relevant tests, then `npm run test`.
- Authentication, database, offline, or synchronization: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- File moves, exports, or removals: include `npm run knip`.
- Dependencies or lockfiles: include `npm run audit` and `npm run build`.
- Release preparation: run the complete validation set used by CI.

Do not run `npm install` unless dependencies are missing or package metadata changed.

Never claim a command passed unless it was run successfully. Report skipped or failing checks exactly.

## Changelog and releases

- Record every user-visible, behavioral, dependency, infrastructure, documentation, or security change under `Unreleased` in `changelog.md`.
- Use Keep a Changelog categories.
- Use release headings in the exact form `## X.Y.Z - YYYY-MM-DD`, without brackets.
- Put an explicit `Compare changes` link below every released heading.
- `Unreleased` compares the latest tag with `HEAD`.
- Normal development does not change the version or create a tag.
- Patch releases are the default. Use a minor release only for a substantial feature set or product milestone.
- Release tags use `vX.Y.Z` and are the only production deployment trigger.
- Do not create a version, tag, GitHub Release, or production deployment unless explicitly requested.
- During a release, align `package.json`, `package-lock.json`, the README version badge, and `changelog.md`.

Do not commit `.env*`, `.vercel/`, build output, local indexes, credentials, or ignored workspace files.

## Final report

After completing work, report:

- what changed and why;
- affected files and behavior;
- GitNexus risk or impact findings when used;
- commands run and their exact results;
- checks not run and why;
- remaining assumptions, risks, or follow-up work.

Keep the report concise. Do not paste large command logs or expose sensitive values.
