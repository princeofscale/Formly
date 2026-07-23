# Changelog

All notable changes to Formly are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Disabled automatic Vercel deployments for branch pushes; production deploys now run only for semantic-version tags.

## [1.1.0] - 2026-07-23

### Added

- Added an Analytics shortcut card to the dashboard quick-access grid so the analytics page is reachable again.
- Added a weight and height history card to the progress page, backed by a new `body_measurements.height_cm` column; saving body metrics now also logs the day's values.
- Added a searchable exercise picker on the progress and analytics pages that only offers exercises the athlete has actually performed.
- Added a weekly friends leaderboard (friends and you, ranked by tonnage) to the friends page.
- Added seasonal gating for the year-in-review: the dashboard teaser now appears only from December 15 through January 15, and in January it covers the year that just ended.

### Changed

- Progress, records, PRs, friend feeds, strength tiers, session summaries, AI-coach context, and the year-in-review now track the heaviest weight actually lifted instead of the estimated 1RM; new `get_recent_prs`, `get_friends_recent_prs`, and `get_friends_with_stats` migrations rank by working-set weight.
- Renamed the friends experience to official wording (“Друзья”/“Команда”) and removed slang from all UI copy and push notifications.
- Translated muscle names in the volume-landmarks list on the analytics page.
- Redesigned the workout-detail history page: session stat chips, per-exercise cards with muscle glyphs, best-set highlighting, and per-exercise volume.
- The quick-access grid now lays out as 2×2 cards with content-driven height, fixing icons overlapping the History and Records labels.
- Dropped `backdrop-filter` blur on fixed and sticky bars for touch devices and retired the legacy red chart palette in favor of the brand accent, reducing scroll jank on phones.

### Removed

- Removed the sleep tracker, goals, and achievements features, including their dashboard cards, routes, services, and translations (database tables are retained).
- Removed the “First set!” celebration and per-set estimated-1RM readouts from the active workout; a first-ever result now only sets the PR baseline.

### Security

- Upgraded Next.js from 16.2.6 to 16.2.11, resolving nine published advisories including middleware bypass, SSRF in Server Actions, and response-cache confusion.

## [1.0.2] - 2026-07-22

### Added

- Added an Analytics pulse with strength trend, lifetime training volume, and four-week muscle-balance coverage.
- Added localized English and Russian chart empty states, workload labels, and volume-status labels.

### Changed

- Replaced Recharts with accessible native SVG charts and rendered them entirely on the server.
- Deferred the Supabase browser SDK until a progress-photo upload begins.
- Deferred the full exercise catalog picker until the athlete taps “Add exercise”.
- Added a production client-bundle measurement script for repeatable route budget checks.

### Fixed

- Reduced the largest authenticated route’s initial client JavaScript from 506,953 to 244,994 bytes (51.7%) and total compiled client JavaScript by 21.8%.

### Removed

- Removed the unused Recharts dependency and 34 transitive packages.

## [1.0.1] - 2026-07-22

### Added

- Added public athlete display names across profiles, dashboard greetings, friend requests, friend lists, and friend PR activity.
- Added a weekly crew pulse with active gym members, team sessions, and a tonnage leader.
- Added evidence and a concrete next-workout action to AI Coach recommendations.

### Changed

- Redesigned the Dashboard coaching hierarchy so the daily briefing appears before deeper weekly analytics.
- Made AI analysis user-triggered instead of running automatically during the initial Dashboard render.
- Paginated workout history at 30 sessions per page and combined four major-lift progress reads into one database query.
- Moved the full muscle heatmap to Analytics and replaced the hidden Dashboard copy with a lightweight link.
- Replaced lifetime workout downloads on History and Profile with a server-side aggregate and optimized friend statistics into grouped database reads.

### Fixed

- Stopped the bottom navigation from prefetching every heavy application route at once.
- Deduplicated repeated session verification during a server render and removed an unnecessary client-only page transition wrapper.

### Removed

- Removed the unused legacy navigation component and its expensive backdrop blur implementation.

## [1.0.0] - 2026-07-22

### Added

- Complete workout logging for exercises, sets, weight, repetitions, RPE, rest timers, notes, warm-ups, cardio, templates, and preset programs.
- Dashboard, workout history, personal records, goals, body measurements, progress photos, strength ratios, muscle-volume analytics, streaks, and yearly wrapped views.
- Mistral-powered exercise suggestions, program generation, coaching insights, session debriefs, and quota controls.
- Russian and English localization plus a searchable exercise catalog with Russian names, slang aliases, fuzzy matching, and 736 imported exercises.
- Friends, friend requests, personal-record reactions, push notifications, scheduled reminders, and CSV export.
- Offline-capable active workouts with service-worker caching, IndexedDB queues, reconnection merging, idempotent completion, and an offline fallback page.
- PWA installation, Vercel Web Analytics, Vercel Speed Insights, and client-side error reporting.
- Formly banner, application logo, favicon, Apple touch icon, project guide for AI agents, and release documentation.
- GitHub CI, CodeQL, gitleaks, Renovate, pre-commit hooks, linting, formatting, type checks, dead-code checks, tests, and production builds.
- Tag-driven remote Vercel production deployments for semantic-version tags.

### Changed

- Renamed the product and GitHub repository from TrainingAR to Formly throughout the user interface, metadata, legal pages, configuration, and documentation.
- Redesigned authentication, onboarding, dashboard, workouts, friends, progress, profile, records, analytics, and supporting flows for a mobile-first experience.
- Replaced the expensive animated authentication scene with static layered gradients and removed pointer tracking, full-screen blur, SVG noise, and continuous GPU animation.
- Removed thirteen global web-font variants in favor of the native system font stack, eliminating font downloads and layout shifts.
- Consolidated shared legal metadata and hardened authentication redirects, validation, and error handling.
- Simplified analytics cards and removed unused heatmap and weekly-volume UI.
- Updated dependencies and build tooling for Next.js 16, React 19, Node.js 24, and current security fixes.

### Fixed

- Fixed authentication loading, password reset, locale handling, hydration, install prompt, and open-redirect edge cases.
- Fixed exercise search ordering, locale fallback, query limits, AI suggestion validation, and mobile picker behavior.
- Fixed offline workout queue draining, queued-set merging, reload recovery, and duplicate completion.
- Fixed workout, exercise form, profile, dashboard, gitleaks, and Vercel build regressions found during review.

### Removed

- Removed obsolete animated-auth code, unused components, old planning documents, and starter image assets.
- Removed redundant dashboard heatmaps and volume cards.

### Security

- Enforced Supabase Row Level Security and server-only privileged credentials.
- Added CodeQL and gitleaks scanning and patched high-severity dependency advisories.
- Updated vulnerable transitive packages without applying npm audit's incompatible Next.js downgrade.
- Validated redirect destinations and prevented environment-specific database errors from leaking to users.

[Unreleased]: https://github.com/princeofscale/Formly/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/princeofscale/Formly/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/princeofscale/Formly/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/princeofscale/Formly/releases/tag/v1.0.0
