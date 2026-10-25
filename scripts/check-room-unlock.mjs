import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

// Requires a running local app and migrated, seeded development database.
// Fresh fixtures are removed in finally; existing learners/progress are untouched.
process.loadEnvFile(".env");
const base = process.env.ROOM_CHECK_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const db = new PrismaClient();
const run = randomUUID();
const userIds = [];
let pathId;

async function login(email, password) {
  const jar = new Map();
  const remember = (response) => {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const index = pair.indexOf("=");
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  };
  const cookies = () =>
    [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
  const csrf = await fetch(`${base}/api/auth/csrf`);
  remember(csrf);
  const { csrfToken } = await csrf.json();
  const signedIn = await fetch(`${base}/api/auth/callback/credentials`, {
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
      callbackUrl: `${base}/paths`,
    }),
  });
  remember(signedIn);
  const session = await fetch(`${base}/api/auth/session`, {
    headers: { Cookie: cookies() },
  });
  assert.equal((await session.json()).user?.email, email);
  return (route) =>
    fetch(`${base}${route}`, {
      redirect: "manual",
      headers: { Cookie: cookies() },
    });
}

try {
  const role = await db.role.findUniqueOrThrow({ where: { name: "STUDENT" } });
  const teacher = await db.user.findUniqueOrThrow({
    where: { email: "teacher@local.test" },
  });
  const password = randomUUID();
  const passwordHash = await hash(password, 4);
  async function createLearner(label) {
    const user = await db.user.create({
      data: {
        email: `room-check-${label}-${run}@local.test`,
        name: "Room check",
        roleId: role.id,
        passwordHash,
        onboardedAt: new Date(),
      },
    });
    userIds.push(user.id);
    return user;
  }
  const learner = await createLearner("learner");
  const other = await createLearner("other");
  const secret = `LOCKED_THEORY_${run}`;
  const path = await db.path.create({
    data: {
      slug: `room-check-${run}`,
      title: "Room unlock check",
      creatorId: teacher.id,
      published: true,
      rooms: {
        create: [
          { title: "First", position: 1, content: "FIRST_THEORY" },
          { title: "Second", position: 3, content: secret },
          { title: "Third", position: 7, content: "THIRD_THEORY" },
        ],
      },
    },
    include: { rooms: { orderBy: { position: "asc" } } },
  });
  pathId = path.id;
  const [first, second, third] = path.rooms;
  const get = await login(learner.email, password);
  async function roomStatus(room, status) {
    const response = await get(`/api/rooms/${room.id}`);
    assert.equal(response.status, status);
    const body = await response.json();
    if (status !== 200) {
      assert.equal(body.data, null);
      assert.ok(!JSON.stringify(body).includes(secret));
    }
    return body;
  }
  assert.equal((await fetch(`${base}/api/rooms/${first.id}`)).status, 401);
  await roomStatus(first, 403);
  await db.enrollment.create({ data: { userId: learner.id, pathId } });
  await roomStatus(first, 200);
  await roomStatus(second, 403);
  console.log(
    "PASS anonymous/unenrolled denied; first room open; next room locked",
  );

  const direct = await get(`/rooms/${second.id}`);
  assert.ok([303, 307].includes(direct.status));
  assert.equal(
    new URL(direct.headers.get("location"), base).pathname,
    "/forbidden",
  );
  assert.ok(!(await direct.text()).includes(secret));
  console.log(
    "PASS locked direct URL redirected on server without leaking theory",
  );

  await db.roomProgress.create({
    data: { userId: other.id, roomId: first.id },
  });
  await roomStatus(second, 403);
  await db.roomProgress.create({
    data: { userId: learner.id, roomId: first.id },
  });
  assert.equal((await roomStatus(second, 200)).data.content, secret);
  await roomStatus(third, 403);
  await db.roomProgress.create({
    data: { userId: learner.id, roomId: second.id },
  });
  await roomStatus(third, 200);
  console.log(
    "PASS other learner progress ignored; immediate unlock for preceding room with gaps in positions",
  );

  await db.roomProgress.deleteMany({ where: { userId: learner.id } });
  await roomStatus(third, 403);
  await db.path.update({
    where: { id: pathId },
    data: { sequentialUnlock: false },
  });
  await roomStatus(second, 200);
  await roomStatus(third, 200);
  await db.path.update({
    where: { id: pathId },
    data: { sequentialUnlock: true },
  });
  await roomStatus(third, 403);
  console.log(
    "PASS disabling sequential unlock opens all rooms; re-enabling restores locks",
  );

  const catalog = await (await get("/api/paths")).json();
  assert.deepEqual(
    catalog.data
      .find((row) => row.id === pathId)
      .rooms.map((room) => room.accessible),
    [true, false, false],
  );
  await db.path.update({ where: { id: pathId }, data: { published: false } });
  await roomStatus(first, 404);
  assert.equal((await get(`/api/rooms/missing-${run}`)).status, 404);
  console.log(
    "PASS path navigation agrees with server access; draft/missing rooms hidden",
  );
} finally {
  if (pathId) await db.path.deleteMany({ where: { id: pathId } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
  console.log("Removed room-unlock check fixtures.");
}
