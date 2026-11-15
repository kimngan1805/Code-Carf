# Learner header search (#69)

Sign in as `student@local.test` after running `npm run db:seed`. Submit the header search with Enter or the search button. On mobile, the header magnifying glass opens `/hv/search`; the page has a full-width search form. Empty input shows instructions, unmatched input shows an explicit empty state, and results are grouped into Lộ trình (Path), Bài học (Room), and Cuộc thi (Contest).

Search matches title substrings regardless of Vietnamese accents or letter case, including `đ`/`Đ` and decomposed Unicode. Leading/trailing whitespace is ignored and repeated whitespace is collapsed. Queries are limited to 120 characters. Each group shows up to 10 results in deterministic title/id order. `%`, `_`, and quotes are literal text, never SQL wildcards. Queries use bound Prisma SQL parameters.

Only published Paths, Rooms belonging to published Paths, and Contests with status `PUBLISHED` are returned. Room has no separate publication flag. Only titles and parent Path metadata are queried; lesson content, exercises, and hidden tests are never included. Search does not bypass enrollment or sequential room access: clicking a locked Room still reaches the existing server access check. Finished/draft Contests do not appear.

This learner feature lives under `/hv/search` and requires the current database role `STUDENT`; teacher/admin navigation stays in its existing workspace. Public header search sends visitors through login with a callback URL. There are no new environment variables, dependencies, migrations, or PostgreSQL extensions. Unicode normalization uses built-in PostgreSQL 16 functions. The queries scan titles; consider indexed normalized titles if the catalog grows substantially.

Verification:

```powershell
npx vitest run src/features/search/service.test.ts src/features/auth/permissions.test.ts
npx tsx scripts/check-search.ts
npm run lint
npm run typecheck
npm test
npm run build
```

The database check uses existing seed data plus temporary fixtures, then removes its fixtures. It verifies accent/case equivalence, grouping, publication filtering, literal punctuation, empty results, and the per-group limit.
