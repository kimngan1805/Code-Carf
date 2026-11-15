import {
  ContestStatus,
  ExerciseKind,
  PrismaClient,
  RoleName,
  XpSource,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { MILESTONE_BADGES } from "../src/features/progress/badges";
import { SAMPLE_SCHOOLS } from "./schools";

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
          onboardedAt: new Date(),
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
    update: {
      published: true,
      description:
        "Làm quen kiểu dữ liệu, hàm và interface trong TypeScript qua các bài tập ngắn.",
    },
    create: {
      slug: "typescript-basics",
      published: true,
      title: "TypeScript Basics",
      description:
        "Làm quen kiểu dữ liệu, hàm và interface trong TypeScript qua các bài tập ngắn.",
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
  // Demo schedule relative to the seed time, so the dashboard always shows upcoming contests.
  const hour = 60 * 60 * 1000;
  const sampleSchedule = {
    status: ContestStatus.PUBLISHED,
    startsAt: new Date(Date.now() + 72 * hour),
    endsAt: new Date(Date.now() + 74 * hour),
  };
  const contest = await prisma.contest.upsert({
    where: { slug: "sample-contest" },
    update: sampleSchedule,
    create: {
      ...sampleSchedule,
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
  const weeklySchedule = {
    status: ContestStatus.PUBLISHED,
    startsAt: new Date(Date.now() + 26 * hour),
    endsAt: new Date(Date.now() + 27.5 * hour),
  };
  await prisma.contest.upsert({
    where: { slug: "weekly-warmup" },
    update: weeklySchedule,
    create: {
      ...weeklySchedule,
      slug: "weekly-warmup",
      title: "Khởi động cuối tuần",
      creatorId: teacher.id,
    },
  });
  await prisma.contestGrader.upsert({
    where: {
      contestId_graderId: { contestId: contest.id, graderId: grader.id },
    },
    update: {},
    create: { contestId: contest.id, graderId: grader.id },
  });
  const badgeCatalog = [
    {
      slug: "first-step",
      name: "Bước đầu tiên",
      description: "Hoàn thành bài tập đầu tiên",
    },
    ...MILESTONE_BADGES,
  ];
  for (const badge of badgeCatalog) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {
        name: badge.name,
        description: badge.description,
      },
      create: badge,
    });
  }
  const student =
    users[roles.findIndex((role) => role.name === RoleName.STUDENT)];
  await seedStudentDemo(student.id, teacher.id, path.id, "Minh Thư");
  await seedDemoLearners(student.passwordHash);
  await seedPersonalDemo(teacher.id, path.id);
  await seedSchools();
}

/**
 * Optional: give your own account the same demo progress.
 * Set DEMO_USER_EMAIL and DEMO_USER_PASSWORD in .env (never in this file),
 * and DEMO_USER_NAME if the account does not exist yet.
 */
async function seedPersonalDemo(teacherId: string, basicsPathId: string) {
  const email = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_USER_PASSWORD;
  if (!email || !password) return;
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.STUDENT },
  });
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    // Demo progress replaces onboarding answers for this account.
    update: { passwordHash, onboardedAt: new Date() },
    create: {
      email,
      name: process.env.DEMO_USER_NAME?.trim() || email.split("@")[0],
      passwordHash,
      roleId: role.id,
      onboardedAt: new Date(),
    },
  });
  await seedStudentDemo(user.id, teacherId, basicsPathId);
  console.log(`Seeded demo progress for ${email}`);
}

/** Demo progress (paths, badges, XP history, streak) so the dashboard has data to show. */
async function seedStudentDemo(
  studentId: string,
  teacherId: string,
  basicsPathId: string,
  /** Rename the account, e.g. the generic seed student. Omit to keep the current name. */
  name?: string,
) {
  const demoPaths = [
    {
      slug: "nhap-mon-lap-trinh",
      title: "Nhập môn lập trình",
      description:
        "Biến, điều kiện, vòng lặp và hàm. Nền tảng cho người mới bắt đầu.",
      rooms: 12,
      done: 5,
    },
    {
      slug: "ctdl-giai-thuat",
      title: "Cấu trúc dữ liệu & giải thuật",
      description:
        "Mảng, danh sách liên kết, cây, đồ thị cùng các thuật toán sắp xếp và tìm kiếm.",
      rooms: 10,
      done: 2,
    },
    {
      slug: "phat-trien-web-co-ban",
      title: "Phát triển web cơ bản",
      description:
        "HTML, CSS và JavaScript để tự dựng một trang web hoàn chỉnh.",
      rooms: 8,
      done: 0,
    },
  ];
  // The demo student follows the three paths above instead of the sample path.
  await prisma.enrollment.deleteMany({
    where: { userId: studentId, pathId: basicsPathId },
  });
  for (const demo of demoPaths) {
    const path = await prisma.path.upsert({
      where: { slug: demo.slug },
      update: { description: demo.description, published: true },
      create: {
        slug: demo.slug,
        published: true,
        title: demo.title,
        description: demo.description,
        creatorId: teacherId,
        rooms: {
          create: Array.from({ length: demo.rooms }, (_, index) => ({
            title: `Bài ${index + 1}`,
            position: index + 1,
          })),
        },
      },
      include: { rooms: { orderBy: { position: "asc" } } },
    });
    await prisma.enrollment.upsert({
      where: { userId_pathId: { userId: studentId, pathId: path.id } },
      update: {},
      create: { userId: studentId, pathId: path.id },
    });
    for (const room of path.rooms.slice(0, demo.done))
      await prisma.roomProgress.upsert({
        where: { userId_roomId: { userId: studentId, roomId: room.id } },
        update: {},
        create: { userId: studentId, roomId: room.id },
      });
  }

  const badges = [
    {
      slug: "streak-7",
      name: "Chuỗi 7 ngày",
      description: "Học 7 ngày liên tiếp",
    },
    {
      slug: "first-path-room",
      name: "Khởi động",
      description: "Hoàn thành 5 bài học",
    },
    {
      slug: "fast-solver",
      name: "Tốc độ",
      description: "Giải đúng trong 5 phút",
    },
    { slug: "night-owl", name: "Cú đêm", description: "Học sau 22 giờ" },
  ];
  for (const badge of [{ slug: "first-step" }, ...badges]) {
    const saved =
      "name" in badge
        ? await prisma.badge.upsert({
            where: { slug: badge.slug },
            update: {},
            create: badge,
          })
        : await prisma.badge.findUniqueOrThrow({ where: { slug: badge.slug } });
    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId: studentId, badgeId: saved.id } },
      update: {},
      create: { userId: studentId, badgeId: saved.id },
    });
  }

  // XP history is rebuilt on every seed so the demo always looks current:
  // the last 7 days build the streak, earlier days fill the activity heatmap.
  const day = 24 * 60 * 60 * 1000;
  const history = Array.from({ length: 83 }, (_, index) => index + 1)
    .filter(
      (daysAgo) => daysAgo <= 7 || ![0, 3, 5].includes((daysAgo * 37) % 7),
    )
    .map((daysAgo) => ({
      userId: studentId,
      amount: 10 + ((daysAgo * 53) % 4) * 5,
      source: XpSource.ROOM_COMPLETED,
      createdAt: new Date(Date.now() - daysAgo * day),
    }));
  const historyXp = history.reduce((sum, event) => sum + event.amount, 0);
  const startingXp = Math.max(0, 1250 - historyXp);
  await prisma.xpEvent.deleteMany({ where: { userId: studentId } });
  await prisma.xpEvent.createMany({
    data: [
      ...history,
      {
        userId: studentId,
        amount: startingXp,
        source: XpSource.ADMIN_ADJUSTMENT,
        createdAt: new Date(Date.now() - 120 * day),
      },
    ],
  });
  await prisma.user.update({
    where: { id: studentId },
    data: {
      ...(name ? { name } : {}),
      xp: historyXp + startingXp,
      currentStreak: 7,
      longestStreak: 12,
      lastActiveOn: new Date(Date.now() - day),
    },
  });
}

/** Other learners so the weekly leaderboard has people to compare with. */
async function seedDemoLearners(passwordHash: string) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.STUDENT },
  });
  const learners = [
    {
      email: "demo-minhanh@local.test",
      name: "Trần Minh Anh",
      xp: 2100,
      week: 120,
    },
    {
      email: "demo-quocbao@local.test",
      name: "Lê Quốc Bảo",
      xp: 1600,
      week: 85,
    },
    { email: "demo-thuha@local.test", name: "Phạm Thu Hà", xp: 900, week: 30 },
    { email: "demo-giahuy@local.test", name: "Võ Gia Huy", xp: 400, week: 15 },
  ];
  for (const learner of learners) {
    const user = await prisma.user.upsert({
      where: { email: learner.email },
      update: { xp: learner.xp },
      create: {
        email: learner.email,
        name: learner.name,
        passwordHash,
        roleId: role.id,
        xp: learner.xp,
        onboardedAt: new Date(),
      },
    });
    await prisma.xpEvent.deleteMany({ where: { userId: user.id } });
    await prisma.xpEvent.create({
      data: {
        userId: user.id,
        amount: learner.week,
        source: XpSource.ROOM_COMPLETED,
        // A minute ago, so it always counts for the current week.
        createdAt: new Date(Date.now() - 60 * 1000),
      },
    });
  }
}

/** Sample school directory for the teacher application form. */
async function seedSchools() {
  for (const group of SAMPLE_SCHOOLS)
    for (const name of group.names)
      await prisma.school.upsert({
        where: { province_name: { province: group.province, name } },
        update: { level: group.level },
        create: { province: group.province, name, level: group.level },
      });
}

main().finally(() => prisma.$disconnect());
