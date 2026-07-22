# Changelog

All notable changes to Formly are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Tag-driven production deployments for semantic-version tags.
- A stable Formly-branded Vercel production alias.

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

[Unreleased]: https://github.com/princeofscale/Formly/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/princeofscale/Formly/releases/tag/v1.0.0
