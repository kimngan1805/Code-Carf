# Contest tasks 64, 76, and 77

Tasks 64 and 76 are merged into `main`. Task 77 is rebased onto `origin/main`; open its review from `feat/77-contest-workspace-and-timer` into `main`. Its diff contains only the workspace and grading integration changes.

Task 77 adds no dependencies or schema migrations. Apply the migrations from `main`, including the `RUNNING` submission status, and regenerate Prisma Client before running the updated app:

```powershell
npx.cmd prisma generate
npm.cmd run db:deploy
```

## Local use

Start the database, apply migrations, seed the sample accounts, and start the app as described in the README. Open `/contests` after signing in as a student.

- `/contests`: published contests with upcoming, live, and ended filters. Times use `Asia/Ho_Chi_Minh`.
- `/contests/[slug]`: description, rules, schedule, countdown, and registration. Missing or unpublished slugs return HTTP 404.
- `/contests/[slug]/play`: statements, public samples, language selection, editor, and the student's last 20 submissions. Entry requires registration and an active contest window.

Task 64 supplies the registration button UI; task 76 connects it to the registration API. The database's participant key prevents duplicates, and simultaneous registration requests return the same registration.

Task 77 calls stream B's `submitSolution` implementation from `main`. The contest layer checks authentication, entry time, and participation; grading validates the exercise, limits submission frequency, runs its test cases, and stores the final status and score. The contest API maps `submissionId` to the history row's `id` and uses its saved creation time. Hidden test data stays excluded from results.

The editor uses the grading stream's supported languages (Python, C++, Java, JavaScript) and shared 64 KB source limit. `GRADER_ADAPTER` selects mock or Judge0. In mock mode code is not executed, but the grading stream treats mocked tests as passing for local development; history labels these results as simulated. Judge0 performs real execution when configured and available.

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
