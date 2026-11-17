import {
  ContestStatus,
  ExerciseKind,
  PrismaClient,
  RoleName,
  SubmissionStatus,
  XpSource,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { MILESTONE_BADGES } from "../src/features/progress/badges";
import {
  dateKeyToDbDate,
  toActivityDateKey,
} from "../src/features/progress/streak";
import { addDays, toVnMidnight } from "../src/features/progress/week-activity";
import { computeContestParticipantStanding } from "../src/features/leaderboard/contest-ranking";
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
          published: true,
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
  // A fresh local seed is immediately playable with the registered sample student.
  const hour = 60 * 60 * 1000;
  const sampleNow = Date.now();
  const sampleSchedule = {
    status: ContestStatus.PUBLISHED,
    startsAt: new Date(sampleNow - hour),
    endsAt: new Date(sampleNow - 60000),
    examStartsAt: new Date(sampleNow - 30000),
    examEndsAt: new Date(sampleNow + 24 * hour),
    durationMinutes: 120,
  };
  const contest = await prisma.contest.upsert({
    where: { slug: "sample-contest" },
    update: sampleSchedule,
    create: {
      ...sampleSchedule,
      slug: "sample-contest",
      title: "Sample Contest",
      description:
        "Hai bài code đơn giản: tính tổng hai số và bình phương một số. Mỗi bài chỉ được nộp một lần. Tài khoản student@local.test đã được đăng ký sẵn để bắt đầu ngay sau khi seed.",
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
        ],
      },
    },
  });
  // Keep older local seeds consistent with the code-only sample contest.
  const squareExercise = {
    title: "Square a number",
    prompt: "Read one integer n and print n * n.",
    kind: ExerciseKind.CODE,
    rubric: null,
    testCases: {
      create: [
        { input: "2", expected: "4", isHidden: false },
        { input: "-3", expected: "9" },
        { input: "0", expected: "0" },
      ],
    },
  };
  await prisma.contestExercise.upsert({
    where: { contestId_position: { contestId: contest.id, position: 2 } },
    update: {
      exercise: {
        update: {
          ...squareExercise,
          testCases: { deleteMany: {}, ...squareExercise.testCases },
        },
      },
    },
    create: {
      position: 2,
      contest: { connect: { id: contest.id } },
      exercise: { create: squareExercise },
    },
  });
  await prisma.contestGrader.upsert({
    where: {
      contestId_graderId: { contestId: contest.id, graderId: grader.id },
    },
    update: {},
    create: { contestId: contest.id, graderId: grader.id },
  });
  const sampleStudent =
    users[roles.findIndex((role) => role.name === RoleName.STUDENT)];

  await prisma.contestParticipant.upsert({
    where: {
      contestId_userId: {
        contestId: contest.id,
        userId: sampleStudent.id,
      },
    },
    update: {},
    create: {
      contestId: contest.id,
      userId: sampleStudent.id,
      joinedAt: new Date(sampleNow - 120000),
    },
  });

  console.log(
    "Sample Contest is ready: sign in as student@local.test and open /contests/sample-contest. The exam stays open for 24 hours; click Start for your own 120-minute timer. Existing attempts are kept.",
  );

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
  const demoPathIds = await seedStudentDemo(
    student.id,
    teacher.id,
    path.id,
    "Minh Thư",
  );
  await seedDemoLearners(student.passwordHash, demoPathIds);
  await seedSampleContestLeaderboard(contest.id, contest.penaltyMinutes);
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
  const demoPathIds: Record<string, string> = {};
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
            published: true,
          })),
        },
      },
      include: { rooms: { orderBy: { position: "asc" } } },
    });
    demoPathIds[demo.slug] = path.id;
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
    if (demo.slug === "nhap-mon-lap-trinh" && path.rooms[5])
      await seedRoomPageDemo(studentId, path.rooms[5].id);
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
  // the last 7 Vietnam calendar days build the streak, earlier days fill the activity heatmap.
  const now = new Date();
  const todayKey = toActivityDateKey(now);
  const yesterdayKey = addDays(todayKey, -1);
  const middayMs = 12 * 60 * 60 * 1000;
  const history = Array.from({ length: 83 }, (_, index) => index + 1)
    .filter(
      (daysAgo) => daysAgo <= 7 || ![0, 3, 5].includes((daysAgo * 37) % 7),
    )
    .map((daysAgo) => ({
      userId: studentId,
      amount: 10 + ((daysAgo * 53) % 4) * 5,
      source: XpSource.ROOM_COMPLETED,
      pathId:
        daysAgo % 2 === 0
          ? demoPathIds["ctdl-giai-thuat"]
          : demoPathIds["nhap-mon-lap-trinh"],
      createdAt: new Date(
        toVnMidnight(addDays(todayKey, -daysAgo)).getTime() + middayMs,
      ),
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
        pathId: demoPathIds["nhap-mon-lap-trinh"],
        createdAt: new Date(
          toVnMidnight(addDays(todayKey, -120)).getTime() + middayMs,
        ),
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
      lastActiveOn: dateKeyToDbDate(yesterdayKey),
    },
  });
  return demoPathIds;
}

/** Other learners so the leaderboard (overall, weekly, and by path) stays consistent. */
async function seedDemoLearners(
  passwordHash: string,
  demoPathIds: Record<string, string>,
) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.STUDENT },
  });
  const day = 24 * 60 * 60 * 1000;
  const now = new Date();
  const pastDate = new Date(now.getTime() - 10 * day);
  const learners = [
    {
      email: "demo-minhanh@local.test",
      name: "Trần Minh Anh",
      xp: 2100,
      weekByPath: [
        { slug: "nhap-mon-lap-trinh", amount: 70 },
        { slug: "ctdl-giai-thuat", amount: 50 },
      ],
      pastPrimarySlug: "nhap-mon-lap-trinh",
    },
    {
      email: "demo-quocbao@local.test",
      name: "Lê Quốc Bảo",
      xp: 1600,
      weekByPath: [
        { slug: "nhap-mon-lap-trinh", amount: 50 },
        { slug: "phat-trien-web-co-ban", amount: 35 },
      ],
      pastPrimarySlug: "ctdl-giai-thuat",
    },
    {
      email: "demo-thuha@local.test",
      name: "Phạm Thu Hà",
      xp: 900,
      weekByPath: [
        { slug: "ctdl-giai-thuat", amount: 15 },
        { slug: "phat-trien-web-co-ban", amount: 15 },
      ],
      pastPrimarySlug: "phat-trien-web-co-ban",
    },
    {
      email: "demo-giahuy@local.test",
      name: "Võ Gia Huy",
      xp: 400,
      weekByPath: [{ slug: "phat-trien-web-co-ban", amount: 15 }],
      pastPrimarySlug: "nhap-mon-lap-trinh",
    },
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
    const weeklyTotal = learner.weekByPath.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );
    const pastXp = Math.max(0, learner.xp - weeklyTotal);
    await prisma.xpEvent.deleteMany({ where: { userId: user.id } });
    await prisma.xpEvent.createMany({
      data: [
        ...learner.weekByPath.map((entry) => ({
          userId: user.id,
          amount: entry.amount,
          source: XpSource.ROOM_COMPLETED,
          pathId: demoPathIds[entry.slug] ?? null,
          // Exact current timestamp ensures it stays inside the active VN week.
          createdAt: now,
        })),
        ...(pastXp > 0
          ? [
              {
                userId: user.id,
                amount: pastXp,
                source: XpSource.ROOM_COMPLETED,
                pathId: demoPathIds[learner.pastPrimarySlug] ?? null,
                createdAt: pastDate,
              },
            ]
          : []),
      ],
    });
  }
}

/**
 * Idempotently seeds demo leaderboard entries in `sample-contest` (including a
 * competition tie) while keeping `student@local.test`'s existing attempt intact.
 */
async function seedSampleContestLeaderboard(
  contestId: string,
  contestPenaltyMinutes: number,
) {
  const contestExercises = await prisma.contestExercise.findMany({
    where: { contestId },
    orderBy: { position: "asc" },
    select: { exerciseId: true },
  });
  if (contestExercises.length < 2) {
    return;
  }

  const [firstExercise, secondExercise] = contestExercises;
  const now = Date.now();
  const demoEntries = [
    {
      email: "demo-minhanh@local.test",
      key: "minhanh",
      finished: true,
      submissions: [
        {
          exerciseId: firstExercise.exerciseId,
          status: SubmissionStatus.ACCEPTED,
          score: 100,
        },
        {
          exerciseId: secondExercise.exerciseId,
          status: SubmissionStatus.ACCEPTED,
          score: 100,
        },
      ],
    },
    {
      email: "demo-quocbao@local.test",
      key: "quocbao",
      finished: true,
      submissions: [
        {
          exerciseId: firstExercise.exerciseId,
          status: SubmissionStatus.ACCEPTED,
          score: 100,
        },
        {
          exerciseId: secondExercise.exerciseId,
          status: SubmissionStatus.REJECTED,
          score: 50,
        },
      ],
    },
    {
      email: "demo-thuha@local.test",
      key: "thuha",
      finished: true,
      submissions: [
        {
          exerciseId: firstExercise.exerciseId,
          status: SubmissionStatus.ACCEPTED,
          score: 100,
        },
        {
          exerciseId: secondExercise.exerciseId,
          status: SubmissionStatus.REJECTED,
          score: 50,
        },
      ],
    },
    {
      email: "demo-giahuy@local.test",
      key: "giahuy",
      finished: false,
      submissions: [
        {
          exerciseId: firstExercise.exerciseId,
          status: SubmissionStatus.ACCEPTED,
          score: 100,
        },
        {
          exerciseId: secondExercise.exerciseId,
          status: SubmissionStatus.REJECTED,
          score: 0,
        },
      ],
    },
  ];

  for (let index = 0; index < demoEntries.length; index++) {
    const entry = demoEntries[index];
    const user = await prisma.user.findUnique({
      where: { email: entry.email },
      select: { id: true },
    });
    if (!user) continue;

    for (let subIdx = 0; subIdx < entry.submissions.length; subIdx++) {
      const sub = entry.submissions[subIdx];
      await prisma.submission.upsert({
        where: {
          id: `contest-demo-${contestId}-${entry.key}-${subIdx + 1}`,
        },
        update: {
          status: sub.status,
          score: sub.score,
        },
        create: {
          id: `contest-demo-${contestId}-${entry.key}-${subIdx + 1}`,
          userId: user.id,
          exerciseId: sub.exerciseId,
          contestId,
          source: "// Seed demo contest submission",
          language: "typescript",
          status: sub.status,
          score: sub.score,
          feedback:
            sub.status === SubmissionStatus.ACCEPTED
              ? "Đạt tất cả test case."
              : "Chưa vượt qua toàn bộ test case.",
        },
      });
    }

    const standing = computeContestParticipantStanding(
      entry.submissions.map((sub, subIdx) => ({
        userId: user.id,
        exerciseId: sub.exerciseId,
        contestId,
        status: sub.status,
        score: sub.score,
        createdAt: new Date(now - (10 - subIdx) * 60000),
      })),
      contestPenaltyMinutes,
      contestId,
    );

    const joinedAt = new Date(now - (30 + index * 5) * 60000);
    const startedAt = new Date(now - (25 + index * 5) * 60000);
    const deadlineAt = new Date(startedAt.getTime() + 120 * 60000);
    const finishedAt = entry.finished ? new Date(now - index * 60000) : null;

    await prisma.contestParticipant.upsert({
      where: {
        contestId_userId: { contestId, userId: user.id },
      },
      update: {
        score: standing.score,
        penaltyMinutes: standing.penaltyMinutes,
        startedAt,
        deadlineAt,
        finishedAt,
      },
      create: {
        contestId,
        userId: user.id,
        joinedAt,
        startedAt,
        deadlineAt,
        finishedAt,
        score: standing.score,
        penaltyMinutes: standing.penaltyMinutes,
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

/** Reproducible examples for the three learner exercise states in the open sixth room. */
async function seedRoomPageDemo(userId: string, roomId: string) {
  await prisma.room.update({
    where: { id: roomId },
    data: {
      title: "Hàm và tham số",
      description: "Viết hàm, truyền tham số và đọc giá trị trả về.",
      content:
        "## Hàm trong TypeScript\n\nHàm gom một tác vụ thành một khối có thể tái sử dụng.\n\n```ts\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```\n\n### Ghi nhớ\n\n- Đặt tên hàm rõ nghĩa.\n- Khai báo kiểu của tham số.\n- Dùng `return` để trả kết quả.\n\n| Thành phần | Ý nghĩa |\n| --- | --- |\n| Tham số | Dữ liệu đầu vào |\n| Giá trị trả về | Kết quả của hàm |",
    },
  });
  const examples = [
    {
      key: "new",
      title: "Tổng hai số",
      prompt:
        "Viết hàm `add(a, b)` trả về tổng hai số.\n\nVí dụ: `add(2, 3)` trả về `5`.",
    },
    {
      key: "submitted",
      title: "Kiểm tra số chẵn",
      prompt:
        "Viết hàm `isEven(n)` trả về `true` nếu `n` chẵn, ngược lại trả về `false`.",
    },
    {
      key: "passed",
      title: "Tìm số lớn nhất",
      prompt: "Viết hàm `max(a, b)` trả về số lớn hơn trong hai số.",
    },
  ];
  for (const example of examples) {
    const id = `room-demo-${roomId}-${example.key}`;
    await prisma.exercise.upsert({
      where: { id },
      update: {},
      create: { id, roomId, title: example.title, prompt: example.prompt },
    });
    if (example.key === "new") continue;
    const status =
      example.key === "passed"
        ? SubmissionStatus.ACCEPTED
        : SubmissionStatus.REJECTED;
    await prisma.submission.upsert({
      where: { id: `room-demo-${userId}-${id}` },
      update: {},
      create: {
        id: `room-demo-${userId}-${id}`,
        userId,
        exerciseId: id,
        contestId: null,
        source: "// Seed demo submission",
        language: "typescript",
        status,
        score: status === SubmissionStatus.ACCEPTED ? 100 : 0,
        feedback: "Bài nộp mẫu để kiểm tra trạng thái trang Room.",
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
