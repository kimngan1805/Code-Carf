# Student exercise reports (#46)

Learners can open **Báo lỗi đề** on the practice exercise page (`/hv/exercises/<id>`) or on an exercise card in an unlocked Room (`/hv/rooms/<id>`). Room cards support both code and handwritten exercises. Choose **Đề bài sai**, **Test sai**, or **Đề bài mơ hồ**, then enter a description and submit. The form shows pending, confirmation, validation, cooldown, and server-error messages without navigating away from the editor or changing the code draft.

Descriptions are trimmed, required, and limited to 2,000 characters. Each learner can send one report per exercise in a rolling five-minute window. Changing the message or category does not bypass the limit. Other learners and exercises have independent limits. A PostgreSQL transaction-scoped advisory lock serializes concurrent requests for the same learner/exercise, so multiple tabs or app instances cannot create a burst of duplicate reports. The transaction reads existing reports to enforce the limit; restarting the app does not reset it. Failed inserts roll back and do not consume the cooldown.

The service requires the live `STUDENT` role and calls `canAccessRoom` before writing. Missing, contest-only, unpublished, unenrolled, and sequentially locked content cannot be reported through this practice workflow. The browser only supplies the exercise ID, kind, and description. User identity comes from the session and Room identity comes from the exercise in the database. An additional check inside the write transaction rejects stale Room links or unpublished Paths. Reports store foreign keys to the learner, exercise, and Room plus kind, description, and creation time. Deleting those records cascades to their reports. Report descriptions remain plain text; no HTML is rendered.

This issue adds the learner flow and durable records. Teacher report handling is a separate task under F11; this PR does not add a teacher inbox or send notifications. The data is available through the Prisma `exerciseReport` model for that integration.

## Setup

No new environment variables or packages are needed. Apply the migration and regenerate the client:

```powershell
npm run db:deploy
npx prisma generate
npm run dev
```

Sign in as `student@local.test` after `npm run db:seed`, enroll in a published Path and open its first Room. Expand an exercise's report form or open **Làm bài** for a code exercise. The seed credentials are described in README.

## Verification

```powershell
npx vitest run src/features/exercise-reports
npx tsx scripts/check-exercise-reports.ts
npm run lint
npm run typecheck
npm test
npm run build
```

The database check creates temporary fixtures and removes them afterward. It submits eight simultaneous requests and asserts exactly one stored report, checks category/message changes cannot bypass the cooldown, verifies independent users/exercises, advances a stored timestamp to test cooldown expiry, and checks Room linkage and publication changes. Service tests cover authentication/role checks, locked content, malicious identity fields, all report kinds, and validation boundaries.
