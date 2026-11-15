# Code Carf

Scaffold for a learning and coding contest platform. The repository contains architecture, authentication, role guards, schema, sample data, grading adapters, and team tooling. Product workflows are intentionally not implemented yet.

## Requirements

- Node.js 22 (`.nvmrc`), npm, Docker Compose
- PostgreSQL 16 locally or a Supabase PostgreSQL connection

## First run

1. Clone this repository and run `nvm use` (or install Node.js 22).
2. Run `cp .env.example .env`. Set `POSTGRES_PASSWORD` and use the same password in `DATABASE_URL`. Generate a random `AUTH_SECRET` of at least 32 characters, for example with `openssl rand -base64 48`.
3. Run `npm ci`.
4. Run `docker compose up -d db`.
5. Run `npm run db:migrate` and `npm run db:seed`.
6. Run `npm run dev`, then open `http://localhost:3000`.

The seed creates `student@local.test`, `teacher@local.test`, `admin@local.test`, and `grader@local.test`. Their local password is `SEED_PASSWORD` from `.env`, or `LocalDev123!` if unset. Change it before sharing a database. The seed also creates a path, room, exercise, contest, grader assignment, enrollment, and badge.

Paths are drafts by default (`Path.published = false`). The seed explicitly publishes its sample paths. After applying the path-publication migration, existing non-seed paths stay hidden until published. Learners can browse `/paths`, open `/paths/<slug>`, and enroll once; progress is the rounded percentage of rooms with a `RoomProgress` record for that learner (zero for an empty path).

Sequential room unlock is enabled by default (`Path.sequentialUnlock = true`). Enrolled learners can open the first room of a published path; later rooms require a `RoomProgress` record for the immediately preceding room in position order. Gaps in positions are supported. Set `sequentialUnlock = false` to open all rooms of that path for enrolled learners. Progress is read on every request, so completing the preceding room unlocks the next immediately. Room pages, the room API, and practice submissions enforce the same rule; contest submissions retain their separate contest authorization. The richer Room learning UI is tracked in #13.

For an app container, run `docker compose up --build app`; Compose applies migrations before starting the app. Seed with the local npm command after the database is running. To use Supabase, set `DATABASE_URL` to its PostgreSQL connection string and skip the local `db` service.

## Judge0

Local development uses `GRADER_ADAPTER=mock`; it returns `MOCKED` and never executes code. For Judge0, set `GRADER_ADAPTER=judge0`, provide `JUDGE0_POSTGRES_PASSWORD`, `JUDGE0_REDIS_PASSWORD`, and `JUDGE0_SECRET_KEY` in `.env`, then run `docker compose --profile judge0 up -d`. The optional profile runs a Judge0 server, worker, PostgreSQL, and Redis. Judge0 requires privileged containers and is primarily supported on Linux. The adapter is an integration boundary; submission workflows are future sprint work.

## Code layout

| Location                              | Purpose                                              |
| ------------------------------------- | ---------------------------------------------------- |
| `src/app`                             | App Router pages and thin API handlers               |
| `src/features/<module>/components`    | Feature UI                                           |
| `src/features/<module>/service.ts`    | Authorization and orchestration                      |
| `src/features/<module>/repository.ts` | Prisma queries                                       |
| `src/components/ui`                   | Shared shadcn-style primitives                       |
| `src/app/globals.css`                 | Design tokens; see `docs/design-system.md`           |
| `src/lib`                             | Database, environment, errors, logging, API response |
| `prisma`                              | Schema, migration, seed                              |
| `src/proxy.ts`                        | Next.js 16 route guard                               |

The module names are `auth`, `paths`, `rooms`, `contests`, `grading`, `leaderboard`, and `admin`. JWT sessions carry the role for quick route checks; services read the current role from PostgreSQL before data access. Role changes therefore take effect in services immediately, while route redirects can lag until sign-in again.

## Data model

`User` belongs to `Role`; `Path` contains ordered `Room`s (theory in `Room.content`, Markdown), which contain `Exercise` and `TestCase`. Exercises have time and memory limits; handwritten exercises carry a `rubric`.

- **Learning:** `RoomProgress` records completed rooms; a room unlocks when the room at the previous `position` is completed. `XpEvent` is the XP ledger (per path, room, or contest) used for per-path and weekly leaderboards; `User.xp` is its running total. Levels are derived from `xp` in code. `User.currentStreak`, `longestStreak`, and `lastActiveOn` track daily streaks. `Badge` and `UserBadge` store achievements.
- **Contests:** `ContestExercise` links reusable exercises to contests with an order and optional point override. `ContestParticipant` stores join time, score, and penalty for the live leaderboard, plus the face reference when `Contest.requireFaceCheck` is set. `ProctoringEvent` logs tab switches, pastes, and face-check failures. `ContestGrader` assigns graders.
- **Submissions:** `Submission.contestId` is null for practice. Code submissions use `source` and `language`; handwritten ones use `imageUrl`. AI grading writes `aiScore` and `aiFeedback` with status `NEEDS_REVIEW`, then a grader sets the final `score` (`reviewerId`, `reviewedAt`).

Contests begin in `DRAFT`; publishing rules will be implemented with the contest workflow, including requiring a grader assignment.

## Team workflow

- Branch from `main`: `feat/<issue-number>-short-name`, `fix/<issue-number>-short-name`, or `chore/<issue-number>-short-name`.
- Make focused Conventional Commits, for example `feat(auth): add role route guard` or `chore(ci): add PR checks`.
- Open a PR for every change. Link the issue, fill the PR template, request review from CODEOWNERS, and wait for CI. Avoid direct pushes to `main` after initial setup.
- Keep migrations in the same PR as schema changes. Never commit `.env` or real credentials.

Suggested semester sequence: sprint 1 foundation and auth; sprint 2 paths and rooms; sprint 3 submissions and Judge0; sprint 4 contests and handwritten grading; sprint 5 leaderboard, XP, badges, and anti-cheat; sprint 6 integration, hardening, and demo. Assign one owner per module and rotate reviewers.

## GitHub task board

[Code Carf Project #2](https://github.com/users/kimngan1805/projects/2) contains 12 Epic issues and 40 task sub-issues from `scripts/seed_sprint_issues.py`. The board uses Backlog, Priority, Estimate, and two milestones named Sprint 1 and Sprint 2. Sprint dates are intentionally blank until the team agrees on them. The task plan totals 160 story points; review capacity and sprint scope before assigning work. The suggested semester sequence above is a planning option, while the imported issue set uses only two sprint milestones from the supplied task list.

To preview the issue plan, run `python3 scripts/seed_sprint_issues.py --repo kimngan1805/Code-Carf --owner kimngan1805 --project 2 --dry-run`. To sync it to GitHub, authenticate with `gh auth login` and `gh auth refresh -s project`, then remove `--dry-run`. The script reuses existing issue titles and project items when rerun. Once dates are agreed, pass all four flags: `--s1-start`, `--s1-end`, `--s2-start`, and `--s2-end` in `YYYY-MM-DD` format.

## Checks

To interactively test sequential room unlock on localhost, set `ROOM_UNLOCK_LAB="1"`, restart the app, and open `/paths/unlock-lab` as a student. This uses a separate per-user test path; see `docs/room-unlock-development.md`. The flag defaults to disabled and requires a loopback host and database.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before a PR. GitHub Actions runs the same checks on every PR. Pre-commit hooks format and lint staged files; commit messages follow Conventional Commits.

## API contract

Successful handlers return `{ "data": ..., "error": null }`. Errors return `{ "data": null, "error": { "code": "...", "message": "..." } }` with an HTTP status. `src/lib/api-response.ts` and `src/lib/logger.ts` centralize this behavior.
