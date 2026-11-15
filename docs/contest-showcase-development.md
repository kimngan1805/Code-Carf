# Public contest showcase (#147)

The landing header (desktop and mobile) and hero link to `/thi-dau`, a public
introduction separate from the protected `/contests` participant catalog.
Visitors can explore a featured event, search/filter contest cards, read the
participation guide and FAQ, and view public details at `/thi-dau/[slug]`.

All cards link to public introductions. Only the explicit participation button
links to `/contests/[slug]`; existing authentication retains the contest as the
login callback. No proxy exemption or access change is made to participant routes.

The showcase queries only PUBLISHED contests and explicitly selects public
metadata and aggregate counts. It never selects exercise statements, test cases,
submissions, creator details or participant records. Descriptions are escaped as
text. Draft/unknown details render not-found. No demo events or invented metrics
are inserted. Empty catalogs have an informative empty state; route loading/error
states remain usable without a session.

Registration dates, exam dates and per-participant duration are distinct. Phase
labels use the exam window, while registration has its own label. All displayed
times use Vietnam time. Featured events prioritize live, then nearest upcoming,
unscheduled, and most recent ended events. Data and phases refresh on a page
request, not through background polling. No database migration is required.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npx.cmd next build --webpack
# With the local app and PostgreSQL running:
node scripts/check-contest-showcase.mjs
```

The HTTP script creates isolated published/draft fixtures and a private exercise,
checks anonymous navigation and privacy, verifies protected participation, then
removes only its fixtures in `finally`. Set `SHOWCASE_CHECK_URL` for another
localhost port. Unit/render tests cover phase boundaries, missing schedules,
Vietnamese search, ordering, selected public fields, links, escaping and 404s.

Manual browser review remains necessary for narrow screens, keyboard interaction,
filter/search updates, accordion use and visual layout. No browser automation is
included in this change.

Refs #64 and #59. Issue #147 is a child of #64; this feature does not reopen or
replace the participant catalog task.
