import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { createExerciseReport } from "../src/features/exercise-reports/repository";
import { REPORT_COOLDOWN_MS } from "../src/features/exercise-reports/rules";

async function main() {
  const suffix = randomUUID();
  const teacher = await db.user.findUniqueOrThrow({
    where: { email: "teacher@local.test" },
  });
  const role = await db.role.findUniqueOrThrow({ where: { name: "STUDENT" } });
  const users: string[] = [];
  let pathId: string | undefined;
  try {
    for (let index = 0; index < 2; index++)
      users.push(
        (
          await db.user.create({
            data: {
              name: "Report check",
              email: `report-${index}-${suffix}@local.test`,
              passwordHash: "fixture-no-login",
              roleId: role.id,
            },
          })
        ).id,
      );
    const path = await db.path.create({
      data: {
        slug: `report-check-${suffix}`,
        title: "Report check",
        creatorId: teacher.id,
        published: true,
        rooms: {
          create: [
            {
              title: "Report room",
              position: 1,
              exercises: {
                create: [
                  { title: "First exercise", prompt: "Demo" },
                  { title: "Second exercise", prompt: "Demo" },
                ],
              },
            },
            { title: "Another room", position: 2 },
          ],
        },
      },
      include: {
        rooms: {
          orderBy: { position: "asc" },
          include: { exercises: { orderBy: { title: "asc" } } },
        },
      },
    });
    pathId = path.id;
    const room = path.rooms[0],
      [exercise, other] = room.exercises;
    const input = {
      kind: "STATEMENT" as const,
      description: "The sample output is inconsistent.",
    };
    const requests = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        createExerciseReport(users[0], exercise.id, room.id, input),
      ),
    );
    assert.equal(requests.filter((r) => r.status === "fulfilled").length, 1);
    const failures = requests.filter((r) => r.status === "rejected");
    assert.equal(failures.length, 7);
    for (const failure of failures)
      assert.equal(failure.reason.code, "REPORT_RATE_LIMITED");
    const stored = await db.exerciseReport.findMany({
      where: { userId: users[0], exerciseId: exercise.id },
    });
    assert.equal(stored.length, 1);
    assert.equal(stored[0].roomId, room.id);
    assert.equal(stored[0].kind, input.kind);
    assert.equal(stored[0].description, input.description);
    // A different category or message cannot bypass the same exercise's limit.
    await assert.rejects(
      createExerciseReport(users[0], exercise.id, room.id, {
        kind: "TEST_CASE",
        description: "Another description",
      }),
      { code: "REPORT_RATE_LIMITED" },
    );
    await createExerciseReport(users[0], other.id, room.id, input);
    await createExerciseReport(users[1], exercise.id, room.id, input);
    await db.exerciseReport.update({
      where: { id: stored[0].id },
      data: { createdAt: new Date(Date.now() - REPORT_COOLDOWN_MS - 1000) },
    });
    await createExerciseReport(users[0], exercise.id, room.id, input);
    assert.equal(
      await db.exerciseReport.count({
        where: { userId: users[0], exerciseId: exercise.id },
      }),
      2,
    );
    await assert.rejects(
      createExerciseReport(users[1], other.id, path.rooms[1].id, input),
      { code: "EXERCISE_NOT_FOUND" },
    );
    assert.equal(
      await db.exerciseReport.count({
        where: { userId: users[1], exerciseId: other.id },
      }),
      0,
    );
    await db.path.update({
      where: { id: path.id },
      data: { published: false },
    });
    await assert.rejects(
      createExerciseReport(users[1], other.id, room.id, input),
      { code: "EXERCISE_NOT_FOUND" },
    );
    console.log(
      "Exercise report checks passed: concurrent duplicate limit, category bypass blocked, correct relations, cooldown expiry and independent users/exercises.",
    );
  } finally {
    if (pathId) {
      await db.exercise.deleteMany({ where: { room: { pathId } } });
      await db.path.deleteMany({ where: { id: pathId } });
    }
    await db.user.deleteMany({ where: { id: { in: users } } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
