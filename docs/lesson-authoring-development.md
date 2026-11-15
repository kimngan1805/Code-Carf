# Teacher lesson content (#7)

Open **Quản lý lộ trình**, choose a path, then **Thêm bài học**. Enter the
lesson name, optional description and Markdown theory. **Xem trước** uses the
same safe Markdown renderer as the learner page. After saving, the lesson opens
with success feedback. **Chỉnh sửa bài học** reloads its saved content for editing.

Only the owning teacher or an admin can write lessons. New lessons are appended
to the path in a serializable transaction. Concurrent saves retry conflicts;
repeated create requests return the same lesson. Editing preserves the existing
lesson ID and position. Failed saves retain the form contents.

No schema migration is needed. This implements creation and content editing from
#7; reordering and deletion remain separate work. Path publication is still part
of #6. Use **Xuất bản** on the managed path detail page when all lessons have
content; adding or editing lessons does not automatically publish a draft.

## Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npx.cmd next build --webpack
```

`authoring.test.ts` covers validation, ownership, editing, request retries and
transaction conflicts. With `DATABASE_URL` and seeded roles, the PostgreSQL
integration tests verify persistence, concurrent positions, deduplication and
cross-path restrictions, cleaning up only their own fixtures. Markdown tests
cover script tags and unsafe links.

HTTP smoke checks verified the add link, both editor pages, saved Markdown display
and denial of another teacher's access. Manual browser checks of typing, preview,
keyboard focus, responsive layout and network interruptions remain pending.
