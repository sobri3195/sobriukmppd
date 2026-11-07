# Validation — 7 November 2026

Current cloud instance: Node 24.22.1, npm 11.9.0, Linux, system Chromium.

| Check | Outcome |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed, strict mode; includes browser specs and config |
| `npm test` | 35 tests passed in 2 files |
| `npm run build` | Passed; 24 precached assets, about 1.08 MB uncompressed |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | 7 tests passed, production preview |

Browser checks: onboarding; task creation, completion and reload; timer start, reload recovery and finish; notes autosave and reload; 10-question quiz; bookmarking; locked results; wrong-answer review; flashcard review; OSCE recording; JSON export/import; dark mode and mobile navigation; no mobile horizontal overflow; cached offline nested-route flashcard use; timer expiry with unanswered scoring; invalid-import rejection; corrupt storage recovery without onboarding and raw data preservation.

Unit checks: safe storage roundtrip, unavailable/quota storage, migration version gate, backup validation and merge, duplicate IDs, invalid question/station references, scoring and unanswered answers, exact deadline expiry and submission locking, streak/calendar handling, progress/statistics, recommendation ordering/minimum sample handling, deterministic capacity-bounded plans, spaced repetition, XP cap, question structure and seed counts.

Desktop (1440px) and mobile (390px) dashboard screenshots were visually inspected. No external medical reference verification, clinical validation, full accessibility audit, cloud CI run, new-task snapshot restoration, or Vercel live deployment was performed. Build emits upstream Zod comment-annotation warnings; build output is successful. Earlier five/six-test browser runs also passed; final result is the seven-test suite above.

Content scope is 36 original questions, 60 flashcards and 12 example OSCE stations. This is not the full requested production specification; see README limitations.
