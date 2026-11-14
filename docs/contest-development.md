# Contest tasks 64, 76, and 77

The branches are stacked. Open reviews with these bases:

1. `feat/64-contest-list-and-details` into `main`.
2. `feat/76-contest-registration-and-access` into the branch for task 64.
3. `feat/77-contest-workspace-and-timer` into the branch for task 76.

The final branch contains all three tasks. No schema migration or new dependency is required.

Merge task 64 into `main` first. Then retarget the review for task 76 to `main` and merge it. Finally retarget task 77 to `main` and merge it. Do not merge later tasks back into a branch that has already been merged and retired.

## Local use

Start the database, apply migrations, seed the sample accounts, and start the app as described in the README. Open `/contests` after signing in as a student.

- `/contests`: published contests with upcoming, live, and ended filters. Times use `Asia/Ho_Chi_Minh`.
- `/contests/[slug]`: description, rules, schedule, countdown, and registration. Missing or unpublished slugs return HTTP 404.
- `/contests/[slug]/play`: statements, public samples, language selection, editor, and the student's last 20 submissions. Entry requires registration and an active contest window.

Task 64 supplies the registration button UI; task 76 connects it to the registration API. The database's participant key prevents duplicates, and simultaneous registration requests return the same registration.

Task 77 calls the `submitSolution` stub from the integration contract in issue 62. It saves a `Submission` with `contestId` and status `PENDING`, reports `MOCKED`, and never executes code or awards points. This stub is for contest submissions; practice submissions remain the grading stream's responsibility. Replace the stub when that stream's implementation is ready. It intentionally uses the mock adapter even when Judge0 is configured.

The server checks the participant, exercise membership, and time before storing a submission. Hidden tests and other students' submissions are excluded from workspace queries. A contest requiring face checks cannot be entered until `faceVerifiedAt` exists; camera verification belongs to task 65.

The timer starts from server time, advances with `performance.now()`, and resynchronizes every 15 seconds, on returning to the tab, and on reconnecting. Reloading fetches a fresh server timestamp rather than restarting the competition duration. Source drafts are local to the browser and keyed by user, contest, exercise, and language. The simple editor works as a fallback when the advanced editor cannot load.

At the deadline the editor disables new submissions and keeps the draft. Automatic submission at expiry belongs to task 78 and is not implemented here. Anti-cheat events and warnings belong to tasks 42 and 43.

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

The script creates temporary accounts, contests, and exercises, signs in through the credentials flow, and checks catalog filters, authentication, roles, origin checks, parallel registration, statement privacy, submission ownership, server time, deadlines, and HTTP 404 responses. It deletes its own fixtures in `finally` and leaves existing records unchanged. Run it only against a local development database. This HTTP check does not exercise browser rendering or webcam behavior.
