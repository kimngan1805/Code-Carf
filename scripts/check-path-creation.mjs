import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

process.loadEnvFile(".env");
const base = process.env.PATH_CHECK_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Use a local application.");
const db = new PrismaClient();
const runId = randomUUID();
const password = randomUUID();
const userIds = [];
let checks = 0;
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
      callbackUrl: `${base}/gv/paths`,
    }),
  });
  remember(response);
  const session = await fetch(`${base}/api/auth/session`, {
    headers: { Cookie: cookies() },
  });
  assert.equal((await session.json()).user?.email, email);
  return (path, init = {}) =>
    fetch(`${base}${path}`, {
      ...init,
      redirect: "manual",
      headers: { Cookie: cookies(), Origin: base, ...init.headers },
    });
}
const input = () => ({ title: `Đường dẫn ${runId}`, requestId: randomUUID() });
const post = (client, body, headers = {}) =>
  client("/api/paths", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
async function check(name, run) {
  await run();
  checks++;
  console.log(`PASS ${name}`);
}
try {
  const passwordHash = await hash(password, 4);
  const clients = {};
  for (const [name, role] of Object.entries({
    teacher: "TEACHER",
    other: "TEACHER",
    student: "STUDENT",
    grader: "GRADER",
    guest: "GUEST",
    admin: "ADMIN",
  })) {
    const roleRecord = await db.role.findUniqueOrThrow({
      where: { name: role },
    });
    const user = await db.user.create({
      data: {
        name: "Path creation check",
        email: `path-check-${name}-${runId}@local.test`,
        roleId: roleRecord.id,
        passwordHash,
        onboardedAt: new Date(),
      },
    });
    userIds.push(user.id);
    clients[name] = await login(user.email);
  }
  await check(
    "anonymous and non-teacher requests cannot create paths",
    async () => {
      const anonymous = await fetch(`${base}/api/paths`, {
        method: "POST",
        body: JSON.stringify(input()),
      });
      assert.equal(anonymous.status, 401);
      for (const name of ["student", "grader", "guest"])
        assert.equal((await post(clients[name], input())).status, 403);
    },
  );
  await check("teacher list and creation form are accessible", async () => {
    const list = await clients.teacher("/gv/paths");
    assert.equal(list.status, 200);
    assert.ok((await list.text()).includes("/gv/paths/new"));
    const form = await clients.teacher("/gv/paths/new");
    assert.equal(form.status, 200);
    assert.ok((await form.text()).includes('id="path-title"'));
  });
  await check(
    "rejects invalid input, owner forgery and foreign origins",
    async () => {
      for (const change of [
        { title: " " },
        { title: "x".repeat(101) },
        { description: "x".repeat(5001) },
        { published: true },
        { creatorId: userIds[1] },
      ])
        assert.equal(
          (await post(clients.teacher, { ...input(), ...change })).status,
          400,
        );
      assert.equal(
        (
          await post(clients.teacher, input(), {
            Origin: "https://foreign.example",
          })
        ).status,
        403,
      );
      assert.equal(
        (await clients.teacher("/api/paths", { method: "POST", body: "{" }))
          .status,
        400,
      );
      assert.equal(
        (
          await clients.teacher("/api/paths", {
            method: "POST",
            body: "x".repeat(40001),
          })
        ).status,
        413,
      );
    },
  );
  const body = input();
  let path;
  await check(
    "concurrent submissions and network retries create one owned draft",
    async () => {
      const responses = await Promise.all(
        Array.from({ length: 4 }, () => post(clients.teacher, body)),
      );
      for (const response of responses) assert.equal(response.status, 201);
      const records = await Promise.all(
        responses.map(async (response) => (await response.json()).data),
      );
      path = records[0];
      assert.ok(records.every((record) => record.id === path.id));
      const saved = await db.path.findUniqueOrThrow({
        where: { id: path.id },
        include: { _count: { select: { rooms: true } } },
      });
      assert.equal(saved.creatorId, userIds[0]);
      assert.equal(saved.published, false);
      assert.equal(saved.sequentialUnlock, true);
      assert.equal(saved._count.rooms, 0);
      assert.ok(saved.slug.startsWith("duong-dan-"));
      assert.equal(
        (await post(clients.teacher, { ...body, title: "Changed" })).status,
        409,
      );
    },
  );
  await check(
    "saved draft is visible to its owner and hidden from learners and other teachers",
    async () => {
      const detail = await clients.teacher(`/gv/paths/${path.slug}?created=1`);
      assert.equal(detail.status, 200);
      assert.ok((await detail.text()).includes("Đã tạo lộ trình thành công."));
      assert.ok(
        (await (await clients.teacher("/gv/paths")).text()).includes(
          path.title,
        ),
      );
      assert.ok(
        !(await (await clients.other("/gv/paths")).text()).includes(path.title),
      );
      const foreign = await clients.other(`/gv/paths/${path.slug}`);
      assert.ok([200, 404].includes(foreign.status));
      const foreignHtml = await foreign.text();
      assert.ok(foreignHtml.includes('name="robots" content="noindex"'));
      assert.ok(!foreignHtml.includes(path.title));
      const visible = (await (await clients.student("/api/paths")).json()).data;
      assert.ok(!visible.some((item) => item.id === path.id));
      const learner = await clients.student(`/hv/paths/${path.slug}`);
      assert.ok([200, 404].includes(learner.status));
      const learnerHtml = await learner.text();
      assert.ok(learnerHtml.includes('name="robots" content="noindex"'));
      assert.ok(!learnerHtml.includes(path.title));
    },
  );
  await check(
    "duplicate titles get unique slugs and unchecked settings persist",
    async () => {
      const response = await post(clients.teacher, {
        ...body,
        requestId: randomUUID(),
        sequentialUnlock: false,
      });
      assert.equal(response.status, 201);
      const saved = (await response.json()).data;
      assert.notEqual(saved.slug, path.slug);
      assert.equal(saved.sequentialUnlock, false);
    },
  );
  await check(
    "admin can create and reserved new slug stays accessible",
    async () => {
      const response = await post(clients.admin, {
        title: "New",
        requestId: randomUUID(),
      });
      assert.equal(response.status, 201);
      const saved = (await response.json()).data;
      assert.notEqual(saved.slug, "new");
      assert.equal(saved.creatorId, userIds[5]);
      assert.equal(
        (await clients.admin(`/gv/paths/${saved.slug}`)).status,
        200,
      );
    },
  );
  console.log(`${checks} path creation HTTP checks passed.`);
} finally {
  await db.path.deleteMany({ where: { creatorId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
}
