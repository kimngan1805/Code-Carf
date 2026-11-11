# Testing conventions

## Unit tests

Vitest, run with `npm test`. Mock the database (`vi.mock("@/lib/db")`) so they run anywhere.

## Integration tests that need PostgreSQL

Name them `*.integration.test.ts` and let them skip themselves when no database answers:

```ts
import { canConnectToDatabase } from "@/test-utils/database";

const hasDatabase = await canConnectToDatabase();

describe.skipIf(!hasDatabase)("my feature (PostgreSQL integration)", () => {
  // ...
});
```

Do not decide with `Boolean(process.env.DATABASE_URL)` alone. CI sets a placeholder URL for the
build, so that check is true even though no database exists, and the suite fails with
`Can't reach database server`.

- **CI:** the `npm test` step runs with an empty `DATABASE_URL`, so integration tests are skipped.
- **Locally:** with the database from `docker compose up -d db` and your `.env`, they run for real.
- Clean up the rows a test creates (use a unique prefix per run) so the suite can run repeatedly.
