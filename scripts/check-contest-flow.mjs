import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

// Run against a local development database and an already running application.
// All fixtures use fresh IDs and are removed in finally; existing data is untouched.
process.loadEnvFile(".env");
const base = process.env.CONTEST_CHECK_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) {
  throw new Error("This check only supports a local application.");
}
const db = new PrismaClient();
const runId = randomUUID();
const password = randomUUID();
const contestIds = [];
const userIds = [];
let exerciseId;
let failures = 0;

async function check(name, run) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function login(email) {
  const jar = new Map();
  function remember(response) {
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(";", 1)[0];
      const index = pair.indexOf("=");
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
  const cookies = () =>
    [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  const csrf = await fetch(`${base}/api/auth/csrf`);
  remember(csrf);
  const { csrfToken } = await csrf.json();
  const response = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Cookie: cookies(),
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      callbackUrl: `${base}/contests`,
    }),
  });
  remember(response);
  const session = await fetch(`${base}/api/auth/session`, {
    headers: { Cookie: cookies() },
  });
  const signedInUser = (await session.json()).user;
  assert.ok(signedInUser?.id, "Local test account could not sign in");
  assert.equal(
    signedInUser.email,
    email,
    "Local check signed in as the wrong account",
  );
  return async (path, init = {}) =>
    fetch(`${base}${path}`, {
      ...init,
      redirect: "manual",
      headers: { Cookie: cookies(), Origin: base, ...init.headers },
    });
}

try {
  const roles = await db.role.findMany();
  const studentRole = roles.find((role) => role.name === "STUDENT");
  const teacherRole = roles.find((role) => role.name === "TEACHER");
  assert.ok(studentRole && teacherRole, "Run npm run db:seed first");
  const passwordHash = await hash(password, 4);
  async function createUser(label, roleId) {
    const user = await db.user.create({
      data: {
        email: `contest-check-${label}-${runId}@local.test`,
        name: "Contest check",
        passwordHash,
        roleId,
        onboardedAt: new Date(),
      },
    });
    userIds.push(user.id);
    return user;
  }
  const student = await createUser("student", studentRole.id);
  const other = await createUser("other", studentRole.id);
  const teacher = await createUser("teacher", teacherRole.id);
  const prompt = `PUBLIC_PROMPT_${runId}`;
  const hidden = `HIDDEN_ANSWER_${runId}`;
  const exercise = await db.exercise.create({
    data: {
      title: "Local test exercise",
      prompt,
      testCases: {
        create: [
          { input: "", expected: "Hello world", isHidden: false },
          { input: "secret", expected: hidden, isHidden: true },
        ],
      },
    },
  });
  exerciseId = exercise.id;
  const now = Date.now();
  async function createContest(label, start, end, status = "PUBLISHED") {
    const contest = await db.contest.create({
      data: {
        slug: `contest-check-${label}-${runId}`,
        title: `CONTEST_${label}_${runId}`,
        status,
        startsAt: new Date(start),
        endsAt: new Date(end),
        exercises: { create: { exerciseId, position: 1, points: 200 } },
      },
    });
    contestIds.push(contest.id);
    return contest;
  }
  const live = await createContest("live", now - 60000, now + 1800000);
  const future = await createContest("future", now + 1800000, now + 3600000);
  const ended = await createContest("ended", now - 3600000, now - 60000);
  const draft = await createContest(
    "draft",
    now - 60000,
    now + 1800000,
    "DRAFT",
  );
  const request = await login(student.email);
  const teacherRequest = await login(teacher.email);
  const prefix = `/api/contests/${live.slug}`;

  await check("catalog hides drafts", async () => {
    const response = await request("/contests");
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(
      html.includes(live.title) &&
        html.includes(future.title) &&
        html.includes(ended.title),
    );
    assert.ok(!html.includes(draft.title), "Draft appeared in the catalog");
  });
  for (const [filter, expected] of [
    ["upcoming", future],
    ["live", live],
    ["ended", ended],
  ]) {
    await check(`catalog ${filter} filter`, async () => {
      const html = await (await request(`/contests?status=${filter}`)).text();
      assert.ok(html.includes(expected.title), "Expected contest is missing");
      for (const item of [live, future, ended].filter(
        (item) => item.id !== expected.id,
      )) {
        assert.ok(
          !html.includes(item.title),
          "Contest appeared under the wrong filter",
        );
      }
    });
  }
  await check("statements stay private before registration", async () => {
    const html = await (await request(`/contests/${live.slug}/play`)).text();
    assert.ok(!html.includes(prompt), "Statement leaked before registration");
  });
  await check("anonymous API request is rejected", async () => {
    const response = await fetch(`${base}${prefix}/registration`, {
      method: "POST",
    });
    assert.equal(response.status, 401);
  });
  await check("teacher cannot register as a contestant", async () => {
    assert.equal(
      (await teacherRequest(`${prefix}/registration`, { method: "POST" }))
        .status,
      403,
    );
  });
  await check("cross-origin registration is rejected", async () => {
    assert.equal(
      (
        await request(`${prefix}/registration`, {
          method: "POST",
          headers: { Origin: "https://example.invalid" },
        })
      ).status,
      403,
    );
  });
  await check("parallel registration creates one participant", async () => {
    const responses = await Promise.all([
      request(`${prefix}/registration`, { method: "POST" }),
      request(`${prefix}/registration`, { method: "POST" }),
    ]);
    for (const response of responses) {
      const result = await response.json();
      assert.ok(response.ok, `Registration failed: ${result.error?.code}`);
    }
    assert.equal(
      await db.contestParticipant.count({
        where: { contestId: live.id, userId: student.id },
      }),
      1,
    );
  });
  const foreignSubmission = await db.submission.create({
    data: {
      userId: other.id,
      contestId: live.id,
      exerciseId,
      source: "other solution",
      language: "python",
    },
  });
  await check(
    "workspace shows public samples and only own submissions",
    async () => {
      const response = await request(`/contests/${live.slug}/play`);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.ok(html.includes(prompt), "Statement is missing");
      assert.ok(
        !html.includes(hidden),
        "Hidden answer leaked into the workspace",
      );
      assert.ok(
        !html.includes(foreignSubmission.id),
        "Another student's submission leaked",
      );
    },
  );
  await check(
    "clock returns fresh server time and disables caching",
    async () => {
      const before = Date.now();
      const response = await request(`${prefix}/clock`);
      const result = await response.json();
      assert.equal(response.status, 200, `Clock failed: ${result.error?.code}`);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.ok(
        result.data.serverNow >= before && result.data.serverNow <= Date.now(),
      );
      assert.equal(result.data.endsAt, live.endsAt.toISOString());
    },
  );
  await check(
    "mock submission saves the authenticated owner and contest",
    async () => {
      const response = await request(`${prefix}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          source: 'print("Hello world")',
          language: "python",
          userId: other.id,
          contestId: draft.id,
        }),
      });
      const result = await response.json();
      assert.equal(response.status, 201);
      assert.equal(result.data.status, "MOCKED");
      const saved = await db.submission.findUniqueOrThrow({
        where: { id: result.data.id },
      });
      assert.equal(saved.userId, student.id);
      assert.equal(saved.contestId, live.id);
      assert.equal(saved.status, "PENDING");
      assert.equal(saved.score, null);
    },
  );
  await check("foreign exercise and invalid JSON are rejected", async () => {
    const invalid = await request(`${prefix}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId: "not-in-this-contest",
        source: "x",
        language: "python",
      }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(
      (await request(`${prefix}/submissions`, { method: "POST", body: "{" }))
        .status,
      400,
    );
  });
  await check("future contest blocks entry after registration", async () => {
    assert.equal(
      (
        await request(`/api/contests/${future.slug}/registration`, {
          method: "POST",
        })
      ).status,
      200,
    );
    const html = await (await request(`/contests/${future.slug}/play`)).text();
    assert.ok(!html.includes(prompt), "Future contest statement leaked");
    assert.equal(
      (await request(`/api/contests/${future.slug}/clock`)).status,
      403,
    );
  });
  await check("deadline blocks submissions and new registrations", async () => {
    await db.contest.update({
      where: { id: live.id },
      data: { endsAt: new Date(Date.now() - 1) },
    });
    assert.equal(
      (
        await request(`${prefix}/submissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId, source: "x", language: "python" }),
        })
      ).status,
      403,
    );
    assert.equal(
      (await request(`${prefix}/registration`, { method: "POST" })).status,
      409,
    );
  });
  await check("unknown and draft slugs render not found", async () => {
    for (const slug of [draft.slug, `missing-${runId}`]) {
      const response = await request(`/contests/${slug}`);
      const html = await response.text();
      assert.ok(
        html.includes("Không tìm thấy cuộc thi"),
        "Not-found page missing",
      );
      assert.ok(!html.includes(prompt), "Statement leaked on a not-found page");
      assert.equal(response.status, 404);
    }
  });
} finally {
  if (contestIds.length) {
    await db.submission.deleteMany({
      where: { contestId: { in: contestIds } },
    });
    await db.contest.deleteMany({ where: { id: { in: contestIds } } });
  }
  if (exerciseId) {
    await db.testCase.deleteMany({ where: { exerciseId } });
    await db.exercise.delete({ where: { id: exerciseId } });
  }
  if (userIds.length)
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
  console.log("Removed local check fixtures.");
}
if (failures) process.exitCode = 1;
