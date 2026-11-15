# Room unlock checks (#12)

## Interactive local sandbox

Set `ROOM_UNLOCK_LAB="1"` in `.env`, restart the app, sign in as a student, and open `/paths/unlock-lab`. It creates a separate three-room path for the current account. Mark Room 1 complete to see Room 2 unlock immediately, undo completion, turn sequential unlock off/on, open room URLs in new tabs, or reset the sandbox. Only this account's sandbox progress and sandbox path flag can be changed. Real learning paths are untouched. The page and server actions require the explicit flag, a loopback web host, a loopback database connection, and student authentication. Leave the flag disabled on shared/deployed environments.

## Automated checks

Apply migrations, regenerate the client (`npx prisma generate`), and seed the local database. Run the app, then run:

```sh
node scripts/check-room-unlock.mjs
```

The script uses fresh local users and a published path with positions 1, 3, 7. It checks authentication/enrollment, first-room access, locked API and direct URLs, isolation from another learner's progress, immediate unlock after preceding-room completion, disabled/re-enabled sequential unlock, draft/missing rooms, and path navigation states. It removes its fixtures in `finally`. Set `ROOM_CHECK_URL` to use another localhost port.

Completion is represented by the existing `RoomProgress` record, written by the learning/completion flow. Normal learning routes do not accept a learner-provided completion flag. The automated check writes progress directly to simulate that producer; the explicitly enabled local sandbox offers completion buttons only for its separate test rooms.

For manual browser checks, sign in as `student@local.test`, open `/paths/nhap-mon-lap-trinh`, and follow an available room link. Seed completes the first five rooms: room six is available, room seven is locked. Entering a locked room URL redirects to `/forbidden`; its API returns 403 with `ROOM_LOCKED`. Check at desktop and 375px. The old `/rooms` listing remains removed; only `/rooms/<roomId>` exists.

`Path.sequentialUnlock` defaults to true. Teachers' editing UI is separate work; use the local database/Prisma Studio to change the flag for a test path. Turning it off skips the predecessor requirement, but the path must still be published and the learner enrolled. The predecessor is the existing room with the greatest lower position in the same path. Progress is read on every request.

Room content is currently escaped plain text. Full Markdown, exercise listing/status, and richer room presentation are tracked in #13. Practice grading checks the same access contract before creating a submission; contest grading uses its own contest authorization and does not require unlocking the practice version of a shared exercise.
