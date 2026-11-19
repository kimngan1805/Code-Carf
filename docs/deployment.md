# Deploying Code Carf

The app (UI and API) is one Next.js container. It runs on Render; the database and the
private evidence files live on Supabase. Every merge to `main` redeploys automatically
once CI is green, and the container applies pending migrations on start.

## 1. Supabase (database and file storage)

1. Create a project at supabase.com and note the database password.
2. **Database URL**: Project Settings → Database → Connection string → **Session pooler**
   (works over IPv4). Replace `[YOUR-PASSWORD]`. It starts with `postgresql://`.
3. **Storage**: create a bucket named `teacher-documents` and keep it **private**. It holds
   teacher evidence files and learners' handwritten answer images (under `handwritten/`);
   neither is ever served from a public link.
4. **API keys**: Project Settings → API → copy the project URL and the `service_role`
   key. The service key is a secret: server only, never in the browser or in git.

## 2. Render (the app)

1. Push the repo to GitHub, then in Render choose New → Blueprint and select the repo.
   It reads `render.yaml`.
2. Fill the variables Render asks for:
   - `DATABASE_URL`: the Supabase session pooler URL
   - `SUPABASE_URL`: the project URL (`https://<ref>.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: the `service_role` key
3. Deploy. The first start runs `prisma migrate deploy` (this also inserts the roles).
4. Open the Render URL.

Free Render services sleep after about 15 minutes without traffic; the next visit takes
30–60 seconds to wake. Open the site once before a demo.

## 3. Demo accounts (once)

Migrations do not create accounts. From your machine, point the seed at Supabase and
choose a password that is not the public default:

```bash
DATABASE_URL="<supabase session pooler url>" SEED_PASSWORD="<strong password>" npm run db:seed
```

This creates `admin@`, `teacher@`, `student@` and `grader@local.test` with that password
plus sample paths and a contest. Share the password only with the people who need it.

## 4. Sample C++ path (optional)

After the deploy that includes the exercise migration has finished, seed the sample path
from your machine. `SEED_TEACHER_EMAIL` is an existing teacher or admin account that will
own the path (it defaults to `teacher@local.test`):

```bash
DATABASE_URL="<supabase session pooler url>" SEED_TEACHER_EMAIL="<teacher email>" npm run db:seed:cpp
```

It is safe to run again: the path, rooms, exercises and test cases are updated in place.

## Notes

- Email is not sent yet (the console mailer only logs). Tracked in #109.
- Never commit `.env` or the service key. Rotate the key in Supabase if it leaks.
- To redeploy manually: Render dashboard → Manual Deploy.
