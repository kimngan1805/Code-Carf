# Password reset (#68)

Public authentication routes are `/forgot-password` and `/reset-password?token=...`, shared by all roles like `/login`. Successful reset signs out the current browser and redirects to `/reset-password/success`, removing the consumed token from the URL before rendering confirmation. Learner/teacher/admin application routes remain `/hv`, `/gv`, `/admin`.

Apply migrations and run `npx prisma generate`, then start the app. Use **Quên mật khẩu?** on the login form. The existing console mailer logs the link on the server in local development; no real email provider is configured by this change. The browser never displays a link, token or account-existence signal in the request response. `AUTH_URL` must be the trusted public app origin (localhost for local development); request headers are not used to construct reset links.

Tokens contain 32 random bytes, stored only as SHA-256 hashes. A link expires after 30 minutes, is used only on a successful password update, and is replaced by a newer allowed request for the same account. Visiting a link does not consume it. Expired, missing, previously used, and superseded links show the same message. An outstanding link is also invalidated when the account password changes through another flow.

Three valid-email requests per normalized email are permitted in each fixed 15-minute window, persisted in PostgreSQL and enforced atomically across instances/concurrent requests. Unknown emails consume the same limit. Further requests receive the identical generic confirmation and send no new link. Rate counters store hashed email keys; old buckets are cleaned up after 24 hours. This is per-email application throttling; network-wide abuse controls belong at the hosting boundary.

Consumption and password update commit in one transaction. A compare-and-set on the old password hash serializes concurrent attempts; an expired/replaced/used token rolls the password write back. Password rules match registration (8 characters minimum, 72 UTF-8 bytes maximum). The active browser session is signed out on successful reset; the app does not automatically sign in the account. Existing JWT sessions in other browsers retain the application's current session policy.

Run unit tests with `npm test -- src/features/auth/password-reset`. Run the real local database check with:

```sh
npx tsx scripts/check-password-reset.ts
```

It creates a disposable learner, captures only its console emails in memory, verifies hashing/expiry, generic responses, link replacement, reuse/concurrent consumption, password change, and concurrent rate limiting, then removes its fixtures. It never prints a bearer token or modifies existing account passwords. No reset sandbox or public test flags are added.

For manual browser testing, create a disposable account, request a link, copy it from the local server log, and open it. Check password confirmation, success, login with the new password, rejection of the old password and reused/expired links. Use a 375px viewport as well as desktop. Do not share real reset links or server logs containing them.
