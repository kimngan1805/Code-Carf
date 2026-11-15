# Teacher path creation (#119)

Sign in as a teacher or admin, open `/gv/paths`, and choose **Tạo lộ trình**.
The form at `/gv/paths/new` accepts a required name (1–100 trimmed characters),
an optional description (up to 5,000 characters), and sequential lesson unlocking
(enabled by default). Cancel returns to the management list without saving.

Saving creates an owned, unpublished path with no rooms and opens its management
page with success feedback. Adding rooms, editing and publishing belong to the
remaining CRUD work in #6. Drafts stay hidden from learners and other teachers;
admins can manage all paths.

`POST /api/paths` checks the live account role and same-origin requests. It accepts
the form fields plus a UUID `requestId`; owner, publication state and slug cannot
be supplied by the client. Vietnamese names become URL slugs, with suffixes on
collision. A request identifier is scoped to the signed-in creator, so retrying
the same payload after a lost response returns the original path. Reusing it
with different fields returns 409. The form keeps inputs after errors and blocks
repeated submissions while saving. No schema migration is required.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
# With PostgreSQL, seeded roles, .env and the local app running:
node scripts/check-path-creation.mjs
```

The HTTP check creates isolated temporary accounts and removes only its own
accounts and paths in `finally`. Set `PATH_CHECK_URL` for a different localhost
port. It covers role denial, origin checks, invalid/forged inputs, concurrent
retries, database persistence, draft visibility, duplicate names and admin access.
Next.js can stream a not-found page with HTTP 200, so checks also inspect its
noindex marker and verify that private content is absent.

Manual browser review: check keyboard navigation, narrow viewport layout, inline
validation, Cancel, submit navigation and retry after a failed network request.
These interactions are not covered by the HTTP script.
