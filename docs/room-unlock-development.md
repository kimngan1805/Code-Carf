# Room unlock checks (#12)

## Automated checks

Teacher/Admin navigation stays under `/creator/paths`: list → `/creator/paths/<slug>` → `/creator/paths/<slug>/rooms/<roomId>`. Back links return to the corresponding management page. These previews allow owned drafts and bypass learner enrollment/unlock requirements only after server-side role/ownership checks. Teachers opening learner `/paths` URLs are redirected to management; students keep the learner URLs and access rules. Default Teacher/Admin dashboard navigation leads to `/creator`.

Apply migrations, regenerate the client (`npx prisma generate`), and seed the local database. Run the app, then run:

```sh
node scripts/check-room-unlock.mjs
```

The script uses fresh local users and a published path with positions 1, 3, 7. It checks authentication/enrollment, first-room access, locked API and direct URLs, isolation from another learner's progress, immediate unlock after preceding-room completion, disabled/re-enabled sequential unlock, draft/missing rooms, and path navigation states. It removes its fixtures in `finally`. Set `ROOM_CHECK_URL` to use another localhost port.

Completion is represented by the existing `RoomProgress` record, written by the learning/completion flow. Normal learning routes do not accept a learner-provided completion flag. The automated check writes progress directly to simulate that producer.

For manual browser checks, sign in as `student@local.test`, open `/paths/nhap-mon-lap-trinh`, and follow an available room link. Seed completes the first five rooms: room six is available, room seven is locked. Entering a locked room URL redirects to `/forbidden`; its API returns 403 with `ROOM_LOCKED`. Check at desktop and 375px. The old `/rooms` listing remains removed; only `/rooms/<roomId>` exists.

`Path.sequentialUnlock` defaults to true. Teachers can change it for their own paths at `/creator/paths` (linked from their sidebar and dashboard). Admins can manage all paths. Each mutation checks the live role and ownership on the server; students cannot change the setting. This management page reads actual database paths, independently of the overview dashboard's mock charts. Turning the flag off skips the predecessor requirement, but the path must still be published and the learner enrolled. The predecessor is the existing room with the greatest lower position in the same path. Progress is read on every request.

Room content is currently escaped plain text. Full Markdown, exercise listing/status, and richer room presentation are tracked in #13. Practice grading checks the same access contract before creating a submission; contest grading uses its own contest authorization and does not require unlocking the practice version of a shared exercise.
