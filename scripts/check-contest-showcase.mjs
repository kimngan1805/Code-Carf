import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");
const base = process.env.SHOWCASE_CHECK_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Use a local application.");
const db = new PrismaClient();
const runId = randomUUID();
const contests = [],
  exercises = [];
const publicTitle = `PUBLIC_SHOWCASE_${runId}`;
const draftTitle = `PRIVATE_DRAFT_${runId}`;
const secret = `PRIVATE_EXERCISE_${runId}`;
const get = (path) => fetch(`${base}${path}`, { redirect: "manual" });
let checks = 0;
async function check(name, run) {
  await run();
  checks++;
  console.log(`PASS ${name}`);
}
try {
  const now = Date.now();
  const published = await db.contest.create({
    data: {
      slug: `showcase-check-${runId}`,
      title: publicTitle,
      description: "Public introduction <script>alert(1)</script>",
      status: "PUBLISHED",
      startsAt: new Date(now - 60000),
      endsAt: new Date(now + 3600000),
      examStartsAt: new Date(now + 7200000),
      examEndsAt: new Date(now + 10800000),
      durationMinutes: 45,
    },
  });
  contests.push(published.id);
  const draft = await db.contest.create({
    data: {
      slug: `showcase-draft-${runId}`,
      title: draftTitle,
      description: draftTitle,
      status: "DRAFT",
    },
  });
  contests.push(draft.id);
  const exercise = await db.exercise.create({
    data: {
      title: secret,
      prompt: secret,
      rubric: secret,
      testCases: {
        create: { input: secret, expected: secret, isHidden: true },
      },
    },
  });
  exercises.push(exercise.id);
  await db.contestExercise.create({
    data: { contestId: published.id, exerciseId: exercise.id, position: 1 },
  });
  await check("landing links lead to the public showcase", async () => {
    const response = await get("/");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('href="/thi-dau"'));
    assert.ok(!html.includes('href="/contests"'));
  });
  await check(
    "anonymous gallery shows published metadata and no private contest data",
    async () => {
      const response = await get("/thi-dau");
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("location"), null);
      const html = await response.text();
      assert.ok(html.includes(publicTitle));
      assert.ok(html.includes(`/thi-dau/${published.slug}`));
      assert.ok(!html.includes(draftTitle));
      assert.ok(!html.includes(secret));
      assert.ok(!html.includes("<script>alert(1)</script>"));
    },
  );
  await check(
    "anonymous detail is public and has an explicit participation link",
    async () => {
      const response = await get(`/thi-dau/${published.slug}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(publicTitle));
      assert.ok(html.includes(`/contests/${published.slug}`));
      assert.ok(!html.includes(secret));
      assert.ok(!html.includes("<script>alert(1)</script>"));
    },
  );
  await check(
    "draft and unknown public slugs show not-found without private data",
    async () => {
      for (const slug of [draft.slug, `unknown-${runId}`]) {
        const response = await get(`/thi-dau/${slug}`);
        assert.ok([200, 404].includes(response.status));
        const html = await response.text();
        assert.ok(html.includes('name="robots" content="noindex"'));
        assert.ok(!html.includes(draftTitle));
      }
    },
  );
  await check(
    "participation still requires login and preserves the selected contest",
    async () => {
      const response = await get(`/contests/${published.slug}`);
      assert.equal(response.status, 307);
      const redirect = new URL(response.headers.get("location"), base);
      assert.equal(redirect.pathname, "/login");
      assert.equal(
        redirect.searchParams.get("callbackUrl"),
        `/contests/${published.slug}`,
      );
    },
  );
  console.log(`${checks} public showcase HTTP checks passed.`);
} finally {
  await db.contest.deleteMany({ where: { id: { in: contests } } });
  await db.exercise.deleteMany({ where: { id: { in: exercises } } });
  await db.$disconnect();
}
