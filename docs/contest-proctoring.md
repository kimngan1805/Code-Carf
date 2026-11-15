# Contest events (task 42)

Branch: `feat/42-contest-tab-and-paste-events`.

Apply migrations and regenerate Prisma Client after pulling. While an authenticated student's attempt is active, the workspace records `visibilitychange` to hidden as `TAB_SWITCH`, and captures document-level `paste` events (including Monaco and the simple editor) as `PASTE`.

`POST /api/contests/[slug]/proctoring-events` accepts a UUID `clientEventId`, ISO `occurredAt`, type, and `pasteLength` for paste only. It derives the user from the session and rejects unknown fields. Clipboard contents are never sent or stored. `ProctoringEvent.createdAt` is server time; the browser's timestamp is diagnostic metadata and cannot override acceptance time.

The participant row lock serializes submissions, finalization, event deduplication and rate checks. Only a published, currently open shared exam with a started, unexpired, unfinished personal attempt accepts events. Requests after completion are rejected. A UUID uniqueness constraint prevents duplicate retries. The server accepts at most 30 events per student/contest in a rolling minute; the browser throttles repeated event types for one second and limits itself to 20 requests/minute. Logging is best effort: a five-second timeout, rejected request or missing network does not block editing, paste or submission. Browser monitoring is not proof of cheating and can be disabled by a modified client.

Manual check: start Sample Contest as the seeded student; switch tabs and return, then paste into the code editor. Inspect that student's `ProctoringEvent` rows in Prisma Studio. Confirm only type, times and paste length are recorded, logging stops after submitting all answers or expiry, and editing/pasting/submitting still work with the logging endpoint blocked in browser devtools. Unit tests exercise access, privacy, expiry, deduplication and request limiting; real browser interaction still requires this manual check.
