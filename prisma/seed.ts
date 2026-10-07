import { ExerciseKind, PrismaClient, RoleName } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );
  const passwordHash = await hash(
    process.env.SEED_PASSWORD ?? "LocalDev123!",
    12,
  );
  const users = await Promise.all(
    roles.map((role) =>
      prisma.user.upsert({
        where: { email: `${role.name.toLowerCase()}@local.test` },
        update: {},
        create: {
          email: `${role.name.toLowerCase()}@local.test`,
          name: role.name,
          passwordHash,
          roleId: role.id,
        },
      }),
    ),
  );
  const teacher =
    users[roles.findIndex((role) => role.name === RoleName.TEACHER)];
  const grader =
    users[roles.findIndex((role) => role.name === RoleName.GRADER)];
  const path = await prisma.path.upsert({
    where: { slug: "typescript-basics" },
    update: {},
    create: {
      slug: "typescript-basics",
      title: "TypeScript Basics",
      creatorId: teacher.id,
      rooms: {
        create: {
          title: "Getting started",
          position: 1,
          content:
            "# Getting started\n\nUse `console.log` to print text to the console.",
          exercises: {
            create: {
              title: "Hello world",
              prompt: "Print Hello world",
              testCases: {
                create: { input: "", expected: "Hello world", isHidden: false },
              },
            },
          },
        },
      },
    },
  });
  const contest = await prisma.contest.upsert({
    where: { slug: "sample-contest" },
    update: {},
    create: {
      slug: "sample-contest",
      title: "Sample Contest",
      creatorId: teacher.id,
      exercises: {
        create: [
          {
            position: 1,
            exercise: {
              create: {
                title: "Sum two numbers",
                prompt: "Read two integers and print their sum.",
                testCases: {
                  create: [
                    { input: "1 2", expected: "3", isHidden: false },
                    { input: "-5 10", expected: "5" },
                  ],
                },
              },
            },
          },
          {
            position: 2,
            exercise: {
              create: {
                title: "Binary search flowchart",
                prompt:
                  "Draw a flowchart for binary search and upload a photo.",
                kind: ExerciseKind.HANDWRITTEN,
                rubric:
                  "Has start/end, low/high/mid, comparison branch, loop until low > high.",
              },
            },
          },
        ],
      },
    },
  });
  await prisma.contestGrader.upsert({
    where: {
      contestId_graderId: { contestId: contest.id, graderId: grader.id },
    },
    update: {},
    create: { contestId: contest.id, graderId: grader.id },
  });
  await prisma.enrollment.upsert({
    where: { userId_pathId: { userId: users[0].id, pathId: path.id } },
    update: {},
    create: { userId: users[0].id, pathId: path.id },
  });
  await prisma.badge.upsert({
    where: { slug: "first-step" },
    update: {},
    create: {
      slug: "first-step",
      name: "First Step",
      description: "Complete your first exercise",
    },
  });
}

main().finally(() => prisma.$disconnect());
