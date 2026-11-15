import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");
const minutes = Number(process.argv[2] ?? 5);
const registrationMinutes = Number(process.argv[3] ?? 2);
if (!Number.isInteger(minutes) || minutes < 1 || minutes > 30) {
  throw new Error(
    "Use a duration from 1 to 30 minutes, for example: npm run demo:contest -- 2",
  );
}
const database = new URL(process.env.DATABASE_URL);
if (
  !Number.isInteger(registrationMinutes) ||
  registrationMinutes < 1 ||
  registrationMinutes > 30
)
  throw new Error(
    "Registration duration must be 1 to 30 minutes. Example: npm run demo:contest -- 2 1",
  );
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) {
  throw new Error("This demo only runs against a local development database.");
}

const db = new PrismaClient();
try {
  const creator = await db.user.findFirst({
    where: { role: { name: "TEACHER" } },
    select: { id: true },
  });
  const now = Date.now();
  const contest = await db.contest.create({
    data: {
      slug: `demo-auto-submit-${randomUUID().slice(0, 8)}`,
      title: `Demo tự nộp khi hết giờ (${minutes} phút)`,
      description:
        "Đăng ký trước khi hết hạn đăng ký. Khi đóng đăng ký và đến giờ thi, bấm Bắt đầu làm bài. Bài phải nộp trước giờ đóng làm bài chung; bắt đầu muộn sẽ còn ít thời gian hơn. Đợi thông báo đã đồng bộ rồi chờ hết giờ để thử tự nộp.",
      status: "PUBLISHED",
      startsAt: new Date(now - 30000),
      endsAt: new Date(now + registrationMinutes * 60000),
      examStartsAt: new Date(now + registrationMinutes * 60000),
      examEndsAt: new Date(now + (registrationMinutes + minutes) * 60000),
      durationMinutes: minutes,
      requireFaceCheck: false,
      creatorId: creator?.id ?? null,
      exercises: {
        create: [
          {
            position: 1,
            exercise: {
              create: {
                title: "In Hello world",
                prompt:
                  'In đúng dòng chữ Hello world ra màn hình.\n\nKhông có dữ liệu đầu vào.\n\nPython: print("Hello world")\n\nBạn có thể sửa code rồi chờ hết giờ để kiểm tra tự nộp.',
                kind: "CODE",
                points: 100,
                testCases: {
                  create: [
                    { input: "", expected: "Hello world", isHidden: false },
                  ],
                },
              },
            },
          },
          {
            position: 2,
            exercise: {
              create: {
                title: "Tổng hai số",
                prompt:
                  "Đọc hai số nguyên a và b trên cùng một dòng, cách nhau bằng khoảng trắng. In tổng a + b.\n\nVí dụ: đầu vào 2 3, đầu ra 5.\n\nPython: print(sum(map(int, input().split())))\n\nMở bài này để kiểm tra hệ thống tự nộp bài đang mở thay vì bài trước.",
                kind: "CODE",
                points: 100,
                testCases: {
                  create: [
                    { input: "2 3", expected: "5", isHidden: false },
                    { input: "-5 10", expected: "5", isHidden: true },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    select: {
      slug: true,
      endsAt: true,
      durationMinutes: true,
      examEndsAt: true,
      _count: { select: { exercises: true } },
    },
  });
  const endTime = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(contest.endsAt);
  console.log(
    `Created a demo: register within ${registrationMinutes} minute(s), then a ${minutes}-minute exam window opens.`,
  );
  console.log(`Open: http://localhost:3000/contests/${contest.slug}`);
  console.log(
    `Registration closes and the exam starts at ${endTime} (Vietnam time).`,
  );
  console.log(
    "Run this command again for a fresh demo; existing attempts are kept.",
  );
  console.log(
    `All answers close at ${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(contest.examEndsAt)}. Late starters cannot go past this time.`,
  );
} finally {
  await db.$disconnect();
}
