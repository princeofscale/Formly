# Changelog

All notable changes to Formly are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.2.1...HEAD)

### Fixed

- Restored push notifications for Edge on Windows. Tightening the stored endpoints to known browser push services left out Windows Push Notification Services, which hands out per-region hosts, so every Edge registration was rejected by the database. Subdomains of the WNS domain are now accepted, and a lookalike domain still is not.
- Sent each reminder at most once per athlete per local day. Nothing recorded what had already gone out, so the daily and smart sweeps could both reach the same person in the same hour, and re-running a sweep sent everything a second time. A sweep now claims a delivery permit before it sends and stays quiet if one already exists.
- Kept the offline page available after signing out. Clearing private data on sign-out deleted the whole page cache, whose only occupant is the public offline screen, so the next time the athlete lost signal the browser showed its own error page instead. The cache is now re-primed straight after it is cleared.
- Stopped the rest-timer notification from disappearing when the browser shut the service worker down mid-set. The deadline lived only in a pending timeout, which died with the worker; it is now also stored, and any wake-up — the worker starting again, or the tab regaining focus — delivers a deadline that has already passed. Background delivery stays best-effort.
- Finished the same workout the same way whether or not the phone had signal. A workout completed offline was flushed through an older path that recomputed tonnage in the browser and wrote it directly, so it produced no finished-workout event, no volume record, and no streak milestone. Both entry points now run the one atomic completion, and the streak is evaluated once behind it.
- Stopped a permanently unsyncable offline record from blocking the queue behind it. A set belonging to a session that was already finished, deleted, or logged under a previous account on a shared device came back as a server error, which the queue reads as "try again later" and retried forever. Such failures are now reported as permanent, move to the dead-letter store, and let the rest of the queue drain.

## 1.2.1 - 2026-07-26

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.2.0...v1.2.1)

### Fixed

- Moved the hourly daily-reminder and smart-reminder sweeps off Vercel cron and onto a GitHub Actions schedule. A Hobby account rejects any cron that runs more than once a day, so the 1.2.0 production deployment failed on the configuration before any code was built. The sweeps have to run hourly to reach each athlete in their own local hour, so shortening them to once a day would have removed the point of the per-profile time zones shipped in the same release. The endpoints authorize on `CRON_SECRET` rather than on the caller, so the schedule can live outside Vercel unchanged. The nightly session auto-finish stays on Vercel cron, which is within the Hobby limit.

## 1.2.0 - 2026-07-26

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.1.0...v1.2.0)

### Added

- Added a unified friends activity feed: see when friends finish a workout, set a weight or volume PR, reach a training-streak milestone, or step into the gym live.
- Added five emoji reactions (🔥 💪 👏 🐐 🤯) and inline comments on every activity event, with push notifications when a friend reacts to or comments on yours.
- Added blocking: hard-block a friend to end the friendship, hide both athletes from each other everywhere, and prevent re-adding by code.
- Added a “Share activity” privacy toggle to the profile so athletes can keep their workouts, PRs, and streaks out of friends' feeds.
- Added a thread with the AI coach: ask about your own training or about training in general, from the coach card or from a “Why this?” link under any piece of advice or debrief point. Answers drawn from your data carry the figure they rest on; general recommendations say so outright. Limited to 20 questions a day.
- Added 1:1 direct messaging with friends: open a thread from a friend's message icon, send messages (updated by polling + push), delete your own, see "seen" receipts, and track unread counts with a badge on the friend row. Blocking severs the conversation both ways.
- Added per-profile IANA time zones and enabled the smart-reminders cron so schedules, streaks, measurements, AI days, and localized push copy follow each athlete's local day.
- Added ten gym machines the catalog had no entry for at any equipment type: assisted pull-up and dip stations, machine lateral raise, machine pullover, pendulum and belt squats, the hip thrust machine, chest-supported row, machine back extension, and machine glute kickback — each with a Russian name, search aliases, and instructions.

### Changed

- Expanded the project agent guidance with repository boundaries, security and offline invariants, GitNexus workflows, validation rules, and release procedures; added the root `.gitnexusrc` configuration for the Formly repository.
- Excluded the local GitNexus index from ESLint scans so generated tooling files do not fail the pre-push check.
- Replaced the friends' PRs feed with the unified activity feed, backed by a new `activity_events` table and `SECURITY DEFINER` feed RPCs; every cross-athlete read now excludes blocked pairs.
- Consolidated high-confidence duplicate system exercises while preserving workout history, notes, videos, goals, aliases, and localized catalog metadata.
- Repaired saved workout templates that referenced an exercise removed by catalog deduplication.
- The next-set hint during a workout now reports the weight change (“+2.5 kg”, “Same weight”, “−5 kg”) and states what the previous set showed, instead of issuing commands such as “Push it” or “Hold”.
- Every AI prompt now shares one tone contract: no slang, no imperative commands, gender-neutral phrasing, and each statement grounded in a figure from the athlete's own data. Exercise alternatives now explain what they share with the original.
- Post-workout debriefs now show the figure behind each point on its own line, matching how the dashboard coach already displays its evidence. Debriefs generated before this change keep rendering unchanged.
- Split English and Russian UI messages into feature-focused JSON modules, added strict locale/message-key typing and key-parity coverage, and limited client-side message payloads by application surface.
- Disabled automatic Vercel deployments for branch pushes; production deploys now run only through the release-tag workflow.
- Standardized release headings, comparison links, and contributor release instructions.
- Moved onboarding, warm-up insertion, online workout completion/activity events, body-metric logging, and generated-template saves into atomic PostgreSQL functions. Workouts finished from the offline queue still take the older path and do not yet emit activity events.
- Moved performed-exercise, previous-set, recent-weight, and streak-date reads into grouped database queries; large Wrapped reports now paginate instead of silently stopping at 10,000 sets.
- Consolidated repeated Mistral content extraction into one tested adapter and completed the generated database typings needed by the new schema and RPCs.

### Security

- Updated ESLint 9, aligned `eslint-config-next` with Next.js 16.2.11, removed the redundant `ts-prune` checker, and updated compatible `brace-expansion` paths to 5.0.8. The blocking dependency audit now targets the production tree rather than unfixed development-only lint transitive dependencies.
- Stopped caching authenticated workout HTML, isolated offline records by account, and cleared private browser storage on sign-out.
- Made AI quota consumption atomic and fail-closed behind an RLS-protected RPC, and revoked direct authenticated access to universal activity-event emission.
- Removed query strings and fragments from browser error reports, redacted token-like values, bounded and rate-limited the endpoint, and rejected external post-auth redirects.
- Removed anonymous execution from every privileged RPC, restricted global stale-session cleanup to `service_role`, and added database rate limits for messages, comments, reactions, and test pushes.
- Restricted stored Web Push endpoints to supported browser push services and rejected arbitrary outbound targets.
- Added runtime schemas and database bounds for profile/body metrics, AI program input, push subscriptions, CSV formula cells, RPC limits, photo MIME/size, captions, notes, and unique photo paths.

### Fixed

- Validated the locale cookie before loading a dictionary and localized the remaining warm-up, notification, weight-unit, and relative-time UI strings.
- Made offline set synchronization idempotent with a database mutation key and moved invalid client records to a dead-letter queue so one bad item no longer blocks later sets.
- Awaited social push and activity side effects before server actions finish instead of leaving work behind in a terminated serverless invocation.
- Persisted locale in profiles, localized scheduled notifications, and changed daily/smart reminder calculations from UTC to each profile's time zone.
- Preserved pre-upgrade offline queue records and added database validation plus safe cron fallback for profile time zones.
- Eliminated workout-page previous-set N+1 reads, corrected server-action UUID validation, and made session deletion rely on its transactional cascade.
- Stopped verifying the session on public pages for visitors who carry no session cookie. Every request, including a first visit to the sign-in page, waited on a network call to Supabase Auth before any HTML was sent. Private routes are unaffected and still verify on every request.
- Stopped smart reminders from telling every athlete they had skipped shoulders. The reminder built its list from a `shoulders` muscle label that left the database enum in favour of front, side, and rear delts, so the lookup never matched a logged set. Lat work now counts towards back for the same reason.
- Merged the catalog rows that shared a Russian name but kept an English `name`, which the earlier deduplication pass skipped by design and which showed up as visible twins in the exercise picker. Workout history decides which row survives, saved templates are remapped in the same transaction, and walking lunges are renamed rather than merged because they are a separate movement from stationary dumbbell lunges.

### Removed

- Removed unused heatmap, weak-point, exercise-card, muscle-icon, avatar, cardio-query, note-query, calendar-query, and push-subscription code confirmed unreachable by Knip and reference search.

## 1.1.0 - 2026-07-23

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.0.2...v1.1.0)

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

## 1.0.2 - 2026-07-22

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.0.1...v1.0.2)

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

## 1.0.1 - 2026-07-22

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.0.0...v1.0.1)

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

## 1.0.0 - 2026-07-22

[View release](https://github.com/princeofscale/Formly/releases/tag/v1.0.0)

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
