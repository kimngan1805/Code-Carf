# Teacher exercise report handling (#47)

Teachers open `/gv/reports` from the sidebar. The list and its total count are scoped to reports whose original Room Path and current exercise Path both belong to that teacher; moving an exercise into another teacher's content hides the old report rather than leaking its new title. Admins retain explicit global access. No email, password hash, lesson prompt, rubric, or hidden test data is returned. Lists use a status filter, deterministic newest-first ordering and 20 records per page.

Statuses are `NEW`, `IN_PROGRESS`, and `RESOLVED`. Teachers may move a pending report between New/In progress or resolve it directly. Resolving requires a trimmed, nonempty response up to 2,000 characters. Resolved reports are terminal and cannot be reopened in this issue. The student report description and category are not editable by the handler.

Every action verifies the current database role. The actor/admin flag is derived from the session, never accepted from form fields. Inside one database transaction, row locks protect the report, exercise and Path ownership checks; the version counter rejects stale writes from other tabs. A repeated transition to the current state is an idempotent success. A terminal resolution and its recipient notification commit together. Notification dedupe key `report-resolved:<reportId>` prevents duplicates under concurrent resolve requests; a failed notification write rolls back the resolution.

Learners open `/hv/reports` from the sidebar or the report form. They only see their own reports, responses and unread resolution count. The page refreshes every 30 seconds while visible and has a manual refresh button. The explicit read action marks only that learner's `REPORT_RESOLVED` messages as read, without affecting other notification types. A notification links to an owner-scoped single-report filter, so old reports still open correctly beyond the first page. Report history remains viewable by its author even if a Path is later unpublished.

## Shared notification foundation and #48

PR #158 (Nhi's #48) was still open when this branch started. This PR reuses its **unchanged** `20261117000000_in_app_notifications` migration and the same Notification schema/types contract, then adds `REPORT_RESOLVED` in a separate migration. It does not copy or replace #48's bell, APIs, lesson/contest writers, or scheduling behavior. The `/hv/reports` page provides the resolution notification flow immediately; once #48 merges, its generic inbox can display these same rows.

Whichever PR merges second must rebase, retain the shared migration unchanged, retain `REPORT_RESOLVED` in `NotificationType` and `NOTIFICATION_TYPES`, and keep both features' schema changes. In #48's bell, extend `ICON_TONE_CLASS` with `REPORT_RESOLVED: "bg-secondary text-secondary-foreground"`; its icon function already has a fallback. This is required because that map is a complete `Record<NotificationKind, string>`; adding an enum case without the map entry fails typecheck. Run both features' tests and typecheck after that integration. Do not rewrite applied migrations or create a second Notification table. The new migration identifiers sort after the shared foundation.

## Local setup

No new environment variables or packages are required. With PostgreSQL running:

```powershell
npm run db:deploy
npx prisma generate
npm run dev
```

Existing reports become New. The seed teacher owns the sample Path; submit a report with the enrolled seed student, then sign in with the teacher and process it. Use a second teacher account/Path when checking ownership. See README for seed accounts. Stop the local Next server before regenerating Prisma on Windows if its query-engine DLL is locked.

## Verification

```powershell
npx vitest run src/features/exercise-reports/handling-service.test.ts src/features/exercise-reports/handling-actions.test.ts src/features/exercise-reports/handling.integration.test.ts
npm run lint
npm run typecheck
npm test
npm run build
```

Database tests use unique fixtures and clean them up. They cover owner filtering/counts, another teacher knowing a real report ID, moved exercises, stale updates, concurrent resolution producing exactly one message, terminal state, recipient-only marking read, filtering and pagination. Service/action tests cover live roles, malformed input, forged identity/admin fields, required resolution text, bounds and safe error handling.
