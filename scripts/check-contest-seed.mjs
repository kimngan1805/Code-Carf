import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { delimiter, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");
const database = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname))
  throw new Error("Use a local database for seed checks.");
const schema = `contest_seed_${randomUUID().replaceAll("-", "")}`;
database.searchParams.set("schema", schema);
const admin = new PrismaClient();
const db = new PrismaClient({ datasourceUrl: database.toString() });
const pathKey =
  Object.keys(process.env).find((key) => key.toLowerCase() === "path") ??
  "PATH";
const env = {
  ...process.env,
  [pathKey]: `${resolve("node_modules/.bin")}${delimiter}${process.env[pathKey] ?? ""}`,
  DATABASE_URL: database.toString(),
  // Never seed a personal account from the developer's .env during a check.
  DEMO_USER_EMAIL: "",
  DEMO_USER_PASSWORD: "",
  SEED_PASSWORD: "SeedCheck123!",
};
function prisma(...args) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", ...args],
    {
      env,
      encoding: "utf8",
      timeout: 120000,
    },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  prisma("migrate", "deploy");
  prisma("db", "seed");
  assert.equal(await db.contest.count(), 1);
  const contest = await db.contest.findUniqueOrThrow({
    where: { slug: "sample-contest" },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { exercise: { include: { testCases: true } } },
      },
    },
  });
  const now = Date.now();
  assert.equal(contest.status, "PUBLISHED");
  assert.equal(contest.requireFaceCheck, false);
  assert.ok(+contest.endsAt <= +contest.examStartsAt);
  assert.ok(+contest.examStartsAt <= now && now < +contest.examEndsAt);
  assert.equal(contest.durationMinutes, 120);
  assert.equal(contest.exercises.length, 2);
  for (const { exercise } of contest.exercises) {
    assert.equal(exercise.kind, "CODE");
    assert.ok(exercise.testCases.some((test) => !test.isHidden));
    assert.ok(exercise.testCases.some((test) => test.isHidden));
  }
  const student = await db.user.findUniqueOrThrow({
    where: { email: "student@local.test" },
  });
  const where = {
    contestId_userId: { contestId: contest.id, userId: student.id },
  };
  const participant = await db.contestParticipant.findUniqueOrThrow({ where });
  assert.equal(participant.startedAt, null);
  assert.equal(participant.deadlineAt, null);
  assert.ok(participant.joinedAt < contest.endsAt);
  const startedAt = new Date();
  const deadlineAt = new Date(+startedAt + 120 * 60000);
  await db.contestParticipant.update({
    where,
    data: { startedAt, deadlineAt },
  });
  const submission = await db.submission.create({
    data: {
      contestId: contest.id,
      userId: student.id,
      exerciseId: contest.exercises[0].exerciseId,
      source: "print(3)",
      language: "python",
      status: "ACCEPTED",
      score: 100,
    },
  });
  prisma("db", "seed");
  assert.equal(await db.contest.count(), 1);
  assert.equal(
    await db.contestExercise.count({ where: { contestId: contest.id } }),
    2,
  );
  const restored = await db.contestParticipant.findUniqueOrThrow({ where });
  assert.equal(+restored.startedAt, +startedAt);
  assert.equal(+restored.deadlineAt, +deadlineAt);
  assert.ok(await db.submission.findUnique({ where: { id: submission.id } }));
  console.log(
    "PASS fresh seed: one playable Sample Contest, two code exercises, registered student.",
  );
  console.log(
    "PASS repeated seed: no duplicate contest or exercises; attempt and answer preserved.",
  );
} finally {
  await db.$disconnect();
  // This generated, validated schema belongs exclusively to this check.
  assert.match(schema, /^contest_seed_[a-f0-9]{32}$/);
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.$disconnect();
  console.log("Removed temporary seed-check schema.");
}
