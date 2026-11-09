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
| `src/lib`                             | Database, environment, errors, logging, API response |
| `prisma`                              | Schema, migration, seed                              |
| `src/proxy.ts`                        | Next.js 16 route guard                               |

The module names are `auth`, `paths`, `rooms`, `contests`, `grading`, `leaderboard`, and `admin`. JWT sessions carry the role for quick route checks; services read the current role from PostgreSQL before data access. Role changes therefore take effect in services immediately, while route redirects can lag until sign-in again.

## Data model

`User` belongs to `Role`; `Path` contains `Room`, which contains `Exercise` and `TestCase`. `Contest` can also contain exercises. `ContestGrader` assigns a grader to a contest. `Submission`, `Enrollment`, `Badge`, and `UserBadge` provide the remaining foundations. Contests begin in `DRAFT`; publishing rules will be implemented with the contest workflow, including requiring a grader assignment.

## Team workflow

- Branch from `main`: `feat/<issue-number>-short-name`, `fix/<issue-number>-short-name`, or `chore/<issue-number>-short-name`.
- Make focused Conventional Commits, for example `feat(auth): add role route guard` or `chore(ci): add PR checks`.
- Open a PR for every change. Link the issue, fill the PR template, request review from CODEOWNERS, and wait for CI. Avoid direct pushes to `main` after initial setup.
- Keep migrations in the same PR as schema changes. Never commit `.env` or real credentials.

Suggested semester sequence: sprint 1 foundation and auth; sprint 2 paths and rooms; sprint 3 submissions and Judge0; sprint 4 contests and handwritten grading; sprint 5 leaderboard, XP, badges, and anti-cheat; sprint 6 integration, hardening, and demo. Assign one owner per module and rotate reviewers.

## Checks

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before a PR. GitHub Actions runs the same checks on every PR. Pre-commit hooks format and lint staged files; commit messages follow Conventional Commits.

## API contract

Successful handlers return `{ "data": ..., "error": null }`. Errors return `{ "data": null, "error": { "code": "...", "message": "..." } }` with an HTTP status. `src/lib/api-response.ts` and `src/lib/logger.ts` centralize this behavior.
