# Contest events (task 42)

Branch: `feat/42-contest-tab-and-paste-events`.

Apply migrations and regenerate Prisma Client after pulling. While an authenticated student's attempt is active, the workspace records `visibilitychange` to hidden as `TAB_SWITCH`, and captures document-level `paste` events (including Monaco and the simple editor) as `PASTE`.

`POST /api/contests/[slug]/proctoring-events` accepts a UUID `clientEventId`, ISO `occurredAt`, type, and `pasteLength` for paste only. It derives the user from the session and rejects unknown fields. Clipboard contents are never sent or stored. `ProctoringEvent.createdAt` is server time; the browser's timestamp is diagnostic metadata and cannot override acceptance time.

The participant row lock serializes submissions, finalization, event deduplication and rate checks. Only a published, currently open shared exam with a started, unexpired, unfinished personal attempt accepts events. Requests after completion are rejected. A UUID uniqueness constraint prevents duplicate retries. The server accepts at most 30 events per student/contest in a rolling minute; the browser throttles repeated event types for one second and limits itself to 20 requests/minute. Logging is best effort: a five-second timeout, rejected request or missing network does not block editing, paste or submission. Browser monitoring is not proof of cheating and can be disabled by a modified client.

Manual check: start Sample Contest as the seeded student; switch tabs and return, then paste into the code editor. Inspect that student's `ProctoringEvent` rows in Prisma Studio. Confirm only type, times and paste length are recorded, logging stops after submitting all answers or expiry, and editing/pasting/submitting still work with the logging endpoint blocked in browser devtools. Unit tests exercise access, privacy, expiry, deduplication and request limiting; real browser interaction still requires this manual check.

## Warnings and review flags (task 43)

Branch: `feat/43-contest-violation-warnings`, based on task 42. Merge task 42 first.

The student sees a warning immediately when leaving the tab or pasting. Counts come only from accepted server events and survive reloads. The workspace fetches its own status on entry, on returning to the tab, after events, and every 15 seconds to pick up events from other tabs and teacher configuration changes. Logging failure shows a connection notice without interrupting the attempt.

Teachers open **Giám sát cuộc thi** in the sidebar (`/gv/contests`) to configure owned contests. Admins can open that URL to manage all contests. `PATCH /api/contests/[slug]/proctoring-settings` accepts `{ "threshold": 3 }`, an integer from 1 to 100, and checks role, ownership and origin. A threshold of 3 permits three recorded events; the fourth flags the attempt. Lowering the threshold also evaluates existing counts. Increasing it does not clear previous flags.

`ContestParticipant.violationCount` counts accepted tab/paste events; `flaggedAt` records the first flag, and `Submission.flaggedForReview` marks existing and future manual or automatic answers. Migration backfills counts and flags from task 42 events. The flag does not alter scores, grading status, deadlines, submission access or automatically finish/disqualify an attempt. The teacher page displays the 20 most recently flagged participants per contest. Settings and events take ordered contest/participant locks to avoid stale thresholds and lost counts during concurrent requests. Deduplicated or rate-limited requests do not increase counts.

`node scripts/check-contest-flow.mjs` tests real sessions, permissions, teacher configuration, cross-user status isolation, lowered/raised thresholds, flags, concurrent rate limiting, and continued submission and grading. It uses temporary fixture users/contests and removes them afterward. Hook tests exercise visibility and paste listeners, immediate warning state, clipboard privacy, offline behavior and cleanup; this does not replace a real-browser visual check.

To repeat an attempt manually, clear only the test student's draft and contest submissions, then reset `startedAt`, `deadlineAt`, `finishedAt`, `violationCount`, and `flaggedAt` on their participant; remove their test proctoring events as well. Retain the registration. Use a fresh test account/contest when preserving an existing attempt matters.
