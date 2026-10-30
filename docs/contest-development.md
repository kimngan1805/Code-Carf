# Contest tasks 64, 76, 77, and 78

Tasks 64, 76, and 77 are merged into `main`. Task 78 lives on `feat/78-contest-deadline-and-auto-submit`, based on that main. Review this branch into `main`.

Task 78 adds `ContestDraft`, `Submission.autoSubmitted`, contest duration and shared exam dates, and each participant's `startedAt` / `deadlineAt`, with no new dependencies. Apply migrations and regenerate Prisma Client before running the updated app:

```powershell
npx.cmd prisma generate
npm.cmd run db:deploy
```

## Local use

For an immediately playable deadline demo, start the app and run:

```powershell
npm.cmd run demo:contest -- 2 1
```

This creates a contest with two code exercises and no camera requirement: one minute to register, followed by a two-minute shared exam window. Register immediately, watch the registration countdown, then start when the exam opens. A late starter has less time because no answer may pass the shared closing. Each run creates a fresh contest. The arguments are exam minutes and registration minutes; defaults are five and two. Only local development databases are supported.

Start the database, apply migrations, seed the sample accounts, and start the app as described in the README. Open `/contests` after signing in as a student.

- `/contests`: published contests filtered by the shared exam status (upcoming, ongoing, ended), with a separate registration badge. An upcoming contest can already accept registration. Times use `Asia/Ho_Chi_Minh`.
- `/contests/[slug]`: registration opening/closing, exam opening/closing, duration, and start/continue actions. The countdown progresses through registration closing, waiting for exam opening, and exam closing. Missing or unpublished slugs return HTTP 404.
- `/contests/[slug]/play`: statements, public samples, editor, and submission history. Entry requires an explicitly started, unexpired personal attempt. Opening this URL before starting redirects to the detail page without starting a clock.

Task 64 supplies the registration button UI; task 76 connects it to the registration API. The database's participant key prevents duplicates, and simultaneous registration requests return the same registration.

## Registration and personal attempts

`Contest.startsAt` / `endsAt` open and close registration **before** the shared exam window `examStartsAt` / `examEndsAt`. The database rejects a registration closing after exam opening. Students register in advance, then wait. Being published or registered alone does not unlock the exam; the server checks the shared exam window on starts, statements, draft saves, and submissions.

During the shared window, `POST /api/contests/[slug]/start` locks the participant, sets `startedAt` to server time, and stores `deadlineAt = min(startedAt + durationMinutes, examEndsAt)`. Repeated or simultaneous starts never reset the clock. The effective deadline is also clamped to the current shared closing, so bringing that closing forward stops all remaining students. Different students may start at different times but nobody gets extra time past the shared closing.

Existing registrations stay unstarted; `joinedAt` is not a start time. Migration backfills shared exam dates from previous registration closing and preserves historical attempts by extending the legacy exam window to cover their stored times. It never deletes submissions or resets completed attempts. New seed/demo data explicitly separates registration and exam windows.

Task 77 calls stream B's `submitSolution` implementation from `main`. The contest layer checks authentication, entry time, and participation; grading validates the exercise, limits submission frequency, runs its test cases, and stores the final status and score. The contest API maps `submissionId` to the history row's `id` and uses its saved creation time. Hidden test data stays excluded from results.

The editor uses the grading stream's supported languages (Python, C++, Java, JavaScript) and shared 64 KB source limit. `GRADER_ADAPTER` selects mock or Judge0. In mock mode code is not executed, but the grading stream treats mocked tests as passing for local development; history labels these results as simulated. Judge0 performs real execution when configured and available.

The server checks the participant, exercise membership, and time before storing a submission. Hidden tests and other students' submissions are excluded from workspace queries. A contest requiring face checks cannot be entered until `faceVerifiedAt` exists; camera verification belongs to task 65.

The timer displays the authenticated participant's `deadlineAt`, advances with `performance.now()`, and resynchronizes with server time every 15 seconds, on returning to the tab, and on reconnecting. Reloading does not restart the duration. Source drafts are local to the browser and keyed by user, contest, exercise, and language. The simple editor works as a fallback when the advanced editor cannot load.

## Deadline behavior (task 78)

While the student's personal attempt is active, the editor synchronizes to `PUT /api/contests/[slug]/draft`. Writes are debounced by 300 ms and serialized so an older request cannot overwrite a newer edit from the same page. The page reports whether the server snapshot has been saved. Local drafts remain available if synchronization fails. With multiple tabs, the last snapshot accepted by the server is the active snapshot.

At expiry the editor becomes read-only and the page calls `POST /api/contests/[slug]/finalize`. This endpoint accepts no new source: it finalizes only the last active snapshot accepted before the deadline. A participant row lock serializes draft writes, manual submissions, and finalization. The final submission ID is stored with the draft and `finishedAt` closes the attempt, so parallel calls, retries, and reloads reuse one submission. An identical manual answer is reused; an empty draft or an active handwritten exercise does not create an empty code submission.

Automatic submissions use the same grading pipeline but do not consume a new manual submission rate-limit slot. An atomic `PENDING` to `RUNNING` claim prevents concurrent grading. History marks newly created automatic answers as **Tự nộp**. A delayed manual request rechecks server time under the participant lock immediately before its insert and is rejected at or after that student's `deadlineAt`.

If connectivity fails at expiry, the page retries finalization. Returning to `/contests/[slug]/play` after expiry opens a result-recovery page without reopening statements or accepting late edits. Finalization is triggered by an open page or a returning student, rather than a background scheduler. Only code successfully synchronized before the deadline is eligible; unsynchronized last-second or offline edits stay local and cannot be submitted after the deadline. Anti-cheat events and warnings remain tasks 42 and 43.

To try this manually, create the demo above, register during its first minute, and check that starting early is blocked. After registration closes and the exam opens, click **Bắt đầu làm bài**. Edit and wait for **Đã đồng bộ bài đang mở**. At expiry the editor locks and the result appears once. In another account, register in advance but start later: its deadline cannot go beyond the same shared closing. Reloading must not reset either clock.

## Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

If Windows locks the Prisma engine because a development server is already running, stop that server before `npm.cmd run build`. When the schema is unchanged and Prisma Client has already been generated, the equivalent Next compilation can be checked with `npx.cmd next build --webpack`.

To check real HTTP requests and PostgreSQL behavior, run the app against a local development database and execute:

```powershell
node scripts/check-contest-flow.mjs
```

For a server on another local port:

```powershell
$env:CONTEST_CHECK_URL = "http://localhost:3100"
node scripts/check-contest-flow.mjs
```

The script creates temporary accounts, contests, and exercises and signs in through the credentials flow. It checks advance registration, blocked early starts, registration/exam countdown labels, upcoming contests that already accept registration, parallel starts, personal duration capped by shared closing, two students, immutable reloads, privacy, late edits, simultaneous finalization, and recovery. Fixtures are removed in `finally`; existing records are unchanged. Run only against a local development database. This HTTP check does not exercise browser rendering or webcam behavior.
