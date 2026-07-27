# Changelog

All notable changes to Formly are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.5.2...HEAD)

### Added

- The catalog now distinguishes the regions of a muscle that answer to different work: upper, middle and lower chest, the lower back inside "back", the obliques inside "core" and the soleus inside "calves". Analytics reports the week's sets per region while judging under- and over-training on the muscle as a whole, so an athlete who only ever presses flat can finally see it. Existing exercises are re-tagged from what their names already say — an incline press is upper chest — and exercises you created yourself keep the muscle you gave them.
- A finished workout is now named by the coach: "Chest and triceps" instead of "Barbell Bench Press · Crunches". The name is written in the same reply as the post-workout debrief, so it costs no extra request and no extra AI allowance, and it appears on the dashboard, in history and on the workout itself. Workouts finished before this, and any where the coach could not be reached, keep the exercise list as their name.
- Height now has a history chart of its own on the Progress screen. Weight and height share the card and swap by tapping either stat; they never share an axis, because a centimetre and a kilogram on one scale draw a body change that did not happen.
- Notes written against an exercise during a workout now stay with that workout, and appear under the exercise on its page in history. Starting the same exercise in a later session gives you an empty note instead of a remark about a seat height from three weeks ago. Existing notes are kept and attached to the most recent workout that contained the exercise.

### Changed

- The dashboard coach card and the program generator now run on **Grok 4.5** through the CheapVibeCode gateway instead of Mistral. The gateway speaks the OpenAI chat-completions protocol, so this is one small client over `fetch` rather than a second SDK. The post-workout debrief, the coach chat, exercise swaps and exercise suggestions are unchanged and stay on Mistral. Grok 4.5 reasons before it answers: a program takes between 25 and 50 seconds where Mistral took a few, and a request that outlives the function is abandoned at 55 seconds and reported as a failure you can retry rather than as a platform timeout. Requires `CVC_API_KEY` in the environment.
- Production now deploys only when a GitHub Release is published. Pushing a `vX.Y.Z` tag no longer deploys anything on its own: a tag is bookkeeping, a release is a decision, and until now the two were the same gesture. The release workflow additionally refuses a release whose tag is not `vX.Y.Z` or does not sit on `main`.
- Published the missing GitHub Releases for 1.5.0, 1.5.1 and 1.5.2, which existed as tags and as changelog entries but not as releases.
- Rewrote the privacy policy and the terms of service. Both were carrying `prose prose-invert` without the Tailwind typography plugin installed, so every heading, list and paragraph in them rendered at browser defaults; both now have a document layout with a contents list, numbered sections and a legal-body stylesheet. The Russian text moves from second-person informal to the register these documents are supposed to be written in, and both documents now describe the friends feed, reactions and comments, direct messages, shareable workout links, the AI coach thread and the daily AI allowance — all of which shipped in 1.5.0 and none of which the policy mentioned.
- Added a rule to `AGENTS.md`: a change that touches what data is collected, where it goes, who can see it, or what the operator answers for must update the privacy policy or the terms in the same change.

### Fixed

- A friend is no longer shown as "in the gym" hours after leaving it. Presence was "has an unfinished session started in the last six hours", which is a description of a closed tab as much as of a workout; it is now the athlete's last logged set, and the dot goes out after 45 minutes of nothing.
- The AI program generator now says what went wrong. Every failure inside it reached the browser as Next.js's own paragraph — "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included…" — which the screen printed at the athlete verbatim, under a heading saying the program could not be generated and with no indication of whether to wait, retry or change anything. The allowance being spent, the model returning nothing usable, and everything else are now three written messages, and the cause is recorded in the server log where that digest was pointing all along. The route also declares its own function timeout rather than inheriting a platform default, since a seven-day program is the longest single model call in the application.
- A day the program generator filled entirely with exercises that are not in your library no longer renders as a blank card.
- Removed the scrollbars from the app. On Profile a lifetime tonnage in the millions pushed the stats card wider than the phone, which put a second scrollbar along the bottom of the page; the number now gives way instead, and the scrollbar chrome is gone throughout. Scrolling by wheel, key and touch is unchanged.
- Translated the last English fragments on the Progress screen — "kg", "hold" and "30d" on the major-lift cards — and the "TOP" badge in history.
- The smart reminder no longer reports chest or back as untrained when the week's work went into a region of them.

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.5.1...v1.5.2)

### Added

- A "Warmup" switch on the set you are about to log. Flip it and the set is still written down, but it stays out of volume, records and everything the AI coach reads. Where you mark warm-ups by hand, the automatic guess for that exercise steps aside entirely — a deliberately light working set counts as work again. Marking one while offline survives the sync.

### Fixed

- The equipment picker in "Add your own exercise" showed `exerciseLibrary.equipment…` in every cell instead of Barbell, Dumbbells and the rest, whenever the form was opened from inside a workout. The screen was not given that part of the translations.
- The AI program generator no longer fails on longer splits. The reply was capped at a length a 6–7 day program overruns, and a program cut off mid-object came back as "AI returned invalid JSON". The post-workout debrief had the same ceiling in Russian, where the same text costs about twice the tokens.
- The AI program generator no longer ships the entire exercise catalog to the model on every generation — around 700 exercises, most of them variants of each other. It now takes up to twelve per muscle, compounds and your own exercises first, which makes generation several times faster and cheaper.
- The weekday in the workout header no longer runs over the save-as-template button on a phone.
- The red "Delete" button no longer shows through the "Effort" cell of a logged set. It is drawn only once the row is swiped aside.

## 1.5.1 - 2026-07-27

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.5.0...v1.5.1)

### Added

- The AI program generator now accepts a note in your own words — "shoulder hurts, skip overhead pressing", "more leg work", "keep it under an hour" — and builds the split around it. Leave it empty and nothing changes for you.
- A generated program now rests on what you have actually been training: weekly working sets per muscle, volume landmarks, and top lifts over the last fourteen days. It previously saw only your goal, your days per week, and where you train, though the screen said otherwise.

### Fixed

- Warm-up sets typed in by hand no longer count as working sets for the AI coach. Only warm-ups added through the warm-up button carried a flag, so a hand-logged ramp turned five working sets into eight, inflated every muscle's weekly volume, and had the coach warning about overtraining that was not happening. A ramp is now recognised by its shape — under 70% of the day's top weight and logged before it — so back-off and drop sets, which come after the top set, still count in full. What the session screen shows you is unchanged: it still counts every set you logged.
- The coach no longer calls a high set count overtraining on its own; the warning is now tied to a muscle actually sitting at its recoverable ceiling, and a single workout is never grounds for it.
- Progression suggestions no longer stall on warm-up reps. A three-step ramp made every exercise look like it had missed its rep target, so the coach rarely proposed adding weight.

## 1.5.0 - 2026-07-26

[Compare changes](https://github.com/princeofscale/Formly/compare/v1.1.0...v1.5.0)

### Added

- Added a failure screen for the app. A database read that failed used to be reported as an empty one, so an outage arrived as "you have no workouts" — wrong, and alarming in a training log. Failed reads now say so and offer a retry, and the screen carries the identifier that ties it to the server log.
- Added a shareable link for a finished workout. The card could previously only be fetched by its owner, so a link pasted into a chat was crawled by a bot with no session and never rendered. A share is now its own record with its own random token, carrying a snapshot of what the card showed rather than a pointer to live data — editing or deleting the workout afterwards cannot change or leak anything through a link already sent. Sharing the same workout twice returns the same link, and it can be revoked.
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

### Fixed

- Restored the offline fallback, which had never worked. The service worker caches that page when it installs — before anyone has signed in — but the page required a session, so the fetch was redirected to the sign-in page and the browser refused to store a redirected response. The install handler swallowed the refusal, leaving no fallback to serve and nothing to notice.
- Made the failure screen reach every page and actually render. It sat inside the signed-in section, so onboarding and the sign-in pages still fell back to the browser's own error page — and it asked for wording its own section never handed to the browser, so the screen would have failed while reporting a failure. It now sits at the root with its wording alongside.
- Stopped four more reads outside the data layer from reporting a failure as an empty result: monthly volume, the four-week volume landmarks, the history list's set counts, and the streak-milestone check.
- Let link crawlers actually load a shared workout card. The card shipped behind the blanket rule that every API route needs a session, so Telegram, Discord and the rest received the same refusal the shared snapshot was built to remove — the feature could not have worked for anyone. Access is bounded by the token, which is what it was always meant to be.
- Stopped the personalized reminder from calling the AI outside every quota. `push_hook` had been a declared allowance since quotas were hardened and nothing ever spent it, because the quota identifies the athlete from their session and the reminder sweep has none. The sweep now charges the athlete it is writing for, and falls back to a written message once their allowance is gone.
- Stopped a failed database read from being indistinguishable from an empty one across the data layer. Fifteen reads discarded their error and returned an empty list.
- Read every recipient's training history in one query instead of one per recipient, so the cost of an hourly reminder run follows the number of people actually due a reminder rather than the size of the account list.
- Made the pre-commit hook run its checks one at a time. Running them together was enough to have the linter killed for memory, which surfaced as a lint failure that passed on a plain retry — the kind of failure that teaches you to retry instead of to look.
- Added a continuous-integration check that the committed database types match the schema, and resolved the release the upgrade check starts from instead of pinning it, so it cannot quietly go on testing an upgrade nobody performs.
- Added a continuous-integration check that upgrades a 1.1.0 database holding real rows, not only an empty one. It seeds the duplicates the older schema permitted and runs the cleanup a live upgrade needs first, which puts on record that two migrations add a unique index without removing the duplicates that preceded it.
- Added a continuous-integration check that applies every database migration to an empty database. The existing checks run JavaScript only, so a migration that does not parse, or that names a type the schema no longer has, passed them all and failed at deployment time instead.
- Restored push notifications for Edge on Windows. Tightening the stored endpoints to known browser push services left out Windows Push Notification Services, which hands out per-region hosts, so every Edge registration was rejected by the database. Subdomains of the WNS domain are now accepted, and a lookalike domain still is not.
- Sent each reminder at most once per athlete per local day. Nothing recorded what had already gone out, so the daily and smart sweeps could both reach the same person in the same hour, and re-running a sweep sent everything a second time. A sweep now claims a delivery permit before it sends and stays quiet if one already exists.
- Kept the offline page available after signing out. Clearing private data on sign-out deleted the whole page cache, whose only occupant is the public offline screen, so the next time the athlete lost signal the browser showed its own error page instead. The cache is now re-primed straight after it is cleared.
- Stopped the rest-timer notification from disappearing when the browser shut the service worker down mid-set. The deadline lived only in a pending timeout, which died with the worker; it is now also stored, and any wake-up — the worker starting again, or the tab regaining focus — delivers a deadline that has already passed. Background delivery stays best-effort.
- Finished the same workout the same way whether or not the phone had signal. A workout completed offline was flushed through an older path that recomputed tonnage in the browser and wrote it directly, so it produced no finished-workout event, no volume record, and no streak milestone. Both entry points now run the one atomic completion, and the streak is evaluated once behind it.
- Stopped a permanently unsyncable offline record from blocking the queue behind it. A set belonging to a session that was already finished, deleted, or logged under a previous account on a shared device came back as a server error, which the queue reads as "try again later" and retried forever. Such failures are now reported as permanent, move to the dead-letter store, and let the rest of the queue drain.
- Moved the hourly daily-reminder and smart-reminder sweeps off Vercel cron and onto a GitHub Actions schedule. A Hobby account rejects any cron that runs more than once a day, so the 1.2.0 production deployment failed on the configuration before any code was built. The sweeps have to run hourly to reach each athlete in their own local hour, so shortening them to once a day would have removed the point of the per-profile time zones shipped in the same release. The endpoints authorize on `CRON_SECRET` rather than on the caller, so the schedule can live outside Vercel unchanged. The nightly session auto-finish stays on Vercel cron, which is within the Hobby limit.
- Validated the locale cookie before loading a dictionary and localized the remaining warm-up, notification, weight-unit, and relative-time UI strings.
- Made offline set synchronization idempotent with a database mutation key and moved invalid client records to a dead-letter queue so one bad item no longer blocks later sets.
- Awaited social push and activity side effects before server actions finish instead of leaving work behind in a terminated serverless invocation.
- Persisted locale in profiles, localized scheduled notifications, and changed daily/smart reminder calculations from UTC to each profile's time zone.
- Preserved pre-upgrade offline queue records and added database validation plus safe cron fallback for profile time zones.
- Eliminated workout-page previous-set N+1 reads, corrected server-action UUID validation, and made session deletion rely on its transactional cascade.
- Stopped verifying the session on public pages for visitors who carry no session cookie. Every request, including a first visit to the sign-in page, waited on a network call to Supabase Auth before any HTML was sent. Private routes are unaffected and still verify on every request.
- Stopped smart reminders from telling every athlete they had skipped shoulders. The reminder built its list from a `shoulders` muscle label that left the database enum in favour of front, side, and rear delts, so the lookup never matched a logged set. Lat work now counts towards back for the same reason.
- Merged the catalog rows that shared a Russian name but kept an English `name`, which the earlier deduplication pass skipped by design and which showed up as visible twins in the exercise picker. Workout history decides which row survives, saved templates are remapped in the same transaction, and walking lunges are renamed rather than merged because they are a separate movement from stationary dumbbell lunges.

### Security

- Updated ESLint 9, aligned `eslint-config-next` with Next.js 16.2.11, removed the redundant `ts-prune` checker, and updated compatible `brace-expansion` paths to 5.0.8. The blocking dependency audit now targets the production tree rather than unfixed development-only lint transitive dependencies.
- Stopped caching authenticated workout HTML, isolated offline records by account, and cleared private browser storage on sign-out.
- Made AI quota consumption atomic and fail-closed behind an RLS-protected RPC, and revoked direct authenticated access to universal activity-event emission.
- Removed query strings and fragments from browser error reports, redacted token-like values, bounded and rate-limited the endpoint, and rejected external post-auth redirects.
- Removed anonymous execution from every privileged RPC, restricted global stale-session cleanup to `service_role`, and added database rate limits for messages, comments, reactions, and test pushes.
- Restricted stored Web Push endpoints to supported browser push services and rejected arbitrary outbound targets.
- Added runtime schemas and database bounds for profile/body metrics, AI program input, push subscriptions, CSV formula cells, RPC limits, photo MIME/size, captions, notes, and unique photo paths.

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
