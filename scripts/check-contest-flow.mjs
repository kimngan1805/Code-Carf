import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

process.loadEnvFile(".env");
const base = process.env.CONTEST_CHECK_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Use a local application.");
const db = new PrismaClient();
const runId = randomUUID();
const password = randomUUID();
const userIds = [],
  contestIds = [],
  exerciseIds = [];
let failures = 0,
  checks = 0;
const delay = () => new Promise((resolve) => setTimeout(resolve, 25));
const json = (body) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
async function check(name, run) {
  checks++;
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
  const remember = (response) => {
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(";", 1)[0],
        index = pair.indexOf("=");
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  };
  const cookies = () =>
    [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
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
  assert.equal(
    (await session.json()).user?.email,
    email,
    "Test account did not sign in",
  );
  return (path, init = {}) =>
    fetch(`${base}${path}`, {
      ...init,
      redirect: "manual",
      headers: { Cookie: cookies(), Origin: base, ...init.headers },
    });
}

try {
  const roles = await db.role.findMany();
  const passwordHash = await hash(password, 4);
  async function user(label, role) {
    const roleId = roles.find((item) => item.name === role)?.id;
    assert.ok(roleId, "Run npm run db:seed first");
    const item = await db.user.create({
      data: {
        email: `contest-check-${label}-${runId}@local.test`,
        name: "Contest check",
        roleId,
        passwordHash,
        onboardedAt: new Date(),
      },
    });
    userIds.push(item.id);
    return item;
  }
  const student = await user("first", "STUDENT"),
    other = await user("second", "STUDENT"),
    teacher = await user("teacher", "TEACHER");
  const prompt = `PUBLIC_${runId}`,
    hidden = `HIDDEN_${runId}`;
  const exercise = await db.exercise.create({
    data: {
      title: "First problem",
      prompt,
      testCases: {
        create: [
          { input: "", expected: "Hello world", isHidden: false },
          { input: "secret", expected: hidden, isHidden: true },
        ],
      },
    },
  });
  exerciseIds.push(exercise.id);
  const secondExercise = await db.exercise.create({
    data: {
      title: "Active problem",
      prompt: "Second problem",
      testCases: { create: { input: "", expected: "1", isHidden: false } },
    },
  });
  exerciseIds.push(secondExercise.id);
  const now = Date.now();
  async function contest(label, opens, closes, status = "PUBLISHED") {
    const item = await db.contest.create({
      data: {
        title: `CONTEST_${label}_${runId}`,
        slug: `contest-check-${label}-${runId}`,
        status,
        startsAt: new Date(opens),
        endsAt: new Date(closes),
        examStartsAt: new Date(closes),
        examEndsAt: new Date(closes + 2 * 3600000),
        durationMinutes: 2,
        exercises: {
          create: [
            { exerciseId: exercise.id, position: 1 },
            { exerciseId: secondExercise.id, position: 2 },
          ],
        },
      },
    });
    contestIds.push(item.id);
    return item;
  }
  const live = await contest("open", now - 60000, now + 3600000);
  const future = await contest("future", now + 3600000, now + 7200000);
  const closed = await contest("closed", now - 4 * 3600000, now - 3 * 3600000);
  const ongoing = await contest("ongoing", now - 3600000, now - 60000);
  const draft = await contest("draft", now - 60000, now + 3600000, "DRAFT");
  const empty = await contest("empty", now - 60000, now + 3600000);
  const request = await login(student.email),
    otherRequest = await login(other.email),
    teacherRequest = await login(teacher.email);
  const prefix = `/api/contests/${live.slug}`;
  const key = (contestId, userId = student.id) => ({
    contestId_userId: { contestId, userId },
  });
  const source = {
    exerciseId: exercise.id,
    language: "python",
    source: 'print("Hello world")',
  };
  const snapshot = {
    exerciseId: secondExercise.id,
    language: "python",
    source: "print('saved before personal deadline')",
  };

  await check(
    "catalog excludes drafts and shows registration dates",
    async () => {
      const html = await (await request("/contests")).text();
      assert.ok(html.includes(live.title) && !html.includes(draft.title));
      assert.ok(html.includes("Mở đăng ký"));
    },
  );
  for (const [filter, expected] of [
    ["upcoming", future],
    ["live", ongoing],
    ["ended", closed],
  ]) {
    await check(`exam ${filter} filter`, async () => {
      const html = await (await request(`/contests?status=${filter}`)).text();
      assert.ok(html.includes(expected.title));
      if (filter === "upcoming") {
        assert.ok(html.includes(live.title));
        assert.ok(html.includes("Đang mở đăng ký"));
      }
      for (const item of [future, ongoing, closed].filter(
        (item) => item.id !== expected.id,
      ))
        assert.ok(!html.includes(item.title));
    });
  }
  await check(
    "authentication, student role, and same-origin are required",
    async () => {
      assert.equal(
        (await fetch(`${base}${prefix}/registration`, { method: "POST" }))
          .status,
        401,
      );
      assert.equal(
        (await teacherRequest(`${prefix}/registration`, { method: "POST" }))
          .status,
        403,
      );
      assert.equal(
        (
          await request(`${prefix}/registration`, {
            method: "POST",
            headers: { Origin: "https://example.invalid" },
          })
        ).status,
        403,
      );
      assert.equal(
        (await request(`${prefix}/start`, { method: "POST" })).status,
        403,
      );
    },
  );
  await check(
    "registration is rejected before opening or after closing",
    async () => {
      for (const item of [future, closed])
        assert.equal(
          (
            await request(`/api/contests/${item.slug}/registration`, {
              method: "POST",
            })
          ).status,
          409,
        );
    },
  );
  await check(
    "parallel registration creates one participant and does not start the timer",
    async () => {
      const responses = await Promise.all(
        Array.from({ length: 3 }, () =>
          request(`${prefix}/registration`, { method: "POST" }),
        ),
      );
      assert.ok(responses.every((response) => response.ok));
      const participant = await db.contestParticipant.findUniqueOrThrow({
        where: key(live.id),
      });
      assert.equal(participant.startedAt, null);
      assert.equal(participant.deadlineAt, null);
      assert.equal(
        await db.contestParticipant.count({
          where: { contestId: live.id, userId: student.id },
        }),
        1,
      );
      assert.equal(
        (await otherRequest(`${prefix}/registration`, { method: "POST" }))
          .status,
        200,
      );
    },
  );
  await check(
    "opening play before clicking Start does not reveal statements or start an attempt",
    async () => {
      const page = await request(`/contests/${live.slug}/play`);
      assert.equal(page.status, 307);
      assert.ok(
        page.headers.get("location")?.endsWith(`/contests/${live.slug}`),
      );
      assert.equal((await request(`${prefix}/clock`)).status, 409);
      assert.equal(
        (
          await request(`${prefix}/submissions`, {
            method: "POST",
            ...json(source),
          })
        ).status,
        409,
      );
      assert.equal(
        (await db.contestParticipant.findUniqueOrThrow({ where: key(live.id) }))
          .startedAt,
        null,
      );
    },
  );
  let firstDeadline;
  await check(
    "registration is available before exam day but neither start nor statements are unlocked",
    async () => {
      assert.equal(
        (await request(`${prefix}/start`, { method: "POST" })).status,
        403,
      );
      const row = await db.contestParticipant.findUniqueOrThrow({
        where: key(live.id),
      });
      assert.equal(row.startedAt, null);
      const html = await (await request(`/contests/${live.slug}`)).text();
      assert.ok(html.includes("Chờ đến giờ thi"));
      assert.ok(html.includes("ĐÓNG ĐĂNG KÝ SAU"));
    },
  );
  await check(
    "parallel explicit starts create one immutable personal deadline",
    async () => {
      await db.contest.update({
        where: { id: live.id },
        data: {
          endsAt: new Date(Date.now() - 100),
          examStartsAt: new Date(Date.now() - 50),
          examEndsAt: new Date(Date.now() + 3600000),
        },
      });
      const responses = await Promise.all(
        Array.from({ length: 4 }, () =>
          request(`${prefix}/start`, {
            method: "POST",
            ...json({ durationMinutes: 999, userId: other.id }),
          }),
        ),
      );
      assert.ok(responses.every((response) => response.ok));
      const results = await Promise.all(
        responses.map((response) => response.json()),
      );
      assert.equal(
        new Set(results.map((result) => result.data.deadlineAt)).size,
        1,
      );
      firstDeadline = results[0].data.deadlineAt;
      assert.equal(
        Date.parse(firstDeadline) - Date.parse(results[0].data.startedAt),
        120000,
      );
    },
  );
  await check(
    "registered students can work in the exam window after registration closed",
    async () => {
      await db.contest.update({
        where: { id: live.id },
        data: { endsAt: new Date(now - 1000) },
      });
      const clock = await request(`${prefix}/clock`);
      assert.equal(clock.status, 200);
      assert.equal((await clock.json()).data.deadlineAt, firstDeadline);
      assert.equal(
        (await request(`${prefix}/finalize`, { method: "POST" })).status,
        409,
      );
      assert.equal(
        (
          await request(`${prefix}/submissions`, {
            method: "POST",
            ...json(source),
          })
        ).status,
        201,
      );
    },
  );
  await check(
    "repeated identical manual submissions are rejected",
    async () => {
      const response = await request(`${prefix}/submissions`, {
        method: "POST",
        ...json(source),
      });
      assert.equal(response.status, 409);
      assert.equal(
        (await response.json()).error.code,
        "EXERCISE_ALREADY_SUBMITTED",
      );
      assert.equal(
        await db.submission.count({
          where: { contestId: live.id, userId: student.id, ...source },
        }),
        1,
      );
    },
  );
  await check(
    "parallel edited submissions cannot replace a submitted exercise",
    async () => {
      const edited = { ...source, source: 'print("edited answer")' };
      const responses = await Promise.all(
        Array.from({ length: 4 }, () =>
          request(`${prefix}/submissions`, { method: "POST", ...json(edited) }),
        ),
      );
      assert.equal(
        responses.filter((response) => response.status === 201).length,
        0,
      );
      assert.equal(
        responses.filter((response) => response.status === 409).length,
        4,
      );
      for (const response of responses.filter((item) => item.status === 409))
        assert.equal(
          (await response.json()).error.code,
          "EXERCISE_ALREADY_SUBMITTED",
        );
      assert.equal(
        await db.submission.count({
          where: { contestId: live.id, userId: student.id, ...edited },
        }),
        0,
      );
    },
  );
  await check("changing the language cannot resubmit an exercise", async () => {
    const response = await request(`${prefix}/submissions`, {
      method: "POST",
      ...json({ ...source, language: "javascript", source: "console.log(1)" }),
    });
    assert.equal(response.status, 409);
  });
  await check(
    "a registered student can start later and gets a separate full duration",
    async () => {
      const detail = await otherRequest(`/contests/${live.slug}`);
      assert.ok((await detail.text()).includes("Bắt đầu làm bài"));
      const countdownHtml = await (
        await otherRequest(`/contests/${live.slug}`)
      ).text();
      assert.ok(countdownHtml.includes("ĐÓNG LÀM BÀI SAU"));
      await delay();
      const response = await otherRequest(`${prefix}/start`, {
        method: "POST",
      });
      const result = await response.json();
      assert.equal(response.status, 200);
      assert.equal(
        Date.parse(result.data.deadlineAt) - Date.parse(result.data.startedAt),
        120000,
      );
      assert.ok(Date.parse(result.data.deadlineAt) > Date.parse(firstDeadline));
    },
  );
  await check(
    "reload, repeated Start, and duration changes never reset the first clock",
    async () => {
      await db.contest.update({
        where: { id: live.id },
        data: { durationMinutes: 10 },
      });
      const restarted = await request(`${prefix}/start`, { method: "POST" });
      assert.equal((await restarted.json()).data.deadlineAt, firstDeadline);
      const html = await (await request(`/contests/${live.slug}/play`)).text();
      assert.ok(html.includes(prompt) && !html.includes(hidden));
      assert.equal(
        (await (await request(`${prefix}/clock`)).json()).data.deadlineAt,
        firstDeadline,
      );
    },
  );
  let foreignSubmissionId;
  await check(
    "submission ownership comes from the session and hidden tests stay private",
    async () => {
      const response = await otherRequest(`${prefix}/submissions`, {
        method: "POST",
        ...json({
          ...source,
          source: "print('other student')",
          userId: student.id,
          contestId: draft.id,
        }),
      });
      const result = await response.json();
      assert.equal(response.status, 201);
      foreignSubmissionId = result.data.id;
      const stored = await db.submission.findUniqueOrThrow({
        where: { id: foreignSubmissionId },
      });
      assert.equal(stored.userId, other.id);
      assert.equal(stored.contestId, live.id);
      assert.ok(!JSON.stringify(result).includes(hidden));
      const html = await (await request(`/contests/${live.slug}/play`)).text();
      assert.ok(!html.includes(foreignSubmissionId));
    },
  );
  await check(
    "active draft synchronization selects the latest problem",
    async () => {
      for (const value of [source, snapshot])
        assert.equal(
          (await request(`${prefix}/draft`, { method: "PUT", ...json(value) }))
            .status,
          200,
        );
      const saved = await db.contestDraft.findUniqueOrThrow({
        where: key(live.id),
      });
      assert.equal(saved.exerciseId, secondExercise.id);
    },
  );
  await check(
    "one student's deadline does not end another student's attempt",
    async () => {
      await delay();
      await db.contestParticipant.update({
        where: key(live.id),
        data: { deadlineAt: new Date() },
      });
      assert.equal(
        (
          await request(`${prefix}/submissions`, {
            method: "POST",
            ...json(source),
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request(`${prefix}/draft`, {
            method: "PUT",
            ...json({ ...snapshot, source: "late edit" }),
          })
        ).status,
        403,
      );
      const responses = await Promise.all(
        Array.from({ length: 4 }, (_, index) =>
          otherRequest(`${prefix}/submissions`, {
            method: "POST",
            ...json({
              ...source,
              exerciseId: secondExercise.id,
              source: `print(${index})`,
            }),
          }),
        ),
      );
      assert.equal(
        responses.filter((response) => response.status === 201).length,
        1,
      );
      assert.ok(
        responses.every((response) =>
          [201, 403, 409].includes(response.status),
        ),
      );
      assert.equal(
        await db.submission.count({
          where: {
            contestId: live.id,
            userId: other.id,
            exerciseId: secondExercise.id,
          },
        }),
        1,
      );
    },
  );
  await check(
    "the last manual answer completes the attempt before expiry and survives reload",
    async () => {
      const participant = await db.contestParticipant.findUniqueOrThrow({
        where: key(live.id, other.id),
      });
      assert.ok(participant.finishedAt);
      assert.ok(participant.finishedAt < participant.deadlineAt);
      const page = await otherRequest(`/contests/${live.slug}/play`);
      assert.equal(page.status, 200);
      assert.ok((await page.text()).includes("Bạn đã nộp tất cả bài"));
      const response = await otherRequest(`${prefix}/finalize`, {
        method: "POST",
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.data.submission.exerciseId, secondExercise.id);
      assert.equal(result.data.submission.autoSubmitted, false);
      assert.equal(
        await db.submission.count({
          where: { contestId: live.id, userId: other.id },
        }),
        2,
      );
      assert.equal(
        (
          await otherRequest(`${prefix}/submissions`, {
            method: "POST",
            ...json(source),
          })
        ).status,
        403,
      );
      assert.equal(
        (await otherRequest(`${prefix}/start`, { method: "POST" })).status,
        403,
      );
    },
  );
  let finalId;
  await check(
    "four concurrent expiry requests submit the saved source exactly once",
    async () => {
      const responses = await Promise.all(
        Array.from({ length: 4 }, () =>
          request(`${prefix}/finalize`, {
            method: "POST",
            ...json({
              source: "late forged answer",
              userId: other.id,
              exerciseId: exercise.id,
            }),
          }),
        ),
      );
      assert.ok(responses.every((response) => response.ok));
      const results = await Promise.all(
        responses.map((response) => response.json()),
      );
      finalId = results[0].data.submission?.id;
      assert.ok(finalId);
      assert.equal(
        new Set(results.map((result) => result.data.submission.id)).size,
        1,
      );
      const saved = await db.submission.findUniqueOrThrow({
        where: { id: finalId },
      });
      assert.equal(saved.source, snapshot.source);
      assert.equal(saved.exerciseId, secondExercise.id);
      assert.equal(saved.userId, student.id);
      assert.equal(saved.autoSubmitted, true);
      assert.equal(
        await db.submission.count({
          where: {
            contestId: live.id,
            userId: student.id,
            autoSubmitted: true,
          },
        }),
        1,
      );
    },
  );
  await check(
    "post-deadline reloads and retries recover the same result without reopening the editor",
    async () => {
      assert.equal(
        (await (await request(`${prefix}/finalize`, { method: "POST" })).json())
          .data.submission.id,
        finalId,
      );
      const page = await request(`/contests/${live.slug}/play`),
        html = await page.text();
      assert.equal(page.status, 200);
      assert.ok(!html.includes(prompt));
      assert.ok(html.includes("Lượt làm bài của bạn đã hết giờ"));
      assert.equal(
        (await request(`${prefix}/start`, { method: "POST" })).status,
        403,
      );
    },
  );
  await check(
    "shared exam closing caps personal time and closes empty attempts",
    async () => {
      const path = `/api/contests/${empty.slug}`;
      assert.equal(
        (await request(`${path}/registration`, { method: "POST" })).status,
        200,
      );
      const hardClose = new Date(Date.now() + 60000);
      await db.contest.update({
        where: { id: empty.id },
        data: {
          endsAt: new Date(Date.now() - 100),
          examStartsAt: new Date(Date.now() - 50),
          examEndsAt: hardClose,
          durationMinutes: 10,
        },
      });
      const startResult = await request(`${path}/start`, { method: "POST" });
      assert.equal(startResult.status, 200);
      assert.equal(
        (await startResult.json()).data.deadlineAt,
        hardClose.toISOString(),
      );
      await delay();
      await db.contest.update({
        where: { id: empty.id },
        data: { examEndsAt: new Date() },
      });
      assert.equal(
        (
          await request(`${path}/submissions`, {
            method: "POST",
            ...json(source),
          })
        ).status,
        403,
      );
      for (let i = 0; i < 2; i++)
        assert.equal(
          (await (await request(`${path}/finalize`, { method: "POST" })).json())
            .data.state,
          "skipped",
        );
      assert.equal(
        await db.submission.count({
          where: { contestId: empty.id, userId: student.id },
        }),
        0,
      );
    },
  );
  await check(
    "shared closing stops remaining students even if their personal duration remains",
    async () => {
      await delay();
      await db.contest.update({
        where: { id: live.id },
        data: { examEndsAt: new Date() },
      });
      assert.equal(
        (
          await otherRequest(`${prefix}/submissions`, {
            method: "POST",
            ...json(source),
          })
        ).status,
        403,
      );
      assert.equal(
        (await otherRequest(`${prefix}/start`, { method: "POST" })).status,
        403,
      );
      const clock = await (await otherRequest(`${prefix}/clock`)).json();
      assert.ok(Date.parse(clock.data.deadlineAt) <= Date.now());
      assert.equal(
        (await otherRequest(`${prefix}/finalize`, { method: "POST" })).status,
        200,
      );
    },
  );
  await check("unknown or draft contests return HTTP 404", async () => {
    for (const slug of [draft.slug, `missing-${runId}`])
      assert.equal((await request(`/contests/${slug}`)).status, 404);
  });
} finally {
  if (contestIds.length) {
    await db.submission.deleteMany({
      where: { contestId: { in: contestIds } },
    });
    await db.contest.deleteMany({ where: { id: { in: contestIds } } });
  }
  if (exerciseIds.length) {
    await db.testCase.deleteMany({
      where: { exerciseId: { in: exerciseIds } },
    });
    await db.exercise.deleteMany({ where: { id: { in: exerciseIds } } });
  }
  if (userIds.length)
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
  console.log("Removed local check fixtures.");
}
console.log(`${checks - failures}/${checks} checks passed.`);
if (failures) process.exitCode = 1;
