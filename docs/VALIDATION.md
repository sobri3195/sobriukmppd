# Validation tahap kedua — 7 November 2026

Current cloud instance: Node 24.22.1, npm 11.9.0, Linux, system Chromium.

| Check                                                                    | Outcome                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------- |
| `npm run lint`                                                           | Passed                                                  |
| `npm run typecheck`                                                      | Passed, strict mode; includes browser specs and config  |
| `npm test`                                                               | 55 tests passed in 3 files                              |
| `npm run build`                                                          | Passed; 27 precached assets, about 1.10 MB uncompressed |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | 13 tests passed, production preview                     |

Browser checks: onboarding; task creation, completion and reload; timer start, reload recovery and finish; notes autosave and reload; 10-question quiz; bookmarking; locked results; wrong-answer review; flashcard review; OSCE recording; JSON export/import; dark mode and mobile navigation; no mobile horizontal overflow; cached offline nested-route flashcard use; timer expiry with unanswered scoring; invalid-import rejection; corrupt storage recovery without onboarding and raw data preservation. Stage-two regressions also cover blocked result URLs for active quizzes, alternative quiz sizes, immediate note reload, pending-note deletion, persistent sidebar collapse, drawer keyboard focus, quick-add forms, isolated OSCE drafts and expiry locking, actual cross-tab storage events, and dashboard/analytics/material integration without a page reload.

Unit checks: safe storage roundtrip, unavailable/quota storage, migration version gate, backup validation and merge, duplicate IDs, invalid question/station references, scoring and unanswered answers, exact deadline expiry and submission locking, streak/calendar handling, progress/statistics, recommendation ordering/minimum sample handling, deterministic capacity-bounded plans, spaced repetition, XP cap, question structure and seed counts.

Desktop (1440px), mobile (390px), and mobile drawer screenshots were visually inspected. A browser inspection reported zero page errors and no horizontal overflow. No external medical reference verification, clinical validation, full accessibility audit, cloud CI run, new-task snapshot restoration, or Vercel live deployment was performed. Build emits upstream Zod comment-annotation warnings; build output is successful. Earlier runs exposed test-harness selector/clock issues; those were corrected without weakening application assertions. Final full browser suite: 13 passed (49.6 seconds).

Content scope is 36 original questions, 60 flashcards and 12 example OSCE stations. This is not the full requested production specification; see README limitations.

Stage-two unit coverage additionally verifies immediate in-memory/debounced disk updates, lifecycle flush, cancellation of pending note writes, retry after quota errors, preservation of corrupt raw data, recovery failure reporting, clean-tab synchronization and stale/dirty-tab conflicts, timestamped backup envelopes with legacy v1 support, timer pause/resume and idempotent completion, overdue quiz timestamps, per-subject denominators, chronological review selection, bounded recommendations, and exclusion of cancelled attempts.

Remaining limitations are recorded in [AUDIT.md](AUDIT.md). localStorage conflict handling is not an atomic cross-process transaction. Physical PWA installation and live Vercel routing/rollout were not verified. This evidence does not assert clinical validation or completion of the full original content specification.
